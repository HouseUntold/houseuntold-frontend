import { useCheckoutLeads } from "@/api/hooks/useLeads";
import { Card } from "@/components/ui/Card";
import { formatLabel, pluralize } from "@/lib/utils";
import { ChevronDown, Inbox, RefreshCw, Search, Users, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

function formatLeadDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }),
  };
}

export const AdminLeads: React.FC = () => {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [includeCompleted, setIncludeCompleted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const {
    data,
    isLoading,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCheckoutLeads({ q: search, includeCompleted, limit: 10 });

  const leadList = useMemo(() => (data?.pages || []).flatMap((p) => p.leads), [data]);

  return (
    <div className="space-y-5 text-left animate-fade-in">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--color-hairline)]/70">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-brand)] shadow-sm shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] tracking-tight">
              Checkout Leads
            </h2>
              <span className="px-2 py-0.5 rounded-md bg-[var(--color-canvas)] border border-[var(--color-hairline)]/70 text-[var(--color-muted)] text-xs font-medium tabular-nums">
              {leadList.length}{hasNextPage ? "+" : ""}
            </span>
          </div>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Attempted checkouts that may not be paid yet. Completed payments are hidden by default.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Segmented Filter Toggle */}
          <div
            role="tablist"
            aria-label="Filter checkout leads"
            className="relative grid grid-cols-2 p-1 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] w-48"
          >
            <span
              aria-hidden="true"
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[var(--color-brand)] shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                includeCompleted ? "translate-x-full" : "translate-x-0"
              }`}
            />
            <button
              type="button"
              role="tab"
              aria-selected={!includeCompleted}
              onClick={() => setIncludeCompleted(false)}
              className={`relative z-10 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer ${
                !includeCompleted
                  ? "text-[var(--color-brand-text)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Incomplete
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={includeCompleted}
              onClick={() => setIncludeCompleted(true)}
              className={`relative z-10 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer ${
                includeCompleted
                  ? "text-[var(--color-brand-text)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              All leads
            </button>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh leads"
            title="Refresh leads"
            className="w-10 h-10 rounded-full shrink-0 bg-[var(--color-surface)] border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-hairline)]/80 shadow-sm flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--color-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, or UTR..."
            aria-label="Search checkout leads"
            className="w-full h-10 pl-10 pr-9 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]/60 focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {isFetching && !isLoading && (
          <span className="text-xs font-medium text-[var(--color-muted)] shrink-0">
            Updating...
          </span>
        )}
      </div>

      {/* Leads Table */}
      <Card className="overflow-hidden border border-[var(--color-hairline)]/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-[var(--color-canvas)] border-b border-[var(--color-hairline)] text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3.5 font-semibold w-[24%]">Customer</th>
                <th className="px-4 py-3.5 font-semibold w-[24%]">Interest</th>
                <th className="px-4 py-3.5 font-semibold w-[18%]">Group</th>
                <th className="px-4 py-3.5 font-semibold w-[20%]">Payment</th>
                <th className="px-4 py-3.5 font-semibold text-right w-[14%]">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]/70 bg-[var(--color-surface)]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4">
                      <div className="h-3.5 w-28 rounded bg-[var(--color-hairline)]/40" />
                      <div className="h-3 w-24 rounded bg-[var(--color-hairline)]/30 mt-1.5" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-3.5 w-24 rounded bg-[var(--color-hairline)]/40" />
                      <div className="h-3 w-32 rounded bg-[var(--color-hairline)]/30 mt-1.5" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-3.5 w-16 rounded bg-[var(--color-hairline)]/40" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-3.5 w-24 rounded bg-[var(--color-hairline)]/40" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-5 w-20 rounded-full bg-[var(--color-hairline)]/40" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-3 w-20 rounded bg-[var(--color-hairline)]/30 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : leadList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-11 h-11 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)]/70 flex items-center justify-center text-[var(--color-muted)] mb-3">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        No {includeCompleted ? "" : "incomplete "}leads found
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-1">
                        {search
                          ? "Try a different name, phone number, or UTR."
                          : "Checkout attempts will appear here as guests start booking."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                leadList.map((lead) => {
                  const dt = formatLeadDate(lead.updated_at);
                  const groupParts = [
                    lead.couple_count > 0 ? `${lead.couple_count} couple${lead.couple_count === 1 ? "" : "s"}` : "",
                    lead.stag_male_count > 0 ? `${lead.stag_male_count} male` : "",
                    lead.stag_female_count > 0 ? `${lead.stag_female_count} female` : "",
                  ].filter(Boolean);
                  return (
                    <tr key={lead.id} className="hover:bg-[var(--color-surface-hover)]/60 transition-colors">
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-0.5">
                          <div className="font-bold text-[var(--color-ink)] text-sm leading-snug">{lead.primary_name || "Guest"}</div>
                          <div className="text-[var(--color-muted)] font-mono text-xs num">{lead.contact_phone || "—"}</div>
                          <div className="text-[11px] text-[var(--color-muted)]">
                            {[lead.primary_age ? `Age ${lead.primary_age}` : "", lead.gender ? formatLabel(lead.gender) : ""].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-[var(--color-ink)] line-clamp-1">{lead.event_title || "—"}</div>
                          <div className="text-[11px] text-[var(--color-muted)] line-clamp-1">{lead.category_name ? formatLabel(lead.category_name) : "—"}</div>
                          {lead.seat_section && (
                            <div className="text-[11px] text-[var(--color-brand)] font-semibold">Section {lead.seat_section}{lead.seat_table_size ? ` · ${lead.seat_table_size}-seater` : ""}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-0.5">
                          {lead.guest_count > 0 ? <div className="font-semibold text-[var(--color-ink)] num text-xs">{lead.guest_count} {pluralize(lead.guest_count, "guest")}</div> : <div className="text-[var(--color-muted)]">—</div>}
                          {groupParts.length > 0 && <div className="text-[11px] text-[var(--color-muted)] num leading-snug">{groupParts.join(" · ")}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-0.5">
                          {lead.upi_transaction_id ? <div className="font-mono text-xs font-semibold text-[var(--color-brand)] break-all">{lead.upi_transaction_id}</div> : <div className="text-[var(--color-muted)] text-xs">No UTR</div>}
                          {lead.booking_id && <div className="text-[11px] text-[var(--color-muted)] font-mono">#{lead.booking_id.slice(0, 8).toUpperCase()}</div>}
                          {lead.error_message && <div className="text-[11px] text-[var(--color-danger)] leading-snug max-w-[220px]">{lead.error_message}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top text-right">
                        <div className="text-xs font-medium text-[var(--color-ink)] whitespace-nowrap">{dt.date}</div>
                        <div className="text-[11px] text-[var(--color-muted)] whitespace-nowrap mt-0.5">{dt.time}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {hasNextPage && (
          <div className="border-t border-[var(--color-hairline)]/70 bg-[var(--color-canvas)]/40 px-4 py-3 flex justify-center">
            <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 cursor-pointer">
              <ChevronDown className={`w-4 h-4 ${isFetchingNextPage ? "animate-pulse" : ""}`} />
              {isFetchingNextPage ? "Loading..." : "Load 10 more"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};