import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, type DashboardData } from "../api";
import { formatDate, formatMoney } from "../utils/format";

const backupButtonStyle = {
  padding: "0.5rem 1rem",
  background: "#1a1a1a",
  color: "#f5f5f0",
  border: "none",
  borderRadius: 6,
  fontWeight: 500,
  cursor: "pointer",
} as const;

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  function loadDashboard() {
    setLoading(true);
    setError(null);
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleExport() {
    setBackupError(null);
    setBackupMessage(null);
    setExporting(true);
    try {
      await api.exportBackup();
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  function handleImportClick() {
    setBackupError(null);
    setBackupMessage(null);
    importInputRef.current?.click();
  }

  async function handleImportFile(file: File) {
    const confirmed = window.confirm(
      "Importing a backup will permanently delete all current data in the database and replace it with the contents of this zip file. Continue?",
    );
    if (!confirmed) return;

    setBackupError(null);
    setBackupMessage(null);
    setImporting(true);
    try {
      const result = await api.importBackup(file);
      const totalRows = result.tables.reduce((sum, t) => sum + t.count, 0);
      setBackupMessage(`Backup restored (${totalRows} rows across ${result.tables.length} tables).`);
      loadDashboard();
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  if (loading) return <p>Loading dashboard…</p>;
  if (error) return <p style={{ color: "#c00" }}>{error}</p>;
  if (!data) return null;

  const { backupImportEnabled, counts, totals, recent } = data;

  const cards = [
    { label: "Total projects", value: counts.projects, link: "/projects" },
    { label: "Total billed (projects)", value: formatMoney(totals.totalBilled) },
    { label: "Total received", value: formatMoney(totals.totalReceived) },
    { label: "Outstanding from projects", value: formatMoney(totals.outstandingFromProjects), highlight: true },
    { label: "Total vendors", value: counts.vendors, link: "/vendors" },
    { label: "Total vendor bill", value: formatMoney(totals.totalVendorBill) },
    { label: "Total paid to vendors", value: formatMoney(totals.totalPaidToVendors) },
    { label: "Outstanding to vendors", value: formatMoney(totals.outstandingToVendors), highlight: true },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>Dashboard</h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || (backupImportEnabled && importing)}
            style={{
              ...backupButtonStyle,
              cursor: exporting || importing ? "wait" : "pointer",
              opacity: exporting || importing ? 0.7 : 1,
            }}
          >
            {exporting ? "Exporting…" : "Export backup"}
          </button>
          {backupImportEnabled && (
            <>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={exporting || importing}
                style={{
                  ...backupButtonStyle,
                  background: "#fff",
                  color: "#1a1a1a",
                  border: "1px solid #ccc",
                  cursor: exporting || importing ? "wait" : "pointer",
                  opacity: exporting || importing ? 0.7 : 1,
                }}
              >
                {importing ? "Importing…" : "Import backup"}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".zip,application/zip"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                }}
              />
            </>
          )}
        </div>
      </div>
      {backupError && (
        <p style={{ color: "#c00", marginBottom: "1rem" }}>{backupError}</p>
      )}
      {backupMessage && (
        <p style={{ color: "#060", marginBottom: "1rem" }}>{backupMessage}</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "2.5rem",
        }}
      >
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              background: c.highlight ? "#1a1a1a" : "#fff",
              color: c.highlight ? "#f5f5f0" : undefined,
              padding: "1.25rem",
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "0.85rem", opacity: 0.85, marginBottom: "0.35rem" }}>{c.label}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>
              {c.link ? (
                <Link to={c.link} style={{ color: "inherit", textDecoration: "none" }}>
                  {typeof c.value === "number" ? c.value : c.value}
                </Link>
              ) : (
                c.value
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>Recent project payments</h2>
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            {recent.projectPayments.length === 0 ? (
              <p style={{ padding: "1.5rem", color: "#666" }}>No payments yet</p>
            ) : (
              <ul style={{ listStyle: "none" }}>
                {recent.projectPayments.map((p) => (
                  <li
                    key={p.id}
                    style={{
                      padding: "0.75rem 1.25rem",
                      borderBottom: "1px solid #eee",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      <Link to={`/projects/${p.projectId}`} style={{ fontWeight: 500 }}>
                        {p.project.name}
                      </Link>
                      <span style={{ marginLeft: "0.5rem", color: "#666", fontSize: "0.9rem" }}>
                        {formatDate(p.date)}
                        {"paymentMethod" in p && p.paymentMethod && ` · ${p.paymentMethod.name}`}
                      </span>
                    </span>
                    <span style={{ fontWeight: 600 }}>{formatMoney(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>Recent vendor payments</h2>
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            {recent.vendorPayments.length === 0 ? (
              <p style={{ padding: "1.5rem", color: "#666" }}>No payments yet</p>
            ) : (
              <ul style={{ listStyle: "none" }}>
                {recent.vendorPayments.map((p) => (
                  <li
                    key={p.id}
                    style={{
                      padding: "0.75rem 1.25rem",
                      borderBottom: "1px solid #eee",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      <Link to={`/vendors/${p.vendorId}`} style={{ fontWeight: 500 }}>
                        {p.vendor.name}
                      </Link>
                      <span style={{ marginLeft: "0.5rem", color: "#666", fontSize: "0.9rem" }}>
                        {formatDate(p.date)}
                        {p.paymentMethod && ` · ${p.paymentMethod.name}`}
                      </span>
                    </span>
                    <span style={{ fontWeight: 600 }}>{formatMoney(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
