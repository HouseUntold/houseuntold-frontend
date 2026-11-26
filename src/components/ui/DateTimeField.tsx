import { CalendarDays, Clock } from "lucide-react";
import React from "react";
import { Input } from "./Input";

interface DateTimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const localDate = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const DateTimeField: React.FC<DateTimeFieldProps> = ({ label, value, onChange, required }) => {
  const date = value?.slice(0, 10) || "";
  const time = value?.slice(11, 16) || "19:00";

  const setDate = (nextDate: string) => onChange(`${nextDate}T${time}`);
  const setTime = (nextTime: string) => onChange(`${date || localDate(new Date())}T${nextTime}`);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          type="date"
          label={`${label} date`}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required={required}
          trailing={<CalendarDays className="w-4 h-4 text-[var(--color-brand)]" />}
          className="pr-10"
        />
        <Input
          type="time"
          label={`${label} time`}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required={required}
          trailing={<Clock className="w-4 h-4 text-[var(--color-brand)]" />}
          className="pr-10"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "Today", days: 0 },
          { label: "Tomorrow", days: 1 },
          { label: "Weekend", days: 5 },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              const next = new Date();
              next.setDate(next.getDate() + preset.days);
              setDate(localDate(next));
            }}
            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-xs font-medium text-[var(--color-muted)] hover:border-[var(--color-brand)]/40 hover:text-[var(--color-brand)] cursor-pointer transition-[color,border-color,background-color] duration-150 ease-[var(--ease-out)] active:scale-[0.98]"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
