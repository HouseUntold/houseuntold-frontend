import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Eye,
  KeyRound,
  LayoutDashboard,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../../../components/ui/Button";
import {
  type CreateEventForm,
  CreateEventFormSchema,
  type CreateStaffUserInput,
  CreateStaffUserInputSchema,
} from "../../../lib/api/schemas";
import type { AdminMfaEnrollmentResponse } from "../../../lib/api/types";
import { formatINR } from "../../../lib/domain/rules";
import { SPRING_SPATIAL } from "../../../lib/motion/variants";
import { useAdmin } from "../hooks/useAdmin";

interface AdminDashboardViewProps {
  onInspectSeatMap: (eventId: string) => void;
  onNotify: (title: string, tone: "success" | "error" | "info") => void;
}

type AdminView = "overview" | "events" | "staff" | "security";

const NAV_ITEMS: Array<{
  key: AdminView;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  { key: "overview", label: "Overview", hint: "Live metrics", Icon: LayoutDashboard },
  { key: "events", label: "Event Catalog", hint: "Inventory & box office", Icon: Calendar },
  { key: "staff", label: "Team Directory", hint: "Gate & bar staff", Icon: Users },
  { key: "security", label: "Security & MFA", hint: "Authenticator TOTP", Icon: ShieldCheck },
];

const VIEW_META: Record<
  AdminView,
  { eyebrow: string; title: string; description: string }
> = {
  overview: {
    eyebrow: "Shift Manager · Live",
    title: "Operations Overview",
    description: "Real-time seat inventory, revenue, and gate admissions across all active venues.",
  },
  events: {
    eyebrow: "Inventory · Box Office",
    title: "Event Catalog",
    description: "Publish, pause, and inspect live seat maps for every event in the season.",
  },
  staff: {
    eyebrow: "Access · Credentials",
    title: "Team Directory",
    description: "Provision login IDs for gatekeepers and bartenders on shift.",
  },
  security: {
    eyebrow: "Compliance · MFA",
    title: "Security & Authenticator",
    description: "Enroll a TOTP authenticator app for admin sign-in.",
  },
};

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onInspectSeatMap,
  onNotify,
}) => {
  const { stats, events, staffUsers, updateStatus, createEvent, createStaff, enrollMfa } = useAdmin();
  const [view, setView] = useState<AdminView>("overview");
  const [search, setSearch] = useState("");
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<
    {
      name: string;
      email: string;
      password: string;
      role: "SCANNER" | "BARTENDER";
    } | null
  >(null);
  const [mfaEnrollment, setMfaEnrollment] = useState<AdminMfaEnrollmentResponse | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEventForm>({
    resolver: zodResolver(CreateEventFormSchema),
    defaultValues: {
      title: "NCPA Jazz & Brass Quartet",
      subtitle: "An intimate evening of acoustic jazz and brass improvisation in South Mumbai.",
      category: "Live Music",
      venueName: "Tata Theatre, NCPA",
      dateLabel: "Sat, 13 Dec 2026",
      timeLabel: "19:30 IST",
      layoutType: "PROSCENIUM",
      vipPrice: 2000,
      generalPrice: 1100,
    },
  });

  const staffForm = useForm<CreateStaffUserInput>({
    resolver: zodResolver(CreateStaffUserInputSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "SCANNER",
    },
  });

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q)
        || e.venueName.toLowerCase().includes(q)
        || e.category.toLowerCase().includes(q),
    );
  }, [events, search]);

  const handleCreateSubmit = async (values: CreateEventForm) => {
    try {
      const created = await createEvent.mutateAsync(values);
      onNotify(`Published "${created.title}" with 24 live seats.`, "success");
      reset();
      setShowCreateEvent(false);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Could not create event", "error");
    }
  };

  const handleCreateStaffSubmit = async (values: CreateStaffUserInput) => {
    try {
      const created = await createStaff.mutateAsync(values);
      setIssuedCredentials({
        name: created.name,
        email: created.email,
        password: values.password,
        role: created.role,
      });
      staffForm.reset();
      setShowCreateStaff(false);
      onNotify(`Provisioned ${created.role} credentials for ${created.name}.`, "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Could not create staff ID", "error");
    }
  };

  const handleMfaEnroll = async () => {
    try {
      const res = await enrollMfa.mutateAsync();
      setCopiedSecret(false);
      setMfaEnrollment(res);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "MFA enrollment failed", "error");
    }
  };

  const currentMeta = VIEW_META[view];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Sidebar */}
        <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[248px]">
          <div className="rounded-[16px] border border-[#E7E5E0] bg-white p-2 shadow-sm">
            <div className="px-3 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#5C6570]">
                Workspace
              </div>
              <div className="mt-1 text-[14px] font-semibold text-[#0F1419]">
                Royal Opera House
              </div>
              <div className="text-[12px] text-[#5C6570]">Mumbai · Shift Manager</div>
            </div>

            <div className="mx-2 h-px bg-[#E7E5E0]" />

            <nav className="mt-2 space-y-0.5">
              {NAV_ITEMS.map(({ key, label, hint, Icon }) => {
                const isActive = view === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key)}
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex w-full items-start gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "bg-[#2D2A6E]/[0.08]"
                        : "hover:bg-[#FAFAF7]"
                    }`}
                  >
                    <Icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isActive ? "text-[#2D2A6E]" : "text-[#5C6570] group-hover:text-[#0F1419]"
                      }`}
                      strokeWidth={1.9}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[13px] font-semibold ${isActive ? "text-[#0F1419]" : "text-[#0F1419]/90"}`}
                      >
                        {label}
                      </div>
                      <div className="truncate text-[11px] text-[#5C6570]">{hint}</div>
                    </div>
                    {isActive && (
                      <ChevronRight
                        className="mt-1 h-3.5 w-3.5 shrink-0 text-[#2D2A6E]"
                        strokeWidth={2.5}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-3 hidden rounded-[14px] border border-[#E7E5E0] bg-white p-4 lg:block">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#5C6570]">
              Signed in as
            </div>
            <div className="mt-1 text-[13px] font-semibold text-[#0F1419]">Shift Manager</div>
            <div className="mt-0.5 text-[11.5px] text-[#5C6570]">
              Full venue operations access
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 space-y-6 pb-16">
          {/* Header */}
          <header className="flex flex-col gap-4 border-b border-[#E7E5E0] pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#5C6570]">
                {currentMeta.eyebrow}
              </div>
              <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-[#0F1419]">
                {currentMeta.title}
              </h1>
              <p className="mt-1 max-w-xl text-[13px] text-[#5C6570]">
                {currentMeta.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {view === "events" && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowCreateEvent((s) => !s)}
                >
                  <Plus className="h-4 w-4" strokeWidth={1.9} />
                  <span>{showCreateEvent ? "Close Form" : "New Event"}</span>
                </Button>
              )}
              {view === "staff" && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowCreateStaff((s) => !s)}
                >
                  <UserPlus className="h-4 w-4" strokeWidth={1.9} />
                  <span>{showCreateStaff ? "Close Form" : "Add Staff ID"}</span>
                </Button>
              )}
              {view === "security" && !mfaEnrollment && (
                <Button
                  variant="primary"
                  size="md"
                  isLoading={enrollMfa.isPending}
                  onClick={handleMfaEnroll}
                >
                  <ShieldCheck className="h-4 w-4" strokeWidth={1.9} />
                  <span>Enable Authenticator</span>
                </Button>
              )}
              {view === "overview" && (
                <>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setView("staff")}
                  >
                    <UserPlus className="h-4 w-4 text-[#2D2A6E]" strokeWidth={1.9} />
                    <span>Add Staff</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setView("events");
                      setShowCreateEvent(true);
                    }}
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.9} />
                    <span>New Event</span>
                  </Button>
                </>
              )}
            </div>
          </header>

          {/* Issued credentials banner */}
          <AnimatePresence>
            {issuedCredentials && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={SPRING_SPATIAL}
                className="flex flex-col gap-4 rounded-[14px] border border-[#0F766E]/35 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <KeyRound className="h-4 w-4 text-[#0F766E]" strokeWidth={1.9} />
                    <span className="text-[13.5px] font-semibold text-[#0F1419]">
                      Credentials ready for {issuedCredentials.name}
                    </span>
                    <span className="num rounded-[6px] bg-[#CCFBF1] px-2 py-0.5 text-[11px] font-semibold text-[#0F766E]">
                      {issuedCredentials.role}
                    </span>
                  </div>
                  <div className="num text-[12.5px] text-[#5C6570]">
                    ID: <strong className="text-[#0F1419]">{issuedCredentials.email}</strong>{" "}
                    <span className="mx-1 text-[#E7E5E0]">·</span> Password:{" "}
                    <strong className="text-[#0F1419]">{issuedCredentials.password}</strong>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const text =
                        `House Untold Login\nID: ${issuedCredentials.email}\nPassword: ${issuedCredentials.password}`;
                      if (navigator?.clipboard?.writeText) {
                        void navigator.clipboard.writeText(text);
                      }
                      onNotify("Staff credentials copied to clipboard.", "success");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.9} />
                    <span>Copy</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => setIssuedCredentials(null)}
                    className="rounded-[8px] p-1.5 text-[#5C6570] transition-colors hover:text-[#0F1419]"
                    aria-label="Dismiss credentials banner"
                  >
                    <X className="h-4 w-4" strokeWidth={1.9} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---------- OVERVIEW ---------- */}
          {view === "overview" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING_SPATIAL}
              className="space-y-6"
            >
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Active Events"
                  value={String(stats?.activeEvents ?? 0)}
                  hint="On sale across Mumbai"
                  Icon={Calendar}
                />
                <KpiCard
                  label="Seats Booked"
                  value={`${stats?.seatsBooked ?? 0}`}
                  suffix={`/ ${stats?.totalSeatsCapacity ?? 0}`}
                  hint="Live inventory"
                  hintTone="success"
                  Icon={Users}
                />
                <KpiCard
                  label="Gross Revenue"
                  value={formatINR(stats?.grossTicketRevenue ?? 0)}
                  hint="Razorpay verified"
                  Icon={TrendingUp}
                />
                <KpiCard
                  label="Gate Admitted"
                  value={String(stats?.gateAdmittedToday ?? 0)}
                  hint="HMAC-SHA256 check-ins"
                  hintTone="success"
                  Icon={ShieldCheck}
                />
              </section>

              {/* Recent events */}
              <section className="overflow-hidden rounded-[16px] border border-[#E7E5E0] bg-white shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-[#E7E5E0] px-6 py-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#0F1419]">
                      Recent events
                    </h2>
                    <p className="text-[12.5px] text-[#5C6570]">
                      Top {Math.min(3, events.length)} of {events.length} in catalog
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView("events")}
                    className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#2D2A6E] transition-opacity hover:opacity-80"
                  >
                    View all
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
                <div className="divide-y divide-[#E7E5E0]">
                  {events.slice(0, 3).map((evt) => {
                    const pct = Math.min(
                      100,
                      Math.round((evt.bookedSeats / evt.totalSeats) * 100),
                    );
                    return (
                      <div
                        key={evt.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold text-[#0F1419]">
                            {evt.title}
                          </div>
                          <div className="text-[12px] text-[#5C6570]">
                            {evt.venueName} · {evt.dateLabel} · {evt.timeLabel}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="num text-[12.5px] font-semibold text-[#0F1419]">
                              {evt.bookedSeats}/{evt.totalSeats}
                            </div>
                            <div className="text-[11px] text-[#5C6570]">{pct}% sold</div>
                          </div>
                          <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-[#E7E5E0] sm:block">
                            <div
                              className="h-full rounded-full bg-[#2D2A6E]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onInspectSeatMap(evt.id)}
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.9} />
                            <span>Map</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {events.length === 0 && (
                    <div className="px-6 py-10 text-center text-[13px] text-[#5C6570]">
                      No events yet. Create your first event from the Event Catalog.
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {/* ---------- EVENTS ---------- */}
          {view === "events" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING_SPATIAL}
              className="space-y-5"
            >
              {/* Inline create event form */}
              <AnimatePresence initial={false}>
                {showCreateEvent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <form
                      onSubmit={handleSubmit(handleCreateSubmit)}
                      className="rounded-[16px] border border-[#E7E5E0] bg-white p-6 shadow-sm"
                    >
                      <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#E7E5E0] pb-4">
                        <div>
                          <h2 className="text-[16px] font-semibold text-[#0F1419]">
                            Create live event
                          </h2>
                          <p className="text-[12.5px] text-[#5C6570]">
                            Publishing provisions 24 live seats in the selected layout.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCreateEvent(false)}
                          className="rounded-[8px] p-1.5 text-[#5C6570] transition-colors hover:text-[#0F1419]"
                          aria-label="Close create event form"
                        >
                          <X className="h-4 w-4" strokeWidth={1.9} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label="Event Title" error={errors.title?.message}>
                          <input
                            type="text"
                            {...register("title")}
                            className="h-11 w-full rounded-[8px] border border-[#E7E5E0] px-3.5 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                          />
                        </Field>

                        <Field label="Editorial Subtitle" error={errors.subtitle?.message}>
                          <input
                            type="text"
                            {...register("subtitle")}
                            className="h-11 w-full rounded-[8px] border border-[#E7E5E0] px-3.5 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                          />
                        </Field>

                        <Field label="Category">
                          <select
                            {...register("category")}
                            className="h-11 w-full rounded-[8px] border border-[#E7E5E0] bg-white px-3 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                          >
                            <option value="Live Music">Live Music</option>
                            <option value="Stand-up Comedy">Stand-up Comedy</option>
                            <option value="Theater & Plays">Theater &amp; Plays</option>
                            <option value="Lounge Sessions">Lounge Sessions</option>
                          </select>
                        </Field>

                        <Field label="Floor Layout">
                          <select
                            {...register("layoutType")}
                            className="h-11 w-full rounded-[8px] border border-[#E7E5E0] bg-white px-3 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                          >
                            <option value="PROSCENIUM">Proscenium Hall</option>
                            <option value="CLUB">Club &amp; DJ Floor</option>
                          </select>
                        </Field>

                        <Field label="Venue Name">
                          <input
                            type="text"
                            {...register("venueName")}
                            className="h-11 w-full rounded-[8px] border border-[#E7E5E0] px-3.5 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                          />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Date">
                            <input
                              type="text"
                              {...register("dateLabel")}
                              className="num h-11 w-full rounded-[8px] border border-[#E7E5E0] px-3.5 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                            />
                          </Field>
                          <Field label="Time">
                            <input
                              type="text"
                              {...register("timeLabel")}
                              className="num h-11 w-full rounded-[8px] border border-[#E7E5E0] px-3.5 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                            />
                          </Field>
                        </div>

                        <Field label="VIP Price (₹)">
                          <input
                            type="number"
                            {...register("vipPrice", { valueAsNumber: true })}
                            className="num h-11 w-full rounded-[8px] border border-[#E7E5E0] px-3.5 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                          />
                        </Field>

                        <Field label="General Price (₹)">
                          <input
                            type="number"
                            {...register("generalPrice", { valueAsNumber: true })}
                            className="num h-11 w-full rounded-[8px] border border-[#E7E5E0] px-3.5 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                          />
                        </Field>
                      </div>

                      <div className="mt-6 flex justify-end gap-2 border-t border-[#E7E5E0] pt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowCreateEvent(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          isLoading={createEvent.isPending}
                        >
                          Publish Event
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Table card */}
              <section className="overflow-hidden rounded-[16px] border border-[#E7E5E0] bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 border-b border-[#E7E5E0] px-6 py-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#0F1419]">
                      Event catalog &amp; box office
                    </h2>
                    <p className="text-[12.5px] text-[#5C6570]">
                      {filteredEvents.length} of {events.length} events
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6570]"
                      strokeWidth={1.9}
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search event or venue..."
                      aria-label="Search events"
                      className="h-10 w-full rounded-[8px] border border-[#E7E5E0] bg-[#FAFAF7] pl-9 pr-3 text-[13px] focus:border-[#2D2A6E] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#E7E5E0] bg-[#FAFAF7] text-[11px] font-medium uppercase tracking-wider text-[#5C6570]">
                        <th className="px-6 py-3.5">Event &amp; Venue</th>
                        <th className="px-4 py-3.5">Schedule</th>
                        <th className="px-4 py-3.5">Occupancy</th>
                        <th className="px-4 py-3.5 text-right">Revenue</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E5E0] text-[14px]">
                      {filteredEvents.map((evt) => {
                        const pct = Math.min(
                          100,
                          Math.round((evt.bookedSeats / evt.totalSeats) * 100),
                        );
                        const isLive = evt.status === "ON_SALE" || evt.status === "ALMOST_FULL";
                        return (
                          <tr
                            key={evt.id}
                            className="transition-colors hover:bg-[#FAFAF7]/70"
                          >
                            <td className="px-6 py-4">
                              <div className="font-semibold text-[#0F1419]">
                                {evt.title}
                              </div>
                              <div className="mt-0.5 text-[12px] text-[#5C6570]">
                                {evt.venueName} · {evt.category}
                              </div>
                            </td>
                            <td className="num whitespace-nowrap px-4 py-4 text-[13px] text-[#0F1419]">
                              {evt.dateLabel}
                              <div className="text-[12px] text-[#5C6570]">
                                {evt.timeLabel}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="num text-[13px] font-medium text-[#0F1419]">
                                {evt.bookedSeats} / {evt.totalSeats} <span className="text-[#5C6570]">({pct}%)</span>
                              </div>
                              <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-[#E7E5E0]">
                                <div
                                  className="h-full rounded-full bg-[#2D2A6E]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="num whitespace-nowrap px-4 py-4 text-right font-semibold text-[#0F1419]">
                              {formatINR(evt.grossRevenue)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <span
                                className={`num inline-flex items-center rounded-[6px] px-2.5 py-1 text-[11px] font-semibold ${
                                  isLive
                                    ? "bg-[#DCFCE7] text-[#16A34A]"
                                    : "bg-[#E7E5E0] text-[#5C6570]"
                                }`}
                              >
                                {evt.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => onInspectSeatMap(evt.id)}
                                >
                                  <Eye className="h-3.5 w-3.5" strokeWidth={1.9} />
                                  <span>Seat Map</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const nextStatus = isLive ? "PAUSED" : "ON_SALE";
                                    await updateStatus.mutateAsync({
                                      eventId: evt.id,
                                      status: nextStatus,
                                    });
                                    onNotify(`${evt.title} marked ${nextStatus}.`, "info");
                                  }}
                                >
                                  {isLive ? "Pause" : "Publish"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredEvents.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-12 text-center text-[13px] text-[#5C6570]"
                          >
                            {search
                              ? "No events match your search."
                              : "No events yet. Click \"New Event\" to publish your first."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </motion.div>
          )}

          {/* ---------- STAFF ---------- */}
          {view === "staff" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING_SPATIAL}
              className="space-y-5"
            >
              {/* Inline create staff form */}
              <AnimatePresence initial={false}>
                {showCreateStaff && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <form
                      onSubmit={staffForm.handleSubmit(handleCreateStaffSubmit)}
                      className="rounded-[16px] border border-[#E7E5E0] bg-white p-6 shadow-sm"
                    >
                      <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#E7E5E0] pb-4">
                        <div>
                          <h2 className="text-[16px] font-semibold text-[#0F1419]">
                            Create staff login ID
                          </h2>
                          <p className="text-[12.5px] text-[#5C6570]">
                            Credentials are shown once after provisioning — copy and share securely.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCreateStaff(false)}
                          className="rounded-[8px] p-1.5 text-[#5C6570] transition-colors hover:text-[#0F1419]"
                          aria-label="Close create staff form"
                        >
                          <X className="h-4 w-4" strokeWidth={1.9} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field
                          label="Staff Full Name"
                          htmlFor="staff-name"
                          error={staffForm.formState.errors.name?.message}
                        >
                          <input
                            id="staff-name"
                            type="text"
                            placeholder="e.g. Kabir Gatekeeper"
                            {...staffForm.register("name")}
                            className="h-11 w-full rounded-[8px] border border-[#E7E5E0] px-3.5 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                          />
                        </Field>

                        <Field
                          label="Login ID / Email"
                          htmlFor="staff-email"
                          error={staffForm.formState.errors.email?.message}
                        >
                          <input
                            id="staff-email"
                            type="email"
                            placeholder="gate02@venu.live"
                            {...staffForm.register("email")}
                            className="h-11 w-full rounded-[8px] border border-[#E7E5E0] px-3.5 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                          />
                        </Field>

                        <Field
                          label="Initial Password"
                          htmlFor="staff-password"
                          error={staffForm.formState.errors.password?.message}
                        >
                          <input
                            id="staff-password"
                            type="text"
                            placeholder="Minimum 6 characters"
                            {...staffForm.register("password")}
                            className="num h-11 w-full rounded-[8px] border border-[#E7E5E0] px-3.5 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                          />
                        </Field>

                        <Field label="Assigned Role" htmlFor="staff-role">
                          <select
                            id="staff-role"
                            {...staffForm.register("role")}
                            className="h-11 w-full rounded-[8px] border border-[#E7E5E0] bg-white px-3 text-[14px] focus:border-[#2D2A6E] focus:outline-none"
                          >
                            <option value="SCANNER">Gatekeeper (SCANNER)</option>
                            <option value="BARTENDER">Bartender (BARTENDER)</option>
                          </select>
                        </Field>
                      </div>

                      <div className="mt-6 flex justify-end gap-2 border-t border-[#E7E5E0] pt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowCreateStaff(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          isLoading={createStaff.isPending}
                        >
                          Provision Staff ID
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Directory */}
              <section className="overflow-hidden rounded-[16px] border border-[#E7E5E0] bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-[#E7E5E0] px-6 py-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 text-[#2D2A6E]" strokeWidth={1.9} />
                    <div>
                      <h2 className="text-[15px] font-semibold text-[#0F1419]">
                        Venue staff IDs ({staffUsers.length})
                      </h2>
                      <p className="text-[12.5px] text-[#5C6570]">
                        Assigned credentials for gatekeepers and bartenders.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowCreateStaff((s) => !s)}
                  >
                    <UserPlus className="h-3.5 w-3.5" strokeWidth={1.9} />
                    <span>{showCreateStaff ? "Close Form" : "Add Staff ID"}</span>
                  </Button>
                </div>

                <div className="divide-y divide-[#E7E5E0]">
                  {staffUsers.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-[14px]"
                    >
                      <div>
                        <div className="font-semibold text-[#0F1419]">{staff.name}</div>
                        <div className="num text-[12.5px] text-[#5C6570]">
                          {staff.email}
                        </div>
                      </div>
                      <span
                        className={`num rounded-[6px] px-2.5 py-1 text-[11px] font-semibold ${
                          staff.role === "SCANNER"
                            ? "bg-[#FEF3C7] text-[#B45309]"
                            : "bg-[#CCFBF1] text-[#0F766E]"
                        }`}
                      >
                        {staff.role === "SCANNER" ? "GATEKEEPER (SCANNER)" : "BARTENDER"}
                      </span>
                    </div>
                  ))}
                  {staffUsers.length === 0 && (
                    <div className="px-6 py-12 text-center text-[13px] text-[#5C6570]">
                      No staff yet. Click "Add Staff ID" to provision one.
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {/* ---------- SECURITY ---------- */}
          {view === "security" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING_SPATIAL}
              className="space-y-5"
            >
              {!mfaEnrollment
                ? (
                  <section className="rounded-[16px] border border-[#E7E5E0] bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="max-w-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-[#2D2A6E]" strokeWidth={1.9} />
                          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#5C6570]">
                            RFC 6238 · Replay Protected
                          </span>
                        </div>
                        <h2 className="text-[18px] font-semibold text-[#0F1419]">
                          Authenticator MFA
                        </h2>
                        <p className="text-[13.5px] leading-relaxed text-[#5C6570]">
                          Add a second factor for admin sign-in using any TOTP authenticator app (Google Authenticator,
                          1Password, Authy). Secrets are encrypted with AES-256-GCM at rest and each 6-digit code is
                          strictly single-use.
                        </p>
                        <ul className="space-y-1.5 pt-2 text-[13px] text-[#0F1419]">
                          {[
                            "30-second single-use codes",
                            "Replay-protected by HMAC-SHA256",
                            "Backup codes generated on enrollment",
                          ].map((line) => (
                            <li key={line} className="flex items-center gap-2">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#DCFCE7]">
                                <Check className="h-2.5 w-2.5 text-[#16A34A]" strokeWidth={3} />
                              </span>
                              <span className="text-[12.5px] text-[#5C6570]">{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button
                        variant="primary"
                        size="md"
                        isLoading={enrollMfa.isPending}
                        onClick={handleMfaEnroll}
                      >
                        <ShieldCheck className="h-4 w-4" strokeWidth={1.9} />
                        <span>Enable Authenticator</span>
                      </Button>
                    </div>
                  </section>
                )
                : (
                  <section className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
                    <div className="flex flex-col items-center gap-3 rounded-[16px] border border-[#E7E5E0] bg-[#FAFAF7] p-6 shadow-sm">
                      <QRCodeSVG
                        value={mfaEnrollment.otpauthUri}
                        size={200}
                        bgColor="#FAFAF7"
                        fgColor="#0F1419"
                      />
                      <div className="num text-center text-[11px] text-[#5C6570]">
                        {mfaEnrollment.issuer} · {mfaEnrollment.algorithm} · {mfaEnrollment.digits} digits ·{" "}
                        {mfaEnrollment.period}s
                      </div>
                    </div>

                    <div className="space-y-4 rounded-[16px] border border-[#E7E5E0] bg-white p-6 shadow-sm">
                      <div>
                        <div className="text-[12px] font-medium uppercase tracking-wider text-[#5C6570]">
                          Manual setup key
                        </div>
                        <h2 className="mt-1 text-[16px] font-semibold text-[#0F1419]">
                          Scan the QR, or paste this 160-bit Base32 secret
                        </h2>
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-[10px] border border-[#E7E5E0] bg-[#FAFAF7] p-3">
                        <code className="num break-all text-[12.5px] font-semibold text-[#0F1419]">
                          {mfaEnrollment.secret}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator?.clipboard?.writeText) {
                              void navigator.clipboard.writeText(mfaEnrollment.secret);
                            }
                            setCopiedSecret(true);
                            onNotify("TOTP secret copied to clipboard.", "info");
                          }}
                          className="shrink-0 rounded-[6px] border border-[#E7E5E0] bg-white p-1.5 text-[#0F1419] transition-colors hover:bg-[#F4F3F0] active:scale-95"
                          aria-label="Copy Base32 secret"
                        >
                          {copiedSecret
                            ? <Check className="h-4 w-4 text-[#16A34A]" strokeWidth={1.9} />
                            : <Copy className="h-4 w-4" strokeWidth={1.9} />}
                        </button>
                      </div>

                      <p className="text-[12.5px] leading-relaxed text-[#5C6570]">
                        Your secret is encrypted with AES-256-GCM at rest. Each 6-digit code is strictly single-use per
                        30-second window. Complete enrollment by entering a live code in the authenticator app on your
                        next sign-in.
                      </p>

                      <div className="flex justify-end gap-2 border-t border-[#E7E5E0] pt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setMfaEnrollment(null);
                            setCopiedSecret(false);
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </section>
                )}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

/* ---------- Small helpers ---------- */

const KpiCard: React.FC<{
  label: string;
  value: string;
  suffix?: string;
  hint: string;
  hintTone?: "default" | "success";
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = ({ label, value, suffix, hint, hintTone = "default", Icon }) => {
  return (
    <div className="rounded-[14px] border border-[#E7E5E0] bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#5C6570]">
          {label}
        </span>
        <Icon className="h-4 w-4 text-[#2D2A6E]" strokeWidth={1.9} />
      </div>
      <div className="num mt-2 flex items-baseline gap-1.5 text-[26px] font-semibold text-[#0F1419]">
        <span>{value}</span>
        {suffix && <span className="text-[14px] text-[#5C6570]">{suffix}</span>}
      </div>
      <div
        className={`mt-1 text-[12px] ${hintTone === "success" ? "text-[#16A34A]" : "text-[#5C6570]"}`}
      >
        {hint}
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, error, children }) => (
  <div>
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-[12.5px] font-medium text-[#0F1419]"
    >
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-[12px] text-[#DC2626]">{error}</p>}
  </div>
);
