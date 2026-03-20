import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { ProjectDetail, ProjectList } from "./pages/Projects";
import { VendorList, VendorDetail } from "./pages/Vendors";
import { PaymentMethodsPage } from "./pages/PaymentMethods";
import { BankAccountRegister } from "./pages/BankAccountRegister";
import { ExpensesAndPayments } from "./pages/ExpensesAndPayments";
import { ProjectLineItems } from "./pages/ProjectLineItems";
import { ProjectLineItemsDetail } from "./pages/ProjectLineItemsDetail";
import { OfficeExpenses } from "./pages/OfficeExpenses";
import { InventoryExpenses } from "./pages/InventoryExpenses";

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const projectExpensesNavActive =
    location.pathname === "/project-line-items" ||
    location.pathname.startsWith("/project-line-items/");
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        style={{
          width: 220,
          background: "#1a1a1a",
          color: "#f5f5f0",
          padding: "1.5rem 0",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <NavLink
          to="/"
          end
          style={({ isActive }) => ({
            padding: "0.6rem 1.5rem",
            color: isActive ? "#c9a227" : "#ccc",
            fontWeight: isActive ? 600 : 400,
            textDecoration: "none",
          })}
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/project-line-items"
          style={{
            padding: "0.6rem 1.5rem",
            color: projectExpensesNavActive ? "#c9a227" : "#ccc",
            fontWeight: projectExpensesNavActive ? 600 : 400,
            textDecoration: "none",
          }}
        >
          Total Project Expenses
        </NavLink>
        <NavLink
          to="/vendors"
          style={({ isActive }) => ({
            padding: "0.6rem 1.5rem",
            color: isActive ? "#c9a227" : "#ccc",
            fontWeight: isActive ? 600 : 400,
            textDecoration: "none",
          })}
        >
          Vendors
        </NavLink>
        <NavLink
          to="/office-expenses"
          style={({ isActive }) => ({
            padding: "0.6rem 1.5rem",
            color: isActive ? "#c9a227" : "#ccc",
            fontWeight: isActive ? 600 : 400,
            textDecoration: "none",
          })}
        >
          Office expenses
        </NavLink>
        <NavLink
          to="/inventory"
          style={({ isActive }) => ({
            padding: "0.6rem 1.5rem",
            color: isActive ? "#c9a227" : "#ccc",
            fontWeight: isActive ? 600 : 400,
            textDecoration: "none",
          })}
        >
          Inventory
        </NavLink>
        <NavLink
          to="/bank-accounts"
          style={({ isActive }) => ({
            padding: "0.6rem 1.5rem",
            color: isActive ? "#c9a227" : "#ccc",
            fontWeight: isActive ? 600 : 400,
            textDecoration: "none",
          })}
        >
          Bank Accounts
        </NavLink>
      </nav>
      <main style={{ flex: 1, padding: "2rem", overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/expenses-and-payments"
          element={<ExpensesAndPayments />}
        />
        <Route
          path="/project-line-items/:projectId"
          element={<ProjectLineItemsDetail />}
        />
        <Route path="/project-line-items" element={<ProjectLineItems />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/vendors" element={<VendorList />} />
        <Route path="/vendors/:id" element={<VendorDetail />} />
        <Route path="/office-expenses" element={<OfficeExpenses />} />
        <Route path="/inventory" element={<InventoryExpenses />} />
        <Route path="/bank-accounts" element={<PaymentMethodsPage />} />
        <Route path="/bank-accounts/:id" element={<BankAccountRegister />} />
      </Routes>
    </Layout>
  );
}
