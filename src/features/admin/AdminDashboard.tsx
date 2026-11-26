import { ticketsApi } from "@/api/endpoints/tickets";
import { useBookingsQueue, useVerifyBooking } from "@/api/hooks/useAnalytics";
import { useAdminEvents, useDeleteEvent } from "@/api/hooks/useEvents";
import { useHelpMessages, useResolveHelpMessage } from "@/api/hooks/useHelp";
import {
  useCreateMenuItem,
  useDeleteMenuItem,
  useMenu,
  useUpdateMenuItem,
} from "@/api/hooks/useMenu";
import { useAdminTicketSearch, useMarkWaSent } from "@/api/hooks/useTickets";
import {
  useCreateStaff,
  useDeactivateStaff,
  useStaffList,
  useUpdateStaffPassword,
} from "@/api/hooks/useUsers";
import { queryClient } from "@/api/queryClient";
import { TicketPassCard } from "@/components/tickets/TicketPassCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  formatCurrencyINR,
  formatDateTime,
  formatLabel,
  pluralize,
  ticketCategoryBreakdown,
} from "@/lib/utils";
import { Event } from "@/models/event.schema";
import { MenuItem } from "@/models/menu.schema";
import { Ticket } from "@/models/ticket.schema";
import { useUiStore } from "@/stores/ui.store";
import { onSocketEvent } from "@/ws/socket";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Edit3,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  UserX,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AdminOverview } from "./AdminOverview";

const EventEditor = React.lazy(() =>
  import("./EventEditor").then((m) => ({ default: m.EventEditor })),
);
const AdminLeads = React.lazy(() =>
  import("./AdminLeads").then((m) => ({ default: m.AdminLeads })),
);

type Section =
  | "overview"
  | "bookings"
  | "tickets"
  | "leads"
  | "events"
  | "staff"
  | "menu"
  | "help";

type PendingApproval = {
  guest: string;
  amount: number;
  phone: string;
};

const leadGuestName = (booking: any) =>
  booking.guests?.find((guest: any) => guest.is_primary_contact)?.name ||
  booking.guests?.[0]?.name ||
  booking.primary_name ||
  booking.primary_guest_name ||
  "Guest Booker";

const csvCell = (value: unknown) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

const downloadTicketCsv = (tickets: Ticket[]) => {
  const rows = [
    [
      "Name",
      "Mobile",
      "Guest Count",
      "Couple Count",
      "Stag Male Count",
      "Stag Female Count",
      "Section",
      "Amount Paid",
      "UTR Number",
    ],
    ...tickets.map((ticket) => [
      ticket.primary_guest_name || "Guest",
      ticket.contact_phone || "",
      ticket.attendee_count,
      ticket.couple_count,
      ticket.stag_male_count,
      ticket.stag_female_count,
      ticket.section || "",
      ticket.total_amount,
      ticket.upi_transaction_id || "",
    ]),
  ];
  const blob = new Blob(
    [rows.map((row) => row.map(csvCell).join(",")).join("\n")],
    {
      type: "text/csv;charset=utf-8",
    },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const sections: {
  key: Section;
  label: string;
  icon: React.ElementType;
  to: string;
}[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, to: "/admin" },
  {
    key: "bookings",
    label: "Payments",
    icon: DollarSign,
    to: "/admin/bookings",
  },
  { key: "tickets", label: "Tickets", icon: Search, to: "/admin/tickets" },
  { key: "leads", label: "Leads", icon: UserX, to: "/admin/leads" },
  { key: "events", label: "Events", icon: CalendarDays, to: "/admin/events" },
  { key: "staff", label: "Staff", icon: Users, to: "/admin/staff" },
  { key: "menu", label: "Menu", icon: UtensilsCrossed, to: "/admin/menu" },
  { key: "help", label: "Help Requests", icon: LifeBuoy, to: "/admin/help" },
];

export const AdminDashboard: React.FC = () => {
  const { section } = useParams<{ section?: string }>();
  const activeTab: Section = (
    [
      "overview",
      "bookings",
      "tickets",
      "leads",
      "events",
      "staff",
      "menu",
      "help",
    ].includes(section || "")
      ? section
      : "overview"
  ) as Section;

  const { data: bookings, refetch: refetchBookings } = useBookingsQueue();
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [waPending, setWaPending] = useState(false);
  const [ticketCursor, setTicketCursor] = useState("");
  const [csvDownloading, setCsvDownloading] = useState(false);
  const adminTicketSearch = useAdminTicketSearch(
    ticketSearch,
    waPending,
    ticketCursor,
    activeTab === "tickets",
  );
  const { data: events, refetch: refetchEvents } = useAdminEvents();
  const { data: staffList, refetch: refetchStaff } = useStaffList();
  const { data: menuItems, refetch: refetchMenu } = useMenu();
  const [helpResolved, setHelpResolved] = useState(false);
  const helpMessages = useHelpMessages(helpResolved);
  const resolveHelp = useResolveHelpMessage();

  const verifyBookingMutation = useVerifyBooking();
  const markWaSentMutation = useMarkWaSent({
    query: ticketSearch,
    waPending,
    cursor: ticketCursor,
  });
  const deleteEventMutation = useDeleteEvent();
  const createStaffMutation = useCreateStaff();
  const deactivateStaffMutation = useDeactivateStaff();
  const updateStaffPasswordMutation = useUpdateStaffPassword();
  const createMenuItemMutation = useCreateMenuItem();
  const updateMenuItemMutation = useUpdateMenuItem();
  const deleteMenuItemMutation = useDeleteMenuItem();
  const { showToast } = useUiStore();

  const [liveMessages, setLiveMessages] = useState<string[]>([]);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(
    null,
  );
  const [approvedTicket, setApprovedTicket] = useState<Ticket | null>(null);
  const [approvedPhone, setApprovedPhone] = useState("");
  const [pendingApproval, setPendingApproval] =
    useState<PendingApproval | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<
    "ALL" | "DRINK" | "FOOD"
  >("ALL");

  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<
    "ADMIN" | "SCANNER" | "BARTENDER"
  >("SCANNER");
  const [updatedPasswordValue, setUpdatedPasswordValue] = useState("");
  const [newMenuItemName, setNewMenuItemName] = useState("");
  const [newMenuItemCategory, setNewMenuItemCategory] = useState<
    "DRINK" | "FOOD"
  >("DRINK");
  const [newMenuItemPrice, setNewMenuItemPrice] = useState(250);
  const [newMenuItemServing, setNewMenuItemServing] = useState("");

  useEffect(() => {
    const unsubBooking = onSocketEvent("BOOKING_CREATED", (payload: any) => {
      const msg = `New Booking #${payload.booking_id?.substring(0, 6)} (${formatCurrencyINR(
        payload.total_amount || 0,
      )}) by ${payload.primary_name || "Guest"}`;
      setLiveMessages((prev) => [msg, ...prev.slice(0, 9)]);
      showToast(msg, "info");
      refetchBookings();
    });
    const unsubUtr = onSocketEvent("UTR_SUBMITTED", (payload: any) => {
      const msg = `Payment reference ${payload.upi_txn_id} submitted for booking #${payload.booking_id?.substring(
        0,
        6,
      )}`;
      setLiveMessages((prev) => [msg, ...prev.slice(0, 9)]);
      showToast(msg, "warning");
      refetchBookings();
    });
    const unsubVerified = onSocketEvent("BOOKING_VERIFIED", (payload: any) => {
      const msg = `Booking #${payload.booking_id?.substring(0, 6)} status changed to ${formatLabel(
        payload.status,
      )}`;
      setLiveMessages((prev) => [msg, ...prev.slice(0, 9)]);
      refetchBookings();
    });
    const unsubHelp = onSocketEvent("HELP_SUBMITTED", (payload: any) => {
      const msg = `New help request from ${payload.name || "Guest"} (${payload.phone || "phone not provided"})`;
      setLiveMessages((prev) => [msg, ...prev.slice(0, 9)]);
      showToast(msg, "info");
      void queryClient.invalidateQueries({ queryKey: ["help"] });
    });
    const unsubAll = onSocketEvent("*", () => {
      void queryClient.invalidateQueries();
    });
    return () => {
      unsubBooking();
      unsubUtr();
      unsubVerified();
      unsubHelp();
      unsubAll();
    };
  }, [refetchBookings, showToast]);

  const pendingBookings = useMemo(
    () =>
      Array.isArray(bookings)
        ? bookings.filter(
            (b: any) =>
              b.status === "PENDING" || b.booking_status === "PENDING",
          )
        : [],
    [bookings],
  );

  const filteredMenuItems = useMemo(() => {
    if (!menuItems) return [];
    if (menuCategoryFilter === "ALL") return menuItems;
    return menuItems.filter(
      (item) => (item.category || "").toUpperCase() === menuCategoryFilter,
    );
  }, [menuItems, menuCategoryFilter]);

  const sectionCounts: Partial<Record<Section, number>> = {
    bookings: pendingBookings.length,
    events: events?.length || 0,
    staff: staffList?.length || 0,
    menu: menuItems?.length || 0,
    help: helpMessages.data?.length || 0,
  };

  const refreshAll = async () => {
    await queryClient.invalidateQueries();
    showToast("All admin data refreshed.", "success");
  };

  const handleVerify = async (
    bookingId: string,
    action: "APPROVE" | "REJECT",
    phone?: string,
    ticketId?: string,
    guestName?: string,
    amount?: number,
  ) => {
    if (action === "APPROVE") {
      setApprovedTicket(null);
      setPendingApproval({
        guest: guestName || "Guest",
        amount: amount || 0,
        phone: phone || "",
      });
    }
    try {
      const result = await verifyBookingMutation.mutateAsync({
        bookingId,
        action,
      });
      if (action !== "APPROVE") showToast("Booking rejected.", "success");
      if (action === "REJECT") {
        setPendingApproval(null);
        setApprovedTicket(null);
      }
      if (action === "APPROVE") {
        const approvedTicketId = result?.ticket_id || ticketId;
        setApprovedPhone(phone || "");
        if (approvedTicketId) {
          try {
            const detail = await ticketsApi.detail(approvedTicketId);
            setApprovedTicket(detail);
          } catch {
            showToast(
              "Payment approved, but the ticket preview could not be loaded.",
              "warning",
            );
          }
        }
        setPendingApproval(null);
        showToast(
          "Payment approved. Send ticket on WhatsApp, then mark it sent.",
          "success",
        );
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.error ||
          "Could not complete the action. Please try again.",
        "danger",
      );
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    if (
      !window.confirm(
        `Archive "${event.title}"? It will be hidden from guests and kept for records.`,
      )
    ) {
      return;
    }
    try {
      await deleteEventMutation.mutateAsync(event.id);
      showToast("Event archived.", "success");
      refetchEvents();
    } catch (err: any) {
      showToast(
        err.response?.data?.error || "Could not archive the event.",
        "danger",
      );
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStaffMutation.mutateAsync({
        username: newStaffUsername.trim(),
        password: newStaffPassword,
        role: newStaffRole,
      });
      showToast(`Staff account @${newStaffUsername} created`, "success");
      setShowStaffModal(false);
      setNewStaffUsername("");
      setNewStaffPassword("");
      refetchStaff();
    } catch (err: any) {
      showToast(
        err.response?.data?.error || "Failed to create staff account",
        "danger",
      );
    }
  };

  const handleDeactivateStaff = async (id: string, username: string) => {
    try {
      await deactivateStaffMutation.mutateAsync(id);
      showToast(`Staff member @${username} deactivated`, "info");
      refetchStaff();
    } catch (err: any) {
      showToast(
        err.response?.data?.error || "Failed to deactivate staff",
        "danger",
      );
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    try {
      await updateStaffPasswordMutation.mutateAsync({
        id: selectedStaffId,
        newPassword: updatedPasswordValue,
      });
      showToast(
        "Password updated. This account has been signed out on all devices.",
        "success",
      );
      setShowPasswordModal(false);
      setSelectedStaffId(null);
      setUpdatedPasswordValue("");
    } catch (err: any) {
      showToast(
        err.response?.data?.error || "Failed to update password",
        "danger",
      );
    }
  };

  const resetMenuForm = () => {
    setEditingMenuItemId(null);
    setNewMenuItemName("");
    setNewMenuItemCategory("DRINK");
    setNewMenuItemPrice(250);
    setNewMenuItemServing("");
  };

  const openMenuEditor = (item?: MenuItem) => {
    resetMenuForm();
    if (item) {
      setEditingMenuItemId(item.id);
      setNewMenuItemName(item.name);
      setNewMenuItemCategory(item.category === "FOOD" ? "FOOD" : "DRINK");
      setNewMenuItemPrice(item.unit_price || item.price || 250);
      setNewMenuItemServing(item.serving_label || "");
    }
    setShowMenuModal(true);
  };

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      name: newMenuItemName,
      category: newMenuItemCategory,
      unit_price: Number(newMenuItemPrice),
      serving_label: newMenuItemServing,
    };
    try {
      if (editingMenuItemId) {
        await updateMenuItemMutation.mutateAsync({
          id: editingMenuItemId,
          input,
        });
        showToast("Menu item updated", "success");
      } else {
        await createMenuItemMutation.mutateAsync(input);
        showToast("Menu item created", "success");
      }
      setShowMenuModal(false);
      resetMenuForm();
      refetchMenu();
    } catch (err: any) {
      showToast(
        err.response?.data?.error || "Could not save menu item",
        "danger",
      );
    }
  };

  const handleDeleteMenuItem = async (id: string, name: string) => {
    try {
      await deleteMenuItemMutation.mutateAsync(id);
      showToast(`${name} removed from menu`, "info");
      refetchMenu();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to delete item", "danger");
    }
  };

  const handleDownloadCsv = async () => {
    if (csvDownloading) return;
    setCsvDownloading(true);
    try {
      const tickets = await ticketsApi.exportSearch();
      downloadTicketCsv(tickets);
      showToast(`CSV ready — ${tickets.length} ticket(s) exported.`, "success");
    } catch (err: any) {
      showToast(
        err.response?.data?.error ||
          "Could not prepare the CSV. Please try again.",
        "danger",
      );
    } finally {
      setCsvDownloading(false);
    }
  };

  const closeEditor = () => {
    setEditorMode(null);
    setEditingEvent(null);
    refetchEvents();
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto overflow-x-hidden space-y-6 animate-fade-in text-left pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[var(--color-hairline)]/70">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-[1.75rem] font-semibold text-[var(--color-ink)] tracking-tight leading-none">
              Admin
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-success-bg)] text-[var(--color-success)] text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />{" "}
              Live
            </span>
          </div>
          <p className="text-sm text-[var(--color-muted)] mt-1.5">
            Revenue, approvals, events, staff, and menu.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:shrink-0">
          <Button
            onClick={handleDownloadCsv}
            variant="secondary"
            size="sm"
            isLoading={csvDownloading}
            className="w-full sm:w-auto"
            title="Download all tickets as CSV"
          >
            {!csvDownloading && <Download className="w-4 h-4 mr-1.5" />} CSV
          </Button>
          <Button
            onClick={() => {
              setEditingEvent(null);
              setEditorMode("create");
            }}
            size="sm"
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Event
          </Button>
          <Button
            onClick={() => setShowStaffModal(true)}
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
          >
            <UserPlus className="w-4 h-4 mr-1.5" /> Staff
          </Button>
          <button
            type="button"
            onClick={refreshAll}
            className="hidden sm:inline-flex w-10 h-10 rounded-full shrink-0 bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] items-center justify-center transition-[background-color,color,border-color] duration-150 cursor-pointer"
            aria-label="Refresh all data"
            title="Refresh all data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Socket Feed Bar */}
      {liveMessages.length > 0 && (
        <div className="px-3.5 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 flex items-center justify-between gap-3 text-sm animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[var(--color-muted)] shrink-0">Activity</span>
            <span className="text-[var(--color-hairline)]" aria-hidden>
              ·
            </span>
            <span className="text-[var(--color-ink)] truncate">
              {liveMessages[0]}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLiveMessages([])}
            className="p-1 rounded-md text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors duration-150 cursor-pointer shrink-0"
            aria-label="Dismiss live activity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {editorMode === "create" || (editorMode === "edit" && editingEvent) ? (
        <React.Suspense
          fallback={
            <div className="h-64 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/60 animate-pulse" />
          }
        >
          <EventEditor
            event={editorMode === "edit" ? editingEvent || undefined : undefined}
            onDone={closeEditor}
          />
        </React.Suspense>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[216px_minmax(0,1fr)] gap-6 items-start">
          {/* Desktop Sticky Sidebar */}
          <aside className="hidden lg:block lg:sticky lg:top-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 p-2 shadow-[0_1px_2px_rgba(64,16,33,0.03)]">
            <p className="px-3 pt-1.5 pb-2 text-[11px] font-medium text-[var(--color-muted)]">
              Sections
            </p>
            <nav className="flex flex-col gap-1" aria-label="Admin sections">
              {sections.map(({ key, label, icon: Icon, to }) => {
                const count = sectionCounts[key];
                const isActive = activeTab === key;
                const isUrgent = key === "bookings" && (count || 0) > 0;
                return (
                  <Link
                    key={key}
                    to={to}
                    aria-current={isActive ? "page" : undefined}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-sm flex items-center justify-between gap-2.5 transition-[background-color,color,border-color] duration-150 ease-[var(--ease-out)] ${
                      isActive
                        ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] font-semibold border border-[var(--color-brand)]/15"
                        : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] font-medium border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </span>
                    {count !== undefined && count > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums shrink-0 ${
                          isActive
                            ? "bg-[var(--color-brand)]/12 text-[var(--color-brand)]"
                            : isUrgent
                              ? "bg-[var(--color-brand)] text-[var(--color-brand-text)]"
                              : "bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 text-[var(--color-muted)]"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content Area */}
          <div className="min-w-0 space-y-6">
            {/* Mobile Breadcrumb & Refresh Bar (No horizontal scroll) */}
            <nav
              aria-label="Breadcrumb"
              className="lg:hidden rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 px-3.5 py-2.5 shadow-[0_1px_2px_rgba(64,16,33,0.03)] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5 text-sm min-w-0">
                <span className="text-[var(--color-muted)] shrink-0">Admin</span>
                <ChevronRight className="w-4 h-4 shrink-0 text-[var(--color-muted)]" />
                <span className="font-semibold text-[var(--color-ink)] truncate">
                  {sections.find((s) => s.key === activeTab)?.label || "Overview"}
                </span>
              </div>
              <button
                type="button"
                onClick={refreshAll}
                aria-label="Refresh all data"
                title="Refresh all data"
                className="w-9 h-9 rounded-full shrink-0 bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)] inline-flex items-center justify-center transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.96] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </nav>

            {activeTab === "overview" && <AdminOverview />}

            {/* Pending UTR Verification Queue */}
            {activeTab === "bookings" && (
              <div className="space-y-6">
                <SectionIntro
                  title="Payments Awaiting Approval"
                  subtitle="Only bookings with submitted UTR/payment reference appear here. Incomplete attempts are in Leads."
                  count={pendingBookings.length}
                />

                {/* Pass Preview Area */}
                <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/80 p-4 sm:p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[var(--color-muted)]">
                        Pass preview
                      </p>
                      <h3 className="text-sm font-semibold text-[var(--color-ink)] mt-0.5 truncate">
                        {approvedTicket
                          ? "Confirmed ticket — ready to share"
                          : pendingApproval
                            ? `Confirming ${pendingApproval.guest}'s ticket`
                            : "Approve a payment below to generate the ticket"}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          approvedTicket
                            ? "bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30"
                            : "bg-[var(--color-brand)]/15 text-[var(--color-brand)] border border-[var(--color-brand)]/30"
                        }`}
                      >
                        {approvedTicket
                          ? "Confirmed"
                          : pendingApproval
                            ? "Confirming"
                            : "Waiting"}
                      </span>
                      {approvedTicket && (
                        <button
                          type="button"
                          onClick={() => {
                            setApprovedTicket(null);
                            setPendingApproval(null);
                          }}
                          className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
                          aria-label="Close pass preview"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {approvedTicket ? (
                    <div className="space-y-3">
                      <TicketPassCard
                        ticket={approvedTicket}
                        adminActions
                        whatsappPhone={approvedPhone}
                        waSent={approvedTicket.is_whatsapp_sent}
                        markWaSentLoading={markWaSentMutation.isPending}
                        onMarkWaSent={async () => {
                          try {
                            await markWaSentMutation.mutateAsync(approvedTicket.id);
                            setApprovedTicket(
                              (prev) => prev && { ...prev, is_whatsapp_sent: true },
                            );
                            showToast("Marked as sent on WhatsApp.", "success");
                          } catch (err: any) {
                            showToast(
                              err.response?.data?.error ||
                                "Could not update WhatsApp status.",
                              "danger",
                            );
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="relative rounded-xl border border-dashed border-[var(--color-hairline)] bg-[var(--color-canvas)]/60 py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
                      <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] shadow-sm">
                        <Radio className="w-5 h-5 text-[var(--color-brand)] animate-pulse" />
                      </div>
                      <p className="text-xs text-[var(--color-muted)] max-w-md">
                        {pendingApproval
                          ? `${formatCurrencyINR(pendingApproval.amount)} payment is being verified. The ticket will appear here automatically.`
                          : "Download PNG, copy details, and WhatsApp share options appear here once you approve a payment."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Queue Grid */}
                {pendingBookings.length === 0 ? (
                  <Card className="py-14 px-6 text-center border-dashed border-[var(--color-hairline)]/80 flex flex-col items-center justify-center">
                    <div className="w-11 h-11 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/70 flex items-center justify-center text-[var(--color-muted)] mb-3">
                      <Inbox className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      No payments waiting
                    </p>
                    <p className="text-sm text-[var(--color-muted)] mt-1 max-w-sm">
                      New payment references will appear here for review.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {pendingBookings.map((b: any) => (
                      <div
                        key={b.id || b.booking_id}
                        className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 overflow-hidden transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-[var(--color-brand)]/35 hover:shadow-[0_8px_24px_rgba(64,16,33,0.05)] shadow-[0_1px_2px_rgba(64,16,33,0.03)] flex flex-col justify-between"
                      >
                        <div className="p-5 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold font-mono text-[var(--color-brand)] uppercase tracking-wider block">
                                #{String(b.id || b.booking_id).substring(0, 8)}
                              </span>
                              <h4 className="font-bold text-[var(--color-ink)] text-base mt-0.5 truncate">
                                {leadGuestName(b)}
                              </h4>
                              <p className="text-xs text-[var(--color-muted)] num">
                                {b.contact_phone || b.phone || "No phone"}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-[var(--color-brand)]/15 border border-[var(--color-brand)]/30 text-[var(--color-brand)] font-bold text-xs num shrink-0">
                              {formatCurrencyINR(
                                b.total_amount || b.expected_amount || 0,
                              )}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/70 space-y-2 text-xs">
                            <InfoRow
                              label="Ticket type"
                              value={b.category_name || "General"}
                            />
                            <InfoRow
                              label="Payment reference"
                              value={
                                b.upi_transaction_id ||
                                b.upi_txn_id ||
                                "Not submitted"
                              }
                              mono
                            />
                            <InfoRow
                              label="Submitted"
                              value={formatDateTime(b.created_at)}
                            />
                          </div>
                        </div>

                        <div className="px-5 py-3.5 bg-[var(--color-canvas)]/50 border-t border-[var(--color-hairline)]/60 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleVerify(
                                b.id || b.booking_id,
                                "APPROVE",
                                b.contact_phone || b.phone,
                                b.ticket_id,
                                leadGuestName(b),
                                b.total_amount || b.expected_amount,
                              )
                            }
                            isLoading={verifyBookingMutation.isPending}
                            className="flex-1 bg-[var(--color-success)] text-black hover:opacity-90 font-bold text-xs whitespace-nowrap"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              handleVerify(b.id || b.booking_id, "REJECT")
                            }
                            isLoading={verifyBookingMutation.isPending}
                            className="px-3"
                            title="Reject booking"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Ticket Finder */}
            {activeTab === "tickets" && (
              <div className="space-y-5">
                <SectionIntro
                  title="Find Tickets"
                  subtitle="Search by phone number, guest name, or payment reference. Leave blank to view the latest 10."
                  count={adminTicketSearch.data?.tickets.length || 0}
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      isLoading={csvDownloading}
                      onClick={handleDownloadCsv}
                    >
                      Export CSV
                    </Button>
                  }
                />

                {/* Framed Search Toolbar */}
                <form
                  className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setTicketCursor("");
                    setTicketSearch(ticketQuery.trim());
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <Input
                      value={ticketQuery}
                      onChange={(event) => setTicketQuery(event.target.value)}
                      placeholder="Phone, guest name, or payment reference..."
                      aria-label="Search tickets"
                    />
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-xs font-semibold text-[var(--color-ink)] whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={waPending}
                        onChange={(event) => {
                          setWaPending(event.target.checked);
                          setTicketCursor("");
                          setTicketSearch(ticketQuery.trim());
                        }}
                        className="accent-[var(--color-brand)]"
                      />
                      WA pending only
                    </label>
                    <Button
                      type="submit"
                      isLoading={adminTicketSearch.isFetching}
                      className="h-10 px-5"
                    >
                      <Search className="w-4 h-4 mr-1.5" />
                      Search
                    </Button>
                  </div>
                </form>

                {adminTicketSearch.isError && (
                  <p className="text-sm font-semibold text-[var(--color-danger)]">
                    Ticket search failed. Please try again.
                  </p>
                )}

                {approvedTicket && (
                  <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/80 p-4 sm:p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] font-medium text-[var(--color-muted)]">
                        Selected ticket — download, copy, WhatsApp, or mark sent
                      </p>
                      <button
                        type="button"
                        onClick={() => setApprovedTicket(null)}
                        className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
                        aria-label="Close selected ticket"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <TicketPassCard
                      ticket={approvedTicket}
                      adminActions
                      whatsappPhone={approvedPhone}
                      waSent={approvedTicket.is_whatsapp_sent}
                      markWaSentLoading={markWaSentMutation.isPending}
                      onMarkWaSent={async () => {
                        try {
                          await markWaSentMutation.mutateAsync(approvedTicket.id);
                          setApprovedTicket(
                            (prev) => prev && { ...prev, is_whatsapp_sent: true },
                          );
                          showToast("Marked as sent on WhatsApp.", "success");
                        } catch (err: any) {
                          showToast(
                            err.response?.data?.error ||
                              "Could not update WhatsApp status.",
                            "danger",
                          );
                        }
                      }}
                    />
                  </div>
                )}

                {!adminTicketSearch.isFetching &&
                (adminTicketSearch.data?.tickets.length || 0) === 0 ? (
                  <Card className="py-14 px-6 text-center border-dashed border-[var(--color-hairline)]/80 flex flex-col items-center justify-center">
                    <div className="w-11 h-11 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/70 flex items-center justify-center text-[var(--color-muted)] mb-3">
                      <Search className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      No tickets found
                    </p>
                    <p className="text-sm text-[var(--color-muted)] mt-1 max-w-sm">
                      Try a phone number, guest name, or payment reference.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {(adminTicketSearch.data?.tickets || []).map((ticket) => {
                        const isSelected = approvedTicket?.id === ticket.id;
                        return (
                          <button
                            type="button"
                            key={ticket.id}
                            onClick={() => {
                              setApprovedPhone(ticket.contact_phone || "");
                              setApprovedTicket(ticket);
                            }}
                            className={`rounded-2xl bg-[var(--color-surface)] border p-4 text-left transition-all shadow-sm cursor-pointer flex flex-col justify-between gap-3 ${
                              isSelected
                                ? "border-[var(--color-brand)]/50 bg-[var(--color-brand)]/[0.03]"
                                : "border-[var(--color-hairline)]/70 hover:border-[var(--color-brand)]/35"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-medium text-[var(--color-muted)] font-mono">
                                  #{ticket.id.substring(0, 8)}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                                    ticket.is_whatsapp_sent
                                      ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                                      : "bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-muted)]"
                                  }`}
                                >
                                  {ticket.is_whatsapp_sent
                                    ? "WA sent"
                                    : "WA pending"}
                                </span>
                              </div>

                              <p className="font-bold text-[var(--color-ink)] text-sm mt-1.5 truncate">
                                {ticket.primary_guest_name || "Guest"}
                              </p>
                              <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">
                                {ticket.event_title} &bull;{" "}
                                {ticket.category_name}
                              </p>
                              <p className="text-[11px] text-[var(--color-muted)] mt-1.5">
                                {ticketCategoryBreakdown(ticket) ||
                                  "Individual ticket"}
                                {ticket.free_tequila_eligible_count > 0 &&
                                  ` · ${ticket.free_tequila_redeemed_count}/${ticket.free_tequila_eligible_count} shots`}
                              </p>
                            </div>

                            <div className="pt-2.5 border-t border-[var(--color-hairline)]/60 flex items-center justify-between gap-3">
                              <span className="text-[11px] font-semibold text-[var(--color-ink)] num">
                                {ticket.attendee_count}{" "}
                                {pluralize(ticket.attendee_count, "ticket")}
                              </span>
                              <span className="font-mono text-xs font-bold text-[var(--color-brand)]">
                                {ticket.bar_code || "No barcode"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {adminTicketSearch.data?.hasMore && (
                      <div className="flex justify-center">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setTicketCursor(
                              adminTicketSearch.data?.nextCursor || "",
                            )
                          }
                          isLoading={adminTicketSearch.isFetching}
                        >
                          Load next 10
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Events */}
            {activeTab === "events" && (
              <div className="space-y-5">
                <SectionIntro
                  title="Events"
                  subtitle="Create, edit, publish, and archive events."
                  count={events?.length || 0}
                  action={
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingEvent(null);
                        setEditorMode("create");
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> New Event
                    </Button>
                  }
                />

                {!events || events.length === 0 ? (
                  <Card className="py-14 px-6 text-center border-dashed border-[var(--color-hairline)]/80 flex flex-col items-center justify-center">
                    <div className="w-11 h-11 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/70 flex items-center justify-center text-[var(--color-muted)] mb-3">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      No events yet
                    </p>
                    <p className="text-sm text-[var(--color-muted)] mt-1 max-w-sm mb-4">
                      Create an event to start selling tickets and tables.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingEvent(null);
                        setEditorMode("create");
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      New Event
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 overflow-hidden transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-[var(--color-brand)]/35 hover:shadow-[0_8px_24px_rgba(64,16,33,0.05)] shadow-[0_1px_2px_rgba(64,16,33,0.03)] flex flex-col justify-between"
                      >
                        <div className="p-5 space-y-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <span className="px-2 py-0.5 rounded-md bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[10px] font-bold text-[var(--color-brand)] uppercase tracking-wider">
                              {formatLabel(ev.status)}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-hover)] text-[var(--color-ink)] text-[10px] font-bold num">
                              {ev.ticketTiers?.length || 0}{" "}
                              {pluralize(
                                ev.ticketTiers?.length || 0,
                                "ticket option",
                              )}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-bold text-[var(--color-ink)] text-base leading-snug line-clamp-1">
                              {ev.title}
                            </h3>
                            <p className="text-xs text-[var(--color-muted)] mt-1 line-clamp-2">
                              {ev.description || "No description provided."}
                            </p>
                          </div>

                          <div className="space-y-1.5 pt-1 text-xs text-[var(--color-muted)]">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
                              <span className="num truncate">
                                {formatDateTime(ev.startsAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
                              <span className="truncate">
                                {ev.venue?.name || "Venue"}
                                {ev.locationArea ? `, ${ev.locationArea}` : ""}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 py-3.5 bg-[var(--color-canvas)]/50 border-t border-[var(--color-hairline)]/60 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[var(--color-muted)] num">
                            {ev.artists?.length || 0} artists
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEvent(ev);
                                setEditorMode("edit");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[var(--color-brand)] text-[var(--color-brand-text)] font-bold text-xs hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev)}
                              className="p-1.5 rounded-lg bg-[var(--color-danger)]/15 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/25 transition-colors cursor-pointer"
                              title="Archive event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Staff Accounts */}
            {activeTab === "staff" && (
              <div className="space-y-5">
                <SectionIntro
                  title="Staff Accounts"
                  subtitle="Manage gate staff, bar staff, and administrators."
                  count={staffList?.length || 0}
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowStaffModal(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-1.5" /> Add Staff
                    </Button>
                  }
                />

                <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/80 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-[var(--color-canvas)] border-b border-[var(--color-hairline)] text-[11px] text-[var(--color-muted)]">
                        <tr>
                          <th className="px-4 py-3.5 font-medium text-left">
                            Username
                          </th>
                          <th className="px-4 py-3.5 font-medium text-left">
                            Role
                          </th>
                          <th className="px-4 py-3.5 font-medium text-left">
                            Status
                          </th>
                          <th className="px-4 py-3.5 font-medium text-left">
                            Created
                          </th>
                          <th className="px-4 py-3.5 font-medium text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-hairline)]/70">
                        {staffList?.map((staff) => (
                          <tr
                            key={staff.id}
                            className="hover:bg-[var(--color-surface-hover)]/60 transition-colors"
                          >
                            <td className="px-4 py-3.5 font-medium text-[var(--color-ink)]">
                              @{staff.username}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-ink)]">
                                {formatLabel(staff.role)}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  staff.is_active
                                    ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                                    : "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    staff.is_active
                                      ? "bg-[var(--color-success)]"
                                      : "bg-[var(--color-danger)]"
                                  }`}
                                />
                                {staff.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-[var(--color-muted)] num">
                              {formatDateTime(staff.created_at)}
                            </td>
                            <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStaffId(staff.id);
                                  setShowPasswordModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-ink)] hover:border-[var(--color-brand)] text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <KeyRound className="w-3 h-3" /> Change password
                              </button>
                              {staff.is_active && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeactivateStaff(
                                      staff.id,
                                      staff.username,
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-[var(--color-danger)]/15 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/25 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  Deactivate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* F&B Menu */}
            {activeTab === "menu" && (
              <div className="space-y-5">
                <SectionIntro
                  title="Menu"
                  subtitle="Items guests can buy with bar credit."
                  count={menuItems?.length || 0}
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openMenuEditor()}
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Add Item
                    </Button>
                  }
                />

                {/* Category Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(["ALL", "DRINK", "FOOD"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMenuCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        menuCategoryFilter === cat
                          ? "bg-[var(--color-brand)] text-[var(--color-brand-text)]"
                          : "bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      {cat === "ALL"
                        ? "All Items"
                        : cat === "DRINK"
                          ? "Drinks"
                          : "Food"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-[var(--color-brand)]/35 hover:shadow-[0_8px_24px_rgba(64,16,33,0.05)] shadow-[0_1px_2px_rgba(64,16,33,0.03)] flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-[var(--color-ink)] text-sm leading-snug">
                            {item.name}
                          </h4>
                          <span className="px-1.5 py-0.5 rounded bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[var(--color-muted)] text-[10px] uppercase font-bold shrink-0">
                            {formatLabel(item.category)}
                          </span>
                        </div>
                        {(item.serving_label || item.description) && (
                          <p className="text-xs text-[var(--color-muted)] mt-1.5 line-clamp-2">
                            {item.serving_label || item.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[var(--color-hairline)]/60 flex justify-between items-center gap-2">
                        <span className="font-bold text-[var(--color-brand)] num text-sm">
                          {formatCurrencyINR(
                            item.unit_price || item.price || 0,
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openMenuEditor(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-brand)] text-[var(--color-brand-text)] text-xs font-bold hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteMenuItem(item.id, item.name)
                            }
                            className="p-1.5 rounded-lg bg-[var(--color-danger)]/15 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/25 transition-colors cursor-pointer"
                            title={`Remove ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "leads" && (
              <React.Suspense fallback={<div className="text-[var(--color-muted)]">Loading leads...</div>}>
                <AdminLeads />
              </React.Suspense>
            )}

            {/* Help Requests */}
            {activeTab === "help" && (
              <div className="space-y-5">
                <SectionIntro
                  title="Help Requests"
                  subtitle="Messages submitted from the Help page, newest first."
                  count={helpMessages.data?.length || 0}
                  action={
                    <div
                      role="tablist"
                      aria-label="Filter help requests"
                      className="relative grid grid-cols-2 p-1 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] w-full sm:w-56"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[var(--color-brand)] shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                          helpResolved ? "translate-x-full" : "translate-x-0"
                        }`}
                      />
                      <button
                        type="button"
                        role="tab"
                        aria-selected={!helpResolved}
                        onClick={() => setHelpResolved(false)}
                        className={`relative z-10 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer ${
                          !helpResolved
                            ? "text-[var(--color-brand-text)]"
                            : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                        }`}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={helpResolved}
                        onClick={() => setHelpResolved(true)}
                        className={`relative z-10 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer ${
                          helpResolved
                            ? "text-[var(--color-brand-text)]"
                            : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                        }`}
                      >
                        Resolved
                      </button>
                    </div>
                  }
                />

                {helpMessages.isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-32 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/60 animate-pulse"
                      />
                    ))}
                  </div>
                ) : !helpMessages.data?.length ? (
                  <Card className="py-14 px-6 text-center border-dashed border-[var(--color-hairline)]/80 flex flex-col items-center justify-center">
                    <div className="w-11 h-11 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/70 flex items-center justify-center text-[var(--color-muted)] mb-3">
                      <Inbox className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      No {helpResolved ? "resolved" : "open"} requests
                    </p>
                    <p className="text-sm text-[var(--color-muted)] mt-1">
                      Help messages from guests will appear here.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {helpMessages.data.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/80 overflow-hidden shadow-sm flex flex-col justify-between"
                      >
                        <div className="p-5 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[var(--color-ink)] truncate">
                                {message.name}
                              </p>
                              <p className="text-xs text-[var(--color-brand)] font-mono mt-0.5">
                                {message.phone}
                              </p>
                            </div>
                            <span className="text-[10px] text-[var(--color-muted)] num shrink-0">
                              {formatDateTime(message.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap break-words">
                            {message.message}
                          </p>
                        </div>

                        <div className="px-5 py-3 bg-[var(--color-canvas)]/50 border-t border-[var(--color-hairline)]/60 flex items-center justify-end">
                          {message.is_resolved ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-success)]">
                              <Check className="w-3.5 h-3.5" /> Resolved
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              isLoading={resolveHelp.isPending}
                              onClick={async () => {
                                try {
                                  await resolveHelp.mutateAsync(message.id);
                                  showToast(
                                    "Help request marked as resolved.",
                                    "success",
                                  );
                                } catch (err: any) {
                                  showToast(
                                    err.response?.data?.error ||
                                      "Could not resolve the request.",
                                    "danger",
                                  );
                                }
                              }}
                            >
                              Mark as resolved
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      <Modal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        title="Create Staff Account"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
          <Input
            label="Username"
            value={newStaffUsername}
            onChange={(e) => setNewStaffUsername(e.target.value)}
            required
          />
          <Input
            label="Initial Password"
            type="password"
            value={newStaffPassword}
            onChange={(e) => setNewStaffPassword(e.target.value)}
            required
          />
          <Select
            label="Role"
            value={newStaffRole}
            onChange={(e) =>
              setNewStaffRole(
                e.target.value as "ADMIN" | "SCANNER" | "BARTENDER",
              )
            }
            options={[
              { value: "SCANNER", label: "Gate scanner — Entry check-ins" },
              { value: "BARTENDER", label: "Bartender — Bar orders" },
              { value: "ADMIN", label: "Admin — Full access" },
            ]}
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-hairline)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowStaffModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createStaffMutation.isPending}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Update Staff Password"
      >
        <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
          <p className="text-xs text-[var(--color-muted)]">
            Changing the password will sign out this account on all devices.
          </p>
          <Input
            label="New Password"
            type="password"
            value={updatedPasswordValue}
            onChange={(e) => setUpdatedPasswordValue(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-hairline)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={updateStaffPasswordMutation.isPending}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Menu Item Modal */}
      <Modal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        title={editingMenuItemId ? "Edit Menu Item" : "Add Menu Item"}
      >
        <form onSubmit={handleCreateMenuItem} className="space-y-4 text-xs">
          <Input
            label="Item Name"
            value={newMenuItemName}
            onChange={(e) => setNewMenuItemName(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <Select
              label="Category"
              value={newMenuItemCategory}
              onChange={(e) =>
                setNewMenuItemCategory(e.target.value as "DRINK" | "FOOD")
              }
              options={[
                { value: "DRINK", label: "Drink" },
                { value: "FOOD", label: "Food" },
              ]}
            />
            <Input
              type="number"
              label="Unit Price (₹)"
              value={newMenuItemPrice}
              onChange={(e) => setNewMenuItemPrice(Number(e.target.value))}
              required
            />
          </div>
          <Input
            label="Serving size"
            value={newMenuItemServing}
            onChange={(e) => setNewMenuItemServing(e.target.value)}
            placeholder="e.g. 200 ml or 2 pieces"
            hint="Shown to staff and guests. Price is per item."
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-hairline)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowMenuModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={
                createMenuItemMutation.isPending ||
                updateMenuItemMutation.isPending
              }
            >
              {editingMenuItemId ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const SectionIntro: React.FC<{
  title: string;
  subtitle: string;
  count?: number;
  action?: React.ReactNode;
}> = ({ title, subtitle, count, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--color-hairline)]/70">
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        <h2 className="text-lg font-semibold text-[var(--color-ink)] tracking-tight">
          {title}
        </h2>
        {count !== undefined && (
          <span className="px-2 py-0.5 rounded-md bg-[var(--color-canvas)] border border-[var(--color-hairline)]/70 text-[var(--color-muted)] text-xs font-medium tabular-nums">
            {count}
          </span>
        )}
      </div>
      <p className="text-sm text-[var(--color-muted)] mt-0.5">{subtitle}</p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex justify-between gap-3">
    <span className="text-[var(--color-muted)] shrink-0">{label}</span>
    <span
      className={`font-semibold text-[var(--color-ink)] truncate ${
        mono ? "font-mono text-[var(--color-brand)]" : ""
      }`}
    >
      {value}
    </span>
  </div>
);