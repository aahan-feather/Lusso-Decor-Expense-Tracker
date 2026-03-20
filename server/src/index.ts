import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { projectsRouter } from "./routes/projects.js";
import { vendorsRouter } from "./routes/vendors.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { lineItemsRouter } from "./routes/lineItems.js";
import { paymentMethodsRouter } from "./routes/paymentMethods.js";
import { expensesAndPaymentsRouter } from "./routes/expensesAndPayments.js";
import { officeExpensesRouter } from "./routes/officeExpenses.js";
import { officeExpenseTypesRouter } from "./routes/officeExpenseTypes.js";
import { inventoryExpensesRouter } from "./routes/inventoryExpenses.js";
import { inventoryExpenseTypesRouter } from "./routes/inventoryExpenseTypes.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use("/api/dashboard", dashboardRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/line-items", lineItemsRouter);
app.use("/api/payment-methods", paymentMethodsRouter);
app.use("/api/expenses-and-payments", expensesAndPaymentsRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/office-expenses", officeExpensesRouter);
app.use("/api/office-expense-types", officeExpenseTypesRouter);
app.use("/api/inventory-expenses", inventoryExpensesRouter);
app.use("/api/inventory-expense-types", inventoryExpenseTypesRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, "../../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
