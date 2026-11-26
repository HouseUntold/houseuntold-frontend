import React from "react";
import type { TierType } from "../../lib/api/types";

interface TierBadgeProps {
  tier: TierType;
  label?: string;
  isAlcoholic?: boolean;
}

const TIER_STYLES: Record<TierType, { bg: string; text: string; border: string; defaultLabel: string }> = {
  VIP: {
    bg: "bg-[var(--color-surface-hover)]",
    text: "text-[var(--color-brand-hover)]",
    border: "border-[var(--color-brand-hover)]/25",
    defaultLabel: "VIP / Stage",
  },
  COUPLE: {
    bg: "bg-[var(--color-danger-bg)]",
    text: "text-[var(--color-danger)]",
    border: "border-[var(--color-danger)]/25",
    defaultLabel: "Couple",
  },
  GENERAL: {
    bg: "bg-[var(--color-success-bg)]",
    text: "text-[var(--color-success)]",
    border: "border-[var(--color-success)]/25",
    defaultLabel: "General",
  },
  STAG: {
    bg: "bg-[var(--color-canvas)]",
    text: "text-[var(--color-ink)]",
    border: "border-[var(--color-hairline)]",
    defaultLabel: "Single",
  },
  TABLE: {
    bg: "bg-[var(--color-brand)]",
    text: "text-[var(--color-brand-text)]",
    border: "border-[var(--color-brand)]",
    defaultLabel: "Table",
  },
};

export const TierBadge: React.FC<TierBadgeProps> = ({ tier, label, isAlcoholic }) => {
  const s = TIER_STYLES[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] border text-[12px] font-medium num whitespace-nowrap shrink-0 ${s.bg} ${s.text} ${s.border}`}
    >
      {typeof isAlcoholic === "boolean" && (
        <span
          aria-hidden="true"
          className={isAlcoholic
            ? "w-2 h-2 rounded-full bg-[var(--color-brand-hover)] shrink-0"
            : "w-2 h-2 rounded-full border-[1.75px] border-[var(--color-success)] bg-transparent shrink-0"}
        />
      )}
      <span>{label ?? s.defaultLabel}</span>
    </span>
  );
};

interface ZoneComplianceMarkerProps {
  isAlcoholic: boolean;
  minAge?: number;
}

export const ZoneComplianceMarker: React.FC<ZoneComplianceMarkerProps> = ({ isAlcoholic, minAge }) => {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] whitespace-nowrap">
      <span
        aria-hidden="true"
        className={isAlcoholic
          ? "w-2 h-2 rounded-full bg-[var(--color-brand-hover)] shrink-0"
          : "w-2 h-2 rounded-full border-[1.75px] border-[var(--color-success)] bg-transparent shrink-0"}
      />
      <span>{isAlcoholic ? `Alcoholic Zone (${minAge ?? 21}+)` : "Non-Alcoholic (All Ages)"}</span>
    </span>
  );
};
