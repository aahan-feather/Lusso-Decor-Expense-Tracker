import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type PaymentMethod } from "../api";
import { formatMoney } from "../utils/format";

const TYPES = [
  { value: "bank", label: "Bank" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

export function PaymentMethodsPage() {
  const [list, setList] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("bank");

  const load = () =>
    api.paymentMethods
      .list()
      .then(setList)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.paymentMethods.create({ name: name.trim(), type });
      setName("");
      setType("bank");
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const startEdit = (pm: PaymentMethod) => {
    setEditingId(pm.id);
    setEditName(pm.name);
    setEditType(pm.type);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await api.paymentMethods.update(editingId, {
        name: editName.trim(),
        type: editType,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "#c00" }}>{error}</p>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600 }}>
          Bank Accounts &amp; Payment Methods
        </h1>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          style={{
            padding: "0.5rem 1rem",
            background: "#1a1a1a",
            color: "#f5f5f0",
            borderRadius: 6,
            fontWeight: 500,
          }}
        >
          {showForm ? "Cancel" : "Add payment method"}
        </button>
      </div>

      <p style={{ color: "#666", marginBottom: "1rem" }}>
        Add bank accounts, UPI IDs, cash, or other methods. You can select the
        payment method when recording payments from projects or to vendors.
      </p>

      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            marginBottom: "1.5rem",
            padding: "1.25rem",
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "flex-end",
          }}
        >
          <label>
            Name (e.g. HDFC Savings, Google Pay)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HDFC Savings"
              required
              style={{
                display: "block",
                marginTop: 4,
                padding: "0.5rem",
                width: 220,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            />
          </label>
          <label>
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                display: "block",
                marginTop: 4,
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              background: "#1a1a1a",
              color: "#f5f5f0",
              borderRadius: 6,
              fontWeight: 500,
            }}
          >
            Add
          </button>
        </form>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        {list.length === 0 ? (
          <p style={{ padding: "2rem", color: "#666" }}>
            No payment methods yet. Add one above.
          </p>
        ) : (
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
                }}
              >
                <th style={{ padding: "0.4rem 0.75rem" }}>Name</th>
                <th style={{ padding: "0.4rem 0.75rem" }}>Type</th>
                <th style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
                  Balance
                </th>
                <th style={{ padding: "0.4rem 0.75rem", width: 220 }} />
              </tr>
            </thead>
            <tbody>
              {list.map((pm) => (
                <tr key={pm.id} style={{ borderTop: "1px solid #eee" }}>
                  {editingId === pm.id ? (
                    <td colSpan={4} style={{ padding: "0.75rem 1.25rem" }}>
                      <form
                        onSubmit={handleUpdate}
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          alignItems: "center",
                        }}
                      >
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          style={{
                            padding: "0.4rem",
                            width: 200,
                            border: "1px solid #ccc",
                            borderRadius: 4,
                          }}
                        />
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          style={{
                            padding: "0.4rem",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                          }}
                        >
                          {TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          style={{
                            padding: "0.4rem 0.75rem",
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
                          onClick={() => setEditingId(null)}
                          style={{
                            padding: "0.4rem 0.75rem",
                            background: "#fff",
                            color: "#333",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td style={{ padding: "0.4rem 0.75rem" }}>
                        <Link
                          to={`/bank-accounts/${pm.id}`}
                          style={{ fontWeight: 500 }}
                        >
                          {pm.name}
                        </Link>
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.75rem",
                          color: "#666",
                          textTransform: "capitalize",
                        }}
                      >
                        {pm.type}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.75rem",
                          textAlign: "right",
                          fontWeight: 500,
                        }}
                      >
                        {formatMoney(pm.balance ?? 0)}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.75rem",
                          textAlign: "right",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => startEdit(pm)}
                          style={{ color: "#1a1a1a", fontSize: "0.9rem" }}
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
