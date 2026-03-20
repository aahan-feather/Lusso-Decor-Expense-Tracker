import React, { useState } from "react";
import {
  api,
  type ExpensesAndPaymentsProject,
  type LineItem,
  type ProjectPayment,
  ProjectStatus,
  type Vendor,
  type PaymentMethod,
} from "../api";
import {
  formatDate,
  formatMoney,
  todayISO,
  todayDisplay,
  parseDateInput,
} from "../utils/format";
import { PencilIcon, TrashIcon } from "lucide-react";

/** Align with Vendors / Office expenses tables */
const tableSurface: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.8125rem",
};

const theadRowStyle: React.CSSProperties = {
  background: "#f8f8f8",
  textAlign: "left",
  position: "sticky",
  top: 0,
  zIndex: 1,
  boxShadow: "0 1px 0 0 #eee",
};

export type ProjectEntry =
  | { type: "expense"; createdAt: string; data: LineItem }
  | { type: "payment"; createdAt: string; data: ProjectPayment };

export function mergeEntries(
  project: ExpensesAndPaymentsProject,
): ProjectEntry[] {
  const expenses: ProjectEntry[] = (project.lineItems ?? []).map((item) => ({
    type: "expense" as const,
    createdAt:
      (item as LineItem & { createdAt?: string }).createdAt ?? item.date,
    data: item,
  }));
  const payments: ProjectEntry[] = (project.projectPayments ?? []).map((p) => ({
    type: "payment" as const,
    createdAt:
      (p as ProjectPayment & { createdAt?: string }).createdAt ?? p.date,
    data: p,
  }));
  const merged = [...expenses, ...payments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return merged;
}

const STATUS_STYLES: Record<
  ProjectStatus,
  { background: string; color: string }
> = {
  [ProjectStatus.Running]: { background: "#1a1a1a", color: "#fff" },
  [ProjectStatus.Due]: { background: "#c00", color: "#fff" },
  [ProjectStatus.Closed]: { background: "#0a6b0a", color: "#fff" },
};

export function ProjectStatusBadge({
  project,
  isOpen,
  onToggle,
  onSelect,
  onClose,
}: {
  project: ExpensesAndPaymentsProject;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (status: ProjectStatus) => void | Promise<void>;
  onClose: () => void;
}) {
  const status = project.status ?? null;
  const displayStatus = status as ProjectStatus | null;
  const [saving, setSaving] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleSelect = async (s: ProjectStatus) => {
    setSaving(true);
    try {
      await onSelect(s);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={dropdownRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        disabled={saving}
        style={{
          padding: "0.25rem 0.6rem",
          borderRadius: 6,
          border: "none",
          fontWeight: 600,
          fontSize: "0.8rem",
          cursor: saving ? "not-allowed" : "pointer",
          ...(displayStatus && STATUS_STYLES[displayStatus]
            ? STATUS_STYLES[displayStatus]
            : { background: "#e0e0e0", color: "#333" }),
        }}
      >
        {displayStatus?.charAt(0).toUpperCase() ?? "—"}
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10,
            minWidth: "100%",
            overflow: "hidden",
          }}
        >
          {(
            [
              ProjectStatus.Running,
              ProjectStatus.Due,
              ProjectStatus.Closed,
            ] as const
          ).map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(s);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "0.4rem 0.75rem",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontWeight: 500,
                fontSize: "0.8125rem",
                ...STATUS_STYLES[s],
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditLineItemRow({
  item,
  projectId,
  vendors,
  paymentMethods,
  onSaved,
  onCancel,
  onError,
}: {
  item: LineItem;
  projectId: string;
  vendors: Vendor[];
  paymentMethods: PaymentMethod[];
  onSaved: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const hasRateQty = item.rate != null && item.qty != null;
  const [description, setDescription] = useState(item.description);
  const [date, setDate] = useState(formatDate(item.date));
  const [rate, setRate] = useState(item.rate != null ? String(item.rate) : "");
  const [qty, setQty] = useState(item.qty != null ? String(item.qty) : "");
  const [amount, setAmount] = useState(!hasRateQty ? String(item.amount) : "");
  const [vendorId, setVendorId] = useState(item.vendorId ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(
    item.paymentMethodId ?? "",
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      onError("Description is required");
      return;
    }
    const hasRateQtyInput = rate !== "" && qty !== "";
    const hasAmountInput = amount !== "";
    if (!hasRateQtyInput && !hasAmountInput) {
      onError("Enter either amount or both rate and qty.");
      return;
    }
    if (hasRateQtyInput && hasAmountInput) {
      onError("Use either amount or rate × qty, not both.");
      return;
    }
    const dateISO = parseDateInput(date) ?? todayISO();
    setSubmitting(true);
    try {
      if (hasRateQtyInput) {
        await api.projects.updateLineItem(projectId, item.id, {
          description: description.trim(),
          date: dateISO,
          rate: parseFloat(rate),
          qty: parseFloat(qty),
          vendorId: vendorId.trim() || null,
          paymentMethodId: paymentMethodId.trim() || null,
        });
      } else {
        await api.projects.updateLineItem(projectId, item.id, {
          description: description.trim(),
          date: dateISO,
          amount: parseFloat(amount),
          vendorId: vendorId.trim() || null,
          paymentMethodId: paymentMethodId.trim() || null,
        });
      }
      onSaved();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    padding: "0.4rem",
    border: "1px solid #ccc",
    borderRadius: 4,
    fontSize: "0.8125rem",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <tr
      key={`edit-${item.id}`}
      style={{ borderTop: "1px solid #eee", background: "#f8fbf8" }}
    >
      <td style={{ padding: "0.4rem 0.75rem", whiteSpace: "nowrap" }}>
        <input
          type="text"
          placeholder="dd/mm/yy"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ ...inputStyle, width: 90 }}
        />
      </td>
      <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>-</td>
      <td style={{ padding: "0.4rem 0.75rem 0.4rem 2rem" }}>
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          style={{ ...inputStyle, minWidth: 120 }}
        />
      </td>
      <td style={{ padding: "0.4rem 0.75rem" }}>
        <input
          type="number"
          step="0.01"
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          style={{ ...inputStyle, width: 70 }}
        />
      </td>
      <td style={{ padding: "0.4rem 0.75rem" }}>
        <input
          type="number"
          step="0.01"
          placeholder="Rate"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          style={{ ...inputStyle, width: 90 }}
        />
      </td>
      <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ ...inputStyle, width: 90 }}
        />
      </td>
      <td style={{ padding: "0.4rem 0.75rem" }}>
        <select
          value={paymentMethodId}
          onChange={(e) => setPaymentMethodId(e.target.value)}
          style={{ ...inputStyle, minWidth: 100 }}
        >
          <option value="">Ledger</option>
          {paymentMethods.map((pm) => (
            <option key={pm.id} value={pm.id}>
              {pm.name}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: "0.4rem 0.75rem" }}>
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          style={{ ...inputStyle, minWidth: 110 }}
        >
          <option value="">—</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: "0.4rem 0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            style={{
              padding: "0.35rem 0.6rem",
              background: "#1a1a1a",
              color: "#fff",
              borderRadius: 4,
              fontSize: "0.85rem",
              cursor: "pointer",
              border: "none",
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              fontSize: "0.85rem",
              color: "#666",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

export function EditPaymentRow({
  payment,
  projectId,
  paymentMethods,
  onSaved,
  onCancel,
  onError,
}: {
  payment: ProjectPayment;
  projectId: string;
  paymentMethods: PaymentMethod[];
  onSaved: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [note, setNote] = useState(payment.note?.trim() ?? "");
  const [date, setDate] = useState(formatDate(payment.date));
  const [amount, setAmount] = useState(String(payment.amount));
  const [paymentMethodId, setPaymentMethodId] = useState(
    payment.paymentMethodId ?? "",
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim()) {
      onError("Amount is required");
      return;
    }
    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt < 0) {
      onError("Enter a valid amount");
      return;
    }
    const dateISO = parseDateInput(date) ?? todayISO();
    setSubmitting(true);
    try {
      await api.projects.updatePayment(projectId, payment.id, {
        amount: amt,
        date: dateISO,
        note: note.trim() || null,
        paymentMethodId: paymentMethodId.trim() || null,
      });
      onSaved();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    padding: "0.4rem",
    border: "1px solid #ccc",
    borderRadius: 4,
    fontSize: "0.8125rem",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <tr
      key={`edit-p-${payment.id}`}
      style={{ borderTop: "1px solid #eee", background: "#f0f8f0" }}
    >
      <td style={{ padding: "0.4rem 0.75rem", whiteSpace: "nowrap" }}>
        <input
          type="text"
          placeholder="dd/mm/yy"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ ...inputStyle, width: 90 }}
        />
      </td>
      <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          style={{ ...inputStyle, width: 90 }}
        />
      </td>
      <td style={{ padding: "0.4rem 0.75rem 0.4rem 2rem" }}>
        <input
          type="text"
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ ...inputStyle, minWidth: 120 }}
        />
      </td>
      <td style={{ padding: "0.4rem 0.75rem" }}>—</td>
      <td style={{ padding: "0.4rem 0.75rem" }}>—</td>
      <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>-</td>
      <td style={{ padding: "0.4rem 0.75rem" }}>
        <select
          value={paymentMethodId}
          onChange={(e) => setPaymentMethodId(e.target.value)}
          style={{ ...inputStyle, minWidth: 100 }}
        >
          <option value="">Mode of payment</option>
          {paymentMethods.map((pm) => (
            <option key={pm.id} value={pm.id}>
              {pm.name}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: "0.4rem 0.75rem" }}>—</td>
      <td style={{ padding: "0.4rem 0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            style={{
              padding: "0.35rem 0.6rem",
              background: "#1a1a1a",
              color: "#fff",
              borderRadius: 4,
              fontSize: "0.85rem",
              cursor: "pointer",
              border: "none",
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              fontSize: "0.85rem",
              color: "#666",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AddExpenseForm({
  projectId,
  vendors,
  paymentMethods,
  onAdded,
  onError,
}: {
  projectId: string;
  vendors: Vendor[];
  paymentMethods: PaymentMethod[];
  onAdded: () => void;
  onError: (s: string) => void;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => todayDisplay());
  const [rate, setRate] = useState("");
  const [qty, setQty] = useState("");
  const [amount, setAmount] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const hasRateQty = rate !== "" && qty !== "";
    const hasAmount = amount !== "";
    if (!hasRateQty && !hasAmount) {
      onError("Enter either amount or both rate and qty.");
      return;
    }
    if (hasRateQty && hasAmount) {
      onError("Use either amount or rate × qty, not both.");
      return;
    }
    if (!hasRateQty && (rate !== "" || qty !== "")) {
      onError("Provide both rate and qty, or use a single amount.");
      return;
    }
    const dateISO = parseDateInput(date) ?? todayISO();
    setSubmitting(true);
    try {
      await (hasRateQty
        ? api.projects.addLineItem(projectId, {
            description: name.trim(),
            date: dateISO,
            rate: parseFloat(rate),
            qty: parseFloat(qty),
            vendorId: vendorId || undefined,
            paymentMethodId: paymentMethodId || undefined,
          })
        : api.projects.addLineItem(projectId, {
            description: name.trim(),
            date: dateISO,
            amount: parseFloat(amount),
            vendorId: vendorId || undefined,
            paymentMethodId: paymentMethodId || undefined,
          }));

      setName("");
      setDate(todayDisplay());
      setRate("");
      setQty("");
      setAmount("");
      setVendorId("");
      setPaymentMethodId("");
      onAdded();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        alignItems: "flex-end",
        width: "100%",
        minWidth: 0,
      }}
    >
      <strong
        style={{
          width: "100%",
          marginBottom: 4,
          fontSize: "0.8125rem",
        }}
      >
        Add expense
      </strong>
      <input
        type="text"
        placeholder="dd/mm/yy"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{
          padding: "0.4rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          fontSize: "0.8125rem",
          width: 90,
        }}
      />
      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{
          padding: "0.4rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          fontSize: "0.8125rem",
          minWidth: 140,
        }}
      />

      <input
        type="number"
        step="0.01"
        placeholder="Qty"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        style={{
          padding: "0.4rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          fontSize: "0.8125rem",
          width: 70,
        }}
      />

      <input
        type="number"
        step="0.01"
        placeholder="Rate"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        style={{
          padding: "0.4rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          fontSize: "0.8125rem",
          width: 90,
        }}
      />

      <span style={{ color: "#666", fontSize: "0.8125rem" }}>or</span>

      <input
        type="number"
        step="0.01"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{
          padding: "0.4rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          fontSize: "0.8125rem",
          width: 90,
        }}
      />
      <select
        value={paymentMethodId}
        onChange={(e) => setPaymentMethodId(e.target.value)}
        style={{
          padding: "0.4rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          fontSize: "0.8125rem",
          minWidth: 120,
        }}
      >
        <option value="">Ledger</option>
        {paymentMethods.map((pm) => (
          <option key={pm.id} value={pm.id}>
            {pm.name}
          </option>
        ))}
      </select>
      {paymentMethodId === "" && (
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          style={{
            padding: "0.4rem",
            border: "1px solid #ccc",
            borderRadius: 4,
            fontSize: "0.8125rem",
            minWidth: 130,
          }}
        >
          <option value="">Vendor (optional)</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="submit"
        disabled={submitting}
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
  );
}

export function AddPaymentForm({
  projectId,
  paymentMethods,
  onAdded,
  onError,
}: {
  projectId: string;
  paymentMethods: PaymentMethod[];
  onAdded: () => void;
  onError: (s: string) => void;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => todayDisplay());
  const [amount, setAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    const dateISO = parseDateInput(date) ?? todayISO();
    setSubmitting(true);
    try {
      await api.projects.addPayment(projectId, {
        amount: parseFloat(amount),
        date: dateISO,
        note: name.trim(),
        paymentMethodId: paymentMethodId || undefined,
      });
      setName("");
      setDate(todayDisplay());
      setAmount("");
      setPaymentMethodId("");
      onAdded();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        alignItems: "flex-end",
        width: "100%",
        minWidth: 0,
      }}
    >
      <strong
        style={{
          width: "100%",
          marginBottom: 4,
          fontSize: "0.8125rem",
        }}
      >
        Receive payment
      </strong>
      <input
        type="text"
        placeholder="dd/mm/yy"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{
          padding: "0.4rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          fontSize: "0.8125rem",
          width: 90,
        }}
      />
      <input
        placeholder="Name / note"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{
          padding: "0.4rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          fontSize: "0.8125rem",
          minWidth: 140,
        }}
      />
      <input
        type="number"
        step="0.01"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        style={{
          padding: "0.4rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          fontSize: "0.8125rem",
          width: 100,
        }}
      />
      <select
        value={paymentMethodId}
        required
        onChange={(e) => setPaymentMethodId(e.target.value)}
        style={{
          padding: "0.4rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          fontSize: "0.8125rem",
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
        disabled={submitting}
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
  );
}

export function ProjectExpenseLedger({
  project,
  vendors,
  paymentMethods,
  onRefresh,
  onError,
}: {
  project: ExpensesAndPaymentsProject;
  vendors: Vendor[];
  paymentMethods: PaymentMethod[];
  onRefresh: () => void;
  onError: (message: string | null) => void;
}) {
  const [editingLineItemKey, setEditingLineItemKey] = useState<string | null>(
    null,
  );
  const [editingPaymentKey, setEditingPaymentKey] = useState<string | null>(
    null,
  );

  const entries = mergeEntries(project);

  return (
    <div>
      <div
        style={{
          maxHeight: "min(70vh, calc(100vh - 320px))",
          overflowY: "auto",
          width: "100%",
        }}
      >
        {entries.length === 0 ? (
          <p
            style={{
              padding: "1.25rem 0.75rem",
              margin: 0,
              color: "#666",
            }}
          >
            No line items or payments yet.
          </p>
        ) : (
          <table style={tableSurface}>
            <thead>
              <tr style={theadRowStyle}>
                <th style={{ padding: "0.4rem 0.75rem" }}>Date</th>
                <th
                  style={{
                    padding: "0.4rem 0.75rem",
                    textAlign: "right",
                  }}
                >
                  Amt. Recd.
                </th>
                <th
                  style={{
                    padding: "0.4rem 0.75rem 0.4rem 2rem",
                  }}
                >
                  Name
                </th>
                <th style={{ padding: "0.4rem 0.75rem" }}>Qty</th>
                <th style={{ padding: "0.4rem 0.75rem" }}>Rate</th>
                <th
                  style={{
                    padding: "0.4rem 0.75rem",
                    textAlign: "right",
                  }}
                >
                  Amount
                </th>
                <th style={{ padding: "0.4rem 0.75rem" }}>Mode</th>
                <th style={{ padding: "0.4rem 0.75rem" }}>Vendor</th>
                <th style={{ padding: "0.4rem 0.75rem", width: 80 }} />
              </tr>
            </thead>
            <tbody>
            {entries.map((entry) => {
              if (entry.type === "expense") {
                const item = entry.data as LineItem;
                const editingKey = `${project.id}-${item.id}`;
                const isEditing = editingLineItemKey === editingKey;
                if (isEditing) {
                  return (
                    <EditLineItemRow
                      key={`edit-${item.id}`}
                      item={item}
                      projectId={project.id}
                      vendors={vendors}
                      paymentMethods={paymentMethods}
                      onSaved={() => {
                        setEditingLineItemKey(null);
                        onRefresh();
                      }}
                      onCancel={() => setEditingLineItemKey(null)}
                      onError={(msg) => onError(msg)}
                    />
                  );
                }
                const rate = item.rate ?? null;
                const qty = item.qty ?? null;
                const total =
                  rate != null && qty != null ? rate * qty : item.amount;
                return (
                  <tr
                    key={`e-${item.id}`}
                    style={{ borderTop: "1px solid #eee" }}
                  >
                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(item.date)}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      -
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.75rem 0.4rem 2rem",
                      }}
                    >
                      {item.description}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {qty != null ? qty : "—"}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {rate != null ? formatMoney(rate) : "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      {formatMoney(total)}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {item.paymentMethod
                        ? item.paymentMethod.name
                        : "Ledger"}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {item.vendor ? item.vendor.name : "—"}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLineItemKey(editingKey);
                          }}
                          style={{
                            color: "#1a1a1a",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                            padding: 0,
                          }}
                        >
                          <PencilIcon size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={async () => {
                            if (!confirm("Delete this line item?")) return;
                            try {
                              await api.projects.deleteLineItem(
                                project.id,
                                item.id,
                              );
                              onRefresh();
                            } catch (err) {
                              onError((err as Error).message);
                            }
                          }}
                          style={{
                            color: "#c00",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                            padding: 0,
                          }}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              } else {
                const p = entry.data as ProjectPayment;
                const paymentEditingKey = `${project.id}-${p.id}`;
                const isEditingPayment =
                  editingPaymentKey === paymentEditingKey;
                if (isEditingPayment) {
                  return (
                    <EditPaymentRow
                      key={`edit-p-${p.id}`}
                      payment={p}
                      projectId={project.id}
                      paymentMethods={paymentMethods}
                      onSaved={() => {
                        setEditingPaymentKey(null);
                        onRefresh();
                      }}
                      onCancel={() => setEditingPaymentKey(null)}
                      onError={(msg) => onError(msg)}
                    />
                  );
                }
                return (
                  <tr
                    key={`p-${p.id}`}
                    style={{ borderTop: "1px solid #eee" }}
                  >
                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(p.date)}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      {formatMoney(p.amount)}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.75rem 0.4rem 2rem",
                      }}
                    >
                      {p.note?.trim() || "Payment received"}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>—</td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>—</td>
                    <td
                      style={{
                        padding: "0.4rem 0.75rem",
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      -
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      {p.paymentMethod ? p.paymentMethod.name : "—"}
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>—</td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPaymentKey(paymentEditingKey);
                          }}
                          style={{
                            color: "#1a1a1a",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                            padding: 0,
                          }}
                        >
                          <PencilIcon size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={async () => {
                            if (!confirm("Delete this payment?")) return;
                            try {
                              await api.projects.deletePayment(project.id, p.id);
                              onRefresh();
                            } catch (err) {
                              onError((err as Error).message);
                            }
                          }}
                          style={{
                            color: "#c00",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                            padding: 0,
                          }}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }
            })}
          </tbody>
          </table>
        )}
      </div>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          marginTop: "1.25rem",
          padding: "1rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 1px minmax(0, 1fr)",
            gap: "0 1.25rem",
            alignItems: "end",
          }}
        >
          <AddExpenseForm
            projectId={project.id}
            vendors={vendors}
            paymentMethods={paymentMethods}
            onAdded={onRefresh}
            onError={(msg) => onError(msg)}
          />
          <div
            aria-hidden
            style={{
              background: "#ddd",
              alignSelf: "stretch",
              minHeight: 48,
            }}
          />
          <AddPaymentForm
            projectId={project.id}
            paymentMethods={paymentMethods}
            onAdded={onRefresh}
            onError={(msg) => onError(msg)}
          />
        </div>
      </div>
    </div>
  );
}
