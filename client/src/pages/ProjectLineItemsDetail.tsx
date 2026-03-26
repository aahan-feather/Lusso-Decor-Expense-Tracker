import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  api,
  type ExpensesAndPaymentsProject,
  type Vendor,
  type PaymentMethod,
} from "../api";
import { ProjectExpenseLedger } from "./projectLineItemsShared";

export function ProjectLineItemsDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ExpensesAndPaymentsProject | null>(
    null,
  );
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      setError("Missing project");
      return;
    }
    setLoading(true);
    setError(null);
    api.projects
      .get(projectId)
      .then((p) => setProject(p as ExpensesAndPaymentsProject))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    api.vendors
      .list()
      .then(setVendors)
      .catch(() => {});
    api.paymentMethods
      .list()
      .then(setPaymentMethods)
      .catch(() => {});
  }, [projectId]);

  const refresh = () => {
    if (!projectId) return;
    api.projects
      .get(projectId)
      .then((p) => setProject(p as ExpensesAndPaymentsProject))
      .catch((e) => setError(e.message));
  };

  if (loading) return <p>Loading…</p>;
  if (error && !project) return <p style={{ color: "#c00" }}>{error}</p>;
  if (!project || !projectId) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%",
      }}
    >
      {error && <p style={{ color: "#c00", marginBottom: "1rem" }}>{error}</p>}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/project-line-items")}
          style={{
            padding: "0.4rem 0.75rem",
            background: "#eee",
            border: "1px solid #ccc",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          ← Back to projects
        </button>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>
          {project.name}
        </h1>
        <Link
          to={`/projects/${projectId}`}
          style={{
            fontSize: "0.9rem",
            color: "#fff",
            marginLeft: "auto",
            background: "#000",
            padding: "0.4rem 0.75rem",
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        >
          Project details
        </Link>
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <ProjectExpenseLedger
          project={project}
          vendors={vendors}
          paymentMethods={paymentMethods}
          onRefresh={refresh}
          onError={setError}
        />
      </div>
    </div>
  );
}
