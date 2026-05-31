import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const inventoryExpensesRouter = Router();

const inventoryInclude = {
  paymentMethod: { select: { id: true, name: true, type: true } },
  inventoryExpenseType: { select: { id: true, name: true } },
  vendorItem: {
    select: {
      id: true,
      vendorId: true,
      vendor: { select: { id: true, name: true } },
    },
  },
} as const;

async function syncVendorItemFromInventoryExpense(
  expense: {
    id: string;
    description: string;
    amount: number;
    date: Date;
    paymentMethodId: string | null;
  },
  vendorId: string | null,
): Promise<void> {
  const existingVendorItem = await prisma.vendorItem.findFirst({
    where: { inventoryExpenseId: expense.id },
  });

  const shouldHaveVendorItem =
    vendorId != null &&
    vendorId.trim() !== "" &&
    expense.amount > 0 &&
    expense.paymentMethodId == null;

  if (!shouldHaveVendorItem) {
    if (existingVendorItem) {
      await prisma.vendorItem.delete({ where: { id: existingVendorItem.id } });
    }
    return;
  }

  const trimmedVendorId = vendorId!.trim();
  if (existingVendorItem) {
    if (existingVendorItem.vendorId !== trimmedVendorId) {
      await prisma.vendorItem.delete({ where: { id: existingVendorItem.id } });
      await prisma.vendorItem.create({
        data: {
          vendorId: trimmedVendorId,
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          inventoryExpenseId: expense.id,
        },
      });
    } else {
      await prisma.vendorItem.update({
        where: { id: existingVendorItem.id },
        data: {
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
        },
      });
    }
    return;
  }

  await prisma.vendorItem.create({
    data: {
      vendorId: trimmedVendorId,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      inventoryExpenseId: expense.id,
    },
  });
}

inventoryExpensesRouter.get("/", async (_req, res) => {
  try {
    const items = await prisma.inventoryExpense.findMany({
      orderBy: { date: "desc" },
      include: inventoryInclude,
    });
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list inventory entries" });
  }
});

inventoryExpensesRouter.post("/", async (req, res) => {
  try {
    const { description, amount, date, paymentMethodId, inventoryExpenseTypeId, vendorId } =
      req.body as {
        description: string;
        amount: number;
        date?: string;
        paymentMethodId?: string | null;
        inventoryExpenseTypeId?: string | null;
        vendorId?: string | null;
      };
    if (!description?.trim() || amount == null) {
      return res.status(400).json({ error: "Description and amount are required" });
    }
    const typeId =
      inventoryExpenseTypeId != null && String(inventoryExpenseTypeId).trim() !== ""
        ? String(inventoryExpenseTypeId).trim()
        : null;
    if (!typeId) {
      return res.status(400).json({ error: "Inventory item is required" });
    }

    const trimmedVendorId =
      vendorId != null && String(vendorId).trim() !== "" ? String(vendorId).trim() : null;
    const trimmedPaymentMethodId =
      paymentMethodId != null && String(paymentMethodId).trim() !== ""
        ? String(paymentMethodId).trim()
        : null;

    if (trimmedVendorId && trimmedPaymentMethodId) {
      return res.status(400).json({
        error: "Choose either a bank account or a vendor, not both.",
      });
    }

    const item = await prisma.inventoryExpense.create({
      data: {
        description: description.trim(),
        amount: Number(amount),
        ...(date && { date: new Date(date) }),
        paymentMethodId: trimmedPaymentMethodId,
        inventoryExpenseTypeId: typeId,
      },
      include: inventoryInclude,
    });

    await syncVendorItemFromInventoryExpense(item, trimmedVendorId);

    const refreshed = await prisma.inventoryExpense.findUnique({
      where: { id: item.id },
      include: inventoryInclude,
    });
    res.status(201).json(refreshed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create inventory entry" });
  }
});

inventoryExpensesRouter.patch("/:id", async (req, res) => {
  try {
    const { description, amount, date, paymentMethodId, inventoryExpenseTypeId, vendorId } =
      req.body as {
        description?: string;
        amount?: number;
        date?: string;
        paymentMethodId?: string | null;
        inventoryExpenseTypeId?: string | null;
        vendorId?: string | null;
      };
    const existing = await prisma.inventoryExpense.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Inventory entry not found" });
    if (existing.lineItemId) {
      return res.status(400).json({
        error:
          "This row is project usage (from a project line item). Edit or remove it from the project expense instead.",
      });
    }

    let nextPaymentMethodId = existing.paymentMethodId;
    if (paymentMethodId !== undefined) {
      nextPaymentMethodId = paymentMethodId?.trim() ? paymentMethodId.trim() : null;
    }

    let nextVendorId: string | null = null;
    if (vendorId !== undefined) {
      nextVendorId = vendorId?.trim() ? vendorId.trim() : null;
    } else {
      const linked = await prisma.vendorItem.findFirst({
        where: { inventoryExpenseId: existing.id },
        select: { vendorId: true },
      });
      nextVendorId = linked?.vendorId ?? null;
    }

    if (paymentMethodId !== undefined && nextPaymentMethodId) {
      nextVendorId = null;
    }
    if (vendorId !== undefined && nextVendorId) {
      nextPaymentMethodId = null;
    }

    if (nextVendorId && nextPaymentMethodId) {
      return res.status(400).json({
        error: "Choose either a bank account or a vendor, not both.",
      });
    }

    const item = await prisma.inventoryExpense.update({
      where: { id: req.params.id },
      data: {
        ...(description !== undefined && { description: description.trim() }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(date !== undefined && { date: date ? new Date(date) : existing.date }),
        paymentMethodId: nextPaymentMethodId,
        ...(inventoryExpenseTypeId !== undefined && {
          inventoryExpenseTypeId: inventoryExpenseTypeId?.trim()
            ? inventoryExpenseTypeId.trim()
            : null,
        }),
      },
      include: inventoryInclude,
    });

    await syncVendorItemFromInventoryExpense(item, nextVendorId);

    const refreshed = await prisma.inventoryExpense.findUnique({
      where: { id: item.id },
      include: inventoryInclude,
    });
    res.json(refreshed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update inventory entry" });
  }
});

inventoryExpensesRouter.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.inventoryExpense.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: "Inventory entry not found" });
    if (existing.lineItemId) {
      return res.status(400).json({
        error:
          "This row is project usage (from a project line item). Remove the expense from the project instead.",
      });
    }
    await prisma.inventoryExpense.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete inventory entry" });
  }
});
