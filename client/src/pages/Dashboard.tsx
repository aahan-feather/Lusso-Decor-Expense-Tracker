import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type DashboardData } from "../api";
import { formatDate, formatMoney } from "../utils/format";

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExportError(null);
    setExporting(true);
    try {
      await api.exportBackup();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <p>Loading dashboard…</p>;
  if (error) return <p style={{ color: "#c00" }}>{error}</p>;
  if (!data) return null;

  const { counts, totals, recent } = data;

  const cards = [
    { label: "Total projects", value: counts.projects, link: "/projects" },
    { label: "Total vendors", value: counts.vendors, link: "/vendors" },
    { label: "Total billed (projects)", value: formatMoney(totals.totalBilled) },
    { label: "Total received", value: formatMoney(totals.totalReceived) },
    { label: "Outstanding from projects", value: formatMoney(totals.outstandingFromProjects), highlight: true },
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
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: "0.5rem 1rem",
            background: "#1a1a1a",
            color: "#f5f5f0",
            border: "none",
            borderRadius: 6,
            fontWeight: 500,
            cursor: exporting ? "wait" : "pointer",
            opacity: exporting ? 0.7 : 1,
          }}
        >
          {exporting ? "Exporting…" : "Export backup"}
        </button>
      </div>
      {exportError && (
        <p style={{ color: "#c00", marginBottom: "1rem" }}>{exportError}</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
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
