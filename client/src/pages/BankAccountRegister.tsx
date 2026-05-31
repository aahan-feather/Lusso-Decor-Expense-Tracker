import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  api,
  type RegisterRow,
  type PaymentMethodRegisterResponse,
} from "../api";
import { formatDate, formatMoney, todayISO } from "../utils/format";
import { PencilIcon, TrashIcon } from "lucide-react";
import {
  ScrollableSortableTable,
  type TableColumn,
} from "../components/ScrollableSortableTable";

type RegisterRowWithBalance = {
  row: RegisterRow;
  balance: number;
};

const BANK_REGISTER_COLUMNS: TableColumn[] = [
  { header: "Date" },
  { header: "Type", headerStyle: { minWidth: 140 } },
  { header: "Description" },
  { header: "In", headerStyle: { textAlign: "right", whiteSpace: "nowrap" } },
  { header: "Out", headerStyle: { textAlign: "right", whiteSpace: "nowrap" } },
  {
    header: "Balance",
    headerStyle: { textAlign: "right", whiteSpace: "nowrap" },
  },
  { header: "", headerStyle: { width: 80 } },
];

const sortRegisterRowsBySortAtAsc = (
  a: RegisterRowWithBalance,
  b: RegisterRowWithBalance,
) => a.row.sortAt.localeCompare(b.row.sortAt);

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

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatFilterDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return [d, m, y].join("-");
}

const filterChipStyle: React.CSSProperties = {
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
};

const filterInputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: "0.9rem",
};

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

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [descriptionSearch, setDescriptionSearch] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

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

  const typeSearchLower = typeSearch.trim().toLowerCase();
  const descriptionSearchLower = descriptionSearch.trim().toLowerCase();
  const amountMinNum = amountMin === "" ? null : parseFloat(amountMin);
  const amountMaxNum = amountMax === "" ? null : parseFloat(amountMax);

  const filteredRows = rows.filter((row) => {
    const dk = dateKey(row.date);
    if (dateFrom && dk < dateFrom) return false;
    if (dateTo && dk > dateTo) return false;
    if (
      typeSearchLower &&
      !sourceTypeLabel(row.sourceType).toLowerCase().includes(typeSearchLower)
    )
      return false;
    if (
      descriptionSearchLower &&
      !row.label.toLowerCase().includes(descriptionSearchLower)
    )
      return false;
    if (
      amountMinNum != null &&
      !Number.isNaN(amountMinNum) &&
      row.amount < amountMinNum
    )
      return false;
    if (
      amountMaxNum != null &&
      !Number.isNaN(amountMaxNum) &&
      row.amount > amountMaxNum
    )
      return false;
    return true;
  });

  const hasActiveFilters =
    dateFrom ||
    dateTo ||
    typeSearch.trim() ||
    descriptionSearch.trim() ||
    amountMin ||
    amountMax;

  const rowKey = (row: RegisterRow) => `${row.sourceType}-${row.sourceId}`;
  let running = 0;
  const balanceByRowKey = new Map<string, number>();
  [...filteredRows]
    .sort((a, b) => a.sortAt.localeCompare(b.sortAt))
    .forEach((row) => {
      running += row.direction === "in" ? row.amount : -row.amount;
      balanceByRowKey.set(rowKey(row), running);
    });
  const rowsWithBalance: RegisterRowWithBalance[] = [...filteredRows]
    .sort((a, b) => a.sortAt.localeCompare(b.sortAt))
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
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          marginBottom: hasActiveFilters ? "0.5rem" : "1.5rem",
          padding: "1rem",
          background: "#f8f8f8",
          borderRadius: 8,
          border: "1px solid #eee",
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
            style={filterInputStyle}
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
            style={filterInputStyle}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flex: "1 1 140px",
            minWidth: 140,
          }}
        >
          <label
            style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
          >
            Type
          </label>
          <input
            type="search"
            placeholder="Search type…"
            value={typeSearch}
            onChange={(e) => setTypeSearch(e.target.value)}
            style={{ ...filterInputStyle, flex: 1, maxWidth: 180 }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flex: "1 1 180px",
            minWidth: 180,
          }}
        >
          <label
            style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
          >
            Description
          </label>
          <input
            type="search"
            placeholder="Search description…"
            value={descriptionSearch}
            onChange={(e) => setDescriptionSearch(e.target.value)}
            style={{ ...filterInputStyle, flex: 1, maxWidth: 240 }}
          />
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
              step="0.01"
              placeholder="0"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              style={{ ...filterInputStyle, width: 90 }}
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
              step="0.01"
              placeholder="—"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              style={{ ...filterInputStyle, width: 90 }}
            />
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
            marginBottom: "1.5rem",
            paddingLeft: "1rem",
          }}
        >
          {dateFrom && (
            <button
              type="button"
              onClick={() => setDateFrom("")}
              style={filterChipStyle}
              title="Remove date from filter"
            >
              From: {formatFilterDate(dateFrom)}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {dateTo && (
            <button
              type="button"
              onClick={() => setDateTo("")}
              style={filterChipStyle}
              title="Remove date to filter"
            >
              To: {formatFilterDate(dateTo)}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {typeSearch.trim() && (
            <button
              type="button"
              onClick={() => setTypeSearch("")}
              style={filterChipStyle}
              title="Remove type filter"
            >
              Type: {typeSearch.trim()}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {descriptionSearch.trim() && (
            <button
              type="button"
              onClick={() => setDescriptionSearch("")}
              style={filterChipStyle}
              title="Remove description filter"
            >
              Description: {descriptionSearch.trim()}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {amountMin && (
            <button
              type="button"
              onClick={() => setAmountMin("")}
              style={filterChipStyle}
              title="Remove amount min filter"
            >
              Min: {amountMin}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {amountMax && (
            <button
              type="button"
              onClick={() => setAmountMax("")}
              style={filterChipStyle}
              title="Remove amount max filter"
            >
              Max: {amountMax}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
        </div>
      )}

      <ScrollableSortableTable
        items={rowsWithBalance}
        sortCompare={sortRegisterRowsBySortAtAsc}
        columns={BANK_REGISTER_COLUMNS}
        scrollDeps={[id, loading]}
        emptyMessage={
          rows.length === 0
            ? "No movements yet for this account. Record payments elsewhere with this method, or add a bank-only line below."
            : "No entries match your filters."
        }
        emptyInTable={rows.length > 0}
        renderRow={({ row, balance }) => {
          const isEdit =
            editingId === row.sourceId && row.sourceType === "bank_only";
          if (isEdit) {
            return (
              <tr
                key={`${row.sourceType}-${row.sourceId}`}
                style={{ borderTop: "1px solid #eee" }}
              >
                <td colSpan={7} style={cellPad}>
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
                        onChange={(e) => setEditDescription(e.target.value)}
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
              <td style={{ ...cellPad, wordBreak: "break-word" }}>{row.label}</td>
              <td style={{ ...cellPad, textAlign: "right", whiteSpace: "nowrap" }}>
                {row.direction === "in" ? formatMoney(row.amount) : "—"}
              </td>
              <td style={{ ...cellPad, textAlign: "right", whiteSpace: "nowrap" }}>
                {row.direction === "out" ? formatMoney(row.amount) : "—"}
              </td>
              <td
                style={{
                  ...cellPad,
                  textAlign: "right",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {formatMoney(balance)}
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
