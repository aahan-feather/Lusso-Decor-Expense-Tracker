import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  FloatingPortal,
} from "@floating-ui/react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type ExpensesAndPaymentsProject, ProjectStatus } from "../api";
import {
  ScrollableSortableTable,
  type TableColumn,
} from "../components/ScrollableSortableTable";
import { formatDate, formatMoney } from "../utils/format";
import { ProjectStatusBadge } from "./projectLineItemsShared";

const ALL_PROJECT_STATUSES: ProjectStatus[] = [
  ProjectStatus.Running,
  ProjectStatus.Due,
  ProjectStatus.Closed,
];

const DEFAULT_STATUS_FILTERS: ProjectStatus[] = [
  ProjectStatus.Running,
  ProjectStatus.Due,
];

const PROJECT_TABLE_COLUMNS: TableColumn[] = [
  { header: "Status" },
  { header: "Date" },
  { header: "Name" },
  { header: "Total Value", headerStyle: { textAlign: "right" } },
  { header: "Received", headerStyle: { textAlign: "right" } },
  { header: "Expenses", headerStyle: { textAlign: "right" } },
  { header: "Due", headerStyle: { textAlign: "right" } },
  { header: "Profit", headerStyle: { textAlign: "right" } },
];

const sortProjectsByDateDesc = (
  a: ExpensesAndPaymentsProject,
  b: ExpensesAndPaymentsProject,
) =>
  new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime();

function statusFiltersLabel(filters: ProjectStatus[]): string {
  return filters.join(", ");
}

function statusFiltersMatch(
  a: ProjectStatus[],
  b: ProjectStatus[],
): boolean {
  if (a.length !== b.length) return false;
  return ALL_PROJECT_STATUSES.every((s) => a.includes(s) === b.includes(s));
}

function ProjectStatusMultiSelect({
  value,
  onChange,
}: {
  value: ProjectStatus[];
  onChange: (next: ProjectStatus[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles } = useFloating({
    open,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ fallbackPlacements: ["top-start"] }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
          });
        },
      }),
    ],
  });

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (ev: MouseEvent) => {
      const target = ev.target as Node;
      const ref = refs.reference.current;
      if (ref && ref instanceof HTMLElement && ref.contains(target)) return;
      if (refs.floating.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, refs.reference, refs.floating]);

  const buttonLabel =
    value.length === 0
      ? "Select status…"
      : statusFiltersMatch(value, ALL_PROJECT_STATUSES)
        ? "All statuses"
        : statusFiltersLabel(value);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label
        htmlFor="project-status-filter"
        style={{ fontSize: "0.85rem", fontWeight: 500, color: "#555" }}
      >
        Status
      </label>
      <div
        ref={refs.setReference}
        style={{ position: "relative", minWidth: 160 }}
      >
        <button
          id="project-status-filter"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
            width: "100%",
            padding: "0.4rem 0.6rem",
            border: "1px solid #ccc",
            borderRadius: 4,
            fontSize: "0.9rem",
            background: "#fff",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {buttonLabel}
          </span>
          <span style={{ opacity: 0.6, fontSize: "0.7rem" }} aria-hidden>
            ▾
          </span>
        </button>
        {open && (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              role="listbox"
              aria-multiselectable
              style={{
                ...floatingStyles,
                zIndex: 200,
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: 4,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
                padding: "0.35rem 0",
              }}
            >
              {ALL_PROJECT_STATUSES.map((status) => {
                const checked = value.includes(status);
                return (
                  <label
                    key={status}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.35rem 0.75rem",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onMouseDown={(e) => e.preventDefault()}
                      onChange={() => {
                        onChange(
                          checked
                            ? value.filter((s) => s !== status)
                            : [...value, status],
                        );
                      }}
                    />
                    <span>{status}</span>
                  </label>
                );
              })}
            </div>
          </FloatingPortal>
        )}
      </div>
    </div>
  );
}

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
  const [statusFilters, setStatusFilters] = useState<ProjectStatus[]>(
    () => [...DEFAULT_STATUS_FILTERS],
  );
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
    if (
      statusFilters.length > 0 &&
      (project.status == null || !statusFilters.includes(project.status))
    )
      return false;
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
        <ProjectStatusMultiSelect
          value={statusFilters}
          onChange={setStatusFilters}
        />
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

      {(dateFrom ||
        dateTo ||
        !statusFiltersMatch(statusFilters, DEFAULT_STATUS_FILTERS) ||
        projectNameSearch.trim()) && (
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
          {!statusFiltersMatch(statusFilters, DEFAULT_STATUS_FILTERS) && (
            <button
              type="button"
              onClick={() =>
                setStatusFilters([...DEFAULT_STATUS_FILTERS])
              }
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
              title="Reset status to Running and Due"
            >
              Status:{" "}
              {statusFilters.length > 0
                ? statusFiltersLabel(statusFilters)
                : "none"}
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
        <ScrollableSortableTable
          items={filteredProjects}
          sortCompare={sortProjectsByDateDesc}
          columns={PROJECT_TABLE_COLUMNS}
          scrollToBottom={false}
          emptyMessage="No projects match your filters."
          emptyInTable
          renderRow={(project) => {
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
            const amountReceived = (project.projectPayments ?? []).reduce(
              (s, p) => s + p.amount,
              0,
            );
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
          }}
        />
      )}
    </div>
  );
}
