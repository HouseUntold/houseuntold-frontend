import { ArrowLeft, ArrowRight, Check, Clock, Minus, Plus, RotateCcw, Users, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { ZoneComplianceMarker } from "../../../components/ui/TierBadge";
import type { Seat, TierType } from "../../../lib/api/types";
import { formatINR, formatTimerClock } from "../../../lib/domain/rules";
import { useSeatSelection } from "../hooks/useSeatSelection";

interface SeatMapViewProps {
  eventId: string;
  onBack: () => void;
  onContinue: (eventId: string) => void;
  onNotify: (title: string, tone: "success" | "error" | "info") => void;
}

type SectionKey = "A" | "B" | "C";
type TableCapacity = 5 | 8 | 10 | 15;

interface TableSelectionConfig {
  section: SectionKey;
  tableNumber: number;
  capacity: TableCapacity;
  price: number;
}

const TABLE_CAPACITIES: readonly TableCapacity[] = [5, 8, 10, 15];

const TABLE_PRICES: Record<number, Record<SectionKey, number>> = {
  5: { A: 14999, B: 18999, C: 21999 },
  8: { A: 19999, B: 22999, C: 24999 },
  10: { A: 24999, B: 27999, C: 29999 },
  15: { A: 31999, B: 32999, C: 34999 },
};
const sectionPrice = (section: SectionKey, capacity: TableCapacity) => TABLE_PRICES[capacity][section];

const TIER_PILL_COLOR: Record<TierType, { base: string; border: string; text: string }> = {
  TABLE: { base: "bg-[#F1DAA5]/20", border: "border-[#F1DAA5]/55", text: "text-[#F1DAA5]" },
  COUPLE: { base: "bg-[#FCE7F0]/15", border: "border-[#F472B6]/50", text: "text-[#FBCFE8]" },
  STAG: { base: "bg-[#CCFBF1]/15", border: "border-[#34D399]/50", text: "text-[#A7F3D0]" },
  VIP: { base: "bg-[#FEF3C7]/20", border: "border-[#F59E0B]/50", text: "text-[#FDE68A]" },
  GENERAL: { base: "bg-[#E0F2FE]/15", border: "border-[#38BDF8]/50", text: "text-[#BAE6FD]" },
};

function getTierStyle(tier: string | undefined) {
  if (tier === "COUPLE") return TIER_PILL_COLOR.COUPLE;
  if (tier === "STAG") return TIER_PILL_COLOR.STAG;
  return TIER_PILL_COLOR.TABLE;
}

export const SeatMapView: React.FC<SeatMapViewProps> = ({
  eventId,
  onBack,
  onContinue,
  onNotify,
}) => {
  const { data, isLoading, toggleSeat } = useSeatSelection(eventId, onNotify);
  const [zoom, setZoom] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(522);

  // Popup state for choosing Table of 5, 8, 10, or 15
  const [activeModalSeat, setActiveModalSeat] = useState<
    {
      seat: Seat;
      section: SectionKey;
      tableNumber: number;
    } | null
  >(null);
  const [pendingCapacity, setPendingCapacity] = useState<TableCapacity>(5);
  const [selectedTableConfigs, setSelectedTableConfigs] = useState<
    Record<string, TableSelectionConfig>
  >({});

  useEffect(() => {
    if (!data?.breakdown.holdExpiresAt) {
      setSecondsLeft(540);
      return;
    }
    const update = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(data.breakdown.holdExpiresAt!).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(diff);
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [data?.breakdown.holdExpiresAt]);

  const selectedSeats = useMemo(
    () => (data?.seats ?? []).filter((s) => s.status === "SELECTED_BY_ME"),
    [data?.seats],
  );

  // Keep local table configs in sync if a seat is unselected externally
  useEffect(() => {
    const selectedIds = new Set(selectedSeats.map((s) => s.id));
    setSelectedTableConfigs((prev) => {
      const next: Record<string, TableSelectionConfig> = {};
      let changed = false;
      for (const [id, cfg] of Object.entries(prev)) {
        if (selectedIds.has(id)) {
          next[id] = cfg;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedSeats]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, Seat[]>();
    for (const seat of data?.seats ?? []) {
      const list = map.get(seat.row) ?? [];
      list.push(seat);
      map.set(seat.row, list);
    }
    return Array.from(map.entries());
  }, [data?.seats]);

  if (isLoading || !data) {
    return (
      <div className="max-w-[1280px] mx-auto px-5 sm:px-10 py-10 bg-[#360D19]">
        <div className="h-[520px] rounded-[14px] bg-[#5B342E]/50 border border-[#875931]/40 animate-pulse" />
      </div>
    );
  }

  const { event, seats, breakdown } = data;
  const isClub = event.layoutType === "CLUB" || event.layoutType === "Lounge";

  const explicitB = seats.filter((s) => s.row.toUpperCase() === "B");
  const explicitC = seats.filter((s) => s.row.toUpperCase() === "C");
  const explicitA = seats.filter((s) => s.row.toUpperCase() === "A");

  const hasExplicitSections = explicitB.length > 0 || explicitC.length > 0 || explicitA.length > 0;

  const sectionBTables = (hasExplicitSections ? explicitB : seats.slice(0, 4)).slice(0, 4);
  const sectionCTables = (hasExplicitSections ? explicitC : seats.slice(4, 8)).slice(0, 4);
  const sectionATables = (hasExplicitSections ? explicitA : seats.slice(8, 12)).slice(0, 4);

  const handleTableClick = (seat: Seat, section: SectionKey, tableNumber: number) => {
    if (seat.status === "SELECTED_BY_ME") {
      // Deselect immediately and clear saved package
      setSelectedTableConfigs((prev) => {
        const copy = { ...prev };
        delete copy[seat.id];
        return copy;
      });
      toggleSeat.mutate(seat.id);
      return;
    }

    // Open capacity & pricing modal for available tables
    setPendingCapacity(selectedTableConfigs[seat.id]?.capacity ?? 5);
    setActiveModalSeat({ seat, section, tableNumber });
  };

  const handleConfirmTableModal = () => {
    if (!activeModalSeat) return;
    const { seat, section, tableNumber } = activeModalSeat;
    const price = sectionPrice(section,pendingCapacity);

    setSelectedTableConfigs((prev) => ({
      ...prev,
      [seat.id]: {
        section,
        tableNumber,
        capacity: pendingCapacity,
        price,
      },
    }));

    if (seat.status !== "SELECTED_BY_ME") {
      toggleSeat.mutate(seat.id);
    }

    onNotify(
      `Section ${section} · Table ${tableNumber} (Table of ${pendingCapacity} — ${formatINR(price)}) selected`,
      "success",
    );
    setActiveModalSeat(null);
  };

  // Compute displayed total using configured section+capacity prices when in club/lounge layout
  const displayTotalPayable = useMemo(() => {
    if (!isClub || selectedSeats.length === 0) return breakdown.totalPayable;
    return selectedSeats.reduce((sum, seat) => {
      const cfg = selectedTableConfigs[seat.id];
      return sum + (cfg ? cfg.price : breakdown.totalPayable);
    }, 0);
  }, [isClub, selectedSeats, selectedTableConfigs, breakdown.totalPayable]);

  const renderClubTableNode = (
    seat: Seat,
    section: SectionKey,
    index: number,
    extraClass = "",
  ) => {
    const isSold = seat.status === "SOLD";
    const isHeld = seat.status === "HELD";
    const isSelected = seat.status === "SELECTED_BY_ME";
    const tierStyle = TIER_PILL_COLOR.TABLE;
    const tableNumber = index + 1;
    const savedConfig = selectedTableConfigs[seat.id];

    let cls = `${tierStyle.base} ${tierStyle.border} ${tierStyle.text} hover:brightness-110`;
    if (isSelected) {
      cls = "bg-[#F1DAA5] border-[#F1DAA5] text-[#360D19] font-semibold shadow-card";
    } else if (isSold) {
      cls = "bg-[#260811]/85 border-[#875931]/25 text-[#CFB790]/35 cursor-not-allowed";
    } else if (isHeld) {
      cls = "bg-[#875931]/25 border-[#875931]/50 text-[#CFB790]/75 cursor-not-allowed";
    }

    return (
      <button
        key={seat.id}
        type="button"
        disabled={isSold || isHeld}
        onClick={() => handleTableClick(seat, section, tableNumber)}
        aria-label={`Section ${section} Table ${tableNumber} ${seat.status}`}
        title={`Section ${section} · Table ${tableNumber} (Click to choose 5, 8, 10, or 15 pax)`}
        className={`h-11 px-3 rounded-[9px] border text-[12px] font-medium num flex items-center justify-center gap-1.5 transition-all duration-150 ${
          isSold || isHeld ? "" : "cursor-pointer active:scale-95"
        } ${cls} ${extraClass}`}
      >
        {isSold
          ? (
            "×"
          )
          : (
            <>
              <span>Table {tableNumber}</span>
              {isSelected && savedConfig && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#360D19]/15 font-bold">
                  {savedConfig.capacity}P
                </span>
              )}
            </>
          )}
      </button>
    );
  };

  const renderProsceniumSeatNode = (seat: Seat, extraClass = "") => {
    const isSold = seat.status === "SOLD";
    const isHeld = seat.status === "HELD";
    const isSelected = seat.status === "SELECTED_BY_ME";
    const tierStyle = getTierStyle(seat.tier);

    let cls = `${tierStyle.base} ${tierStyle.border} ${tierStyle.text} hover:brightness-110`;
    if (isSelected) {
      cls = "bg-[#F1DAA5] border-[#F1DAA5] text-[#360D19] font-semibold shadow-card";
    } else if (isSold) {
      cls = "bg-[#260811]/85 border-[#875931]/25 text-[#CFB790]/35 cursor-not-allowed";
    } else if (isHeld) {
      cls = "bg-[#875931]/25 border-[#875931]/50 text-[#CFB790]/75 cursor-not-allowed";
    }

    return (
      <button
        key={seat.id}
        type="button"
        disabled={isSold || isHeld}
        onClick={() => toggleSeat.mutate(seat.id)}
        aria-label={`${seat.label} ${seat.tier} ${seat.status}`}
        className={`h-10 min-w-[44px] px-2.5 rounded-[9px] border text-[12px] font-medium num flex items-center justify-center transition-all duration-150 ${
          isSold || isHeld ? "" : "cursor-pointer active:scale-95"
        } ${cls} ${extraClass}`}
      >
        {isSold ? "×" : seat.label}
      </button>
    );
  };

  return (
    <div className="max-w-[1280px] mx-auto px-5 sm:px-10 pt-6 pb-32 bg-[#360D19] text-[#F1DAA5]">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#875931]/40">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#5B342E]/75 border border-[#875931]/50 text-[13px] font-medium text-[#F1DAA5] hover:bg-[#5B342E] hover:border-[#875931] cursor-pointer active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            <span>Event</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#F1DAA5] truncate">
              {event.title}
            </h1>
            <p className="text-[13px] text-[#CFB790] truncate">
              {event.dateLabel} · {event.timeLabel} · {event.venueName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] bg-[#5B342E]/75 border border-[#875931]/50">
          <Clock className="w-4 h-4 text-[#F1DAA5]" strokeWidth={1.75} />
          <span className="text-[12px] text-[#CFB790]">Hold window</span>
          <span className="num text-[14px] font-semibold text-[#F1DAA5]">
            {selectedSeats.length > 0 ? formatTimerClock(secondsLeft) : "09:00"}
          </span>
        </div>
      </div>

      {/* Tier Pricing & Status Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {event.sections.map((sec) => {
            const secStyle = getTierStyle(sec.tier);
            return (
              <div
                key={sec.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#5B342E]/70 border border-[#875931]/45"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${secStyle.base} border ${secStyle.border}`}
                />
                <span className="text-[13px] font-medium text-[#F1DAA5]">{sec.name}</span>
                <span className="num text-[13px] font-semibold text-[#CFB790]">
                  {typeof sec.price === "number" ? formatINR(sec.price) : sec.price}
                </span>
                <ZoneComplianceMarker isAlcoholic={sec.isAlcoholic} minAge={sec.minAge} />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-[12px] text-[#CFB790]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[4px] bg-[#F1DAA5]/20 border border-[#F1DAA5]/55" />
            Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[4px] bg-[#F1DAA5]" />
            Selected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[4px] bg-[#875931]/30 border border-[#875931]/60" />
            Held
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[4px] bg-[#260811]/85 border border-[#875931]/25" />
            Sold
          </span>
        </div>
      </div>

      {/* Interactive Floor / Hall Map Viewport */}
      <div className="relative bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 shadow-card p-6 sm:p-8 overflow-x-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="text-[13px] font-medium text-[#CFB790]">
            {isClub
              ? `General Table Floor Plan — ${event.venueName} (Tap any table to choose 5, 8, 10, or 15 pax)`
              : "Acoustic Hall Proscenium Layout"}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.1).toFixed(2))))}
              className="w-8 h-8 rounded-[8px] bg-[#360D19] border border-[#875931]/50 flex items-center justify-center text-[#F1DAA5] hover:bg-[#875931]/40 cursor-pointer active:scale-95 transition-colors"
              aria-label="Zoom out seat map"
            >
              <Minus className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <span className="num text-[12px] text-[#CFB790] w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.2, Number((z + 0.1).toFixed(2))))}
              className="w-8 h-8 rounded-[8px] bg-[#360D19] border border-[#875931]/50 flex items-center justify-center text-[#F1DAA5] hover:bg-[#875931]/40 cursor-pointer active:scale-95 transition-colors"
              aria-label="Zoom in seat map"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="w-8 h-8 rounded-[8px] bg-[#360D19] border border-[#875931]/50 flex items-center justify-center text-[#F1DAA5] hover:bg-[#875931]/40 cursor-pointer active:scale-95 ml-1 transition-colors"
              aria-label="Reset seat map zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
          className="transition-transform duration-200 min-w-[820px]"
        >
          {isClub
            ? (
              <div className="max-w-5xl mx-auto space-y-3">
                {/* Top Row: W/C, R1-R4 + Stage, Parking II */}
                <div className="grid grid-cols-12 gap-3 items-stretch">
                  <div className="col-span-3 p-3 rounded-[10px] bg-[#360D19]/75 border border-[#875931]/50 flex flex-col justify-center text-center">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#CFB790]">
                      W/C · G/W
                    </span>
                    <span className="text-[10.5px] text-[#CFB790]/75 mt-0.5">Restrooms</span>
                  </div>

                  <div className="col-span-7 space-y-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {["R1", "R2", "R3", "R4"].map((room) => (
                        <div
                          key={room}
                          className="py-1.5 rounded-[8px] bg-[#360D19] border border-[#875931]/50 text-center num text-[11px] font-semibold text-[#F1DAA5]"
                        >
                          {room}
                        </div>
                      ))}
                    </div>
                    <div className="py-3 rounded-[10px] bg-[#360D19] border border-[#875931]/60 text-center">
                      <div className="num text-[12px] font-bold tracking-widest uppercase text-[#F1DAA5]">
                        Stage
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 p-3 rounded-[10px] bg-[#360D19]/50 border border-dashed border-[#875931]/40 flex items-center justify-center text-center">
                    <span className="text-[10.5px] font-semibold uppercase tracking-widest text-[#CFB790]">
                      Parking II
                    </span>
                  </div>
                </div>

                {/* Barricade */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-3" />
                  <div className="col-span-7 py-1.5 px-4 rounded-[6px] bg-[#875931]/25 border border-[#F1DAA5]/45 text-center text-[11px] font-semibold tracking-widest uppercase text-[#F1DAA5]">
                    Barricade
                  </div>
                  <div className="col-span-2" />
                </div>

                {/* Main Venue Hall + Side Corridors */}
                <div className="grid grid-cols-12 gap-3 items-stretch">
                  {/* Far Left: Restaurant Area + Entry Gate */}
                  <div className="col-span-3 flex flex-col justify-between p-3.5 rounded-[12px] bg-[#360D19]/75 border border-[#875931]/50">
                    <div className="flex items-center justify-between gap-1 pb-2 border-b border-[#875931]/35">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F1DAA5]">
                        Restaurant
                      </span>
                      <span className="text-[10.5px] font-semibold text-[#360D19] bg-[#F1DAA5] px-2 py-0.5 rounded">
                        Entry →
                      </span>
                    </div>

                    <div className="my-auto py-6 text-center text-[11.5px] text-[#CFB790] leading-relaxed">
                      Restaurant &amp; Dining Corridor
                    </div>

                    <div className="pt-2 border-t border-[#875931]/35 text-center">
                      <span className="inline-block w-full py-1.5 rounded-[7px] bg-[#5B342E] border border-[#875931]/50 text-[11px] font-semibold text-[#F1DAA5]">
                        Entry Main Gate
                      </span>
                    </div>
                  </div>

                  {/* Main Hall Enclosure (col-span-7) */}
                  <div className="col-span-7 p-4 rounded-[12px] bg-[#360D19]/80 border border-[#875931]/55 flex flex-col justify-between gap-4">
                    <div className="grid grid-cols-12 gap-3 items-stretch">
                      {/* Left Wall: Section B — 4 General tables stacked from Entry to Bar */}
                      <div className="col-span-4 p-3 rounded-[10px] bg-[#5B342E]/45 border border-[#875931]/45 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F1DAA5]">
                            Section B
                          </span>
                          <span className="text-[10px] text-[#CFB790]">
                            From {formatINR(sectionPrice("B",5))}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2.5 my-auto">
                          {sectionBTables.map((seat, idx) => renderClubTableNode(seat, "B", idx, "w-full"))}
                        </div>

                        <div className="mt-2.5 pt-1.5 border-t border-[#875931]/30 text-[10px] text-center text-[#CFB790]">
                          Entry ↓ to Bar
                        </div>
                      </div>

                      {/* Center Open Dance Area (no tables) */}
                      <div className="col-span-4 rounded-[10px] bg-[#360D19]/60 border border-dashed border-[#875931]/35 flex flex-col items-center justify-center p-4 text-center min-h-[260px]">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#CFB790]">
                          Main Floor
                        </span>
                        <span className="text-[11px] text-[#CFB790]/75 mt-1">
                          Open Dance &amp; Standing Zone
                        </span>
                      </div>

                      {/* Right Wall: Section C (4 General tables stacked) + Section A L-zone vertical arm */}
                      <div className="col-span-4 flex flex-col gap-3">
                        <div className="p-3 rounded-[10px] bg-[#5B342E]/45 border border-[#875931]/45 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F1DAA5]">
                              Section C
                            </span>
                            <span className="text-[10px] text-[#CFB790]">
                              From {formatINR(sectionPrice("C",5))}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2.5">
                            {sectionCTables.map((seat, idx) => renderClubTableNode(seat, "C", idx, "w-full"))}
                          </div>
                        </div>

                        {/* Vertical leg of L-shaped Section A */}
                        <div className="p-3 pb-2 rounded-t-[10px] rounded-bl-[10px] bg-[#5B342E]/45 border-t border-x border-[#875931]/45 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F1DAA5]">
                              Section A
                            </span>
                            <span className="text-[10px] text-[#CFB790]">
                              From {formatINR(sectionPrice("A",5))}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2">
                            {sectionATables.slice(0, 2).map((seat, idx) =>
                              renderClubTableNode(seat, "A", idx, "w-full")
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Wall: Bar (Left) -> Emergency Exit (Center) -> Horizontal bottom arm of L-shaped Section A */}
                    <div className="grid grid-cols-12 gap-3 items-stretch">
                      <div className="col-span-3 p-3 rounded-[10px] bg-[#5B342E]/85 border border-[#875931]/65 flex flex-col items-center justify-center text-center">
                        <div className="text-[12px] font-bold uppercase tracking-wider text-[#F1DAA5]">
                          Bar
                        </div>
                        <div className="text-[10px] text-[#CFB790] mt-0.5">Counter</div>
                      </div>

                      <div className="col-span-3 p-3 rounded-[10px] bg-[#360D19] border border-[#F1DAA5]/55 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#F1DAA5]">
                          Emergency Exit
                        </div>
                        <div className="text-[9.5px] text-[#CFB790] mt-0.5">Center Gate</div>
                      </div>

                      {/* Horizontal bottom leg of L-shaped Section A (next to Emergency Exit) */}
                      <div className="col-span-6 p-3 rounded-b-[10px] rounded-tl-[10px] bg-[#5B342E]/45 border border-[#875931]/45 flex items-center">
                        <div className="grid grid-cols-2 gap-2.5 w-full">
                          {sectionATables.slice(2, 4).map((seat, idx) =>
                            renderClubTableNode(seat, "A", idx + 2, "w-full")
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Far Right: Parking II */}
                  <div className="col-span-2 p-3 rounded-[12px] bg-[#360D19]/50 border border-dashed border-[#875931]/40 flex items-center justify-center text-center">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#CFB790] [writing-mode:vertical-rl] rotate-180">
                      Parking II
                    </span>
                  </div>
                </div>

                {/* Bottom Parking I */}
                <div className="grid grid-cols-12 gap-3 items-center pt-1">
                  <div className="col-span-3" />
                  <div className="col-span-7 py-2 px-4 rounded-[8px] bg-[#360D19]/50 border border-dashed border-[#875931]/40 text-center text-[11px] font-semibold uppercase tracking-widest text-[#CFB790]">
                    Parking I
                  </div>
                  <div className="col-span-2" />
                </div>
              </div>
            )
            : (
              /* Proscenium Acoustic Hall Layout */
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="mx-auto max-w-lg text-center">
                  <svg
                    viewBox="0 0 420 28"
                    className="w-full h-7 text-[#F1DAA5]"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 24 C 120 4, 300 4, 408 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="py-1 num text-[12px] font-semibold tracking-widest uppercase text-[#CFB790]">
                    Performance Stage
                  </div>
                </div>

                <div className="space-y-3">
                  {groupedRows.map(([rowName, rowSeats]) => {
                    const rowTier = rowSeats[0]?.tier ?? "TABLE";
                    return (
                      <div key={rowName} className="flex items-center justify-center gap-3">
                        <span className="num text-[12px] font-semibold text-[#CFB790] w-8 text-right">
                          {rowName}
                        </span>
                        <div className="grid grid-cols-8 gap-2">
                          {rowSeats.map((seat) => renderProsceniumSeatNode(seat))}
                        </div>
                        <span className="text-[11px] font-medium text-[#CFB790] w-16">
                          {rowTier}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Table Capacity & Section Pricing Popup Modal */}
      {activeModalSeat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="table-config-modal-title"
          onClick={() => setActiveModalSeat(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[16px] bg-[#360D19] border border-[#875931]/70 shadow-modal p-6 space-y-5 text-[#F1DAA5]"
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#875931]/40">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-[#CFB790]">
                  Section {activeModalSeat.section} · General Table
                </div>
                <h2
                  id="table-config-modal-title"
                  className="text-[20px] font-semibold text-[#F1DAA5] mt-0.5"
                >
                  Configure Table {activeModalSeat.tableNumber}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalSeat(null)}
                aria-label="Close table options popup"
                className="w-8 h-8 rounded-[8px] bg-[#5B342E]/75 border border-[#875931]/50 flex items-center justify-center text-[#CFB790] hover:text-[#F1DAA5] cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="space-y-2.5">
              <p className="text-[13px] text-[#CFB790]">
                Select group size for <strong className="text-[#F1DAA5]">Section {activeModalSeat.section}</strong>:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {TABLE_CAPACITIES.map((capacity) => {
                  const price = sectionPrice(activeModalSeat.section,capacity);
                  const isChosen = pendingCapacity === capacity;
                  return (
                    <button
                      key={capacity}
                      type="button"
                      onClick={() => setPendingCapacity(capacity)}
                      className={`w-full px-4 py-3 rounded-[11px] border flex items-center justify-between transition-all cursor-pointer ${
                        isChosen
                          ? "bg-[#F1DAA5] border-[#F1DAA5] text-[#360D19] shadow-card"
                          : "bg-[#5B342E]/60 border-[#875931]/50 text-[#F1DAA5] hover:border-[#F1DAA5]/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${
                            isChosen
                              ? "bg-[#360D19]/15 text-[#360D19]"
                              : "bg-[#360D19]/70 text-[#F1DAA5]"
                          }`}
                        >
                          <Users className="w-4 h-4" strokeWidth={1.75} />
                        </span>
                        <div className="text-left">
                          <div className="text-[14px] font-semibold">
                            Table of {capacity}
                          </div>
                          <div
                            className={`text-[11.5px] ${isChosen ? "text-[#360D19]/80" : "text-[#CFB790]"}`}
                          >
                            Section {activeModalSeat.section} · Up to {capacity} guests
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="num text-[16px] font-bold">
                          {formatINR(price)}
                        </span>
                        {isChosen && <Check className="w-4 h-4 text-[#360D19]" strokeWidth={2.5} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModalSeat(null)}
                className="px-4 py-2.5 rounded-[9px] bg-[#5B342E]/75 border border-[#875931]/50 text-[13px] font-medium text-[#F1DAA5] hover:bg-[#5B342E] cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleConfirmTableModal}
                className="!bg-[#F1DAA5] !text-[#360D19] hover:!bg-[#CFB790]"
              >
                <span>
                  Confirm Table of {pendingCapacity} · {formatINR(
                    sectionPrice(activeModalSeat.section,pendingCapacity),
                  )}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Sticky Bottom Checkout Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-[#360D19]/95 backdrop-blur-sm border-t border-[#875931]/50 shadow-modal">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-10 py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-[13px] font-medium text-[#CFB790] mr-1">Selected:</span>
            {selectedSeats.length === 0
              ? (
                <span className="text-[13px] text-[#CFB790]">
                  Tap any available table above to choose group size &amp; lock your spot
                </span>
              )
              : (
                selectedSeats.map((seat) => {
                  const cfg = selectedTableConfigs[seat.id];
                  const pillText = cfg
                    ? `Sec ${cfg.section} · Table ${cfg.tableNumber} (${cfg.capacity} Pax · ${formatINR(cfg.price)})`
                    : seat.label;
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => toggleSeat.mutate(seat.id)}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] bg-[#5B342E] border border-[#875931]/60 text-[12px] num font-medium text-[#F1DAA5] hover:border-[#F1DAA5] cursor-pointer active:scale-95 transition-all"
                    >
                      <span>{pillText}</span>
                      <X className="w-3.5 h-3.5 text-[#CFB790]" strokeWidth={1.75} />
                    </button>
                  );
                })
              )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
            <div className="text-left sm:text-right">
              <div className="text-[11px] text-[#CFB790] uppercase tracking-wider">
                Table Total ({breakdown.seatCount} {breakdown.seatCount === 1 ? "table" : "tables"})
              </div>
              <div className="num text-[20px] font-semibold text-[#F1DAA5]">
                {formatINR(displayTotalPayable)}
              </div>
            </div>

            {/* ONE Primary CTA */}
            <Button
              variant="primary"
              size="lg"
              disabled={selectedSeats.length === 0}
              onClick={() => onContinue(event.id)}
              className="!bg-[#F1DAA5] !text-[#360D19] hover:!bg-[#CFB790]"
            >
              <span>Continue to attendee details</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
