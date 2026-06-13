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
  type InventoryExpense,
  type InventoryExpenseType,
  type PaymentMethod,
  type Vendor,
} from "../api";
import {
  formatDate,
  formatMoney,
  todayDisplay,
  todayISO,
  parseDateInput,
} from "../utils/format";
import { PencilIcon, TrashIcon } from "lucide-react";
import {
  ScrollableSortableTable,
  type TableColumn,
} from "../components/ScrollableSortableTable";

const INVENTORY_TABLE_COLUMNS: TableColumn[] = [
  { header: "Date" },
  { header: "Inventory item" },
  { header: "Purchased", headerStyle: { textAlign: "right" } },
  { header: "Used", headerStyle: { textAlign: "right" } },
  {
    header: "Balance",
    headerStyle: { textAlign: "right", paddingLeft: "3rem" },
  },
  { header: "Pmt. Mode" },
  { header: "Description" },
  { header: "", headerStyle: { width: 80 } },
];

const INVENTORY_BALANCE_CELL_STYLE: CSSProperties = {
  padding: "0.4rem 0.75rem",
  paddingLeft: "3rem",
  textAlign: "right",
};

const sortInventoryByDateAsc = (a: InventoryExpense, b: InventoryExpense) =>
  new Date(a.date).getTime() - new Date(b.date).getTime();

const PAY_TYPE_BANK = "bank";
const PAY_TYPE_VENDOR = "vendor";
const PAY_FILTER_VENDOR_PREFIX = "vendor:";

type InventoryExpenseTypeComboboxProps = {
  types: InventoryExpenseType[];
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  onRequestCreateNew: () => void;
  placeholder?: string;
  inputStyle?: CSSProperties;
  minInputWidth?: number;
};

function InventoryExpenseTypeCombobox({
  types,
  selectedId,
  onSelectedIdChange,
  onRequestCreateNew,
  placeholder = "Choose Item",
  inputStyle,
  minInputWidth = 140,
}: InventoryExpenseTypeComboboxProps) {
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
    if (!selectedId) {
      setQuery("");
      return;
    }
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

  const pick = (t: InventoryExpenseType) => {
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
                No matching items
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
                + Add new item…
              </button>
            </li>
          </ul>
        </FloatingPortal>
      )}
    </div>
  );
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function sumPurchased(rows: InventoryExpense[]): number {
  return rows.reduce((s, i) => s + (i.amount > 0 ? i.amount : 0), 0);
}

function sumUsed(rows: InventoryExpense[]): number {
  return rows.reduce(
    (s, i) => s + (i.amount < 0 ? Math.abs(i.amount) : 0),
    0,
  );
}

export function InventoryExpenses() {
  const [items, setItems] = useState<InventoryExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [inventoryTypes, setInventoryTypes] = useState<InventoryExpenseType[]>([]);

  const [manualDesc, setManualDesc] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(() => todayDisplay());
  const [manualPaymentType, setManualPaymentType] = useState<
    typeof PAY_TYPE_BANK | typeof PAY_TYPE_VENDOR | ""
  >("");
  const [manualPaymentMethodId, setManualPaymentMethodId] = useState("");
  const [manualVendorId, setManualVendorId] = useState("");
  const [manualInventoryExpenseTypeId, setManualInventoryExpenseTypeId] =
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
  const [editPaymentType, setEditPaymentType] = useState<
    typeof PAY_TYPE_BANK | typeof PAY_TYPE_VENDOR | ""
  >("");
  const [editPaymentMethodId, setEditPaymentMethodId] = useState("");
  const [editVendorId, setEditVendorId] = useState("");
  const [editInventoryExpenseTypeId, setEditInventoryExpenseTypeId] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expenseMin, setExpenseMin] = useState("");
  const [expenseMax, setExpenseMax] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = () =>
    api.inventoryExpenses
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
    api.vendors
      .list()
      .then(setVendors)
      .catch(() => {});
    api.inventoryExpenseTypes
      .list()
      .then(setInventoryTypes)
      .catch(() => {});
  }, []);

  const loadTypes = () =>
    api.inventoryExpenseTypes.list().then(setInventoryTypes).catch(() => {});

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
      const t = await api.inventoryExpenseTypes.create({
        name: typeDialogName.trim(),
      });
      await loadTypes();
      if (typeDialogTarget === "manual") {
        setManualInventoryExpenseTypeId(t.id);
      } else {
        setEditInventoryExpenseTypeId(t.id);
      }
      closeTypeDialog();
    } catch (err) {
      setTypeDialogError((err as Error).message);
    }
  };

  const openRenameTypeDialog = (typeId: string) => {
    const t = inventoryTypes.find((x) => x.id === typeId);
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
      await api.inventoryExpenseTypes.update(renameTypeId, {
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

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDesc.trim() || manualAmount === "") return;
    if (!manualInventoryExpenseTypeId.trim()) {
      setError("Choose an inventory item.");
      return;
    }
    if (manualPaymentType === PAY_TYPE_BANK && !manualPaymentMethodId.trim()) {
      setError("Choose a bank account.");
      return;
    }
    if (manualPaymentType === PAY_TYPE_VENDOR && !manualVendorId.trim()) {
      setError("Choose a vendor.");
      return;
    }
    try {
      setError(null);
      const dateISO = manualDate
        ? (parseDateInput(manualDate) ?? todayISO())
        : todayISO();
      await api.inventoryExpenses.create({
        description: manualDesc.trim(),
        amount: parseFloat(manualAmount),
        date: dateISO,
        paymentMethodId:
          manualPaymentType === PAY_TYPE_BANK
            ? manualPaymentMethodId.trim() || null
            : null,
        vendorId:
          manualPaymentType === PAY_TYPE_VENDOR
            ? manualVendorId.trim() || null
            : null,
        inventoryExpenseTypeId: manualInventoryExpenseTypeId.trim(),
      });
      setManualDesc("");
      setManualAmount("");
      setManualDate(todayDisplay());
      setManualPaymentType("");
      setManualPaymentMethodId("");
      setManualVendorId("");
      setManualInventoryExpenseTypeId("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const deleteItem = async (id: string, description: string) => {
    if (!confirm(`Remove this entry "${description}"?`)) return;
    try {
      setError(null);
      await api.inventoryExpenses.delete(id);
      setEditingId(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const startEdit = (row: InventoryExpense) => {
    setEditingId(row.id);
    setEditDesc(row.description);
    setEditAmount(String(row.amount));
    setEditDate(formatDate(row.date));
    if (row.vendorItem?.vendorId) {
      setEditPaymentType(PAY_TYPE_VENDOR);
      setEditVendorId(row.vendorItem.vendorId);
      setEditPaymentMethodId("");
    } else if (row.paymentMethodId) {
      setEditPaymentType(PAY_TYPE_BANK);
      setEditPaymentMethodId(row.paymentMethodId);
      setEditVendorId("");
    } else {
      setEditPaymentType("");
      setEditPaymentMethodId("");
      setEditVendorId("");
    }
    setEditInventoryExpenseTypeId(row.inventoryExpenseTypeId ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDesc("");
    setEditAmount("");
    setEditDate("");
    setEditPaymentType("");
    setEditPaymentMethodId("");
    setEditVendorId("");
    setEditInventoryExpenseTypeId("");
  };

  const saveEdit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!editingId || !editDesc.trim() || editAmount === "") return;
    if (!editInventoryExpenseTypeId.trim()) {
      setError("Choose an inventory item.");
      return;
    }
    if (editPaymentType === PAY_TYPE_BANK && !editPaymentMethodId.trim()) {
      setError("Choose a bank account.");
      return;
    }
    if (editPaymentType === PAY_TYPE_VENDOR && !editVendorId.trim()) {
      setError("Choose a vendor.");
      return;
    }
    try {
      setError(null);
      const dateISO = editDate
        ? (parseDateInput(editDate) ?? todayISO())
        : todayISO();
      await api.inventoryExpenses.update(editingId, {
        description: editDesc.trim(),
        amount: parseFloat(editAmount),
        date: dateISO,
        paymentMethodId:
          editPaymentType === PAY_TYPE_BANK
            ? editPaymentMethodId.trim() || null
            : null,
        vendorId:
          editPaymentType === PAY_TYPE_VENDOR
            ? editVendorId.trim() || null
            : null,
        inventoryExpenseTypeId: editInventoryExpenseTypeId.trim(),
      });
      cancelEdit();
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading && items.length === 0) return <p>Loading…</p>;

  const vendorNeedsVendor =
    manualPaymentType === PAY_TYPE_VENDOR && !manualVendorId.trim();
  const bankNeedsAccount =
    manualPaymentType === PAY_TYPE_BANK && !manualPaymentMethodId.trim();
  const paymentTypeInvalid = !manualPaymentType;
  const canAddManual =
    manualDate.trim() !== "" &&
    manualInventoryExpenseTypeId.trim() !== "" &&
    manualDesc.trim() !== "" &&
    manualAmount.trim() !== "" &&
    !Number.isNaN(parseFloat(manualAmount)) &&
    !paymentTypeInvalid &&
    !vendorNeedsVendor &&
    !bankNeedsAccount;

  const totalAll = items.reduce((s, i) => s + i.amount, 0);
  const totalPurchasedAll = sumPurchased(items);
  const totalUsedAll = sumUsed(items);

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
    if (paymentModeFilter) {
      if (paymentModeFilter.startsWith(PAY_FILTER_VENDOR_PREFIX)) {
        const vendorId = paymentModeFilter.slice(PAY_FILTER_VENDOR_PREFIX.length);
        if ((row.vendorItem?.vendorId ?? "") !== vendorId) return false;
      } else if ((row.paymentMethodId ?? "") !== paymentModeFilter) {
        return false;
      }
    }
    if (typeFilter && (row.inventoryExpenseTypeId ?? "") !== typeFilter)
      return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, i) => s + i.amount, 0);
  const totalPurchasedFiltered = sumPurchased(filtered);
  const totalUsedFiltered = sumUsed(filtered);

  const balanceMap = new Map<string, number>();
  {
    let running = 0;
    const chronological = [...filtered].sort(sortInventoryByDateAsc);
    for (const row of chronological) {
      running += row.amount;
      balanceMap.set(row.id, running);
    }
  }

  const hasActiveFilters =
    dateFrom ||
    dateTo ||
    expenseMin ||
    expenseMax ||
    paymentModeFilter ||
    typeFilter;

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

      <div style={{ marginBottom: ".5rem", marginTop: "-20px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>
          Inventory
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "0rem",
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
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label
            style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555",  }}
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
            <optgroup label="Bank accounts">
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Vendors">
              {vendors.map((v) => (
                <option key={v.id} value={`${PAY_FILTER_VENDOR_PREFIX}${v.id}`}>
                  {v.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label
            style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
          >
            Inventory item
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "0.4rem 0.6rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: "0.9rem",
              minWidth: 120,
            }}
          >
            <option value="">All</option>
            {inventoryTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem",
            alignItems: "flex-end",
            fontSize: "0.9rem",
            marginLeft: "auto",
            alignSelf: "flex-start",
          }}
        >
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                  minWidth: 220,
                }}
              >
                <span>
                  Purchased {hasActiveFilters ? "(filtered)" : "(all)"}
                </span>
                <span style={{ fontWeight: 600, minWidth: 80, textAlign: "right" }}>
                  {formatMoney(
                    hasActiveFilters ? totalPurchasedFiltered : totalPurchasedAll,
                  )}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                  minWidth: 220,
                }}
              >
                <span>Used {hasActiveFilters ? "(filtered)" : "(all)"}</span>
                <span style={{ fontWeight: 600, minWidth: 80, textAlign: "right" }}>
                  {formatMoney(hasActiveFilters ? totalUsedFiltered : totalUsedAll)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                  minWidth: 220,
                }}
              >
                <span>Net {hasActiveFilters ? "(filtered)" : "(all)"}</span>
                <span style={{ fontWeight: 600, minWidth: 80, textAlign: "right" }}>
                  {formatMoney(hasActiveFilters ? totalFiltered : totalAll)}
                </span>
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
              {paymentModeFilter.startsWith(PAY_FILTER_VENDOR_PREFIX)
                ? (vendors.find(
                    (v) =>
                      v.id ===
                      paymentModeFilter.slice(PAY_FILTER_VENDOR_PREFIX.length),
                  )?.name ?? "Vendor")
                : (paymentMethods.find((pm) => pm.id === paymentModeFilter)
                    ?.name ?? "Bank")}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {typeFilter && (
            <button
              type="button"
              onClick={() => setTypeFilter("")}
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
              Item:{" "}
              {inventoryTypes.find((t) => t.id === typeFilter)?.name ?? typeFilter}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
        </div>
      )}

      <ScrollableSortableTable
        items={filtered}
        sortCompare={sortInventoryByDateAsc}
        columns={INVENTORY_TABLE_COLUMNS}
        scrollDeps={[loading]}
        emptyMessage={
          items.length === 0
            ? "No inventory entries yet. Add one below."
            : "No entries match your filters."
        }
        emptyInTable={items.length > 0}
        renderRow={(row) => {
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
                          <InventoryExpenseTypeCombobox
                            types={inventoryTypes}
                            selectedId={editInventoryExpenseTypeId}
                            onSelectedIdChange={setEditInventoryExpenseTypeId}
                            onRequestCreateNew={() => openTypeDialog("edit")}
                            placeholder="Choose Item"
                            minInputWidth={120}
                            inputStyle={{ padding: "0.4rem" }}
                          />
                          <button
                            type="button"
                            title="Edit item name"
                            disabled={!editInventoryExpenseTypeId}
                            onClick={() =>
                              openRenameTypeDialog(editInventoryExpenseTypeId)
                            }
                            style={{
                              flexShrink: 0,
                              padding: "0.35rem",
                              border: "1px solid #ccc",
                              borderRadius: 4,
                              background: "#fff",
                              cursor: editInventoryExpenseTypeId
                                ? "pointer"
                                : "not-allowed",
                              opacity: editInventoryExpenseTypeId ? 1 : 0.45,
                              color: "#1a1a1a",
                            }}
                          >
                            <PencilIcon size={14} />
                          </button>
                        </div>
                      </td>
                      <td
                        colSpan={2}
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
                          title="Positive = purchased, negative = used"
                          style={{
                            padding: "0.4rem",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                            width: 120,
                          }}
                        />
                      </td>
                      <td style={INVENTORY_BALANCE_CELL_STYLE}>
                        {formatMoney(balanceMap.get(row.id) ?? 0)}
                      </td>
                      <td style={{ padding: "0.4rem 0.75rem" }}>
                        <select
                          value={editPaymentType}
                          onChange={(e) => {
                            const v = e.target.value as
                              | typeof PAY_TYPE_BANK
                              | typeof PAY_TYPE_VENDOR
                              | "";
                            setEditPaymentType(v);
                            if (v !== PAY_TYPE_BANK) setEditPaymentMethodId("");
                            if (v !== PAY_TYPE_VENDOR) setEditVendorId("");
                          }}
                          style={{
                            padding: "0.4rem",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                            minWidth: 120,
                          }}
                        >
                          <option value="">Mode of payment</option>
                          <option value={PAY_TYPE_BANK}>Bank accounts</option>
                          <option value={PAY_TYPE_VENDOR}>Vendor</option>
                        </select>
                        {editPaymentType === PAY_TYPE_BANK && (
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
                              marginTop: 6,
                            }}
                          >
                            <option value="">Choose a bank account</option>
                            {paymentMethods.map((pm) => (
                              <option key={pm.id} value={pm.id}>
                                {pm.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {editPaymentType === PAY_TYPE_VENDOR && (
                          <select
                            value={editVendorId}
                            onChange={(e) => setEditVendorId(e.target.value)}
                            style={{
                              padding: "0.4rem",
                              border: "1px solid #ccc",
                              borderRadius: 4,
                              minWidth: 120,
                              marginTop: 6,
                            }}
                          >
                            <option value="">Choose a vendor</option>
                            {vendors.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        )}
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
                      {row.inventoryExpenseType?.name ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        textAlign: "right",
                      }}
                    >
                      {row.amount > 0 ? formatMoney(row.amount) : "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        textAlign: "right",
                      }}
                    >
                      {row.amount < 0
                        ? formatMoney(Math.abs(row.amount))
                        : "—"}
                    </td>
                    <td style={INVENTORY_BALANCE_CELL_STYLE}>
                      {formatMoney(balanceMap.get(row.id) ?? 0)}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {row.vendorItem?.vendor?.name ??
                        row.paymentMethod?.name ??
                        "—"}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {row.description}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {row.lineItemId ? (
                        <span
                          style={{ fontSize: "0.75rem", color: "#888" }}
                          title="Edit or remove this from the project expense screen."
                        >
                          Project
                        </span>
                      ) : (
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
                      )}
                    </td>
                  </tr>
                );
        }}
      />

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
              minWidth: 200,
            }}
          >
            <InventoryExpenseTypeCombobox
              types={inventoryTypes}
              selectedId={manualInventoryExpenseTypeId}
              onSelectedIdChange={setManualInventoryExpenseTypeId}
              onRequestCreateNew={() => openTypeDialog("manual")}
              placeholder="Choose Item"
              minInputWidth={160}
            />
            <button
              type="button"
              title="Edit item name"
              disabled={!manualInventoryExpenseTypeId}
              onClick={() =>
                openRenameTypeDialog(manualInventoryExpenseTypeId)
              }
              style={{
                flexShrink: 0,
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: 4,
                background: "#fff",
                cursor: manualInventoryExpenseTypeId ? "pointer" : "not-allowed",
                opacity: manualInventoryExpenseTypeId ? 1 : 0.45,
                color: "#1a1a1a",
              }}
            >
              <PencilIcon size={16} />
            </button>
          </div>
          <input
            placeholder="Enter Details"
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
            value={manualPaymentType}
            onChange={(e) => {
              const v = e.target.value as
                | typeof PAY_TYPE_BANK
                | typeof PAY_TYPE_VENDOR
                | "";
              setManualPaymentType(v);
              if (v !== PAY_TYPE_BANK) setManualPaymentMethodId("");
              if (v !== PAY_TYPE_VENDOR) setManualVendorId("");
            }}
            style={{
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              minWidth: 120,
            }}
          >
            <option value="">Mode of payment</option>
            <option value={PAY_TYPE_BANK}>Bank accounts</option>
            <option value={PAY_TYPE_VENDOR}>Vendor</option>
          </select>
          {manualPaymentType === PAY_TYPE_BANK && (
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
              <option value="">Choose a bank account</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name}
                </option>
              ))}
            </select>
          )}
          {manualPaymentType === PAY_TYPE_VENDOR && (
            <select
              value={manualVendorId}
              onChange={(e) => setManualVendorId(e.target.value)}
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: 4,
                minWidth: 120,
              }}
            >
              <option value="">Choose a vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={!canAddManual}
            style={{
              padding: "0.5rem 1rem",
              background: "#1a1a1a",
              color: "#fff",
              borderRadius: 6,
              fontWeight: 500,
              cursor: canAddManual ? "pointer" : "not-allowed",
              opacity: canAddManual ? 1 : 0.5,
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
            aria-labelledby="inventory-rename-type-title"
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
              id="inventory-rename-type-title"
              style={{
                margin: "0 0 1rem",
                fontSize: "1.1rem",
                fontWeight: 600,
              }}
            >
              Edit inventory item
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
            aria-labelledby="inventory-type-dialog-title"
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
              id="inventory-type-dialog-title"
              style={{
                margin: "0 0 1rem",
                fontSize: "1.1rem",
                fontWeight: 600,
              }}
            >
              New inventory item
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
                  placeholder="e.g. Cable spool, Paint"
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
                  Save item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
