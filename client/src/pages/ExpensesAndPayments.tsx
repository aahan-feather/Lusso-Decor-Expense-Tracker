import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ExpensesAndPaymentsProject } from "../api";
import { formatDate, formatMoney } from "../utils/format";

export function ExpensesAndPayments() {
  const [projects, setProjects] = useState<ExpensesAndPaymentsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.expensesAndPayments().then(setProjects).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "#c00" }}>{error}</p>;

  return (
    <div>
      <h1 style={{ marginBottom: "0.5rem", fontSize: "1.75rem", fontWeight: 600 }}>All expenses &amp; payments</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Projects are ordered by last added first. Within each project, expenses and payments are ordered by oldest first.
      </p>

      {projects.length === 0 ? (
        <p style={{ color: "#666" }}>No projects yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {projects.map((project) => {
            const totalExpenses = project.lineItems.reduce((s, i) => s + i.amount, 0);
            const totalPayments = project.projectPayments.reduce((s, i) => s + i.amount, 0);
            const balance = totalExpenses - totalPayments;
            const hasAny = project.lineItems.length > 0 || project.projectPayments.length > 0;

            return (
              <section
                key={project.id}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "1rem 1.25rem",
                    background: "#f8f8f8",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <span>
                    <Link to={`/projects/${project.id}`} style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                      {project.name}
                    </Link>
                    {(project.type || project.documentRef) && (
                      <span style={{ marginLeft: "0.5rem", color: "#666", fontSize: "0.9rem" }}>
                        {[project.type, project.documentRef].filter(Boolean).join(" \u00b7 ")}
                      </span>
                    )}
                  </span>
                  <span style={{ color: "#666", fontSize: "0.9rem" }}>
                    Expenses {formatMoney(totalExpenses)}{" \u00b7 "}Received {formatMoney(totalPayments)}{" \u00b7 "}Balance {formatMoney(balance)}
                  </span>
                </div>

                {!hasAny ? (
                  <p style={{ padding: "1.25rem", color: "#666" }}>No expenses or payments yet.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                    <div style={{ borderRight: "1px solid #eee" }}>
                      <div style={{ padding: "0.75rem 1.25rem", background: "#fafafa", fontWeight: 600, fontSize: "0.9rem" }}>
                        Expenses (oldest first)
                      </div>
                      <ul style={{ listStyle: "none" }}>
                        {project.lineItems.map((item) => (
                          <li
                            key={item.id}
                            style={{
                              padding: "0.6rem 1.25rem",
                              borderBottom: "1px solid #eee",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span>
                              {formatDate(item.date)}
                              <span style={{ marginLeft: "0.5rem" }}>{item.description}</span>
                              {item.vendor && (
                                <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#666" }}>{" \u2192 "}{item.vendor.name}</span>
                              )}
                            </span>
                            <span style={{ fontWeight: 500 }}>{formatMoney(item.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ padding: "0.75rem 1.25rem", background: "#fafafa", fontWeight: 600, fontSize: "0.9rem" }}>
                        Payments received (oldest first)
                      </div>
                      <ul style={{ listStyle: "none" }}>
                        {project.projectPayments.map((p) => (
                          <li
                            key={p.id}
                            style={{
                              padding: "0.6rem 1.25rem",
                              borderBottom: "1px solid #eee",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span>
                              {formatDate(p.date)}
                              {p.paymentMethod && <span style={{ marginLeft: "0.5rem", color: "#666" }}>{" \u00b7 "}{p.paymentMethod.name}</span>}
                              {p.note && <span style={{ marginLeft: "0.5rem", color: "#666" }}>{p.note}</span>}
                            </span>
                            <span style={{ fontWeight: 500 }}>{formatMoney(p.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
