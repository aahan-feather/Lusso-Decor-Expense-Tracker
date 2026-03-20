/**
 * Format a date string (ISO or yyyy-mm-dd) as dd/mm/yy for display.
 */
export function formatDate(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

/**
 * Format a number as INR with Indian numbering (lakhs/crores). No currency symbol.
 * e.g. 1234567 -> "12,34,567"
 */
export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "decimal",
    minimumFractionDigits: 0,
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
  return formatDate(new Date().toISOString().slice(0, 10));
}

/**
 * Today's date as yyyy-mm-dd for API / internal use.
 */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
