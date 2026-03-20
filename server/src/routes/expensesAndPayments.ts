import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const expensesAndPaymentsRouter = Router();

expensesAndPaymentsRouter.get("/", async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        lineItems: {
          orderBy: { createdAt: "asc" },
          include: {
            vendor: { select: { id: true, name: true } },
            paymentMethod: { select: { id: true, name: true, type: true } },
          },
        },
        projectPayments: {
          orderBy: { createdAt: "asc" },
          include: { paymentMethod: { select: { id: true, name: true, type: true } } },
        },
      },
    });
    res.json(projects);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load expenses and payments" });
  }
});
