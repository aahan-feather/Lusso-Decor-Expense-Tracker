import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const vendorsRouter = Router();

vendorsRouter.get("/", async (_req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: "asc" },
      include: {
        vendorItems: { select: { amount: true } },
        vendorPayments: { select: { amount: true } },
      },
    });
    const withBalance = vendors.map((v) => {
      const totalItems = v.vendorItems.reduce((s, i) => s + i.amount, 0);
      const totalPaid = v.vendorPayments.reduce((s, i) => s + i.amount, 0);
      const { vendorItems, vendorPayments, ...rest } = v;
      return { ...rest, balance: totalItems - totalPaid };
    });
    res.json(withBalance);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list vendors" });
  }
});

vendorsRouter.post("/", async (req, res) => {
  try {
    const { name, email, phone } = req.body as { name: string; email?: string; phone?: string };
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
    const vendor = await prisma.vendor.create({
      data: { name: name.trim(), email: email?.trim() ?? null, phone: phone?.trim() ?? null },
    });
    res.status(201).json(vendor);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

vendorsRouter.get("/:id", async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        vendorItems: { include: { lineItem: { include: { project: { select: { name: true } } } } } },
        vendorPayments: {
          include: {
            paymentMethod: { select: { id: true, name: true, type: true } },
            allocations: { include: { vendorItem: true } },
          },
        },
      },
    });
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    const totalItems = vendor.vendorItems.reduce((s, i) => s + i.amount, 0);
    const totalPaid = vendor.vendorPayments.reduce((s, i) => s + i.amount, 0);
    res.json({ ...vendor, balance: totalItems - totalPaid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get vendor" });
  }
});

vendorsRouter.patch("/:id", async (req, res) => {
  try {
    const { name, email, phone } = req.body as { name?: string; email?: string; phone?: string };
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email?.trim() ?? null }),
        ...(phone !== undefined && { phone: phone?.trim() ?? null }),
      },
    });
    res.json(vendor);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update vendor" });
  }
});

vendorsRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.vendor.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete vendor" });
  }
});

// Vendor items (can attach from project line item or create standalone)
vendorsRouter.post("/:id/items", async (req, res) => {
  try {
    const { description, amount, date, lineItemId } = req.body as {
      description: string;
      amount: number;
      date?: string;
      lineItemId?: string;
    };
    if (!description?.trim() || amount == null) {
      return res.status(400).json({ error: "Description and amount are required" });
    }
    const item = await prisma.vendorItem.create({
      data: {
        vendorId: req.params.id,
        description: description.trim(),
        amount: Number(amount),
        ...(date && { date: new Date(date) }),
        ...(lineItemId && { lineItemId }),
      },
      include: { lineItem: { include: { project: { select: { name: true } } } } },
    });
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to add vendor item" });
  }
});

vendorsRouter.patch("/:vendorId/items/:itemId", async (req, res) => {
  try {
    const { description, amount, date } = req.body as {
      description?: string;
      amount?: number;
      date?: string;
    };
    const existing = await prisma.vendorItem.findFirst({
      where: { id: req.params.itemId, vendorId: req.params.vendorId },
    });
    if (!existing) return res.status(404).json({ error: "Vendor item not found" });
    if (existing.lineItemId != null) {
      return res.status(400).json({ error: "Cannot edit item linked to a project" });
    }
    const item = await prisma.vendorItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(description !== undefined && { description: description.trim() }),
        ...(amount != null && { amount: Number(amount) }),
        ...(date !== undefined && { date: date ? new Date(date) : existing.date }),
      },
      include: { lineItem: { include: { project: { select: { name: true } } } } },
    });
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update vendor item" });
  }
});

vendorsRouter.delete("/:vendorId/items/:itemId", async (req, res) => {
  try {
    const existing = await prisma.vendorItem.findFirst({
      where: { id: req.params.itemId, vendorId: req.params.vendorId },
    });
    if (!existing) return res.status(404).json({ error: "Vendor item not found" });
    if (existing.lineItemId != null) {
      return res.status(400).json({ error: "Cannot delete item linked to a project" });
    }
    await prisma.vendorItem.delete({
      where: { id: req.params.itemId },
    });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete vendor item" });
  }
});

// Vendor payments
vendorsRouter.post("/:id/payments", async (req, res) => {
  try {
    const { amount, date, note, paymentMethodId, vendorItemIds } = req.body as {
      amount: number;
      date?: string;
      note?: string;
      paymentMethodId?: string;
      vendorItemIds?: string[];
    };
    if (amount == null) return res.status(400).json({ error: "Amount is required" });
    const vendorId = req.params.id;
    const ids = Array.isArray(vendorItemIds) ? vendorItemIds.filter((id) => id && typeof id === "string") : [];
    const payment = await prisma.vendorPayment.create({
      data: {
        vendorId,
        amount: Number(amount),
        ...(date && { date: new Date(date) }),
        ...(note !== undefined && { note: note?.trim() ?? null }),
        ...(paymentMethodId?.trim() && { paymentMethodId: paymentMethodId.trim() }),
        ...(ids.length > 0 && {
          allocations: {
            create: ids.map((vendorItemId) => ({ vendorItemId })),
          },
        }),
      },
      include: {
        paymentMethod: { select: { id: true, name: true, type: true } },
        allocations: { include: { vendorItem: true } },
      },
    });
    res.status(201).json(payment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

vendorsRouter.patch("/:vendorId/payments/:paymentId", async (req, res) => {
  try {
    const { amount, date, note, paymentMethodId } = req.body as {
      amount?: number;
      date?: string;
      note?: string | null;
      paymentMethodId?: string | null;
    };
    const existing = await prisma.vendorPayment.findFirst({
      where: { id: req.params.paymentId, vendorId: req.params.vendorId },
    });
    if (!existing) return res.status(404).json({ error: "Payment not found" });
    const payment = await prisma.vendorPayment.update({
      where: { id: req.params.paymentId },
      data: {
        ...(amount != null && { amount: Number(amount) }),
        ...(date !== undefined && { date: date ? new Date(date) : existing.date }),
        ...(note !== undefined && { note: note?.trim() ?? null }),
        ...(paymentMethodId !== undefined && {
          paymentMethodId: paymentMethodId?.trim() ?? null,
        }),
      },
      include: {
        paymentMethod: { select: { id: true, name: true, type: true } },
        allocations: { include: { vendorItem: true } },
      },
    });
    res.json(payment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update payment" });
  }
});

vendorsRouter.delete("/:vendorId/payments/:paymentId", async (req, res) => {
  try {
    await prisma.vendorPayment.deleteMany({
      where: { id: req.params.paymentId, vendorId: req.params.vendorId },
    });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete payment" });
  }
});
