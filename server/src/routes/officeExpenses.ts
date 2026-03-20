import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const officeExpensesRouter = Router();

officeExpensesRouter.get("/", async (_req, res) => {
  try {
    const items = await prisma.officeExpense.findMany({
      orderBy: { date: "desc" },
      include: {
        paymentMethod: { select: { id: true, name: true, type: true } },
        officeExpenseType: { select: { id: true, name: true } },
      },
    });
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list office expenses" });
  }
});

officeExpensesRouter.post("/", async (req, res) => {
  try {
    const { description, amount, date, paymentMethodId, officeExpenseTypeId } = req.body as {
      description: string;
      amount: number;
      date?: string;
      paymentMethodId?: string | null;
      officeExpenseTypeId?: string | null;
    };
    if (!description?.trim() || amount == null) {
      return res.status(400).json({ error: "Description and amount are required" });
    }
    const item = await prisma.officeExpense.create({
      data: {
        description: description.trim(),
        amount: Number(amount),
        ...(date && { date: new Date(date) }),
        paymentMethodId: paymentMethodId?.trim() ? paymentMethodId.trim() : null,
        officeExpenseTypeId: officeExpenseTypeId?.trim() ? officeExpenseTypeId.trim() : null,
      },
      include: {
        paymentMethod: { select: { id: true, name: true, type: true } },
        officeExpenseType: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create office expense" });
  }
});

officeExpensesRouter.patch("/:id", async (req, res) => {
  try {
    const { description, amount, date, paymentMethodId, officeExpenseTypeId } = req.body as {
      description?: string;
      amount?: number;
      date?: string;
      paymentMethodId?: string | null;
      officeExpenseTypeId?: string | null;
    };
    const existing = await prisma.officeExpense.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Office expense not found" });

    const item = await prisma.officeExpense.update({
      where: { id: req.params.id },
      data: {
        ...(description !== undefined && { description: description.trim() }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(date !== undefined && { date: date ? new Date(date) : existing.date }),
        ...(paymentMethodId !== undefined && {
          paymentMethodId: paymentMethodId?.trim() ? paymentMethodId.trim() : null,
        }),
        ...(officeExpenseTypeId !== undefined && {
          officeExpenseTypeId: officeExpenseTypeId?.trim() ? officeExpenseTypeId.trim() : null,
        }),
      },
      include: {
        paymentMethod: { select: { id: true, name: true, type: true } },
        officeExpenseType: { select: { id: true, name: true } },
      },
    });
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update office expense" });
  }
});

officeExpensesRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.officeExpense.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete office expense" });
  }
});
