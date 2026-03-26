import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  api,
  type RegisterRow,
  type PaymentMethodRegisterResponse,
} from "../api";
import { formatDate, formatMoney, todayISO } from "../utils/format";
import { PencilIcon, TrashIcon } from "lucide-react";

const BANK_CATEGORIES = [
  { value: "", label: "—" },
  { value: "fee", label: "Fee" },
  { value: "interest", label: "Interest" },
  { value: "adjustment", label: "Adjustment" },
  { value: "other", label: "Other" },
];

function sourceTypeLabel(t: RegisterRow["sourceType"]): string {
  switch (t) {
    case "project_payment":
      return "Customer in";
    case "vendor_payment":
      return "Vendor out";
    case "office_expense":
      return "Office";
    case "inventory_expense":
      return "Inventory";
    case "line_item":
      return "Project expense";
    case "bank_only":
      return "Bank only";
    default:
      return t;
  }
}

function RegisterSourceLink({ row }: { row: RegisterRow }) {
  const m = row.meta;
  switch (row.sourceType) {
    case "project_payment":
    case "line_item":
      return m?.projectId ? (
        <Link
          to={`/projects/${m.projectId}`}
          style={{ color: "#1a1a1a", fontSize: "0.8125rem" }}
        >
          Open project
        </Link>
      ) : null;
    case "vendor_payment":
      return m?.vendorId ? (
        <Link
          to={`/vendors/${m.vendorId}`}
          style={{ color: "#1a1a1a", fontSize: "0.8125rem" }}
        >
          Open vendor
        </Link>
      ) : null;
    case "office_expense":
      return (
        <Link
          to="/office-expenses"
          style={{ color: "#1a1a1a", fontSize: "0.8125rem" }}
        >
          Office list
        </Link>
      );
    case "inventory_expense":
      return (
        <Link
          to="/inventory"
          style={{ color: "#1a1a1a", fontSize: "0.8125rem" }}
        >
          Inventory list
        </Link>
      );
    default:
      return <span style={{ color: "#aaa" }}>—</span>;
  }
}

export function BankAccountRegister() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PaymentMethodRegisterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState(todayISO());
  const [newAmount, setNewAmount] = useState("");
  const [newDirection, setNewDirection] = useState<"in" | "out">("out");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDirection, setEditDirection] = useState<"in" | "out">("out");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    return api.paymentMethods
      .register(id)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load()?.finally(() => setLoading(false));
  }, [id, load]);

  const startEditBankOnly = (row: RegisterRow) => {
    if (row.sourceType !== "bank_only") return;
    setEditingId(row.sourceId);
    setEditDate(row.date.slice(0, 10));
    setEditAmount(String(row.amount));
    setEditDirection(row.direction);
    setEditDescription(
      row.label.replace(/^\[[^\]]+\]\s*/, "").trim() || row.label,
    );
    setEditCategory(row.category ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleCreateBankOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const amount = parseFloat(newAmount.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a positive amount");
      return;
    }
    if (!newDescription.trim()) {
      setError("Description is required");
      return;
    }
    try {
      setError(null);
      await api.paymentMethods.bankOnly.create(id, {
        amount,
        direction: newDirection,
        description: newDescription.trim(),
        date: newDate,
        category: newCategory || null,
      });
      setNewAmount("");
      setNewDescription("");
      setNewCategory("");
      setNewDate(todayISO());
      setNewDirection("out");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editingId) return;
    const amount = parseFloat(editAmount.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a positive amount");
      return;
    }
    if (!editDescription.trim()) {
      setError("Description is required");
      return;
    }
    try {
      setError(null);
      await api.paymentMethods.bankOnly.update(id, editingId, {
        amount,
        direction: editDirection,
        description: editDescription.trim(),
        date: editDate,
        category: editCategory || null,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteBankOnly = async (entryId: string) => {
    if (!id) return;
    if (!confirm("Delete this bank-only entry?")) return;
    try {
      setError(null);
      await api.paymentMethods.bankOnly.delete(id, entryId);
      if (editingId === entryId) setEditingId(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!id) {
    return <p>Missing account id.</p>;
  }

  if (loading && !data) return <p>Loading…</p>;

  const pm = data?.paymentMethod;
  const rows = data?.rows ?? [];

  const rowKey = (row: RegisterRow) => `${row.sourceType}-${row.sourceId}`;
  let running = 0;
  const balanceByRowKey = new Map<string, number>();
  [...rows]
    .sort((a, b) => a.sortAt.localeCompare(b.sortAt))
    .forEach((row) => {
      running += row.direction === "in" ? row.amount : -row.amount;
      balanceByRowKey.set(rowKey(row), running);
    });
  const rowsWithBalance = [...rows]
    .sort((a, b) => b.sortAt.localeCompare(a.sortAt))
    .map((row) => ({
      row,
      balance: balanceByRowKey.get(rowKey(row)) ?? 0,
    }));

  const tableInput: React.CSSProperties = {
    padding: "0.4rem",
    border: "1px solid #ccc",
    borderRadius: 4,
  };

  const cellPad: React.CSSProperties = { padding: "0.4rem 0.75rem" };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/bank-accounts")}
          style={{
            padding: "0.35rem 0.75rem",
            border: "1px solid #ccc",
            borderRadius: 6,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        {pm && (
          <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>
            {pm.name}
            <span
              style={{
                marginLeft: "0.5rem",
                color: "#666",
                fontSize: "1rem",
                fontWeight: 400,
                textTransform: "capitalize",
              }}
            >
              {pm.type}
            </span>
          </h1>
        )}
      </div>

      {error && <p style={{ color: "#c00", marginBottom: "1rem" }}>{error}</p>}

      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflow: "hidden",
          width: "100%",
          flex: 1,
          minHeight: 0,
          maxHeight: "calc(100vh - 220px)",
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
              <th style={cellPad}>Date</th>
              <th style={cellPad}>Type</th>
              <th style={{ ...cellPad, textAlign: "right" }}>Out</th>
              <th style={{ ...cellPad, textAlign: "right" }}>In</th>
              <th style={{ ...cellPad, textAlign: "right" }}>Balance</th>
              <th style={cellPad}>Description</th>
              <th style={cellPad}>Open</th>
              <th style={{ ...cellPad, width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    ...cellPad,
                    padding: "1.25rem 0.75rem",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  No movements yet for this account. Record payments elsewhere
                  with this method, or add a bank-only line below.
                </td>
              </tr>
            ) : (
              rowsWithBalance.map(({ row, balance }) => {
                const isEdit =
                  editingId === row.sourceId && row.sourceType === "bank_only";
                if (isEdit) {
                  return (
                    <tr
                      key={`${row.sourceType}-${row.sourceId}`}
                      style={{ borderTop: "1px solid #eee" }}
                    >
                      <td colSpan={8} style={cellPad}>
                        <form
                          onSubmit={handleSaveEdit}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                            alignItems: "flex-end",
                          }}
                        >
                          <label style={{ fontSize: "0.8125rem" }}>
                            Date
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              required
                              style={{
                                ...tableInput,
                                display: "block",
                                marginTop: 4,
                              }}
                            />
                          </label>
                          <label style={{ fontSize: "0.8125rem" }}>
                            Amount
                            <input
                              type="number"
                              min={0.01}
                              step={0.01}
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              required
                              style={{
                                ...tableInput,
                                display: "block",
                                marginTop: 4,
                                width: 90,
                              }}
                            />
                          </label>
                          <label style={{ fontSize: "0.8125rem" }}>
                            Direction
                            <select
                              value={editDirection}
                              onChange={(e) =>
                                setEditDirection(e.target.value as "in" | "out")
                              }
                              style={{
                                ...tableInput,
                                display: "block",
                                marginTop: 4,
                                minWidth: 100,
                              }}
                            >
                              <option value="out">Out</option>
                              <option value="in">In</option>
                            </select>
                          </label>
                          <label
                            style={{
                              flex: "1 1 180px",
                              minWidth: 140,
                              fontSize: "0.8125rem",
                            }}
                          >
                            Description
                            <input
                              value={editDescription}
                              onChange={(e) =>
                                setEditDescription(e.target.value)
                              }
                              required
                              style={{
                                ...tableInput,
                                display: "block",
                                marginTop: 4,
                                width: "100%",
                              }}
                            />
                          </label>
                          <label style={{ fontSize: "0.8125rem" }}>
                            Category
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              style={{
                                ...tableInput,
                                display: "block",
                                marginTop: 4,
                                minWidth: 120,
                              }}
                            >
                              {BANK_CATEGORIES.map((c) => (
                                <option key={c.value || "none"} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="submit"
                            style={{
                              marginRight: 8,
                              padding: "0.35rem 0.6rem",
                              fontSize: "0.85rem",
                              background: "#1a1a1a",
                              color: "#fff",
                              borderRadius: 4,
                              border: "none",
                              cursor: "pointer",
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
                        </form>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={`${row.sourceType}-${row.sourceId}`}
                    style={{
                      borderTop: "1px solid #eee",
                      verticalAlign: "top",
                    }}
                  >
                    <td style={{ ...cellPad, whiteSpace: "nowrap" }}>
                      {formatDate(row.date)}
                    </td>
                    <td style={{ ...cellPad, color: "#444" }}>
                      {sourceTypeLabel(row.sourceType)}
                    </td>
                    <td style={{ ...cellPad, textAlign: "right" }}>
                      {row.direction === "out" ? formatMoney(row.amount) : "—"}
                    </td>
                    <td style={{ ...cellPad, textAlign: "right" }}>
                      {row.direction === "in" ? formatMoney(row.amount) : "—"}
                    </td>
                    <td
                      style={{
                        ...cellPad,
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      {formatMoney(balance)}
                    </td>
                    <td style={cellPad}>{row.label}</td>
                    <td style={cellPad}>
                      <RegisterSourceLink row={row} />
                    </td>
                    <td style={cellPad}>
                      {row.sourceType === "bank_only" ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            onClick={() => startEditBankOnly(row)}
                            title="Edit"
                            style={{
                              marginRight: 8,
                              fontSize: "0.85rem",
                              color: "#1a1a1a",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            <PencilIcon size={14} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => handleDeleteBankOnly(row.sourceId)}
                            style={{
                              color: "#c00",
                              fontSize: "0.85rem",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      ) : null}
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
          onSubmit={handleCreateBankOnly}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            title="Date"
            style={{ ...tableInput, width: "auto" }}
          />
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            required
            placeholder="Amount"
            style={{ ...tableInput, width: 90 }}
          />
          <select
            value={newDirection}
            onChange={(e) => setNewDirection(e.target.value as "in" | "out")}
            style={{ ...tableInput, minWidth: 120 }}
            title="Direction"
          >
            <option value="out">Out (debit)</option>
            <option value="in">In (credit)</option>
          </select>
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            required
            placeholder="Description (e.g. bank fee)"
            style={{ ...tableInput, minWidth: 180, flex: "1 1 200px" }}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ ...tableInput, minWidth: 120 }}
            title="Category"
          >
            {BANK_CATEGORIES.map((c) => (
              <option key={c.value || "none"} value={c.value}>
                {c.label === "—" ? "Category" : c.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              background: "#1a1a1a",
              color: "#f5f5f0",
              borderRadius: 4,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Add bank-only entry
          </button>
        </form>
      </div>
    </div>
  );
}
