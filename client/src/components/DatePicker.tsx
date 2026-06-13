import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  FloatingPortal,
} from "@floating-ui/react";
import { Calendar } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  dateInputPlaceholder,
  formatDateLocale,
  formatMonthYear,
  getWeekdayLabels,
  getWeekStartDay,
  isoFromLocalDate,
  parseISODateLocal,
  parseLocaleDateInput,
  todayISO,
} from "../utils/format";

type DatePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  style?: React.CSSProperties;
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function buildCalendarDays(viewMonth: Date): Array<Date | null> {
  const firstOfMonth = startOfMonth(viewMonth);
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  ).getDate();
  const weekStart = getWeekStartDay();
  const leadingEmpty = (firstOfMonth.getDay() - weekStart + 7) % 7;
  const cells: Array<Date | null> = [];

  for (let i = 0; i < leadingEmpty; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day),
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DatePicker({ value, onChange, id, style }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(() =>
    value ? formatDateLocale(value) : "",
  );
  const [viewMonth, setViewMonth] = useState(() => {
    const selected = value ? parseISODateLocal(value) : null;
    return startOfMonth(selected ?? new Date());
  });

  const { refs, floatingStyles } = useFloating({
    open,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip({ fallbackPlacements: ["top-start"] }), shift({ padding: 8 })],
  });

  useEffect(() => {
    setInputValue(value ? formatDateLocale(value) : "");
    const selected = value ? parseISODateLocal(value) : null;
    if (selected) setViewMonth(startOfMonth(selected));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (ev: MouseEvent) => {
      const target = ev.target as Node;
      const ref = refs.reference.current;
      if (ref && ref instanceof HTMLElement && ref.contains(target)) return;
      if (refs.floating.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, refs.reference, refs.floating]);

  const today = todayISO();
  const weekdayLabels = useMemo(() => getWeekdayLabels(), []);
  const calendarDays = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);

  const commitInput = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    const parsed = parseLocaleDateInput(trimmed);
    if (parsed) {
      onChange(parsed);
      setInputValue(formatDateLocale(parsed));
      return;
    }
    setInputValue(value ? formatDateLocale(value) : "");
  };

  const selectDate = (date: Date) => {
    const iso = isoFromLocalDate(date);
    onChange(iso);
    setInputValue(formatDateLocale(iso));
    setOpen(false);
  };

  return (
    <div
      ref={refs.setReference}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        position: "relative",
        maxWidth: 180,
        ...style,
      }}
    >
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={dateInputPlaceholder()}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={commitInput}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitInput();
          }
        }}
        style={{
          padding: "0.35rem 0.5rem",
          width: "100%",
          border: "1px solid #ccc",
          borderRadius: 4,
        }}
      />
      <button
        type="button"
        aria-label="Open calendar"
        onClick={() => setOpen((current) => !current)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.35rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          background: "#fff",
          cursor: "pointer",
          color: "#444",
          flexShrink: 0,
        }}
      >
        <Calendar size={16} aria-hidden />
      </button>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              zIndex: 200,
              width: 280,
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
              padding: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setViewMonth((current) => addMonths(current, -1))}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "1rem",
                  padding: "0.2rem 0.45rem",
                }}
              >
                ‹
              </button>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                {formatMonthYear(viewMonth)}
              </div>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setViewMonth((current) => addMonths(current, 1))}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "1rem",
                  padding: "0.2rem 0.45rem",
                }}
              >
                ›
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "0.15rem",
                marginBottom: "0.35rem",
              }}
            >
              {weekdayLabels.map((label) => (
                <div
                  key={label}
                  style={{
                    textAlign: "center",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "#666",
                    padding: "0.15rem 0",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "0.15rem",
              }}
            >
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} />;
                }
                const iso = isoFromLocalDate(date);
                const isSelected = value === iso;
                const isToday = today === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => selectDate(date)}
                    style={{
                      border: isToday ? "1px solid #1a1a1a" : "1px solid transparent",
                      borderRadius: 4,
                      background: isSelected ? "#1a1a1a" : "transparent",
                      color: isSelected ? "#f5f5f0" : "#1a1a1a",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      padding: "0.35rem 0",
                      fontWeight: isSelected || isToday ? 600 : 400,
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const todayDate = parseISODateLocal(todayISO());
                if (todayDate) selectDate(todayDate);
              }}
              style={{
                marginTop: "0.65rem",
                width: "100%",
                border: "none",
                background: "transparent",
                color: "#1668c0",
                cursor: "pointer",
                fontSize: "0.82rem",
                textAlign: "left",
                padding: 0,
              }}
            >
              Today
            </button>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
