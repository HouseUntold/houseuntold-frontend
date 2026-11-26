import React from "react";

const PATTERNS: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  $: "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};

export interface Code39Bar {
  x: number;
  width: number;
}

export const normalizeBarCode = (rawValue: string) =>
  (rawValue || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || "00000";

export const getCode39Bars = (rawValue: string): { bars: Code39Bar[]; width: number } => {
  const value = normalizeBarCode(rawValue);
  const chars = `*${value}*`.split("");
  const bars: Code39Bar[] = [];
  let x = 4;

  chars.forEach((char, charIndex) => {
    const pattern = PATTERNS[char] || PATTERNS["0"];
    pattern.split("").forEach((element, elementIndex) => {
      const width = element === "w" ? 3 : 1;
      if (elementIndex % 2 === 0) bars.push({ x, width });
      x += width;
    });
    if (charIndex < chars.length - 1) x += 1;
  });

  bars.push({ x, width: 1 });
  return { bars, width: x + 5 };
};

interface Code39BarcodeProps {
  value: string;
  label?: string;
}

export const Code39Barcode: React.FC<Code39BarcodeProps> = ({ value, label }) => {
  const code = normalizeBarCode(value);
  const { bars, width } = getCode39Bars(code);

  return (
    <div className="w-full flex flex-col items-center gap-1">
      <svg
        viewBox={`0 0 ${width} 56`}
        className="w-full h-11 text-[var(--color-ink)] block"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Barcode ${code}`}
      >
        {bars.map((bar, index) => (
          <rect key={index} x={bar.x} y={0} width={bar.width} height={56} fill="currentColor" />
        ))}
      </svg>
      <span className="text-xs font-bold tracking-[0.35em] text-[var(--color-ink)] num">{code}</span>
      {label && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
          {label}
        </span>
      )}
    </div>
  );
};
