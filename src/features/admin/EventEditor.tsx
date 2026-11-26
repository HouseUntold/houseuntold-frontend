import { eventsApi } from "@/api/endpoints/events";
import {
  useCreateEvent,
  useCreateTier,
  useEvent,
  useSetFirst99Active,
  useUpdateEvent,
  useUpdateTier,
} from "@/api/hooks/useEvents";
import { qk } from "@/api/keys";
import { queryClient } from "@/api/queryClient";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrencyINR, formatLabel, pluralize } from "@/lib/utils";
import { isValidEventText } from "@/lib/validation";
import { Event } from "@/models/event.schema";
import { useUiStore } from "@/stores/ui.store";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  MapPin,
  Music2,
  Pencil,
  Plus,
  Save,
  Ticket,
  Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

type DraftArtist = {
  id?: string;
  name: string;
  category: string;
  description: string;
};

type DraftTier = {
  id?: string;
  name: string;
  category: string;
  base_price: number;
  fnb_credit: number;
  entry_count: number;
  is_gender_strict: boolean;
};

type TableDraft = { id?: string; section: string; guestCount: number; totalAmount: number; fnbCredit: number };
type GroupDraft = { id?: string; kind: "COUPLE" | "STAG_MALE" | "STAG_FEMALE"; price: number; fnbCredit: number };
type SeatDraft = { section: string; table_size: number; total_tables: number; reserved_tables: number };

type Draft = {
  title: string;
  venueName: string;
  locationArea: string;
  transitInfo: string;
  advisoryNotice: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: "DRAFT" | "ON_SALE" | "SOLD_OUT" | "ENDED" | "LIVE";
  is_first_99_active: boolean;
  artists: DraftArtist[];
  tables: TableDraft[];
  groups: GroupDraft[];
  seats: SeatDraft[];
};

type Errors = Record<string, string>;

interface EventEditorProps {
  event?: Event;
  onDone: () => void;
}

const STEPS = ["Details", "Pricing", "Artists", "Review"] as const;
const SECTIONS = ["A", "B", "C"] as const;
const TABLE_SIZES = [5, 8, 10, 15] as const;
const TABLE_PRICES: Record<number, Record<string, number>> = {
  5: { A: 14999, B: 18999, C: 21999 },
  8: { A: 19999, B: 22999, C: 24999 },
  10: { A: 24999, B: 27999, C: 29999 },
  15: { A: 31999, B: 32999, C: 34999 },
};
const GROUP_OPTIONS: { kind: GroupDraft["kind"]; label: string; entryCount: number; strict: boolean; defaultPrice: number; defaultFnb: number }[] = [
  { kind: "COUPLE", label: "Couple", entryCount: 2, strict: true, defaultPrice: 3299, defaultFnb: 3000 },
  { kind: "STAG_MALE", label: "Single male", entryCount: 1, strict: false, defaultPrice: 1999, defaultFnb: 1999 },
  { kind: "STAG_FEMALE", label: "Single female", entryCount: 1, strict: false, defaultPrice: 999, defaultFnb: 999 },
];
const tableAmountFor = (size: number, section: string) => TABLE_PRICES[size]?.[section] ?? 0;
const groupDefaults = (kind: GroupDraft["kind"], id?: string) => {
  const opt = GROUP_OPTIONS.find((g) => g.kind === kind)!;
  return { id, kind, price: opt.defaultPrice, fnbCredit: opt.defaultFnb } as GroupDraft;
};

const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const defaultSeats = (): SeatDraft[] =>
  TABLE_SIZES.flatMap((table_size) =>
    SECTIONS.map((section) => ({ section, table_size, total_tables: 0, reserved_tables: 0 })),
  );

const parseTableTier = (tier: DraftTier): TableDraft | null => {
  const name = tier.name.trim().toUpperCase();
  if (!name.startsWith("GROUP") && !name.startsWith("TABLE")) return null;
  const parts = name.split("_");
  let section = "";
  let size = Number(tier.entry_count || 0);
  if (parts.length >= 3) {
    if (SECTIONS.includes(parts[1] as any) && /^\d+$/.test(parts[2])) { section = parts[1]; size = Number(parts[2]); }
    else if (/^\d+$/.test(parts[1]) && SECTIONS.includes(parts[2] as any)) { size = Number(parts[1]); section = parts[2]; }
  }
  if (!section) section = SECTIONS.includes((tier.category || "").toUpperCase() as any) ? (tier.category || "A").toUpperCase() : "A";
  if (!TABLE_SIZES.includes(size as any)) size = TABLE_SIZES.includes(Number(tier.entry_count) as any) ? Number(tier.entry_count) : 5;
  return { id: tier.id, section, guestCount: size, totalAmount: Number(tier.base_price || 0), fnbCredit: Number((tier as any).raw_fnb_credit ?? tier.fnb_credit ?? tier.base_price ?? 0) };
};

const tierToGroup = (tier: DraftTier): GroupDraft | null => {
  const name = tier.name.trim().toUpperCase();
  if (!GROUP_OPTIONS.some((g) => g.kind === name)) return null;
  return { id: tier.id, kind: name as GroupDraft["kind"], price: Number(tier.base_price || 0), fnbCredit: Number((tier as any).raw_fnb_credit ?? tier.fnb_credit ?? tier.base_price ?? 0) };
};

const makeDraft = (event?: Event, existingSeats?: SeatDraft[]): Draft => {
  const tiers = (event?.ticketTiers || []).map((tier) => ({
    id: tier.id,
    name: tier.name,
    category: tier.category || "MAIN_FLOOR",
    base_price: Number(tier.base_price ?? tier.price ?? 0),
    fnb_credit: Number((tier as any).raw_fnb_credit ?? tier.fnb_credit ?? 0),
    entry_count: Number(tier.entry_count || 1),
    is_gender_strict: Boolean(tier.is_gender_strict),
  }));
  return {
    title: event?.title || "",
    venueName: event?.venueName || event?.venue?.name || "Venue to be announced",
    locationArea: event?.locationArea || "Pune",
    transitInfo: event?.transitInfo || "",
    advisoryNotice: event?.advisoryNotice || "A valid government photo ID is required for entry to 21+ areas.",
    description: event?.description || "",
    startsAt: toLocalInput(event?.startsAt),
    endsAt: toLocalInput(event?.endsAt),
    status: event?.status || "ON_SALE",
    is_first_99_active: event?.is_first_99_active ?? true,
    artists: (event?.artists || []).map((artist) => ({
      id: artist.id,
      name: artist.name,
      category: artist.category,
      description: artist.description || "",
    })),
    tables: tiers.map(parseTableTier).filter(Boolean) as TableDraft[],
    groups: (() => {
      const seen = new Set<string>();
      const out: GroupDraft[] = [];
      for (const t of tiers) {
        const g = tierToGroup(t);
        if (!g || seen.has(g.kind)) continue;
        seen.add(g.kind);
        out.push(g);
      }
      return out;
    })(),
    seats: existingSeats ?? defaultSeats(),
  };
};

const draftToTiers = (draft: Draft): DraftTier[] => [
  ...draft.tables.map((t) => ({ id: t.id, name: `GROUP_${t.section}_${t.guestCount}`, category: t.section, base_price: t.totalAmount, fnb_credit: t.fnbCredit, entry_count: t.guestCount, is_gender_strict: false })),
  ...draft.groups.map((g) => {
    const opt = GROUP_OPTIONS.find((o) => o.kind === g.kind)!;
    return { id: g.id, name: g.kind, category: "MAIN_FLOOR", base_price: g.price, fnb_credit: g.fnbCredit, entry_count: opt.entryCount, is_gender_strict: opt.strict };
  }),
];

const backendStatus = (status: Draft["status"]) => (status === "LIVE" ? "ON_SALE" : status);

const textError = (label: string, value: string, min: number, max: number) => {
  const trimmed = value.trim();
  if (!trimmed && min === 0) return "";
  if (trimmed.length < min) return `${label} must be at least ${min} characters.`;
  if (trimmed.length > max) return `${label} must be at most ${max} characters.`;
  if (!isValidEventText(trimmed)) return `${label} can contain only letters, numbers, spaces, and common punctuation.`;
  return "";
};

const validateDraft = (draft: Draft): Errors => {
  const errors: Errors = {};
  const put = (key: string, message: string) => { if (message) errors[key] = message; };
  put("title", textError("Event title", draft.title, 4, 120));
  put("venueName", textError("Venue name", draft.venueName, 2, 120));
  put("locationArea", textError("Location area", draft.locationArea, 2, 120));
  put("transitInfo", textError("Transit information", draft.transitInfo, 0, 180));
  put("advisoryNotice", textError("Advisory notice", draft.advisoryNotice, 0, 240));
  put("description", textError("Event description", draft.description, 0, 2000));
  if (!draft.startsAt) errors.startsAt = "Start date and time are required.";
  if (!draft.endsAt) errors.endsAt = "End date and time are required.";
  if (draft.startsAt && draft.endsAt && new Date(draft.endsAt) <= new Date(draft.startsAt)) errors.timing = "End time must be after start time.";
  return errors;
};

const validateAmount = (value: number, label = "Amount") =>
  Number.isFinite(value) && value >= 0 && value <= 1000000 ? "" : `${label} must be between ₹0 and ₹10,00,000.`;

const emptyArtist = (): DraftArtist => ({ name: "", category: "HEADLINER", description: "" });
const emptyTable = (): TableDraft => { const totalAmount = tableAmountFor(5, "A"); return { section: "A", guestCount: 5, totalAmount, fnbCredit: totalAmount }; };
const emptyGroup = (): GroupDraft => groupDefaults("COUPLE");

export const EventEditor: React.FC<EventEditorProps> = ({ event: eventProp, onDone }) => {
  const { data: freshEvent } = useEvent(eventProp?.id || "");
  const event = freshEvent ?? eventProp;
  const [draft, setDraft] = useState<Draft>(() => makeDraft(event));
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [tableForm, setTableForm] = useState<TableDraft>(emptyTable);
  const [tableErrors, setTableErrors] = useState<Errors>({});
  const [editingTableIndex, setEditingTableIndex] = useState<number | null>(null);
  const [groupForm, setGroupForm] = useState<GroupDraft>(emptyGroup);
  const [groupErrors, setGroupErrors] = useState<Errors>({});
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);
  const [artistForm, setArtistForm] = useState<DraftArtist>(emptyArtist);
  const [artistErrors, setArtistErrors] = useState<Errors>({});
  const [editingArtistIndex, setEditingArtistIndex] = useState<number | null>(null);
  const [reviewUnlocked, setReviewUnlocked] = useState(Boolean(event));
  const [seatsLoading, setSeatsLoading] = useState(false);

  const hasUserEditedRef = useRef(false);
  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const setFirst99ActiveMutation = useSetFirst99Active();
  const createTierMutation = useCreateTier();
  const updateTierMutation = useUpdateTier();
  const { showToast } = useUiStore();

  const [originalSeats, setOriginalSeats] = useState<SeatDraft[]>(defaultSeats());
  const baseOriginal = useMemo(() => makeDraft(event, originalSeats), [event, originalSeats]);
  const tiers = useMemo(() => draftToTiers(draft), [draft]);
  const originalTiers = useMemo(() => draftToTiers(baseOriginal), [baseOriginal]);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseOriginal);

  // Reset editor when switching to a different event
  useEffect(() => {
    hasUserEditedRef.current = false;
    const freshSeats = defaultSeats();
    setOriginalSeats(freshSeats);
    setDraft(makeDraft(eventProp, freshSeats));
    setStep(0);
    setErrors({});
    setTableForm(emptyTable()); setTableErrors({}); setEditingTableIndex(null);
    setGroupForm(emptyGroup()); setGroupErrors({}); setEditingGroupIndex(null);
    setArtistForm(emptyArtist()); setArtistErrors({}); setEditingArtistIndex(null);
    setReviewUnlocked(Boolean(eventProp));
  }, [eventProp?.id]);

  // Hydrate full details when freshEvent finishes loading (without overwriting user edits or loaded seats)
  useEffect(() => {
    if (!freshEvent || hasUserEditedRef.current) return;
    setDraft((prev) => makeDraft(freshEvent, prev.seats));
    setReviewUnlocked(true);
  }, [freshEvent]);

  // Load seating inventory for existing event
  useEffect(() => {
    if (!eventProp?.id) return;
    let alive = true;
    setSeatsLoading(true);
    eventsApi.seats(eventProp.id).then((snap: any) => {
      if (!alive) return;
      const byKey = new Map<string, any>();
      for (const g of (snap?.groups || [])) byKey.set(`${String(g.section || "A").toUpperCase()}-${Number(g.table_size || 0)}`, g);
      const seats = defaultSeats().map((seat) => {
        const g = byKey.get(`${seat.section}-${seat.table_size}`);
        return g ? { ...seat, total_tables: Number(g.total_tables || 0), reserved_tables: Number(g.reserved_tables || 0) } : seat;
      });
      setOriginalSeats(seats);
      setDraft((prev) => ({ ...prev, seats }));
    }).catch(() => {}).finally(() => { if (alive) setSeatsLoading(false); });
    return () => { alive = false; };
  }, [eventProp?.id]);

  const markEdited = () => {
    hasUserEditedRef.current = true;
  };

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    markEdited();
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev }; delete next[key as string]; delete next.timing; return next;
    });
  };

  const money = (raw: string) => { const c = raw.replace(/[^0-9]/g, ""); return c === "" ? 0 : Math.min(1000000, Number(c)); };
  const setSeatTotal = (section: string, tableSize: number, raw: string) => {
    markEdited();
    const value = Math.min(10000, Math.max(0, Number(raw.replace(/[^0-9]/g, "") || 0)));
    setDraft((prev) => ({ ...prev, seats: prev.seats.map((s) => s.section === section && s.table_size === tableSize ? { ...s, total_tables: value } : s) }));
  };

  const validateTableForm = () => {
    const next: Errors = {};
    const a = validateAmount(tableForm.totalAmount, "Table amount");
    const f = validateAmount(tableForm.fnbCredit, "F&B credit");
    if (tableForm.totalAmount <= 0) next.totalAmount = "Table amount must be greater than ₹0.";
    if (a) next.totalAmount = a;
    if (f) next.fnbCredit = f;
    if (tableForm.fnbCredit > tableForm.totalAmount) next.fnbCredit = "F&B credit cannot exceed table amount.";
    setTableErrors(next);
    return Object.keys(next).length === 0;
  };

  const addTable = () => {
    if (!validateTableForm()) { showToast("Fix table pricing fields.", "warning"); return; }
    const item = { ...tableForm };
    const dup = draft.tables.findIndex((t, i) => i !== editingTableIndex && t.section === item.section && t.guestCount === item.guestCount);
    if (dup >= 0) { setTableErrors({ totalAmount: `Section ${item.section} · ${item.guestCount} guests already exists.` }); showToast("That table section/size is already added.", "warning"); return; }
    markEdited();
    setDraft((prev) => ({ ...prev, tables: editingTableIndex === null ? [...prev.tables, item] : prev.tables.map((t, i) => i === editingTableIndex ? { ...t, ...item, id: t.id } : t) }));
    setTableForm(emptyTable()); setTableErrors({}); setEditingTableIndex(null);
  };

  const editTable = (i: number) => { setTableForm({ ...draft.tables[i] }); setTableErrors({}); setEditingTableIndex(i); };
  const removeTable = (i: number) => {
    markEdited();
    const t = draft.tables[i];
    if (t?.id) showToast("Removed from draft. Existing DB tier is not auto-deleted.", "info");
    setDraft((p) => ({ ...p, tables: p.tables.filter((_, idx) => idx !== i) }));
    if (editingTableIndex === i) { setTableForm(emptyTable()); setEditingTableIndex(null); }
  };

  const validateGroupForm = () => {
    const next: Errors = {};
    const a = validateAmount(groupForm.price, "Price"); const f = validateAmount(groupForm.fnbCredit, "F&B credit");
    if (groupForm.price <= 0) next.price = "Price must be greater than ₹0.";
    if (a) next.price = a; if (f) next.fnbCredit = f;
    if (groupForm.fnbCredit > groupForm.price) next.fnbCredit = "F&B credit cannot exceed price.";
    setGroupErrors(next);
    return Object.keys(next).length === 0;
  };

  const addGroup = () => {
    if (!validateGroupForm()) { showToast("Fix group pricing fields.", "warning"); return; }
    const item = { ...groupForm };
    markEdited();
    setDraft((prev) => {
      const exists = prev.groups.findIndex((g) => g.kind === item.kind);
      if (editingGroupIndex !== null) return { ...prev, groups: prev.groups.map((g, i) => i === editingGroupIndex ? { ...item, id: g.id } : g) };
      if (exists >= 0) return { ...prev, groups: prev.groups.map((g, i) => i === exists ? { ...item, id: g.id } : g) };
      return { ...prev, groups: [...prev.groups, item] };
    });
    setGroupForm(emptyGroup()); setGroupErrors({}); setEditingGroupIndex(null);
  };

  const editGroup = (i: number) => { setGroupForm({ ...draft.groups[i] }); setGroupErrors({}); setEditingGroupIndex(i); };
  const removeGroup = (i: number) => {
    markEdited();
    const g = draft.groups[i];
    if (g?.id) showToast("Removed from draft. Existing DB tier is not auto-deleted.", "info");
    setDraft((p) => ({ ...p, groups: p.groups.filter((_, idx) => idx !== i) }));
    if (editingGroupIndex === i) { setGroupForm(emptyGroup()); setEditingGroupIndex(null); }
  };

  const validateArtistForm = () => {
    const next: Errors = {};
    const name = textError("Artist name", artistForm.name, 2, 80);
    const category = textError("Artist role", artistForm.category, 2, 80);
    const description = textError("Artist notes", artistForm.description, 0, 240);
    if (name) next.name = name; if (category) next.category = category; if (description) next.description = description;
    setArtistErrors(next);
    return Object.keys(next).length === 0;
  };

  const addArtist = () => {
    if (!validateArtistForm()) { showToast("Please correct the highlighted artist fields.", "warning"); return; }
    markEdited();
    const artist: DraftArtist = {
      ...(editingArtistIndex !== null ? draft.artists[editingArtistIndex] : {}),
      name: artistForm.name.trim(),
      category: artistForm.category.trim(),
      description: artistForm.description.trim(),
    };
    setDraft((prev) => ({
      ...prev,
      artists: editingArtistIndex === null
        ? [...prev.artists, artist]
        : prev.artists.map((item, index) => (index === editingArtistIndex ? artist : item)),
    }));
    setArtistForm(emptyArtist());
    setArtistErrors({});
    setEditingArtistIndex(null);
  };

  const editArtist = (index: number) => {
    setArtistForm({ ...draft.artists[index] });
    setArtistErrors({});
    setEditingArtistIndex(index);
  };

  const removeArtist = (index: number) => {
    markEdited();
    setDraft((prev) => ({ ...prev, artists: prev.artists.filter((_, i) => i !== index) }));
    if (editingArtistIndex === index) {
      setArtistForm(emptyArtist());
      setEditingArtistIndex(null);
    }
  };

  const goNext = () => {
    if (step === 0) {
      const nextErrors = validateDraft(draft);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) { showToast("Please correct the highlighted event details.", "warning"); return; }
    }
    if (step === 1) {
      const hasPricing = draft.tables.length > 0 || draft.groups.length > 0;
      if (!hasPricing) { showToast("Add at least one table or group price before continuing.", "warning"); return; }
      const badSeat = draft.seats.find((s) => s.total_tables < s.reserved_tables);
      if (badSeat) { showToast(`Section ${badSeat.section}, ${badSeat.table_size} guests: total cannot be below reserved (${badSeat.reserved_tables}).`, "warning"); return; }
    }
    const next = Math.min(step + 1, STEPS.length - 1);
    if (next === STEPS.length - 1) setReviewUnlocked(true);
    setStep(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== STEPS.length - 1) { goNext(); return; }
    const nextErrors = { ...validateDraft(draft) };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { showToast("Please correct the highlighted fields.", "warning"); setStep(0); return; }
    if (draft.tables.length === 0 && draft.groups.length === 0) { showToast("Add at least one pricing entry.", "warning"); setStep(1); return; }

    setSaving(true);
    try {
      const payload = {
        title: draft.title.trim(),
        startsAt: new Date(draft.startsAt).toISOString(),
        endsAt: new Date(draft.endsAt).toISOString(),
        location: `${draft.venueName.trim()}, ${draft.locationArea.trim()}`,
        venueName: draft.venueName.trim(),
        locationArea: draft.locationArea.trim(),
        transitInfo: draft.transitInfo.trim(),
        advisoryNotice: draft.advisoryNotice.trim(),
        description: draft.description.trim(),
        status: backendStatus(draft.status),
        artists: draft.artists.map((artist) => ({ ...(artist.id ? { id: artist.id } : {}), name: artist.name.trim(), category: artist.category.trim() || "PERFORMER", description: artist.description.trim() })),
      };

      let eventId = event?.id;
      if (!eventId) {
        const created = await createEventMutation.mutateAsync({ ...payload, status: payload.status as any });
        eventId = created.id;
      } else {
        await updateEventMutation.mutateAsync({ id: eventId, input: { ...payload, status: payload.status as any } });
      }

      if (draft.is_first_99_active !== baseOriginal.is_first_99_active) {
        await setFirst99ActiveMutation.mutateAsync({ eventId, isFirst99Active: draft.is_first_99_active });
      }

      for (const tier of tiers) {
        const data = { name: tier.name, category: tier.category, base_price: tier.base_price, fnb_credit: tier.fnb_credit, entry_count: tier.entry_count, is_gender_strict: tier.is_gender_strict };
        if (tier.id && event) {
          const before = originalTiers.find((item) => item.id === tier.id);
          if (before && JSON.stringify({ ...before, id: undefined }) !== JSON.stringify({ ...tier, id: undefined })) {
            await updateTierMutation.mutateAsync({ tierId: tier.id, data });
          }
        } else {
          await createTierMutation.mutateAsync({ eventId: eventId!, data });
        }
      }

      const seatRows = draft.seats.map((s) => {
        const tier = draft.tables.find((t) => t.section === s.section && t.guestCount === s.table_size);
        const amount = tier ? tier.totalAmount : tableAmountFor(s.table_size, s.section);
        const fnb = tier ? tier.fnbCredit : amount;
        return { section: s.section, table_size: s.table_size, total_tables: s.total_tables, table_total: amount, fnb_credit: fnb };
      });
      await eventsApi.configureSeating(eventId!, seatRows);
      await queryClient.invalidateQueries({ queryKey: qk.events.all });
      await queryClient.invalidateQueries({ queryKey: qk.events.seats(eventId!) });
      await queryClient.invalidateQueries({ queryKey: qk.analytics.all });

      showToast(event ? "Event updated." : "Event created.", "success");
      onDone();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Could not save the event. Please try again.", "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="w-full max-w-full overflow-x-hidden space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onDone}
            className="inline-flex items-center gap-1.5 min-h-[44px] -ml-2 px-2 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors duration-150 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to events
          </button>
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-ink)] tracking-tight leading-tight truncate">
            {event ? event.title : "New event"}
          </h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:justify-end shrink-0">
          {isDirty && (
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-[var(--color-brand)]/10 text-[var(--color-brand)] text-xs font-medium">
              Unsaved
            </span>
          )}
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={() => setStep((prev) => prev - 1)} className="flex-1 sm:flex-none">
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext} className="flex-1 sm:flex-none">
              Next
            </Button>
          ) : (
            <Button type="submit" isLoading={saving} className="flex-1 sm:flex-none">
              <Save className="w-4 h-4 mr-1.5" /> {event ? "Save" : "Create"}
            </Button>
          )}
        </div>
      </div>

      {/* Stepper: Clean 4-column grid on mobile (no horizontal page scroll) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STEPS.map((label, index) => {
          const canOpen = Boolean(event) || index < step || (index === STEPS.length - 1 && reviewUnlocked);
          const active = index === step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => canOpen && setStep(index)}
              disabled={!canOpen}
              className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center sm:justify-start transition-[background-color,color,border-color,transform] duration-150 ease-[var(--ease-out)] cursor-pointer disabled:cursor-not-allowed active:scale-[0.98] ${
                active
                  ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border-[var(--color-brand)]/30"
                  : index < step
                  ? "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/30"
                  : "bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-hairline)]"
              }`}
            >
              <span className="mr-1.5 inline-flex w-5 h-5 items-center justify-center rounded-full bg-current/10 text-[11px] shrink-0">
                {index + 1}
              </span>
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {step === 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 min-w-0 space-y-6">
            <Card className="p-4 sm:p-6 space-y-5">
              <SectionTitle icon={CalendarDays} title="Event Details" subtitle="Title, schedule, and visibility." />
              <Input
                label="Event Title"
                value={draft.title}
                maxLength={120}
                error={errors.title}
                hint="4–120 characters. Letters, numbers and common punctuation."
                onChange={(e) => update("title", e.target.value)}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <DateTimeField
                    label="Start"
                    value={draft.startsAt}
                    onChange={(value) => update("startsAt", value)}
                    required
                  />
                  {errors.startsAt && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.startsAt}</p>}
                </div>
                <div className="min-w-0">
                  <DateTimeField
                    label="End"
                    value={draft.endsAt}
                    onChange={(value) => update("endsAt", value)}
                    required
                  />
                  {errors.endsAt && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.endsAt}</p>}
                </div>
              </div>
              {errors.timing && <p className="text-xs font-semibold text-[var(--color-danger)]">{errors.timing}</p>}
              <Select
                label="Visibility"
                value={draft.status}
                onChange={(e) => update("status", e.target.value as Draft["status"])}
                options={[
                  { value: "ON_SALE", label: "On sale — visible and bookable" },
                  { value: "DRAFT", label: "Draft — hidden from guests" },
                  { value: "SOLD_OUT", label: "Sold out — visible, not bookable" },
                  { value: "ENDED", label: "Ended — archived" },
                  { value: "LIVE", label: "Live — happening now" },
                ]}
              />
              <TextareaField
                label="Event Description"
                value={draft.description}
                maxLength={2000}
                rows={5}
                error={errors.description}
                hint="Up to 2,000 characters. Use line breaks to separate paragraphs."
                placeholder="Describe the concept, sound, production, dress code and experience..."
                onChange={(value) => update("description", value)}
              />
            </Card>

            <Card className="p-4 sm:p-6 space-y-5">
              <SectionTitle icon={MapPin} title="Venue & Arrival" subtitle="Location details shown on the public event page" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Venue Name"
                  value={draft.venueName}
                  maxLength={120}
                  error={errors.venueName}
                  hint="2–120 characters"
                  onChange={(e) => update("venueName", e.target.value)}
                  required
                />
                <Input
                  label="Neighbourhood / Area"
                  value={draft.locationArea}
                  maxLength={120}
                  error={errors.locationArea}
                  hint="2–120 characters"
                  onChange={(e) => update("locationArea", e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Transit Information"
                  value={draft.transitInfo}
                  maxLength={180}
                  error={errors.transitInfo}
                  hint="Up to 180 characters"
                  onChange={(e) => update("transitInfo", e.target.value)}
                />
                <Input
                  label="Guest Advisory"
                  value={draft.advisoryNotice}
                  maxLength={240}
                  error={errors.advisoryNotice}
                  hint="Up to 240 characters"
                  onChange={(e) => update("advisoryNotice", e.target.value)}
                />
              </div>
            </Card>
          </div>
          <ReviewCard draft={draft} />
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 min-w-0 space-y-6">
            <Card className="p-4 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <SectionTitle icon={Ticket} title="Table pricing" subtitle="Add each table like an artist entry: choose size, section, total amount, and F&B credit." />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    markEdited();
                    const tables: TableDraft[] = TABLE_SIZES.flatMap((guestCount) =>
                      SECTIONS.map((section) => {
                        const totalAmount = tableAmountFor(guestCount, section);
                        return { section, guestCount, totalAmount, fnbCredit: totalAmount };
                      }),
                    );
                    const groups: GroupDraft[] = GROUP_OPTIONS.map((g) => ({ kind: g.kind, price: g.defaultPrice, fnbCredit: g.defaultFnb }));
                    setDraft((p) => ({ ...p, tables, groups }));
                    setTableForm(emptyTable()); setGroupForm(emptyGroup());
                    showToast("Recommended pricing loaded. You can edit any row before saving.", "success");
                  }}
                >
                  Load recommended
                </Button>
              </div>
              <label className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={draft.is_first_99_active}
                  onChange={(e) => update("is_first_99_active", e.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-[var(--color-brand)] shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--color-ink)]">First 99 women at ₹1</span>
                  <span className="block text-xs text-[var(--color-muted)] mt-1 leading-relaxed">
                    When on, early women pay ₹1 with no bar credit. When off, normal female pricing applies.
                  </span>
                </span>
              </label>
              <div className="p-4 rounded-2xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)] space-y-3">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {editingTableIndex === null ? "Add table pricing" : `Edit table ${editingTableIndex + 1}`}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Table size"
                    value={String(tableForm.guestCount)}
                    onChange={(e) => {
                      const guestCount = Number(e.target.value);
                      const suggested = tableAmountFor(guestCount, tableForm.section);
                      setTableForm((p) => ({ ...p, guestCount, totalAmount: suggested, fnbCredit: suggested }));
                    }}
                    options={TABLE_SIZES.map((size) => ({ value: String(size), label: `${size} guests` }))}
                  />
                  <Select
                    label="Section"
                    value={tableForm.section}
                    onChange={(e) => {
                      const section = e.target.value;
                      const suggested = tableAmountFor(tableForm.guestCount, section);
                      setTableForm((p) => ({ ...p, section, totalAmount: suggested, fnbCredit: suggested }));
                    }}
                    options={SECTIONS.map((section) => ({ value: section, label: `Section ${section}` }))}
                  />
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    label="Total table amount"
                    value={String(tableForm.totalAmount)}
                    error={tableErrors.totalAmount}
                    leading={<span className="text-sm font-medium text-[var(--color-muted)]">₹</span>}
                    onChange={(e) => {
                      const totalAmount = money(e.target.value);
                      setTableForm((p) => ({ ...p, totalAmount, fnbCredit: totalAmount }));
                    }}
                    hint="Amount paid and F&B credit are the same"
                  />
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    label="F&B credit"
                    value={String(tableForm.fnbCredit)}
                    error={tableErrors.fnbCredit}
                    leading={<span className="text-sm font-medium text-[var(--color-muted)]">₹</span>}
                    onChange={(e) => setTableForm((p) => ({ ...p, fnbCredit: money(e.target.value) }))}
                    hint="Defaults to table amount"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={addTable}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    {editingTableIndex === null ? "Add table" : "Update table"}
                  </Button>
                  {editingTableIndex !== null && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setTableForm(emptyTable()); setTableErrors({}); setEditingTableIndex(null); }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
              <div className="w-full overflow-x-auto rounded-xl border border-[var(--color-hairline)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-canvas)] text-[11px] text-[var(--color-muted)]">
                    <tr>
                      <th className="px-3 py-3 font-medium">Table</th>
                      <th className="px-3 py-3 font-medium">Amount</th>
                      <th className="px-3 py-3 font-medium">Wallet</th>
                      <th className="px-3 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.tables.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">No table pricing added yet.</td></tr>
                    ) : draft.tables.map((t, i) => (
                      <tr key={t.id || `table-${i}`} className="border-t border-[var(--color-hairline)]">
                        <td className="px-3 py-3 font-medium text-[var(--color-ink)] whitespace-nowrap">{t.guestCount} guests · Sec {t.section}</td>
                        <td className="px-3 py-3 text-[var(--color-muted)] num whitespace-nowrap">{formatCurrencyINR(t.totalAmount)}</td>
                        <td className="px-3 py-3 text-[var(--color-muted)] num whitespace-nowrap">{formatCurrencyINR(t.fnbCredit)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            <button type="button" onClick={() => editTable(i)} className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-ink)] hover:bg-[var(--color-brand)]/12 cursor-pointer" aria-label="Edit table"><Pencil className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => removeTable(i)} className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15 cursor-pointer" aria-label="Remove table"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 space-y-5">
              <SectionTitle icon={Ticket} title="Seating setup" subtitle="Set guest count, section, and max tables available. Saved to DB on Save." />
              <div className="w-full overflow-x-auto rounded-xl border border-[var(--color-hairline)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-canvas)] text-[11px] text-[var(--color-muted)]">
                    <tr>
                      <th className="px-3 py-3 font-medium">Sec</th>
                      <th className="px-3 py-3 font-medium">Guests</th>
                      <th className="px-3 py-3 font-medium">Reserved</th>
                      <th className="px-3 py-3 font-medium">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seatsLoading ? (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">Loading seating...</td></tr>
                    ) : draft.seats.map((s) => (
                      <tr key={`${s.section}-${s.table_size}`} className="border-t border-[var(--color-hairline)]">
                        <td className="px-3 py-3 font-medium text-[var(--color-ink)]">{s.section}</td>
                        <td className="px-3 py-3 text-[var(--color-muted)]">{s.table_size}</td>
                        <td className="px-3 py-3 text-[var(--color-muted)] num">{s.reserved_tables}</td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={String(s.total_tables)}
                            onChange={(e) => setSeatTotal(s.section, s.table_size, e.target.value)}
                            className="w-20 sm:w-28 min-h-[40px] px-2.5 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-sm text-[var(--color-ink)]"
                            aria-label={`Max tables for section ${s.section} ${s.table_size} guests`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 space-y-5">
              <SectionTitle icon={Ticket} title="Group pricing" subtitle="Add couple, single male, and single female pricing with individual F&B credit." />
              <div className="p-4 rounded-2xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)] space-y-3">
                <p className="text-sm font-semibold text-[var(--color-ink)]">{editingGroupIndex === null ? "Add group pricing" : "Edit group pricing"}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select label="Category" value={groupForm.kind} onChange={(e) => setGroupForm((p) => groupDefaults(e.target.value as GroupDraft["kind"], p.id))} options={GROUP_OPTIONS.map((g) => ({ value: g.kind, label: g.label }))} />
                  <Input type="text" inputMode="numeric" pattern="[0-9]*" label="Price" value={String(groupForm.price)} error={groupErrors.price} leading={<span className="text-sm font-medium text-[var(--color-muted)]">₹</span>} onChange={(e) => setGroupForm((p) => ({ ...p, price: money(e.target.value) }))} />
                  <Input type="text" inputMode="numeric" pattern="[0-9]*" label="F&B credit" value={String(groupForm.fnbCredit)} error={groupErrors.fnbCredit} leading={<span className="text-sm font-medium text-[var(--color-muted)]">₹</span>} onChange={(e) => setGroupForm((p) => ({ ...p, fnbCredit: money(e.target.value) }))} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={addGroup}><Plus className="w-3.5 h-3.5 mr-1.5" />{editingGroupIndex === null ? "Add group" : "Update group"}</Button>
                  {editingGroupIndex !== null && <Button type="button" variant="ghost" size="sm" onClick={() => { setGroupForm(emptyGroup()); setGroupErrors({}); setEditingGroupIndex(null); }}>Cancel</Button>}
                </div>
              </div>
              <div className="w-full overflow-x-auto rounded-xl border border-[var(--color-hairline)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-canvas)] text-[11px] text-[var(--color-muted)]">
                    <tr>
                      <th className="px-3 py-3 font-medium">Category</th>
                      <th className="px-3 py-3 font-medium">Price</th>
                      <th className="px-3 py-3 font-medium">Wallet</th>
                      <th className="px-3 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.groups.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">No group pricing added yet.</td></tr>
                    ) : draft.groups.map((g, i) => {
                      const label = GROUP_OPTIONS.find((o) => o.kind === g.kind)?.label || g.kind;
                      return (
                        <tr key={g.kind} className="border-t border-[var(--color-hairline)]">
                          <td className="px-3 py-3 font-medium text-[var(--color-ink)] whitespace-nowrap">{label}</td>
                          <td className="px-3 py-3 text-[var(--color-muted)] num whitespace-nowrap">{formatCurrencyINR(g.price)}</td>
                          <td className="px-3 py-3 text-[var(--color-muted)] num whitespace-nowrap">{formatCurrencyINR(g.fnbCredit)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex justify-end gap-1.5">
                              <button type="button" onClick={() => editGroup(i)} className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-ink)] hover:bg-[var(--color-brand)]/12 cursor-pointer" aria-label={`Edit ${label}`}><Pencil className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => removeGroup(i)} className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15 cursor-pointer" aria-label={`Remove ${label}`}><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <ReviewCard draft={draft} />
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 min-w-0 space-y-6">
            <Card className="p-4 sm:p-6 space-y-5">
              <SectionTitle
                icon={Music2}
                title="Artists & Performers"
                subtitle="Add one artist at a time. Edit or delete from Actions."
              />
              <div className="p-4 rounded-2xl bg-[var(--color-canvas)]/70 border border-[var(--color-hairline)] space-y-3">
                <p className="text-sm font-bold text-[var(--color-ink)]">
                  {editingArtistIndex === null ? "Add an artist" : `Edit artist ${editingArtistIndex + 1}`}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Artist or DJ name"
                    placeholder="e.g. DJ Sarthak"
                    value={artistForm.name}
                    maxLength={80}
                    error={artistErrors.name}
                    onChange={(e) => setArtistForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    label="Role"
                    placeholder="Headliner, Resident, Live Vocalist"
                    value={artistForm.category}
                    maxLength={80}
                    error={artistErrors.category}
                    onChange={(e) => setArtistForm((prev) => ({ ...prev, category: e.target.value }))}
                  />
                </div>
                <Input
                  label="Artist notes"
                  placeholder="Set time or short description"
                  value={artistForm.description}
                  maxLength={240}
                  error={artistErrors.description}
                  onChange={(e) => setArtistForm((prev) => ({ ...prev, description: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={addArtist}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    {editingArtistIndex === null ? "Add artist" : "Update artist"}
                  </Button>
                  {editingArtistIndex !== null && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setArtistForm(emptyArtist());
                        setArtistErrors({});
                        setEditingArtistIndex(null);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              <div className="w-full overflow-x-auto rounded-xl border border-[var(--color-hairline)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-canvas)] text-[11px] text-[var(--color-muted)]">
                    <tr>
                      <th className="px-3 py-3 font-medium text-left">Artist</th>
                      <th className="px-3 py-3 font-medium text-left">Role</th>
                      <th className="px-3 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.artists.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">
                          No artists added yet.
                        </td>
                      </tr>
                    ) : draft.artists.map((artist, index) => (
                      <tr key={artist.id || `artist-${index}`} className="border-t border-[var(--color-hairline)]">
                        <td className="px-3 py-2.5 font-semibold text-[var(--color-ink)]">{artist.name}</td>
                        <td className="px-3 py-2.5 text-[var(--color-muted)]">{artist.category}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => editArtist(index)}
                              className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-ink)] hover:bg-[var(--color-brand)]/20 cursor-pointer"
                              title="Edit artist"
                              aria-label="Edit artist"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeArtist(index)}
                              className="p-2 rounded-lg bg-[var(--color-danger)]/15 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/25 cursor-pointer"
                              title="Delete artist"
                              aria-label="Delete artist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <ReviewCard draft={draft} />
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 min-w-0 space-y-6">
            <Card className="p-4 sm:p-6 space-y-5">
              <SectionTitle icon={CheckCircle2} title="Review" subtitle="Confirm pricing, seating, and details before saving." />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] space-y-2 text-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Tables</p>
                  {draft.tables.length === 0 ? <p className="text-[var(--color-muted)]">No table pricing.</p> : draft.tables.map((t, i) => <SummaryRow key={t.id || i} label={`${t.guestCount} guests · ${t.section}`} value={`${formatCurrencyINR(t.totalAmount)} / F&B ${formatCurrencyINR(t.fnbCredit)}`} />)}
                </div>
                <div className="p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] space-y-2 text-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Groups</p>
                  {draft.groups.length === 0 ? <p className="text-[var(--color-muted)]">No group pricing.</p> : draft.groups.map((g) => <SummaryRow key={g.kind} label={GROUP_OPTIONS.find((o) => o.kind === g.kind)?.label || g.kind} value={`${formatCurrencyINR(g.price)} / F&B ${formatCurrencyINR(g.fnbCredit)}`} />)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-hairline)] space-y-2 text-xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Seating</p>
                {draft.seats.filter((s) => s.total_tables > 0).length === 0 ? <p className="text-[var(--color-muted)]">No seating inventory configured.</p>
                : draft.seats.filter((s) => s.total_tables > 0).map((s) => <SummaryRow key={`${s.section}-${s.table_size}`} label={`Section ${s.section} · ${s.table_size} guests`} value={`${s.total_tables} max / ${s.reserved_tables} reserved`} />)}
              </div>
              <div className="space-y-1.5">
                {draft.artists.map((artist, index) => (
                  <p key={artist.id || `artist-${index}`} className="text-xs text-[var(--color-muted)]">
                    <strong className="text-[var(--color-ink)]">{artist.name}</strong> · {artist.category}
                    {artist.description && ` · ${artist.description}`}
                  </p>
                ))}
              </div>
            </Card>
          </div>
          <ReviewCard draft={draft} />
        </div>
      )}
    </form>
  );
};

/* Desktop-only sidebar (hidden on mobile to keep the form clean and scroll-free) */
const ReviewCard: React.FC<{ draft: Draft }> = ({ draft }) => (
  <div className="hidden xl:block xl:col-span-4 space-y-6 xl:sticky xl:top-20">
    <Card className="p-6 space-y-4">
      <SectionTitle icon={CheckCircle2} title="Event Summary" subtitle="Review the details before saving." />
      <SummaryRow label="Event" value={draft.title.trim() || "Untitled"} />
      <SummaryRow
        label="Schedule"
        value={draft.startsAt && draft.endsAt
          ? `${new Date(draft.startsAt).toLocaleString()} → ${new Date(draft.endsAt).toLocaleString()}`
          : "Not set"}
      />
      <SummaryRow label="Venue" value={`${draft.venueName}, ${draft.locationArea}`} />
      <SummaryRow
        label="Artists"
        value={`${draft.artists.filter((a) => a.name.trim()).length} ${
          pluralize(draft.artists.filter((a) => a.name.trim()).length, "performer")
        }`}
      />
      <SummaryRow label="Visibility" value={formatLabel(draft.status)} />
      <SummaryRow
        label="First 99 women"
        value={draft.is_first_99_active ? "₹1 · ₹0 bar credit" : "Standard pricing"}
      />
    </Card>

    <Card className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
        <CircleAlert className="w-4 h-4 text-[var(--color-brand)]" /> Setup Checklist
      </div>
      <ChecklistItem done={Boolean(draft.title.trim())} label="Event title and schedule" />
      <ChecklistItem done={Boolean(draft.venueName.trim() && draft.locationArea.trim())} label="Venue and location" />
      <ChecklistItem done={draft.artists.some((a) => a.name.trim())} label="At least one performing artist" />
      <ChecklistItem done={draft.tables.length > 0 || draft.groups.length > 0} label="At least one pricing entry" />
      <ChecklistItem done={new Date(draft.endsAt) > new Date(draft.startsAt)} label="Valid event timing" />
    </Card>
  </div>
);

const SectionTitle: React.FC<{ icon: React.ElementType; title: string; subtitle: string }> = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-3 pb-4 border-b border-[var(--color-hairline)]/70">
    <div className="p-2 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hairline)]/70 text-[var(--color-brand)] shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0">
      <h3 className="text-sm sm:text-[15px] font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="text-xs sm:text-[13px] text-[var(--color-muted)] mt-0.5 leading-relaxed">{subtitle}</p>
    </div>
  </div>
);

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 text-xs">
    <span className="text-[var(--color-muted)] shrink-0">{label}</span>
    <span className="font-semibold text-[var(--color-ink)] text-right line-clamp-2">{value}</span>
  </div>
);

const ChecklistItem: React.FC<{ done: boolean; label: string }> = ({ done, label }) => (
  <div className="flex items-center gap-2 text-xs">
    <CheckCircle2 className={`w-4 h-4 ${done ? "text-[var(--color-success)]" : "text-[var(--color-muted)]"}`} />
    <span className={done ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"}>{label}</span>
  </div>
);

type TextareaFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  maxLength?: number;
  rows?: number;
  onChange: (value: string) => void;
};

const TextareaField: React.FC<TextareaFieldProps> = ({ label, value, placeholder, hint, error, maxLength, rows = 4, onChange }) => {
  const id = React.useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const [shake, setShake] = React.useState(false);
  const prev = React.useRef(error);
  React.useEffect(() => { if (error && error !== prev.current) setShake(true); if (!error) setShake(false); prev.current = error; }, [error]);
  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      <label htmlFor={id} className="text-[13px] font-medium text-[var(--color-muted)]">{label}</label>
      <div className={shake ? "shake" : ""} onAnimationEnd={(e) => { if (e.animationName === "field-shake") setShake(false); }}>
        <textarea
          id={id}
          rows={rows}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full min-h-[112px] p-3.5 rounded-xl bg-[var(--color-canvas)] border text-base sm:text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]/65 transition-[border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] focus:outline-none resize-y ${
            error ? "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-2 focus:ring-[var(--color-danger)]/12"
            : "border-[var(--color-hairline)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/12"
          }`}
        />
      </div>
      {error ? <span id={`${id}-error`} className="text-xs text-[var(--color-danger)]" role="status">{error}</span>
        : hint ? <span id={`${id}-hint`} className="text-xs text-[var(--color-muted)]">{hint}</span> : null}
    </div>
  );
};