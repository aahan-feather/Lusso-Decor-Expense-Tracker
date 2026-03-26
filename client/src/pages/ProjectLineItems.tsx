import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type ExpensesAndPaymentsProject, ProjectStatus } from "../api";
import { formatDate, formatMoney } from "../utils/format";
import { ProjectStatusBadge } from "./projectLineItemsShared";

export function ProjectLineItems() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ExpensesAndPaymentsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusDropdownProjectId, setStatusDropdownProjectId] = useState<
    string | null
  >(null);

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [projectNameSearch, setProjectNameSearch] = useState<string>("");

  useEffect(() => {
    api
      .expensesAndPayments()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    api
      .expensesAndPayments()
      .then(setProjects)
      .catch((e) => setError(e.message));
  };

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "#c00" }}>{error}</p>;

  const searchLower = projectNameSearch.trim().toLowerCase();
  const filteredProjects = projects.filter((project) => {
    if (dateFrom && (project.date ?? "") < dateFrom) return false;
    if (dateTo && (project.date ?? "") > dateTo) return false;
    if (statusFilter && (project.status ?? null) !== statusFilter) return false;
    if (
      searchLower &&
      !(project.name ?? "").toLowerCase().includes(searchLower)
    )
      return false;
    return true;
  });

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
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>
          Total Project Expenses
        </h1>
        <Link
          to="/projects/new"
          style={{
            padding: "0.5rem 1rem",
            background: "#1a1a1a",
            color: "#f5f5f0",
            borderRadius: 6,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Add project
        </Link>
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label
            style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
          >
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter((e.target.value as ProjectStatus | "") || "")
            }
            style={{
              padding: "0.4rem 0.6rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: "0.9rem",
              minWidth: 120,
            }}
          >
            <option value="">All</option>
            <option value={ProjectStatus.Running}>
              {ProjectStatus.Running}
            </option>
            <option value={ProjectStatus.Due}>{ProjectStatus.Due}</option>
            <option value={ProjectStatus.Closed}>{ProjectStatus.Closed}</option>
          </select>
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
            Search project
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
      </div>

      {(dateFrom || dateTo || statusFilter || projectNameSearch.trim()) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
            marginTop: "-1rem",
            marginBottom: "1.5rem",
            paddingLeft: "1rem",
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
          {statusFilter && (
            <button
              type="button"
              onClick={() => setStatusFilter("")}
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
              title="Remove status filter"
            >
              Status: {statusFilter}
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
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={`Remove search: ${projectNameSearch.trim()}`}
            >
              Project:{" "}
              {projectNameSearch.trim().length > 20
                ? `${projectNameSearch.trim().slice(0, 20)}…`
                : projectNameSearch.trim()}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
        </div>
      )}

      {projects.length === 0 ? (
        <p style={{ color: "#666" }}>No projects yet.</p>
      ) : (
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
                <th style={{ padding: "0.4rem 0.75rem" }}>Status</th>
                <th style={{ padding: "0.4rem 0.75rem" }}>Date</th>
                <th style={{ padding: "0.4rem 0.75rem" }}>Name</th>
                <th
                  style={{
                    padding: "0.4rem 0.75rem",
                    textAlign: "right",
                  }}
                >
                  Total Value
                </th>
                <th
                  style={{
                    padding: "0.4rem 0.75rem",
                    textAlign: "right",
                  }}
                >
                  Received
                </th>
                <th
                  style={{
                    padding: "0.4rem 0.75rem",
                    textAlign: "right",
                  }}
                >
                  Expenses
                </th>
                <th
                  style={{
                    padding: "0.4rem 0.75rem",
                    textAlign: "right",
                  }}
                >
                  Due
                </th>
                <th
                  style={{
                    padding: "0.4rem 0.75rem",
                    textAlign: "right",
                  }}
                >
                  Profit
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "1.25rem 0.75rem",
                      textAlign: "center",
                      color: "#666",
                    }}
                  >
                    No projects match your filters.
                  </td>
                </tr>
              ) : (
                [...filteredProjects]
                  .sort(
                    (a, b) =>
                      new Date(b.date ?? "").getTime() -
                      new Date(a.date ?? "").getTime(),
                  )
                  .map((project) => {
                    const invoiceAmount = project.invoiceAmount ?? 0;
                    const totalExpenses = (project.lineItems ?? []).reduce(
                      (sum, item) => {
                        const rate = item.rate ?? null;
                        const qty = item.qty ?? null;
                        const total =
                          rate != null && qty != null
                            ? rate * qty
                            : (item.amount ?? 0);
                        return sum + total;
                      },
                      0,
                    );
                    const amountReceived = (
                      project.projectPayments ?? []
                    ).reduce((s, p) => s + p.amount, 0);
                    const amountPending = invoiceAmount - amountReceived;
                    const profit = amountReceived - totalExpenses;

                    return (
                      <tr
                        key={project.id}
                        onClick={() =>
                          navigate(`/project-line-items/${project.id}`)
                        }
                        style={{
                          cursor: "pointer",
                          borderTop: "1px solid #eee",
                        }}
                      >
                        <td
                          style={{
                            padding: "0.4rem 0.75rem",
                            verticalAlign: "middle",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ProjectStatusBadge
                            project={project}
                            isOpen={statusDropdownProjectId === project.id}
                            onToggle={() =>
                              setStatusDropdownProjectId(
                                statusDropdownProjectId === project.id
                                  ? null
                                  : project.id,
                              )
                            }
                            onSelect={async (status) => {
                              try {
                                await api.projects.update(project.id, {
                                  status,
                                });
                                refresh();
                                setStatusDropdownProjectId(null);
                              } catch {
                                setStatusDropdownProjectId(null);
                              }
                            }}
                            onClose={() => setStatusDropdownProjectId(null)}
                          />
                        </td>
                        <td style={{ padding: "0.4rem 0.75rem" }}>
                          {project.date ? formatDate(project.date) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "0.4rem 0.75rem",
                            fontWeight: 500,
                            maxWidth: "50ch",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={project.name}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            to={`/project-line-items/${project.id}`}
                            style={{
                              color: "inherit",
                              fontWeight: 500,
                            }}
                          >
                            {project.name.length > 30
                              ? `${project.name.slice(0, 30)}…`
                              : project.name}
                          </Link>
                        </td>
                        <td
                          style={{
                            padding: "0.4rem 0.75rem",
                            textAlign: "right",
                          }}
                        >
                          {formatMoney(invoiceAmount)}
                        </td>
                        <td
                          style={{
                            padding: "0.4rem 0.75rem",
                            textAlign: "right",
                          }}
                        >
                          {formatMoney(amountReceived)}
                        </td>
                        <td
                          style={{
                            padding: "0.4rem 0.75rem",
                            textAlign: "right",
                          }}
                        >
                          {formatMoney(totalExpenses)}
                        </td>
                        <td
                          style={{
                            padding: "0.4rem 0.75rem",
                            textAlign: "right",
                            color: amountPending < 0 ? "#c00" : undefined,
                            fontWeight: amountPending < 0 ? 600 : undefined,
                          }}
                        >
                          {formatMoney(amountPending)}
                        </td>
                        <td
                          style={{
                            padding: "0.4rem 0.75rem",
                            textAlign: "right",
                            color: profit < 0 ? "#c00" : undefined,
                            fontWeight: profit < 0 ? 600 : undefined,
                          }}
                        >
                          {formatMoney(profit)}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
