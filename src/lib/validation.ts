export type ValidationResult = {
  value: string;
  error: string | null;
};

const MOBILE_SEPARATORS = /[\s.()\-]/g;
const DUMMY_MOBILES = new Set(["9876543210", "6789012345"]);

const allDigits = (value: string) => /^[0-9]+$/.test(value);

export const limitDigits = (value: string, max = 12) => value.replace(/\D/g, "").slice(0, max);

const allSameDigits = (value: string) => value.split("").every((digit) => digit === value[0]);

const isSequentialDigits = (value: string) => {
  let ascending = true;
  let descending = true;
  for (let i = 1; i < value.length; i++) {
    const previous = Number(value[i - 1]);
    const current = Number(value[i]);
    if (current !== (previous + 1) % 10) ascending = false;
    if (current !== (previous + 9) % 10) descending = false;
  }
  return ascending || descending;
};

export const normalizeIndianMobile = (raw: string): ValidationResult => {
  let value = raw.trim().replace(MOBILE_SEPARATORS, "");
  if (value.startsWith("+91")) value = value.slice(3);
  else if (value.length === 12 && value.startsWith("91")) value = value.slice(2);
  else if (value.length === 11 && value.startsWith("0")) value = value.slice(1);

  if (!allDigits(value)) {
    return { value: raw, error: "Mobile number must contain digits only." };
  }
  if (value.length !== 10) {
    return { value: raw, error: "Mobile number must be 10 digits after the country code." };
  }
  if (!/[6-9]/.test(value[0])) {
    return { value: raw, error: "Mobile number must start with 6, 7, 8 or 9." };
  }
  if (allSameDigits(value) || DUMMY_MOBILES.has(value)) {
    return { value: raw, error: "This mobile number is not valid." };
  }
  return { value: `+91${value}`, error: null };
};

export const normalizeUtr = (raw: string): ValidationResult => {
  const value = raw.trim().replace(/\s/g, "");
  if (!allDigits(value)) {
    return { value: raw, error: "UTR must contain digits only." };
  }
  if (value.length !== 12) {
    return { value: raw, error: "UTR must be exactly 12 digits." };
  }
  if (allSameDigits(value) || isSequentialDigits(value)) {
    return { value: raw, error: "This UTR is a dummy pattern and cannot be used." };
  }
  return { value, error: null };
};

export const isValidIndianMobile = (value: string) => normalizeIndianMobile(value).error === null;

export const isValidUtr = (value: string) => normalizeUtr(value).error === null;

export const EVENT_TEXT_PATTERN = /^[\p{L}\p{N}\s&,'’.:!()/+\-–—•|%?=;]+$/u;

export const isValidEventText = (value: string) => EVENT_TEXT_PATTERN.test(value.trim());
