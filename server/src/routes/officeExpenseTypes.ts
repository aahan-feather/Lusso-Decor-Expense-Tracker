import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const officeExpenseTypesRouter = Router();

officeExpenseTypesRouter.get("/", async (_req, res) => {
  try {
    const types = await prisma.officeExpenseType.findMany({
      orderBy: { name: "asc" },
    });
    res.json(types);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list office expense types" });
  }
});

officeExpenseTypesRouter.post("/", async (req, res) => {
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    const type = await prisma.officeExpenseType.create({
      data: { name: name.trim() },
    });
    res.status(201).json(type);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ error: "A type with this name already exists" });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to create office expense type" });
  }
});

officeExpenseTypesRouter.patch("/:id", async (req, res) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    const type = await prisma.officeExpenseType.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
    });
    res.json(type);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        return res.status(404).json({ error: "Type not found" });
      }
      if (e.code === "P2002") {
        return res.status(409).json({ error: "A type with this name already exists" });
      }
    }
    console.error(e);
    res.status(500).json({ error: "Failed to update office expense type" });
  }
});

officeExpenseTypesRouter.delete("/:id", async (req, res) => {
  try {
    const usageCount = await prisma.officeExpense.count({
      where: { officeExpenseTypeId: req.params.id },
    });
    if (usageCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: this type is used by ${usageCount} expense${usageCount === 1 ? "" : "s"}`,
      });
    }
    await prisma.officeExpenseType.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({ error: "Type not found" });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to delete office expense type" });
  }
});

// ── Accounts payable per type ────────────────────────────

officeExpenseTypesRouter.get("/payables/all", async (_req, res) => {
  try {
    const payables = await prisma.officeExpenseTypePayable.findMany({
      orderBy: { date: "desc" },
      include: { officeExpenseType: { select: { id: true, name: true } } },
    });
    res.json(payables);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list payables" });
  }
});

officeExpenseTypesRouter.get("/:typeId/payables", async (req, res) => {
  try {
    const payables = await prisma.officeExpenseTypePayable.findMany({
      where: { officeExpenseTypeId: req.params.typeId },
      orderBy: { date: "desc" },
    });
    res.json(payables);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list payables" });
  }
});

officeExpenseTypesRouter.post("/:typeId/payables", async (req, res) => {
  try {
    const { name, amount, date } = req.body as {
      name?: string;
      amount?: number;
      date?: string;
    };
    if (!name?.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (amount == null || isNaN(amount)) {
      return res.status(400).json({ error: "Amount is required" });
    }
    const payable = await prisma.officeExpenseTypePayable.create({
      data: {
        name: name.trim(),
        amount,
        date: date ? new Date(date) : undefined,
        officeExpenseTypeId: req.params.typeId,
      },
    });
    res.status(201).json(payable);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2003"
    ) {
      return res.status(404).json({ error: "Expense type not found" });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to create payable" });
  }
});

officeExpenseTypesRouter.patch("/:typeId/payables/:payableId", async (req, res) => {
  try {
    const { name, amount, date } = req.body as {
      name?: string;
      amount?: number;
      date?: string;
    };
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (amount !== undefined) data.amount = amount;
    if (date !== undefined) data.date = new Date(date);
    const payable = await prisma.officeExpenseTypePayable.update({
      where: { id: req.params.payableId },
      data,
    });
    res.json(payable);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return res.status(404).json({ error: "Payable not found" });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to update payable" });
  }
});

officeExpenseTypesRouter.delete("/:typeId/payables/:payableId", async (req, res) => {
  try {
    await prisma.officeExpenseTypePayable.delete({
      where: { id: req.params.payableId },
    });
    res.status(204).end();
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return res.status(404).json({ error: "Payable not found" });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to delete payable" });
  }
});
