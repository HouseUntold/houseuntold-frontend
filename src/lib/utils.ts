export function cn(...classes: (string | boolean | undefined | null | Record<string, boolean>)[]): string {
  const result: string[] = [];

  for (const item of classes) {
    if (!item) continue;
    if (typeof item === "string") {
      result.push(item);
    } else if (typeof item === "object") {
      for (const [key, value] of Object.entries(item)) {
        if (value) result.push(key);
      }
    }
  }

  return result.join(" ");
}

export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ticketCategoryBreakdown(ticket: {
  couple_count?: number;
  stag_male_count?: number;
  stag_female_count?: number;
}): string {
  const part = (count = 0, singular: string, plural: string) =>
    count > 0 ? `${count} ${count === 1 ? singular : plural}` : "";
  return [
    part(ticket.couple_count, "couple", "couples"),
    part(ticket.stag_male_count, "single man", "single men"),
    part(ticket.stag_female_count, "single woman", "single women"),
  ].filter(Boolean).join(" · ");
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return isoString;
  }
}

const displayLabels: Record<string, string> = {
  ADMIN: "Admin",
  BARTENDER: "Bartender",
  CANCELLED: "Cancelled",
  CONFIRMED: "Confirmed",
  COUPLE: "Couple",
  DRAFT: "Draft",
  DRINK: "Drink",
  ENDED: "Ended",
  FOOD: "Food",
  GATEKEEPER: "Gate staff",
  LIVE: "Live",
  ON_SALE: "On sale",
  PENDING: "Pending approval",
  REJECTED: "Rejected",
  SCANNER: "Gate scanner",
  SOLD_OUT: "Sold out",
  STAG: "Single",
  STAG_FEMALE: "Single woman",
  STAG_MALE: "Single man",
};

export function formatLabel(value?: string): string {
  if (!value) return "—";
  const key = value.toUpperCase();
  if (displayLabels[key]) return displayLabels[key];
  return key.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || `${singular}s`;
}
