/**
 * Format a date string (ISO or yyyy-mm-dd) as dd/mm/yy for display.
 */
export function formatDate(s: string): string {
  const d = parseISODateLocal(s) ?? new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function getUserLocale(): string {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en-IN";
}

export function parseISODateLocal(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isoFromLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localeDatePartOrder(): Array<"day" | "month" | "year"> {
  const parts = new Intl.DateTimeFormat(getUserLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(2024, 0, 15));
  return parts
    .filter(
      (part): part is Intl.DateTimeFormatPart & { type: "day" | "month" | "year" } =>
        part.type === "day" || part.type === "month" || part.type === "year",
    )
    .map((part) => part.type);
}

/**
 * Format yyyy-mm-dd using the browser locale (e.g. dd/mm/yyyy in India).
 */
export function formatDateLocale(iso: string): string {
  const date = parseISODateLocal(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat(getUserLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Placeholder for locale date inputs (e.g. dd/mm/yyyy).
 */
export function dateInputPlaceholder(): string {
  const parts = new Intl.DateTimeFormat(getUserLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(2024, 11, 31));
  return parts
    .map((part) => {
      if (part.type === "day") return "dd";
      if (part.type === "month") return "mm";
      if (part.type === "year") return "yyyy";
      return part.value;
    })
    .join("");
}

/**
 * Parse a locale-formatted date string to yyyy-mm-dd. Returns null if invalid.
 */
export function parseLocaleDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[./-]/).map((part) => part.trim());
  if (parts.length !== 3) return null;

  const order = localeDatePartOrder();
  const values: Partial<Record<"day" | "month" | "year", number>> = {};
  order.forEach((type, index) => {
    values[type] = parseInt(parts[index], 10);
  });

  const day = values.day;
  const month = values.month;
  let year = values.year;
  if (day == null || month == null || year == null) return null;
  if (year < 100) year += year >= 50 ? 1900 : 2000;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return isoFromLocalDate(date);
}

export function getWeekStartDay(): number {
  try {
    const locale = new Intl.Locale(getUserLocale());
    const weekInfo = (locale as Intl.Locale & { weekInfo?: { firstDay?: number } })
      .weekInfo;
    if (weekInfo?.firstDay != null) return weekInfo.firstDay;
  } catch {
    // Intl.Locale weekInfo is not available in every browser.
  }
  return getUserLocale().startsWith("en-US") ? 0 : 1;
}

export function getWeekdayLabels(): string[] {
  const formatter = new Intl.DateTimeFormat(getUserLocale(), {
    weekday: "short",
  });
  const weekStart = getWeekStartDay();
  const labels: string[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = (weekStart + offset) % 7;
    const date = new Date(2024, 0, 7 + day);
    labels.push(formatter.format(date));
  }
  return labels;
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat(getUserLocale(), {
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Format a number as INR with Indian numbering (lakhs/crores). No currency symbol.
 * e.g. 1234567 -> "12,34,567"
 */
export function formatMoney(
  n: number,
  options: boolean | "if-present" = false,
): string {
  const hasCents = Math.round(n * 100) % 100 !== 0;
  const minimumFractionDigits =
    options === true ? 2 : options === "if-present" && hasCents ? 2 : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "decimal",
    minimumFractionDigits,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Format a string (user input) as amount with commas for display in amount inputs.
 * Strips invalid chars, keeps at most one decimal point and 2 decimal places.
 */
export function formatAmountInput(value: string): string {
  const raw = value.replace(/,/g, "");
  if (raw === "" || raw === ".") return raw;
  let cleaned = "";
  let seenDot = false;
  for (const c of raw) {
    if (c === ".") {
      if (!seenDot) {
        cleaned += c;
        seenDot = true;
      }
    } else if (/\d/.test(c)) cleaned += c;
  }
  const parts = cleaned.split(".");
  const intPart = parts[0] || "0";
  const decPart = (parts[1] ?? "").slice(0, 2);
  const num = intPart === "" ? 0 : parseInt(intPart, 10);
  if (Number.isNaN(num)) return "";
  const formattedInt = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(num);
  if (!seenDot && decPart === "") return formattedInt;
  return formattedInt + "." + decPart;
}

/**
 * Parse an amount input string (possibly with commas) to a number for API/submit.
 */
export function parseAmountInput(value: string): number {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return NaN;
  return parseFloat(cleaned);
}

/**
 * Parse dd/mm/yy or dd/mm/yyyy to yyyy-mm-dd for API. Returns null if invalid.
 */
export function parseDateInput(s: string): string | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/").map((p) => p.trim());
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const day = parseInt(d, 10);
  const month = parseInt(m, 10) - 1;
  let year = parseInt(y, 10);
  if (year < 100) year += year >= 50 ? 1900 : 2000; // 50-99 -> 1950-1999, 00-49 -> 2000-2049
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  )
    return null;
  const yy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Today's date as dd/mm/yy for use in date inputs.
 */
export function todayDisplay(): string {
  return formatDate(todayISO());
}

/**
 * Today's date as yyyy-mm-dd for API / internal use (local timezone).
 */
export function todayISO(): string {
  return isoFromLocalDate(new Date());
}
