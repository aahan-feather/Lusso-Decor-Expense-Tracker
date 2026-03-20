import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const inventoryExpensesRouter = Router();

inventoryExpensesRouter.get("/", async (_req, res) => {
  try {
    const items = await prisma.inventoryExpense.findMany({
      orderBy: { date: "desc" },
      include: {
        paymentMethod: { select: { id: true, name: true, type: true } },
        inventoryExpenseType: { select: { id: true, name: true } },
      },
    });
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list inventory entries" });
  }
});

inventoryExpensesRouter.post("/", async (req, res) => {
  try {
    const { description, amount, date, paymentMethodId, inventoryExpenseTypeId } = req.body as {
      description: string;
      amount: number;
      date?: string;
      paymentMethodId?: string | null;
      inventoryExpenseTypeId?: string | null;
    };
    if (!description?.trim() || amount == null) {
      return res.status(400).json({ error: "Description and amount are required" });
    }
    const item = await prisma.inventoryExpense.create({
      data: {
        description: description.trim(),
        amount: Number(amount),
        ...(date && { date: new Date(date) }),
        paymentMethodId: paymentMethodId?.trim() ? paymentMethodId.trim() : null,
        inventoryExpenseTypeId: inventoryExpenseTypeId?.trim() ? inventoryExpenseTypeId.trim() : null,
      },
      include: {
        paymentMethod: { select: { id: true, name: true, type: true } },
        inventoryExpenseType: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create inventory entry" });
  }
});

inventoryExpensesRouter.patch("/:id", async (req, res) => {
  try {
    const { description, amount, date, paymentMethodId, inventoryExpenseTypeId } = req.body as {
      description?: string;
      amount?: number;
      date?: string;
      paymentMethodId?: string | null;
      inventoryExpenseTypeId?: string | null;
    };
    const existing = await prisma.inventoryExpense.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Inventory entry not found" });

    const item = await prisma.inventoryExpense.update({
      where: { id: req.params.id },
      data: {
        ...(description !== undefined && { description: description.trim() }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(date !== undefined && { date: date ? new Date(date) : existing.date }),
        ...(paymentMethodId !== undefined && {
          paymentMethodId: paymentMethodId?.trim() ? paymentMethodId.trim() : null,
        }),
        ...(inventoryExpenseTypeId !== undefined && {
          inventoryExpenseTypeId: inventoryExpenseTypeId?.trim() ? inventoryExpenseTypeId.trim() : null,
        }),
      },
      include: {
        paymentMethod: { select: { id: true, name: true, type: true } },
        inventoryExpenseType: { select: { id: true, name: true } },
      },
    });
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update inventory entry" });
  }
});

inventoryExpensesRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.inventoryExpense.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete inventory entry" });
  }
});
