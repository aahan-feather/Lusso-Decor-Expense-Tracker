import { useEffect, useState } from "react";
import {
  api,
  type InventoryExpense,
  type InventoryExpenseType,
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

const ADD_NEW_TYPE_VALUE = "__add_new_type__";

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function InventoryExpenses() {
  const [items, setItems] = useState<InventoryExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [inventoryTypes, setInventoryTypes] = useState<InventoryExpenseType[]>([]);

  const [manualDesc, setManualDesc] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(() => todayDisplay());
  const [manualPaymentMethodId, setManualPaymentMethodId] = useState("");
  const [manualInventoryExpenseTypeId, setManualInventoryExpenseTypeId] =
    useState("");

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeDialogName, setTypeDialogName] = useState("");
  const [typeDialogTarget, setTypeDialogTarget] = useState<"manual" | "edit">(
    "manual",
  );
  const [typeDialogError, setTypeDialogError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPaymentMethodId, setEditPaymentMethodId] = useState("");
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
    try {
      setError(null);
      const dateISO = manualDate
        ? (parseDateInput(manualDate) ?? todayISO())
        : todayISO();
      await api.inventoryExpenses.create({
        description: manualDesc.trim(),
        amount: parseFloat(manualAmount),
        date: dateISO,
        paymentMethodId: manualPaymentMethodId.trim() || null,
        inventoryExpenseTypeId: manualInventoryExpenseTypeId.trim() || null,
      });
      setManualDesc("");
      setManualAmount("");
      setManualDate(todayDisplay());
      setManualPaymentMethodId("");
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
    setEditPaymentMethodId(row.paymentMethodId ?? "");
    setEditInventoryExpenseTypeId(row.inventoryExpenseTypeId ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDesc("");
    setEditAmount("");
    setEditDate("");
    setEditPaymentMethodId("");
    setEditInventoryExpenseTypeId("");
  };

  const saveEdit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!editingId || !editDesc.trim() || editAmount === "") return;
    try {
      setError(null);
      const dateISO = editDate
        ? (parseDateInput(editDate) ?? todayISO())
        : todayISO();
      await api.inventoryExpenses.update(editingId, {
        description: editDesc.trim(),
        amount: parseFloat(editAmount),
        date: dateISO,
        paymentMethodId: editPaymentMethodId.trim() || null,
        inventoryExpenseTypeId: editInventoryExpenseTypeId.trim() || null,
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
    if (typeFilter && (row.inventoryExpenseTypeId ?? "") !== typeFilter)
      return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, i) => s + i.amount, 0);

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
            Inventory
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

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label
            style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
          >
            Type
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
              Type:{" "}
              {inventoryTypes.find((t) => t.id === typeFilter)?.name ?? typeFilter}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
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
                    ? "No inventory entries yet. Add one below."
                    : "No entries match your filters."}
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
                        <select
                          value={editInventoryExpenseTypeId}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === ADD_NEW_TYPE_VALUE) {
                              openTypeDialog("edit");
                              return;
                            }
                            setEditInventoryExpenseTypeId(v);
                          }}
                          style={{
                            padding: "0.4rem",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                            minWidth: 120,
                          }}
                        >
                          <option value="">—</option>
                          {inventoryTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                          <option value={ADD_NEW_TYPE_VALUE}>
                            + Add new type…
                          </option>
                        </select>
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
                      {row.inventoryExpenseType?.name ?? "—"}
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
          <select
            value={manualInventoryExpenseTypeId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === ADD_NEW_TYPE_VALUE) {
                openTypeDialog("manual");
                return;
              }
              setManualInventoryExpenseTypeId(v);
            }}
            style={{
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              minWidth: 140,
            }}
          >
            <option value="">Type (optional)</option>
            {inventoryTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value={ADD_NEW_TYPE_VALUE}>+ Add new type…</option>
          </select>
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
              New inventory type
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
                  placeholder="e.g. Raw materials, Supplies"
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
