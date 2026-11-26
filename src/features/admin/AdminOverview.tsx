import { useAdminEvents } from "@/api/hooks/useEvents";
import { useAdminStats } from "@/api/hooks/useAnalytics";
import { eventsApi } from "@/api/endpoints/events";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { formatCurrencyINR, formatDateTime } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import {
  BadgeIndianRupee,
  CalendarCheck2,
  DoorOpen,
  Ticket,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import React from "react";

type SeatRow = { section: string; table_size: number; total_tables: number; reserved_tables?: number };

export const AdminOverview: React.FC = () => {
  const { data: stats, isLoading } = useAdminStats();
  const { data: events } = useAdminEvents();
  const { showToast } = useUiStore();
  const [eventId, setEventId] = React.useState("");
  const [rows, setRows] = React.useState<SeatRow[]>([]);
  const [seatLoading, setSeatLoading] = React.useState(false);

  React.useEffect(() => { if (!eventId && events?.[0]?.id) setEventId(events[0].id); }, [eventId, events]);
  React.useEffect(() => {
    if (!eventId) return;
    let alive = true;
    setSeatLoading(true);
    eventsApi.seats(eventId).then((snap: any) => {
      if (!alive) return;
      const groups = Array.isArray(snap?.groups) ? snap.groups : [];
      setRows(groups.map((g: any) => ({ section: String(g.section || "A"), table_size: Number(g.table_size || 5), total_tables: Number(g.total_tables || 0), reserved_tables: Number(g.reserved_tables || 0) })));
    }).catch((err: any) => { if (alive) showToast(err?.response?.data?.error || "Could not load seating.", "danger"); })
      .finally(() => { if (alive) setSeatLoading(false); });
    return () => { alive = false; };
  }, [eventId, showToast]);


  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  const checkInRate = stats.total_tickets ? Math.round((stats.checked_in_tickets / stats.total_tickets) * 100) : 0;
  const maxRevenue = Math.max(1, ...stats.per_event_performance.map((event) => event.ticket_revenue));
  const maxItemRevenue = Math.max(1, ...stats.top_bar_items.map((item) => item.revenue));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-ink)] tracking-tight">Operations overview</h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Revenue, check-ins, and bar performance across events.
          </p>
        </div>
        <div className="text-[11px] font-medium text-[var(--color-muted)] px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-hairline)]/70 w-fit">
          Live data
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 stagger">
        <KpiCard icon={BadgeIndianRupee} label="Ticket Revenue" value={formatCurrencyINR(stats.total_revenue)} detail={`${stats.confirmed_bookings} confirmed bookings`} tone="brand" />
        <KpiCard icon={Ticket} label="Tickets Sold" value={stats.total_tickets.toLocaleString("en-IN")} detail={`${stats.active_events} active ${stats.active_events === 1 ? "event" : "events"}`} tone="ink" />
        <KpiCard icon={DoorOpen} label="Gate Check-ins" value={stats.checked_in_tickets.toLocaleString("en-IN")} detail={`${checkInRate}% of sold tickets`} tone="success" />
        <KpiCard icon={UtensilsCrossed} label="Bar Credit Used" value={formatCurrencyINR(stats.fnb_redeemed)} detail={`${formatCurrencyINR(stats.fnb_remaining)} remaining`} tone="amber" />
        <KpiCard icon={CalendarCheck2} label="Bar Orders" value={stats.bar_transactions.toLocaleString("en-IN")} detail={`${stats.total_guests.toLocaleString("en-IN")} guests on list`} tone="ink" />
        <KpiCard icon={TrendingUp} label="Tequila Shots" value={stats.total_tequila_redeemed.toLocaleString("en-IN")} detail="Free shots redeemed" tone="success" />
        <KpiCard icon={TrendingUp} label="Extra Collected" value={formatCurrencyINR(stats.extra_cash_collected + stats.extra_upi_collected)} detail={`${formatCurrencyINR(stats.extra_cash_collected)} cash · ${formatCurrencyINR(stats.extra_upi_collected)} UPI`} tone="ink" />
        <Card className="p-5">
          <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Group Bookings</p>
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-[var(--color-muted)]">Couples</span><span className="font-bold text-[var(--color-ink)] num">{stats.total_couples}</span></div>
            <div className="flex justify-between"><span className="text-[var(--color-muted)]">Single men</span><span className="font-bold text-[var(--color-ink)] num">{stats.total_stag_male}</span></div>
            <div className="flex justify-between"><span className="text-[var(--color-muted)]">Single women</span><span className="font-bold text-[var(--color-ink)] num">{stats.total_stag_female}</span></div>
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <SectionHeading title="Table Booking Breakdown" subtitle="Total booked tables by guest count across selected event." />
          <div className="w-full sm:w-72">
            <Select label="Event" value={eventId} onChange={(e) => setEventId(e.target.value)} options={(events || []).map((ev) => ({ value: ev.id, label: ev.title }))} />
          </div>
        </div>
        {seatLoading ? <EmptyState label="Loading seating..." /> : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {[5, 8, 10, 15].map((size) => {
              const booked = rows.filter((r) => r.table_size === size).reduce((sum, r) => sum + Number(r.reserved_tables || 0), 0);
              return (
                <div key={size} className="p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]">
                  <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">{size} Guest Tables</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--color-ink)] num">{booked}</p>
                  <p className="text-[11px] text-[var(--color-muted)] mt-1">Total booked</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <Card className="xl:col-span-7 p-6">
          <SectionHeading title="Revenue by Event" subtitle="Confirmed ticket value per event" />
          {stats.per_event_performance.length === 0
            ? <EmptyState label="No event revenue data yet." />
            : (
              <div className="h-64 flex items-end gap-3 pt-6 pb-2 overflow-x-auto">
                {stats.per_event_performance.map((event, i) => (
                  <div
                    key={event.event_id}
                    className="flex-1 min-w-12 flex flex-col items-center justify-end gap-2 group"
                  >
                    <span className="text-[10px] font-semibold text-[var(--color-ink)] num opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap tabular-nums">
                      {formatCurrencyINR(event.ticket_revenue)}
                    </span>
                    <div className="w-full max-w-14 h-[180px] flex items-end">
                      <div
                        className="w-full rounded-t-md bg-[var(--color-brand)]/85 group-hover:bg-[var(--color-brand)] transition-colors duration-150 animate-grow-y"
                        style={{ height: `${Math.max(4, (event.ticket_revenue / maxRevenue) * 100)}%`, animationDelay: `${i * 35}ms` }}
                        title={`${event.event_title}: ${formatCurrencyINR(event.ticket_revenue)}`}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--color-muted)] truncate w-full text-center" title={event.event_title}>
                      {event.event_title}
                    </span>
                  </div>
                ))}
              </div>
            )}
        </Card>

        <Card className="xl:col-span-5 p-6">
          <SectionHeading title="Gate Check-Ins" subtitle="Check-in progress across sold tickets" />
          <div className="flex items-center justify-center py-6">
            <div
              className="relative w-40 h-40 rounded-full flex items-center justify-center transition-[background] duration-500 ease-[var(--ease-out)]"
              style={{ background: `conic-gradient(var(--color-success) ${checkInRate * 3.6}deg, color-mix(in srgb, var(--color-hairline) 45%, transparent) 0deg)` }}
              role="img"
              aria-label={`${checkInRate}% of tickets checked in`}
            >
              <div className="w-[7.25rem] h-[7.25rem] rounded-full bg-[var(--color-surface)] flex flex-col items-center justify-center border border-[var(--color-hairline)]/70 shadow-[inset_0_1px_2px_rgba(64,16,33,0.04)]">
                <span className="text-2xl font-semibold text-[var(--color-ink)] tabular-nums">{checkInRate}%</span>
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-medium">Checked in</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]">
              <div className="text-lg font-bold text-[var(--color-success)] num">{stats.checked_in_tickets}</div>
              <div className="text-[10px] text-[var(--color-muted)] uppercase font-bold">Checked In</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]">
              <div className="text-lg font-bold text-[var(--color-ink)] num">
                {Math.max(0, stats.total_tickets - stats.checked_in_tickets)}
              </div>
              <div className="text-[10px] text-[var(--color-muted)] uppercase font-bold">Not Checked In</div>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-6 p-6">
          <SectionHeading title="Event Performance" subtitle="Bookings, check-ins, revenue, and bar sales." />
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-hairline)] text-[var(--color-muted)]">
                <tr>
                  <th className="py-2 p-1 text-left font-bold">Event</th>
                  <th className="py-2 p-1 text-center font-bold">Bookings</th>
                  <th className="py-2 p-1 text-center font-bold">Revenue</th>
                  <th className="py-2 p-1 text-center font-bold">Check-ins</th>
                  <th className="py-2 p-1 text-right font-bold">Bar Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-hairline)]">
                {stats.per_event_performance.map((event) => (
                  <tr key={event.event_id} className="hover:bg-[var(--color-surface-hover)]/50">
                    <td className="py-3 p-1 text-left font-bold text-[var(--color-ink)] max-w-52 truncate">{event.event_title}</td>
                    <td className="py-3 p-1 text-center num">{event.confirmed_bookings}</td>
                    <td className="py-3 p-1 text-center font-bold text-[var(--color-brand)] num">
                      {formatCurrencyINR(event.ticket_revenue)}
                    </td>
                    <td className="py-3 p-1 text-center num">{event.checked_in_tickets}/{event.total_tickets}</td>
                    <td className="py-3 p-1 text-right num">{formatCurrencyINR(event.total_bar_bill)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.per_event_performance.length === 0 && <EmptyState label="No events to report yet." />}
          </div>
        </Card>

        <Card className="xl:col-span-6 p-6">
          <SectionHeading title="Top Bar Items" subtitle="Highest-selling items by revenue." />
          <div className="max-h-72 space-y-3 overflow-y-auto pt-5 pr-1">
            {stats.top_bar_items.length === 0 && <EmptyState label="No bar sales recorded yet." />}
            {stats.top_bar_items.map((item, i) => {
              const pct = Math.max(3, (item.revenue / maxItemRevenue) * 100);
              return (
              <div key={`${item.item_name}-${item.item_category}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-[var(--color-ink)] truncate">{item.item_name}</span>
                  <span className="text-[var(--color-muted)] tabular-nums shrink-0">
                    {item.quantity} sold · {formatCurrencyINR(item.revenue)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-canvas)] border border-[var(--color-hairline)]/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-brand)]/80 animate-grow-y"
                    style={{ width: `${pct}%`, transformOrigin: "left", animationDelay: `${i * 40}ms` }}
                  />
                </div>
              </div>
              );
            })}
          </div>
        </Card>

        <Card className="xl:col-span-12 p-6">
          <SectionHeading title="Recent Check-Ins" subtitle="Latest arrivals at all entrances." />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pt-5">
            {stats.recent_gate_entries.length === 0 && <EmptyState label="No check-ins recorded yet." />}
            {stats.recent_gate_entries.map((entry) => (
              <div
                key={`${entry.ticket_id}-${entry.checked_in_at || ""}`}
                className="p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[var(--color-ink)] truncate">
                    {entry.primary_guest || "Guest"}
                  </div>
                  <div className="text-[11px] text-[var(--color-muted)] truncate mt-0.5">
                    {entry.category_name} • {entry.bar_code}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold text-[var(--color-success)]">CHECKED IN</div>
                  <div className="text-[10px] text-[var(--color-muted)] mt-0.5">
                    {entry.checked_in_at ? formatDateTime(entry.checked_in_at) : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  tone: "brand" | "success" | "amber" | "ink";
}> = ({ icon: Icon, label, value, detail, tone }) => {
  const toneClass = {
    brand: "text-[var(--color-brand)] bg-[var(--color-brand)]/10",
    success: "text-[var(--color-success)] bg-[var(--color-success)]/10",
    amber: "text-[#9A6700] bg-[#9A6700]/10",
    ink: "text-[var(--color-ink)] bg-[var(--color-surface-hover)]",
  }[tone];

  return (
    <Card className="p-4 sm:p-5 transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-[var(--color-brand)]/35 hover:shadow-[0_8px_24px_rgba(64,16,33,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-[var(--color-muted)]">{label}</p>
          <p className="text-xl sm:text-2xl font-semibold text-[var(--color-ink)] tabular-nums mt-1.5 leading-none tracking-tight truncate">
            {value}
          </p>
          <p className="text-[11px] text-[var(--color-muted)] mt-2 truncate">{detail}</p>
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${toneClass}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
    </Card>
  );
};

const SectionHeading: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="pb-4 border-b border-[var(--color-hairline)]/70">
    <h3 className="text-sm font-semibold text-[var(--color-ink)] tracking-tight">{title}</h3>
    <p className="text-xs text-[var(--color-muted)] mt-0.5">{subtitle}</p>
  </div>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="col-span-full py-10 px-6 text-center">
    <div className="mx-auto w-10 h-10 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/70 flex items-center justify-center mb-3">
      <CalendarCheck2 className="w-4.5 h-4.5 text-[var(--color-muted)]" />
    </div>
    <p className="text-sm font-medium text-[var(--color-ink)]">{label}</p>
    <p className="text-xs text-[var(--color-muted)] mt-1">Data will appear here as activity comes in.</p>
  </div>
);
