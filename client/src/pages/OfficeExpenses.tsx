import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  FloatingPortal,
} from "@floating-ui/react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  api,
  type OfficeExpense,
  type OfficeExpenseType,
  type PaymentMethod,
} from "../api";
import {
  formatDate,
  formatMoney,
  todayDisplay,
  todayISO,
  parseDateInput,
} from "../utils/format";
import { PencilIcon, TrashIcon } from "lucide-react";

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

type OfficeExpenseTypeComboboxProps = {
  types: OfficeExpenseType[];
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  onRequestCreateNew: () => void;
  placeholder?: string;
  inputStyle?: CSSProperties;
  minInputWidth?: number;
};

function OfficeExpenseTypeCombobox({
  types,
  selectedId,
  onSelectedIdChange,
  onRequestCreateNew,
  placeholder = "Type (optional)",
  inputStyle,
  minInputWidth = 140,
}: OfficeExpenseTypeComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { refs, floatingStyles } = useFloating({
    open,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ fallbackPlacements: ["top-start"] }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
      }),
    ],
  });

  useEffect(() => {
    if (!selectedId) return;
    const t = types.find((x) => x.id === selectedId);
    if (t) setQuery(t.name);
  }, [selectedId, types]);

  useEffect(() => {
    const onDocMouseDown = (ev: MouseEvent) => {
      const target = ev.target as Node;
      const refEl = refs.reference.current;
      if (
        refEl &&
        refEl instanceof HTMLElement &&
        refEl.contains(target)
      )
        return;
      if (refs.floating.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = types.filter((t) =>
    q ? t.name.toLowerCase().includes(q) : true,
  );

  const pick = (t: OfficeExpenseType) => {
    onSelectedIdChange(t.id);
    setQuery(t.name);
    setOpen(false);
  };

  const scheduleClose = () => {
    if (blurCloseTimer.current) clearTimeout(blurCloseTimer.current);
    blurCloseTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const cancelClose = () => {
    if (blurCloseTimer.current) {
      clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
  };

  return (
    <div
      ref={refs.setReference}
      style={{
        position: "relative",
        flex: 1,
        minWidth: minInputWidth,
      }}
    >
        <input
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setOpen(true);
            const cur = types.find((x) => x.id === selectedId);
            if (selectedId && cur && v !== cur.name) onSelectedIdChange("");
            if (!v.trim()) onSelectedIdChange("");
          }}
          onFocus={() => {
            cancelClose();
            setOpen(true);
          }}
          onBlur={() => {
            scheduleClose();
            const trimmed = query.trim();
            if (!trimmed) {
              onSelectedIdChange("");
              return;
            }
            const cur = selectedId
              ? types.find((x) => x.id === selectedId)
              : undefined;
            if (cur && cur.name.toLowerCase() === trimmed.toLowerCase()) return;
            const exact = types.find(
              (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
            );
            if (exact) onSelectedIdChange(exact.id);
            else onSelectedIdChange("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setOpen(false);
            }
          }}
          style={{
            width: "100%",
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: 4,
            boxSizing: "border-box",
            ...inputStyle,
          }}
        />
        {open && (
          <FloatingPortal>
            <ul
              ref={refs.setFloating}
              role="listbox"
              style={{
                ...floatingStyles,
                zIndex: 200,
                padding: 0,
                margin: 0,
                listStyle: "none",
                maxHeight: 220,
                overflowY: "auto",
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: 4,
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              }}
            >
              {filtered.length === 0 ? (
                <li
                  style={{
                    padding: "0.5rem 0.65rem",
                    fontSize: "0.85rem",
                    color: "#666",
                  }}
                >
                  No matching types
                </li>
              ) : (
                filtered.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      role="option"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(t)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "0.45rem 0.65rem",
                        border: "none",
                        background: "transparent",
                        fontSize: "0.875rem",
                        cursor: "pointer",
                      }}
                    >
                      {t.name}
                    </button>
                  </li>
                ))
              )}
              <li
                style={{
                  borderTop: "1px solid #eee",
                }}
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                    onRequestCreateNew();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "0.45rem 0.65rem",
                    border: "none",
                    background: "#f8f8f8",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    color: "#1a1a1a",
                  }}
                >
                  + Add new type…
                </button>
              </li>
            </ul>
          </FloatingPortal>
        )}
    </div>
  );
}

export function OfficeExpenses() {
  const [items, setItems] = useState<OfficeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<OfficeExpenseType[]>([]);

  const [manualDesc, setManualDesc] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(() => todayDisplay());
  const [manualPaymentMethodId, setManualPaymentMethodId] = useState("");
  const [manualOfficeExpenseTypeId, setManualOfficeExpenseTypeId] =
    useState("");

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeDialogName, setTypeDialogName] = useState("");
  const [typeDialogTarget, setTypeDialogTarget] = useState<"manual" | "edit">(
    "manual",
  );
  const [typeDialogError, setTypeDialogError] = useState<string | null>(null);

  const [renameTypeDialogOpen, setRenameTypeDialogOpen] = useState(false);
  const [renameTypeId, setRenameTypeId] = useState<string | null>(null);
  const [renameTypeName, setRenameTypeName] = useState("");
  const [renameTypeError, setRenameTypeError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPaymentMethodId, setEditPaymentMethodId] = useState("");
  const [editOfficeExpenseTypeId, setEditOfficeExpenseTypeId] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expenseMin, setExpenseMin] = useState("");
  const [expenseMax, setExpenseMax] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("");
  const [typeFilterIds, setTypeFilterIds] = useState<string[]>([]);
  const [typeFilterMenuOpen, setTypeFilterMenuOpen] = useState(false);
  const [typeFilterQuery, setTypeFilterQuery] = useState("");

  const typeFilterFloating = useFloating({
    open: typeFilterMenuOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ fallbackPlacements: ["top-start"] }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
            maxWidth: "280px",
          });
        },
      }),
    ],
  });

  const load = () =>
    api.officeExpenses
      .list()
      .then(setItems)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.paymentMethods
      .list()
      .then(setPaymentMethods)
      .catch(() => {});
    api.officeExpenseTypes
      .list()
      .then(setExpenseTypes)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!typeFilterMenuOpen) return;
    const onDocMouseDown = (ev: MouseEvent) => {
      const target = ev.target as Node;
      const tfRef = typeFilterFloating.refs.reference.current;
      if (
        tfRef &&
        tfRef instanceof HTMLElement &&
        tfRef.contains(target)
      )
        return;
      if (typeFilterFloating.refs.floating.current?.contains(target)) return;
      setTypeFilterMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [typeFilterMenuOpen]);

  useEffect(() => {
    if (!typeFilterMenuOpen) setTypeFilterQuery("");
  }, [typeFilterMenuOpen]);

  const typeFilterSearch = typeFilterQuery.trim().toLowerCase();
  const typeFilterListFiltered = expenseTypes.filter((t) =>
    typeFilterSearch ? t.name.toLowerCase().includes(typeFilterSearch) : true,
  );

  const loadTypes = () =>
    api.officeExpenseTypes.list().then(setExpenseTypes).catch(() => {});

  const openTypeDialog = (target: "manual" | "edit") => {
    setTypeDialogTarget(target);
    setTypeDialogName("");
    setTypeDialogError(null);
    setTypeDialogOpen(true);
  };

  const closeTypeDialog = () => {
    setTypeDialogOpen(false);
    setTypeDialogName("");
    setTypeDialogError(null);
  };

  const submitNewType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeDialogName.trim()) return;
    try {
      setTypeDialogError(null);
      const t = await api.officeExpenseTypes.create({
        name: typeDialogName.trim(),
      });
      await loadTypes();
      if (typeDialogTarget === "manual") {
        setManualOfficeExpenseTypeId(t.id);
      } else {
        setEditOfficeExpenseTypeId(t.id);
      }
      closeTypeDialog();
    } catch (err) {
      setTypeDialogError((err as Error).message);
    }
  };

  useEffect(() => {
    if (!typeDialogOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setTypeDialogOpen(false);
        setTypeDialogName("");
        setTypeDialogError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typeDialogOpen]);

  const openRenameTypeDialog = (typeId: string) => {
    const t = expenseTypes.find((x) => x.id === typeId);
    if (!t) return;
    setRenameTypeId(typeId);
    setRenameTypeName(t.name);
    setRenameTypeError(null);
    setRenameTypeDialogOpen(true);
  };

  const closeRenameTypeDialog = () => {
    setRenameTypeDialogOpen(false);
    setRenameTypeId(null);
    setRenameTypeName("");
    setRenameTypeError(null);
  };

  const submitRenameType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTypeId || !renameTypeName.trim()) return;
    try {
      setRenameTypeError(null);
      await api.officeExpenseTypes.update(renameTypeId, {
        name: renameTypeName.trim(),
      });
      await loadTypes();
      await load();
      closeRenameTypeDialog();
    } catch (err) {
      setRenameTypeError((err as Error).message);
    }
  };

  useEffect(() => {
    if (!renameTypeDialogOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setRenameTypeDialogOpen(false);
        setRenameTypeId(null);
        setRenameTypeName("");
        setRenameTypeError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [renameTypeDialogOpen]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDesc.trim() || manualAmount === "") return;
    try {
      setError(null);
      const dateISO = manualDate
        ? (parseDateInput(manualDate) ?? todayISO())
        : todayISO();
      await api.officeExpenses.create({
        description: manualDesc.trim(),
        amount: parseFloat(manualAmount),
        date: dateISO,
        paymentMethodId: manualPaymentMethodId.trim() || null,
        officeExpenseTypeId: manualOfficeExpenseTypeId.trim() || null,
      });
      setManualDesc("");
      setManualAmount("");
      setManualDate(todayDisplay());
      setManualPaymentMethodId("");
      setManualOfficeExpenseTypeId("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const deleteItem = async (id: string, description: string) => {
    if (!confirm(`Remove this expense "${description}"?`)) return;
    try {
      setError(null);
      await api.officeExpenses.delete(id);
      setEditingId(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const startEdit = (row: OfficeExpense) => {
    setEditingId(row.id);
    setEditDesc(row.description);
    setEditAmount(String(row.amount));
    setEditDate(formatDate(row.date));
    setEditPaymentMethodId(row.paymentMethodId ?? "");
    setEditOfficeExpenseTypeId(row.officeExpenseTypeId ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDesc("");
    setEditAmount("");
    setEditDate("");
    setEditPaymentMethodId("");
    setEditOfficeExpenseTypeId("");
  };

  const saveEdit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!editingId || !editDesc.trim() || editAmount === "") return;
    try {
      setError(null);
      const dateISO = editDate
        ? (parseDateInput(editDate) ?? todayISO())
        : todayISO();
      await api.officeExpenses.update(editingId, {
        description: editDesc.trim(),
        amount: parseFloat(editAmount),
        date: dateISO,
        paymentMethodId: editPaymentMethodId.trim() || null,
        officeExpenseTypeId: editOfficeExpenseTypeId.trim() || null,
      });
      cancelEdit();
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading && items.length === 0) return <p>Loading…</p>;

  const totalAll = items.reduce((s, i) => s + i.amount, 0);

  const expenseMinNum = expenseMin === "" ? null : parseFloat(expenseMin);
  const expenseMaxNum = expenseMax === "" ? null : parseFloat(expenseMax);

  const filtered = items.filter((row) => {
    const dk = dateKey(row.date);
    if (dateFrom && dk < dateFrom) return false;
    if (dateTo && dk > dateTo) return false;
    if (
      expenseMinNum != null &&
      !Number.isNaN(expenseMinNum) &&
      row.amount < expenseMinNum
    )
      return false;
    if (
      expenseMaxNum != null &&
      !Number.isNaN(expenseMaxNum) &&
      row.amount > expenseMaxNum
    )
      return false;
    if (
      paymentModeFilter &&
      (row.paymentMethodId ?? "") !== paymentModeFilter
    )
      return false;
    if (typeFilterIds.length > 0) {
      const rid = row.officeExpenseTypeId ?? "";
      if (!rid || !typeFilterIds.includes(rid)) return false;
    }
    return true;
  });

  const totalFiltered = filtered.reduce((s, i) => s + i.amount, 0);

  const hasActiveFilters =
    dateFrom ||
    dateTo ||
    expenseMin ||
    expenseMax ||
    paymentModeFilter ||
    typeFilterIds.length > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%",
      }}
    >
      {error && (
        <p style={{ color: "#c00", marginBottom: "1rem" }}>{error}</p>
      )}

      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>
            Office expenses
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "space-between",
                minWidth: 200,
              }}
            >
              <span>Total (all)</span>
              <span style={{ fontWeight: 600 }}>{formatMoney(totalAll)}</span>
            </div>
            {hasActiveFilters && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "space-between",
                  minWidth: 200,
                  fontSize: "0.9rem",
                  color: "#555",
                }}
              >
                <span>Filtered subtotal</span>
                <span style={{ fontWeight: 600 }}>
                  {formatMoney(totalFiltered)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1.5rem",
          padding: "1rem",
          background: "#f8f8f8",
          borderRadius: 8,
          border: "1px solid #eee",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label
              style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
            >
              Date from
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                padding: "0.4rem 0.6rem",
                border: "1px solid #ccc",
                borderRadius: 4,
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label
              style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
            >
              Date to
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                padding: "0.4rem 0.6rem",
                border: "1px solid #ccc",
                borderRadius: 4,
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label
              style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
            >
              Amount min
            </label>
            <input
              type="number"
              step="1"
              placeholder="0"
              value={expenseMin}
              onChange={(e) => setExpenseMin(e.target.value)}
              style={{
                padding: "0.4rem 0.6rem",
                border: "1px solid #ccc",
                borderRadius: 4,
                fontSize: "0.9rem",
                width: 90,
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label
              style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
            >
              Amount max
            </label>
            <input
              type="number"
              step="1"
              placeholder="—"
              value={expenseMax}
              onChange={(e) => setExpenseMax(e.target.value)}
              style={{
                padding: "0.4rem 0.6rem",
                border: "1px solid #ccc",
                borderRadius: 4,
                fontSize: "0.9rem",
                width: 90,
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label
            style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
          >
            Payment mode
          </label>
          <select
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value)}
            style={{
              padding: "0.4rem 0.6rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: "0.9rem",
              minWidth: 120,
            }}
          >
            <option value="">All</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <label
            style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
          >
            Types
          </label>
          <div
            ref={typeFilterFloating.refs.setReference}
            style={{ position: "relative", minWidth: 180 }}
          >
            <input
              type="text"
              autoComplete="off"
              aria-expanded={typeFilterMenuOpen}
              aria-haspopup="listbox"
              placeholder={
                typeFilterIds.length > 0
                  ? `${typeFilterIds.length} selected — type to filter…`
                  : "Search types…"
              }
              value={typeFilterQuery}
              onChange={(e) => {
                setTypeFilterQuery(e.target.value);
                setTypeFilterMenuOpen(true);
              }}
              onFocus={() => setTypeFilterMenuOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setTypeFilterMenuOpen(false);
                }
              }}
              style={{
                padding: "0.4rem 0.6rem",
                border: "1px solid #ccc",
                borderRadius: 4,
                fontSize: "0.9rem",
                width: "100%",
                minWidth: 180,
                boxSizing: "border-box",
                background: "#fff",
              }}
            />
            {typeFilterMenuOpen && (
              <FloatingPortal>
                <div
                  ref={typeFilterFloating.refs.setFloating}
                  role="listbox"
                  aria-multiselectable
                  style={{
                    ...typeFilterFloating.floatingStyles,
                    zIndex: 200,
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: "min(360px, 55vh)",
                    overflow: "hidden",
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                >
                  <div
                    style={{
                      overflowY: "auto",
                      overflowX: "hidden",
                      flex: 1,
                      minHeight: 0,
                      padding: "0.35rem 0",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {expenseTypes.length === 0 ? (
                      <div
                        style={{
                          padding: "0.5rem 0.75rem",
                          fontSize: "0.85rem",
                          color: "#666",
                        }}
                      >
                        No types yet
                      </div>
                    ) : typeFilterListFiltered.length === 0 ? (
                      <div
                        style={{
                          padding: "0.5rem 0.75rem",
                          fontSize: "0.85rem",
                          color: "#666",
                        }}
                      >
                        No types match “{typeFilterQuery.trim()}”
                      </div>
                    ) : (
                      typeFilterListFiltered.map((t) => {
                        const checked = typeFilterIds.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.875rem",
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onMouseDown={(e) => e.preventDefault()}
                              onChange={() => {
                                setTypeFilterIds((prev) =>
                                  checked
                                    ? prev.filter((id) => id !== t.id)
                                    : [...prev, t.id],
                                );
                              }}
                            />
                            <span>{t.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </FloatingPortal>
            )}
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
            marginTop: "-1rem",
            marginBottom: "1.5rem",
          }}
        >
          {dateFrom && (
            <button
              type="button"
              onClick={() => setDateFrom("")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.6rem",
                background: "#e8e8e8",
                border: "1px solid #ccc",
                borderRadius: 16,
                fontSize: "0.8rem",
                cursor: "pointer",
                color: "#333",
              }}
            >
              From:{" "}
              {(() => {
                const [y, m, d] = dateFrom.split("-");
                return [d, m, y].join("-");
              })()}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {dateTo && (
            <button
              type="button"
              onClick={() => setDateTo("")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.6rem",
                background: "#e8e8e8",
                border: "1px solid #ccc",
                borderRadius: 16,
                fontSize: "0.8rem",
                cursor: "pointer",
                color: "#333",
              }}
            >
              To:{" "}
              {(() => {
                const [y, m, d] = dateTo.split("-");
                return [d, m, y].join("-");
              })()}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {expenseMin && (
            <button
              type="button"
              onClick={() => setExpenseMin("")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.6rem",
                background: "#e8e8e8",
                border: "1px solid #ccc",
                borderRadius: 16,
                fontSize: "0.8rem",
                cursor: "pointer",
                color: "#333",
              }}
            >
              Amount ≥ {expenseMin}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {expenseMax && (
            <button
              type="button"
              onClick={() => setExpenseMax("")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.6rem",
                background: "#e8e8e8",
                border: "1px solid #ccc",
                borderRadius: 16,
                fontSize: "0.8rem",
                cursor: "pointer",
                color: "#333",
              }}
            >
              Amount ≤ {expenseMax}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {paymentModeFilter && (
            <button
              type="button"
              onClick={() => setPaymentModeFilter("")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.6rem",
                background: "#e8e8e8",
                border: "1px solid #ccc",
                borderRadius: 16,
                fontSize: "0.8rem",
                cursor: "pointer",
                color: "#333",
              }}
            >
              Payment:{" "}
              {paymentMethods.find((pm) => pm.id === paymentModeFilter)?.name ??
                paymentModeFilter}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {typeFilterIds.map((tid) => (
            <button
              key={tid}
              type="button"
              onClick={() =>
                setTypeFilterIds((prev) => prev.filter((id) => id !== tid))
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.6rem",
                background: "#e8e8e8",
                border: "1px solid #ccc",
                borderRadius: 16,
                fontSize: "0.8rem",
                cursor: "pointer",
                color: "#333",
              }}
            >
              Type:{" "}
              {expenseTypes.find((t) => t.id === tid)?.name ?? tid}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflow: "hidden",
          width: "100%",
          flex: "1",
          maxHeight: "calc(100% - 320px)",
          overflowY: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.8125rem",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f8f8f8",
                textAlign: "left",
                position: "sticky",
                top: 0,
                zIndex: 1,
                boxShadow: "0 1px 0 0 #eee",
              }}
            >
              <th style={{ padding: "0.4rem 0.75rem" }}>Date</th>
              <th style={{ padding: "0.4rem 0.75rem" }}>Type</th>
              <th style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
                Amount
              </th>
              <th style={{ padding: "0.4rem 0.75rem" }}>Payment mode</th>
              <th style={{ padding: "0.4rem 0.75rem" }}>Description</th>
              <th style={{ padding: "0.4rem 0.75rem", width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: "1.25rem 0.75rem",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  {items.length === 0
                    ? "No office expenses yet. Add one below."
                    : "No expenses match your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const isEditing = row.id === editingId;
                if (isEditing) {
                  return (
                    <tr key={row.id} style={{ borderTop: "1px solid #eee" }}>
                      <td style={{ padding: "0.4rem 0.75rem" }}>
                        <input
                          type="text"
                          placeholder="dd/mm/yy"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          style={{
                            padding: "0.4rem",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                            width: 90,
                          }}
                        />
                      </td>
                      <td style={{ padding: "0.4rem 0.75rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <OfficeExpenseTypeCombobox
                            types={expenseTypes}
                            selectedId={editOfficeExpenseTypeId}
                            onSelectedIdChange={setEditOfficeExpenseTypeId}
                            onRequestCreateNew={() => openTypeDialog("edit")}
                            placeholder="Type (optional)"
                            minInputWidth={120}
                            inputStyle={{ padding: "0.4rem" }}
                          />
                          <button
                            type="button"
                            title="Edit type name"
                            disabled={!editOfficeExpenseTypeId}
                            onClick={() =>
                              openRenameTypeDialog(editOfficeExpenseTypeId)
                            }
                            style={{
                              flexShrink: 0,
                              padding: "0.35rem",
                              border: "1px solid #ccc",
                              borderRadius: 4,
                              background: "#fff",
                              cursor: editOfficeExpenseTypeId
                                ? "pointer"
                                : "not-allowed",
                              opacity: editOfficeExpenseTypeId ? 1 : 0.45,
                              color: "#1a1a1a",
                            }}
                          >
                            <PencilIcon size={14} />
                          </button>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.75rem",
                          textAlign: "right",
                        }}
                      >
                        <input
                          type="number"
                          step="1"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          style={{
                            padding: "0.4rem",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                            width: 90,
                          }}
                        />
                      </td>
                      <td style={{ padding: "0.4rem 0.75rem" }}>
                        <select
                          value={editPaymentMethodId}
                          onChange={(e) =>
                            setEditPaymentMethodId(e.target.value)
                          }
                          style={{
                            padding: "0.4rem",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                            minWidth: 120,
                          }}
                        >
                          <option value="">Mode of payment</option>
                          {paymentMethods.map((pm) => (
                            <option key={pm.id} value={pm.id}>
                              {pm.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "0.4rem 0.75rem" }}>
                        <input
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          required
                          style={{
                            padding: "0.4rem",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                            minWidth: 140,
                          }}
                        />
                      </td>
                      <td style={{ padding: "0.4rem 0.75rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            onClick={saveEdit}
                            style={{
                              marginRight: 8,
                              padding: "0.35rem 0.6rem",
                              fontSize: "0.85rem",
                              background: "#1a1a1a",
                              color: "#fff",
                              borderRadius: 4,
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            style={{ fontSize: "0.85rem", color: "#666" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={row.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {formatDate(row.date)}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem", color: "#444" }}>
                      {row.officeExpenseType?.name ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        textAlign: "right",
                      }}
                    >
                      {formatMoney(row.amount)}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {row.paymentMethod?.name ?? "—"}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {row.description}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          style={{
                            marginRight: 8,
                            fontSize: "0.85rem",
                            color: "#1a1a1a",
                          }}
                        >
                          <PencilIcon size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(row.id, row.description)}
                          style={{ color: "#c00", fontSize: "0.85rem" }}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          marginTop: "1.25rem",
          padding: "1rem",
        }}
      >
        <form
          onSubmit={addItem}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          <input
            type="text"
            placeholder="dd/mm/yy"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
            style={{
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              width: 90,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "0.35rem",
              minWidth: 180,
            }}
          >
            <OfficeExpenseTypeCombobox
              types={expenseTypes}
              selectedId={manualOfficeExpenseTypeId}
              onSelectedIdChange={setManualOfficeExpenseTypeId}
              onRequestCreateNew={() => openTypeDialog("manual")}
              minInputWidth={140}
            />
            <button
              type="button"
              title="Edit type name"
              disabled={!manualOfficeExpenseTypeId}
              onClick={() =>
                openRenameTypeDialog(manualOfficeExpenseTypeId)
              }
              style={{
                flexShrink: 0,
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: 4,
                background: "#fff",
                cursor: manualOfficeExpenseTypeId ? "pointer" : "not-allowed",
                opacity: manualOfficeExpenseTypeId ? 1 : 0.45,
                color: "#1a1a1a",
              }}
            >
              <PencilIcon size={16} />
            </button>
          </div>
          <input
            placeholder="Description"
            value={manualDesc}
            onChange={(e) => setManualDesc(e.target.value)}
            required
            style={{
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              minWidth: 140,
            }}
          />
          <input
            type="number"
            step="1"
            placeholder="Amount"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            style={{
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              width: 90,
            }}
          />
          <select
            value={manualPaymentMethodId}
            onChange={(e) => setManualPaymentMethodId(e.target.value)}
            style={{
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              minWidth: 120,
            }}
          >
            <option value="">Mode of payment</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              background: "#1a1a1a",
              color: "#fff",
              borderRadius: 6,
              fontWeight: 500,
            }}
          >
            Add
          </button>
        </form>
      </div>

      {renameTypeDialogOpen && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={closeRenameTypeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="office-rename-type-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: "1.25rem",
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              id="office-rename-type-title"
              style={{
                margin: "0 0 1rem",
                fontSize: "1.1rem",
                fontWeight: 600,
              }}
            >
              Edit expense type
            </h2>
            <form onSubmit={submitRenameType}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "#555",
                }}
              >
                Name
                <input
                  autoFocus
                  value={renameTypeName}
                  onChange={(e) => setRenameTypeName(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 6,
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    boxSizing: "border-box",
                  }}
                />
              </label>
              {renameTypeError && (
                <p
                  style={{
                    color: "#c00",
                    fontSize: "0.85rem",
                    margin: "0.75rem 0 0",
                  }}
                >
                  {renameTypeError}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "flex-end",
                  marginTop: "1.25rem",
                }}
              >
                <button
                  type="button"
                  onClick={closeRenameTypeDialog}
                  style={{
                    padding: "0.45rem 0.9rem",
                    background: "#f5f5f5",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    fontSize: "0.9rem",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "0.45rem 0.9rem",
                    background: "#1a1a1a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 500,
                    fontSize: "0.9rem",
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {typeDialogOpen && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={closeTypeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="office-type-dialog-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: "1.25rem",
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              id="office-type-dialog-title"
              style={{
                margin: "0 0 1rem",
                fontSize: "1.1rem",
                fontWeight: 600,
              }}
            >
              New expense type
            </h2>
            <form onSubmit={submitNewType}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "#555",
                }}
              >
                Name
                <input
                  autoFocus
                  value={typeDialogName}
                  onChange={(e) => setTypeDialogName(e.target.value)}
                  placeholder="e.g. Rent, Salary"
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 6,
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    boxSizing: "border-box",
                  }}
                />
              </label>
              {typeDialogError && (
                <p style={{ color: "#c00", fontSize: "0.85rem", margin: "0.75rem 0 0" }}>
                  {typeDialogError}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "flex-end",
                  marginTop: "1.25rem",
                }}
              >
                <button
                  type="button"
                  onClick={closeTypeDialog}
                  style={{
                    padding: "0.45rem 0.9rem",
                    background: "#f5f5f5",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    fontSize: "0.9rem",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "0.45rem 0.9rem",
                    background: "#1a1a1a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 500,
                    fontSize: "0.9rem",
                  }}
                >
                  Save type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
