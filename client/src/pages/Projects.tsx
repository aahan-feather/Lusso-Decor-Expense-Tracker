import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  api,
  type Project,
  type ProjectType,
  ProjectStatus,
  type LineItem,
  type ProjectPayment,
} from "../api";
import {
  formatDate,
  formatMoney,
  formatAmountInput,
  parseAmountInput,
  parseDateInput,
} from "../utils/format";

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = () =>
    api.projects
      .list()
      .then(setProjects)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const startEditName = (project: Project) => {
    setEditingId(project.id);
    setEditingName(project.name);
  };

  const saveProjectName = async (projectId: string) => {
    const trimmed = editingName.trim();
    const proj = projects.find((p) => p.id === projectId);
    if (!trimmed || proj?.name === trimmed) {
      setEditingId(null);
      setEditingName("");
      return;
    }
    try {
      await api.projects.update(projectId, { name: trimmed });
      setEditingId(null);
      setEditingName("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const cancelEditName = () => {
    setEditingId(null);
    setEditingName("");
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
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>
          Projects
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
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflow: "hidden",
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        {projects.length === 0 ? (
          <p style={{ padding: "2rem", color: "#666" }}>
            No projects yet. Add one above.
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
                <th style={{ padding: "0.4rem 0.75rem" }}>Type</th>
                <th style={{ padding: "0.4rem 0.75rem" }}>Status</th>
                <th style={{ padding: "0.4rem 0.75rem" }}>ID</th>
                <th style={{ padding: "0.4rem 0.75rem" }}>Date</th>
                <th style={{ padding: "0.4rem 0.75rem" }}>
                  Contact person 1 name
                </th>
                <th style={{ padding: "0.4rem 0.75rem" }}>
                  Contact person 1 phone
                </th>
                <th style={{ padding: "0.4rem 0.75rem" }}>
                  Contact person 2 name
                </th>
                <th style={{ padding: "0.4rem 0.75rem" }}>
                  Contact person 2 phone
                </th>
                <th style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
                  Invoice amount
                </th>
                <th style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
                  Balance
                </th>
                <th style={{ padding: "0.4rem 0.75rem" }}>Expenses</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "0.4rem 0.75rem" }}>
                    {editingId === c.id ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => saveProjectName(c.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveProjectName(c.id);
                            if (e.key === "Escape") cancelEditName();
                          }}
                          autoFocus
                          style={{
                            padding: "0.35rem 0.5rem",
                            border: "1px solid #1a1a1a",
                            borderRadius: 4,
                            width: "100%",
                            maxWidth: 240,
                            fontWeight: 500,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => cancelEditName()}
                          style={{ fontSize: "0.85rem", color: "#666" }}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <>
                        <Link
                          to={`/projects/${c.id}`}
                          style={{ fontWeight: 500 }}
                        >
                          {c.name}
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            startEditName(c);
                          }}
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.85rem",
                            color: "#666",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0.15rem",
                          }}
                          title="Edit name"
                        >
                          ✎
                        </button>
                      </>
                    )}
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                    {c.type ?? "—"}
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                    {c.status ?? "—"}
                  </td>
                  <td
                    style={{
                      padding: "0.4rem 0.75rem",
                      fontFamily: "monospace",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {c.documentRef ?? "—"}
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                    {c.date ? formatDate(c.date) : "—"}
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                    {c.contactPerson1Name ?? "—"}
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                    {c.contactPerson1Phone ?? "—"}
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                    {c.contactPerson2Name ?? "—"}
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", color: "#666" }}>
                    {c.contactPerson2Phone ?? "—"}
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
                    {formatMoney(c.invoiceAmount ?? 0)}
                  </td>
                  <td
                    style={{
                      padding: "0.4rem 0.75rem",
                      textAlign: "right",
                      fontWeight: 500,
                    }}
                  >
                    {formatMoney(c.balance ?? 0)}
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem" }}>
                    <Link
                      to={`/project-line-items/${c.id}`}
                      style={{ fontSize: "0.8125rem", color: "#1668c0" }}
                    >
                      Ledger
                    </Link>
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

type ProjectDetailData = Project & {
  lineItems: LineItem[];
  projectPayments: ProjectPayment[];
  balance: number;
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [projectType, setProjectType] = useState<ProjectType | "">("");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | "">("");
  const [documentRef, setDocumentRef] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [projectName, setProjectName] = useState("");
  const [contactPerson1Name, setContactPerson1Name] = useState("");
  const [contactPerson1Phone, setContactPerson1Phone] = useState("");
  const [contactPerson2Name, setContactPerson2Name] = useState("");
  const [contactPerson2Phone, setContactPerson2Phone] = useState("");
  const [projectDetails, setProjectDetails] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!id || id === "new") return;
    api.projects
      .get(id)
      .then(setProject)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    if (id === "new") setLoading(false);
    else load();
  }, [id]);

  useEffect(() => {
    if (project?.invoiceAmount != null)
      setInvoiceAmount(formatMoney(project.invoiceAmount));
    else if (project) setInvoiceAmount("");
  }, [project?.id, project?.invoiceAmount]);

  useEffect(() => {
    if (project) {
      setProjectType(project.type ?? "");
      setProjectStatus(project.status ?? "");
      setDocumentRef(project.documentRef ?? "");
      setProjectDate(project.date ? formatDate(project.date) : "");
      setProjectName(project.name);
      setContactPerson1Name(project.contactPerson1Name ?? "");
      setContactPerson1Phone(project.contactPerson1Phone ?? "");
      setContactPerson2Name(project.contactPerson2Name ?? "");
      setContactPerson2Phone(project.contactPerson2Phone ?? "");
      setProjectDetails(project.details ?? "");
    }
  }, [
    project?.id,
    project?.type,
    project?.status,
    project?.documentRef,
    project?.details,
    project?.date,
    project?.name,
    project?.contactPerson1Name,
    project?.contactPerson1Phone,
    project?.contactPerson2Name,
    project?.contactPerson2Phone,
  ]);

  useEffect(() => {
    setLoading(false);
  }, [project, error]);

  const deleteProject = async () => {
    if (
      !id ||
      !project ||
      !confirm("Delete this project? This cannot be undone.")
    )
      return;
    try {
      await api.projects.delete(id);
      navigate("/project-line-items");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const isCreateMode = id === "new";
  if (loading && !project && !isCreateMode) return <p>Loading…</p>;
  if (error && !project && !isCreateMode)
    return <p style={{ color: "#c00" }}>{error}</p>;
  if (!project && !isCreateMode) return null;

  const expenses = project
    ? project.lineItems.reduce((s, i) => s + i.amount, 0)
    : 0;
  const received = project
    ? project.projectPayments.reduce((s, i) => s + i.amount, 0)
    : 0;
  const canDeleteProject =
    !isCreateMode && project && expenses === 0 && received === 0;

  const createDateValid =
    projectDate.trim().length > 0 &&
    parseDateInput(projectDate.trim()) !== null;
  const createFormComplete =
    projectName.trim().length > 0 && createDateValid;

  const saveProjectFields = async () => {
    const parsed = parseAmountInput(invoiceAmount);
    const invVal = invoiceAmount.trim()
      ? Number.isNaN(parsed)
        ? null
        : parsed
      : null;
    if (invVal !== null && invVal < 0) return;
    const newType =
      projectType === "Quotation" || projectType === "Invoice"
        ? projectType
        : null;
    const newStatus =
      projectStatus === ProjectStatus.Running ||
      projectStatus === ProjectStatus.Due ||
      projectStatus === ProjectStatus.Closed
        ? projectStatus
        : null;
    const dateISO = projectDate.trim()
      ? (parseDateInput(projectDate.trim()) ?? undefined)
      : undefined;
    if (isCreateMode && (!projectName.trim() || !dateISO)) return;
    setSaving(true);
    try {
      if (isCreateMode) {
        await api.projects.create({
          name: projectName.trim(),
          invoiceAmount: invVal ?? undefined,
          type: newType ?? undefined,
          status: newStatus ?? undefined,
          documentRef: documentRef.trim() || undefined,
          date: dateISO,
          contactPerson1Name: contactPerson1Name.trim() || undefined,
          contactPerson1Phone: contactPerson1Phone.trim() || undefined,
          contactPerson2Name: contactPerson2Name.trim() || undefined,
          contactPerson2Phone: contactPerson2Phone.trim() || undefined,
          details: projectDetails.trim() || undefined,
        });
        navigate(`/project-line-items`);
      } else if (id) {
        await api.projects.update(id, {
          name: projectName.trim() || undefined,
          invoiceAmount: invVal ?? undefined,
          type: newType ?? undefined,
          status: newStatus ?? undefined,
          documentRef: documentRef.trim() || undefined,
          details: projectDetails.trim() || null,
          date: dateISO ?? (projectDate.trim() ? undefined : null),
          contactPerson1Name: contactPerson1Name.trim() || undefined,
          contactPerson1Phone: contactPerson1Phone.trim() || undefined,
          contactPerson2Name: contactPerson2Name.trim() || undefined,
          contactPerson2Phone: contactPerson2Phone.trim() || undefined,
        });
        load();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "0.5rem 1rem",
            alignItems: "center",
            maxWidth: 1000,
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>Date</span>
          <input
            type="text"
            placeholder="dd/mm/yy"
            value={projectDate}
            onChange={(e) => setProjectDate(e.target.value)}
            style={{
              padding: "0.35rem 0.5rem",
              width: "100%",
              maxWidth: 100,
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
          <span style={{ fontSize: "0.9rem" }}>Project Name</span>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: 4,
              padding: "0.35rem 0.5rem",
              width: "100%",
              minWidth: 120,
            }}
          />
          <span style={{ fontSize: "0.9rem" }}>Contact Person 1</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={contactPerson1Name}
              onChange={(e) => setContactPerson1Name(e.target.value)}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                padding: "0.35rem 0.5rem",
                width: "100%",
                minWidth: 120,
              }}
            />
            <span style={{ fontSize: "0.9rem", marginLeft: "2rem" }}>
              Mobile
            </span>
            <input
              value={contactPerson1Phone}
              onChange={(e) => setContactPerson1Phone(e.target.value)}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                padding: "0.35rem 0.5rem",
                width: "100%",
                minWidth: 120,
              }}
            />
          </div>

          <span style={{ fontSize: "0.9rem" }}>Contact Person 2</span>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              value={contactPerson2Name}
              onChange={(e) => setContactPerson2Name(e.target.value)}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                padding: "0.35rem 0.5rem",
                width: "100%",
                minWidth: 120,
              }}
            />
            <span style={{ fontSize: "0.9rem", marginLeft: "2rem" }}>
              Mobile
            </span>
            <input
              value={contactPerson2Phone}
              onChange={(e) => setContactPerson2Phone(e.target.value)}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                padding: "0.35rem 0.5rem",
                width: "100%",
                minWidth: 120,
              }}
            />
          </div>

          <span style={{ fontSize: "0.9rem" }}>Project amount</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={invoiceAmount}
            onChange={(e) =>
              setInvoiceAmount(formatAmountInput(e.target.value))
            }
            style={{
              width: "100%",
              maxWidth: 120,
              padding: "0.35rem 0.5rem",
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
          <span style={{ fontSize: "0.9rem" }}>Type</span>
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value as ProjectType | "")}
            style={{
              padding: "0.35rem 0.5rem",
              width: "100%",
              maxWidth: 140,
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          >
            <option value="">—</option>
            <option value="Quotation">Quotation</option>
            <option value="Invoice">Invoice</option>
          </select>
          <span style={{ fontSize: "0.9rem" }}>Status</span>
          <select
            value={projectStatus}
            onChange={(e) =>
              setProjectStatus(e.target.value as ProjectStatus | "")
            }
            style={{
              padding: "0.35rem 0.5rem",
              width: "100%",
              maxWidth: 140,
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          >
            <option value="">—</option>
            <option value={ProjectStatus.Running}>Running</option>
            <option value={ProjectStatus.Due}>Due</option>
            <option value={ProjectStatus.Closed}>Closed</option>
          </select>
          <span style={{ fontSize: "0.9rem" }}>Invoice # / Quotation Dt</span>
          <input
            value={documentRef}
            onChange={(e) => setDocumentRef(e.target.value)}
            placeholder="e.g. Q-001, INV-2024-01"
            style={{
              padding: "0.35rem 0.5rem",
              width: "100%",
              maxWidth: 180,
              border: "1px solid #ccc",
              borderRadius: 4,
              fontFamily: "monospace",
            }}
          />
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            <span style={{ fontSize: "0.9rem" }}>Project details</span>
            <textarea
              value={projectDetails}
              onChange={(e) => setProjectDetails(e.target.value)}
              placeholder="Notes, scope, or anything else for this project…"
              rows={6}
              style={{
                width: "100%",
                padding: "0.5rem 0.6rem",
                border: "1px solid #ccc",
                borderRadius: 4,
                fontFamily: "inherit",
                fontSize: "0.9rem",
                lineHeight: 1.45,
                resize: "vertical",
              }}
            />
          </div>

          <span style={{ fontSize: "0.9rem" }}>Amount Recieved</span>
          <span>{formatMoney(received)}</span>
          <span style={{ fontSize: "0.9rem" }}>Expenses</span>
          <span>{formatMoney(expenses)}</span>
        </div>
        {project &&
          (project.email ||
            project.contactPerson1Name ||
            project.contactPerson1Phone ||
            project.contactPerson2Name ||
            project.contactPerson2Phone) && (
            <p style={{ color: "#666", marginTop: 4 }}>
              {[
                project.email,
                project.contactPerson1Name &&
                  (project.contactPerson1Phone
                    ? `${project.contactPerson1Name} (${project.contactPerson1Phone})`
                    : project.contactPerson1Name),
                project.contactPerson2Name &&
                  (project.contactPerson2Phone
                    ? `${project.contactPerson2Name} (${project.contactPerson2Phone})`
                    : project.contactPerson2Name),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
      </div>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginTop: "5rem",
        }}
      >
        <button
          type="button"
          onClick={saveProjectFields}
          disabled={
            saving || (isCreateMode && !createFormComplete)
          }
          style={{
            padding: "0.5rem 1rem",
            background:
              saving || (isCreateMode && !createFormComplete)
                ? "#999"
                : "#1a1a1a",
            color: "#f5f5f0",
            borderRadius: 6,
            fontWeight: 500,
            border: "none",
            cursor:
              saving || (isCreateMode && !createFormComplete)
                ? "not-allowed"
                : "pointer",
          }}
        >
          {saving
            ? isCreateMode
              ? "Creating…"
              : "Saving…"
            : isCreateMode
              ? "Create"
              : "Save"}
        </button>
        {canDeleteProject && (
          <button
            type="button"
            onClick={deleteProject}
            style={{
              padding: "0.5rem 1rem",
              background: "#c00",
              color: "#fff",
              borderRadius: 6,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Delete project
          </button>
        )}
        {isCreateMode && (
          <Link
            to="/project-line-items"
            style={{ fontSize: "0.9rem", color: "#666" }}
          >
            Cancel
          </Link>
        )}
        {!isCreateMode && id && (
          <Link
            to={`/project-line-items/${id}`}
            style={{ fontSize: "0.9rem", color: "#1668c0" }}
          >
            Expense ledger
          </Link>
        )}
      </span>
    </div>
  );
}
