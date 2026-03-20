import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type DashboardData } from "../api";
import { formatDate, formatMoney } from "../utils/format";

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

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
      <h1 style={{ marginBottom: "1.5rem", fontSize: "1.75rem", fontWeight: 600 }}>Dashboard</h1>

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
