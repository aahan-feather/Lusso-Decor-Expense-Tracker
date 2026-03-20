import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  api,
  type Vendor,
  type VendorItem,
  type VendorPayment,
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

export function VendorList() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const load = () =>
    api.vendors
      .list()
      .then(setVendors)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.vendors.create({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setName("");
      setEmail("");
      setPhone("");
      setShowForm(false);
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
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600 }}>Vendors</h1>
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
          {showForm ? "Cancel" : "Add vendor"}
        </button>
      </div>

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
            Name *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                display: "block",
                marginTop: 4,
                padding: "0.5rem",
                width: 200,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                display: "block",
                marginTop: 4,
                padding: "0.5rem",
                width: 200,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            />
          </label>
          <label>
            Phone
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                display: "block",
                marginTop: 4,
                padding: "0.5rem",
                width: 160,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            />
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
            Save
          </button>
        </form>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflow: "hidden",
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        {vendors.length === 0 ? (
          <p style={{ padding: "2rem", color: "#666" }}>
            No vendors yet. Add one above.
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
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  boxShadow: "0 1px 0 0 #eee",
                }}
              >
                <th style={{ padding: "0.4rem 0.75rem" }}>Name</th>
                <th style={{ padding: "0.4rem 0.75rem" }}>Contact</th>
                <th style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
                  Balance due
                </th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "0.4rem 0.75rem" }}>
                    <Link to={`/vendors/${v.id}`} style={{ fontWeight: 500 }}>
                      {v.name}
                    </Link>
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                    {[v.email, v.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td
                    style={{
                      padding: "0.4rem 0.75rem",
                      textAlign: "right",
                      fontWeight: 500,
                    }}
                  >
                    {formatMoney(v.balance ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

type VendorDetailData = Vendor & {
  vendorItems: VendorItem[];
  vendorPayments: VendorPayment[];
  balance: number;
};

export function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<VendorDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualDesc, setManualDesc] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(() => todayDisplay());
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => todayDisplay());
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editPaymentNote, setEditPaymentNote] = useState("");
  const [editPaymentMethodId, setEditPaymentMethodId] = useState("");

  // Vendor activity filters
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [paidMin, setPaidMin] = useState<string>("");
  const [paidMax, setPaidMax] = useState<string>("");
  const [expenseMin, setExpenseMin] = useState<string>("");
  const [expenseMax, setExpenseMax] = useState<string>("");
  const [projectNameSearch, setProjectNameSearch] = useState<string>("");
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("");
  const [addMode, setAddMode] = useState<"expense" | "payment">("expense");

  const loadVendor = () => {
    if (!id) return;
    api.vendors
      .get(id)
      .then(setVendor)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadVendor();
    api.paymentMethods
      .list()
      .then(setPaymentMethods)
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    setLoading(false);
  }, [vendor, error]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !manualDesc.trim() || manualAmount === "") return;
    try {
      const dateISO = manualDate
        ? (parseDateInput(manualDate) ?? todayISO())
        : todayISO();
      await api.vendors.addItem(id, {
        description: manualDesc.trim(),
        amount: parseFloat(manualAmount),
        date: dateISO,
      });
      setManualDesc("");
      setManualAmount("");
      setManualDate(todayDisplay());
      loadVendor();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !paymentAmount) return;
    const dateISO = paymentDate
      ? (parseDateInput(paymentDate) ?? todayISO())
      : todayISO();
    try {
      await api.vendors.addPayment(id, {
        amount: parseFloat(paymentAmount),
        date: dateISO,
        note: paymentNote.trim() || undefined,
        paymentMethodId: paymentMethodId.trim() || undefined,
      });
      setPaymentAmount("");
      setPaymentDate(todayDisplay());
      setPaymentNote("");
      setPaymentMethodId("");
      loadVendor();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const deleteItem = async (itemId: string, description: string) => {
    if (!id || !confirm(`Remove this item "${description}" from vendor? `))
      return;
    try {
      await api.vendors.deleteItem(id, itemId);
      setEditingItemId(null);
      loadVendor();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const deletePayment = async (paymentId: string, note: string) => {
    if (!id || !confirm(`Remove this payment "${note}" from vendor? `))
      return;
    try {
      await api.vendors.deletePayment(id, paymentId);
      setEditingPaymentId(null);
      loadVendor();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const startEdit = (row: ActivityRow) => {
    if (row.type !== "expense" || !row.itemId || row.projectName) return;
    setEditingItemId(row.itemId);
    setEditDesc(row.description);
    setEditAmount(String(row.expenseAmount));
    setEditDate(formatDate(row.date));
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditDesc("");
    setEditAmount("");
    setEditDate("");
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editingItemId || !editDesc.trim() || editAmount === "") return;
    try {
      const dateISO = editDate
        ? (parseDateInput(editDate) ?? todayISO())
        : todayISO();
      await api.vendors.updateItem(id, editingItemId, {
        description: editDesc.trim(),
        amount: parseFloat(editAmount),
        date: dateISO,
      });
      cancelEdit();
      loadVendor();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const startEditPayment = (row: ActivityRow) => {
    if (row.type !== "payment" || !row.paymentId) return;
    setEditingPaymentId(row.paymentId);
    setEditPaymentAmount(String(row.paidAmount));
    setEditPaymentDate(formatDate(row.date));
    setEditPaymentNote(row.description === "Payment" ? "" : row.description);
    setEditPaymentMethodId(row.paymentMethodId ?? "");
  };

  const cancelEditPayment = () => {
    setEditingPaymentId(null);
    setEditPaymentAmount("");
    setEditPaymentDate("");
    setEditPaymentNote("");
    setEditPaymentMethodId("");
  };

  const saveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editingPaymentId || editPaymentAmount === "") return;
    try {
      const dateISO = editPaymentDate
        ? (parseDateInput(editPaymentDate) ?? todayISO())
        : todayISO();
      await api.vendors.updatePayment(id, editingPaymentId, {
        amount: parseFloat(editPaymentAmount),
        date: dateISO,
        note: editPaymentNote.trim() || null,
        paymentMethodId: editPaymentMethodId.trim() || null,
      });
      cancelEditPayment();
      loadVendor();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading && !vendor) return <p>Loading…</p>;
  if (error && !vendor) return <p style={{ color: "#c00" }}>{error}</p>;
  if (!vendor) return null;

  const totalPaid = vendor.vendorPayments.reduce((s, i) => s + i.amount, 0);

  type ActivityRow = {
    id: string;
    date: string;
    description: string;
    paidAmount: number;
    expenseAmount: number;
    projectName: string | null;
    type: "expense" | "payment";
    itemId?: string;
    paymentId?: string;
    paymentMethodId?: string | null;
    paymentMethodName?: string | null;
  };
  const activityRows: ActivityRow[] = [
    ...vendor.vendorItems.map(
      (item): ActivityRow => ({
        id: `item-${item.id}`,
        date: item.date,
        description: item.description,
        paidAmount: 0,
        expenseAmount: item.amount,
        projectName: item.lineItem?.project?.name ?? null,
        type: "expense",
        itemId: item.id,
      }),
    ),
    ...vendor.vendorPayments.map(
      (p): ActivityRow => ({
        id: `payment-${p.id}`,
        date: p.date,
        description: p.note?.trim() || "Payment",
        paidAmount: p.amount,
        expenseAmount: 0,
        projectName: null,
        type: "payment",
        paymentId: p.id,
        paymentMethodId: p.paymentMethodId ?? null,
        paymentMethodName: p.paymentMethod?.name ?? null,
      }),
    ),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const projectSearchLower = projectNameSearch.trim().toLowerCase();
  const paidMinNum = paidMin === "" ? null : parseFloat(paidMin);
  const paidMaxNum = paidMax === "" ? null : parseFloat(paidMax);
  const expenseMinNum = expenseMin === "" ? null : parseFloat(expenseMin);
  const expenseMaxNum = expenseMax === "" ? null : parseFloat(expenseMax);

  const filteredActivityRows = activityRows.filter((row) => {
    if (dateFrom && row.date < dateFrom) return false;
    if (dateTo && row.date > dateTo) return false;
    if (
      paidMinNum != null &&
      !Number.isNaN(paidMinNum) &&
      row.paidAmount < paidMinNum
    )
      return false;
    if (
      paidMaxNum != null &&
      !Number.isNaN(paidMaxNum) &&
      row.paidAmount > paidMaxNum
    )
      return false;
    if (
      expenseMinNum != null &&
      !Number.isNaN(expenseMinNum) &&
      row.expenseAmount < expenseMinNum
    )
      return false;
    if (
      expenseMaxNum != null &&
      !Number.isNaN(expenseMaxNum) &&
      row.expenseAmount > expenseMaxNum
    )
      return false;
    if (
      projectSearchLower &&
      !(row.projectName ?? "").toLowerCase().includes(projectSearchLower)
    )
      return false;
    if (paymentModeFilter && (row.paymentMethodId ?? "") !== paymentModeFilter)
      return false;
    return true;
  });

  const hasActiveFilters =
    dateFrom ||
    dateTo ||
    paidMin ||
    paidMax ||
    expenseMin ||
    expenseMax ||
    projectNameSearch.trim() ||
    paymentModeFilter;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%",
      }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1>{vendor.name}</h1>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "space-between",
              }}
            >
              <div>Total Billing: </div>
              <div>
                {formatMoney(
                  vendor.vendorItems.reduce((s, i) => s + i.amount, 0),
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "space-between",
              }}
            >
              <div>Paid: </div>
              <div>{formatMoney(totalPaid)}</div>
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "space-between",
              }}
            >
              <div>Balance due: </div>
              <div>{formatMoney(vendor.balance)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor activity filters */}
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
              Paid min
            </label>
            <input
              type="number"
              step="1"
              placeholder="0"
              value={paidMin}
              onChange={(e) => setPaidMin(e.target.value)}
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
              Paid max
            </label>
            <input
              type="number"
              step="1"
              placeholder="—"
              value={paidMax}
              onChange={(e) => setPaidMax(e.target.value)}
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
              Expense min
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
              Expense max
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flex: "1 1 200px",
            minWidth: 200,
          }}
        >
          <label
            style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
          >
            Project name
          </label>
          <input
            type="search"
            placeholder="Project name…"
            value={projectNameSearch}
            onChange={(e) => setProjectNameSearch(e.target.value)}
            style={{
              padding: "0.4rem 0.6rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: "0.9rem",
              flex: 1,
              maxWidth: 280,
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label
            style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
          >
            Mode
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
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
            marginTop: "-1rem",
            marginBottom: "1.5rem",
            paddingLeft: "0",
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
              title="Remove date from filter"
            >
              From:{" "}
              {dateFrom &&
                (() => {
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
              title="Remove date to filter"
            >
              To:{" "}
              {dateTo &&
                (() => {
                  const [y, m, d] = dateTo.split("-");
                  return [d, m, y].join("-");
                })()}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {paidMin && (
            <button
              type="button"
              onClick={() => setPaidMin("")}
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
              title="Remove paid min filter"
            >
              Paid ≥ {paidMin}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {paidMax && (
            <button
              type="button"
              onClick={() => setPaidMax("")}
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
              title="Remove paid max filter"
            >
              Paid ≤ {paidMax}
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
              title="Remove expense min filter"
            >
              Expense ≥ {expenseMin}
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
              title="Remove expense max filter"
            >
              Expense ≤ {expenseMax}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {projectNameSearch.trim() && (
            <button
              type="button"
              onClick={() => setProjectNameSearch("")}
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
              title="Remove project name filter"
            >
              Project: {projectNameSearch}
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
              title="Remove payment mode filter"
            >
              Payment:{" "}
              {paymentMethods.find((pm) => pm.id === paymentModeFilter)?.name ??
                paymentModeFilter}
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
          maxHeight: "calc(100% - 400px)",
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
              <th style={{ padding: "0.4rem 0.75rem" }}>Project Name</th>

              <th style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
                Paid Amount
              </th>
              <th style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
                Expense Amount
              </th>
              <th style={{ padding: "0.4rem 0.75rem" }}>Payment mode</th>
              <th style={{ padding: "0.4rem 0.75rem" }}>Description</th>

              <th style={{ padding: "0.4rem 0.75rem", width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {filteredActivityRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "1.25rem 0.75rem",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  {activityRows.length === 0
                    ? "No expenses or payments yet."
                    : "No activity matches your filters."}
                </td>
              </tr>
            ) : (
              filteredActivityRows.map((row) => {
                const isManualExpense =
                  row.type === "expense" && row.itemId && !row.projectName;
                const isEditing =
                  row.type === "expense" && row.itemId === editingItemId;
                const isEditingPayment =
                  row.type === "payment" && row.paymentId === editingPaymentId;

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

                      <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                        —
                      </td>

                      <td
                        style={{
                          padding: "0.4rem 0.75rem",
                          textAlign: "right",
                        }}
                      >
                        —
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

                      <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                        —
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

                if (isEditingPayment) {
                  return (
                    <tr key={row.id} style={{ borderTop: "1px solid #eee" }}>
                      <td style={{ padding: "0.4rem 0.75rem" }}>
                        <input
                          type="text"
                          placeholder="dd/mm/yy"
                          value={editPaymentDate}
                          onChange={(e) => setEditPaymentDate(e.target.value)}
                          style={{
                            padding: "0.4rem",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                            width: 90,
                          }}
                        />
                      </td>
                      <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                        —
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
                          value={editPaymentAmount}
                          onChange={(e) => setEditPaymentAmount(e.target.value)}
                          style={{
                            padding: "0.4rem",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                            width: 90,
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.75rem",
                          textAlign: "right",
                        }}
                      >
                        —
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
                          placeholder="Note (optional)"
                          value={editPaymentNote}
                          onChange={(e) => setEditPaymentNote(e.target.value)}
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
                            onClick={saveEditPayment}
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
                            onClick={cancelEditPayment}
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
                    <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                      {row.projectName ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        textAlign: "right",
                      }}
                    >
                      {row.paidAmount !== 0 ? formatMoney(row.paidAmount) : "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        textAlign: "right",
                      }}
                    >
                      {row.expenseAmount !== 0
                        ? formatMoney(row.expenseAmount)
                        : "—"}
                    </td>

                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        textAlign: "center",
                      }}
                    >
                      {row.paymentMethodName ?? "—"}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {row.description}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {isManualExpense ? (
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
                            onClick={() =>
                              deleteItem(row.itemId!, row.description ?? "")
                            }
                            style={{ color: "#c00", fontSize: "0.85rem" }}
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      ) : row.type === "payment" && row.paymentId ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            onClick={() => startEditPayment(row)}
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
                            onClick={() =>
                              deletePayment(
                                row.paymentId!,
                                row.description ?? "",
                              )
                            }
                            style={{ color: "#c00", fontSize: "0.85rem" }}
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
          onSubmit={(e) => {
            e.preventDefault();
            if (addMode === "expense") addItem(e);
            else addPayment(e);
          }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              border: "1px solid #ccc",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setAddMode("expense")}
              style={{
                padding: "0.5rem 0.85rem",
                border: "none",
                background: addMode === "expense" ? "#1a1a1a" : "#f0f0f0",
                color: addMode === "expense" ? "#fff" : "#333",
                fontWeight: 500,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Add expense
            </button>
            <button
              type="button"
              onClick={() => setAddMode("payment")}
              style={{
                padding: "0.5rem 0.85rem",
                border: "none",
                background: addMode === "payment" ? "#1a1a1a" : "#f0f0f0",
                color: addMode === "payment" ? "#fff" : "#333",
                fontWeight: 500,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Record payment
            </button>
          </div>
          <input
            type="text"
            placeholder="dd/mm/yy"
            value={addMode === "expense" ? manualDate : paymentDate}
            onChange={(e) =>
              addMode === "expense"
                ? setManualDate(e.target.value)
                : setPaymentDate(e.target.value)
            }
            style={{
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              width: 90,
            }}
          />
          {addMode === "expense" ? (
            <>
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
            </>
          ) : (
            <>
              <input
                placeholder="Note (optional)"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
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
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
                style={{
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  width: 90,
                }}
              />
              <select
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
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
            </>
          )}
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
    </div>
  );
}
