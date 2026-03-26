import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const projectsRouter = Router();

projectsRouter.get("/", async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { name: "asc" },
      include: {
        lineItems: { select: { amount: true } },
        projectPayments: { select: { amount: true } },
      },
    });
    const withBalance = projects.map((c) => {
      const billed = c.lineItems.reduce((s, i) => s + i.amount, 0);
      const paid = c.projectPayments.reduce((s, i) => s + i.amount, 0);
      const { lineItems, projectPayments, ...rest } = c;
      return { ...rest, balance: billed - paid };
    });
    res.json(withBalance);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

projectsRouter.post("/", async (req, res) => {
  try {
    const { name, email, contactPerson1Name, contactPerson1Phone, contactPerson2Name, contactPerson2Phone, type, status, documentRef, details, invoiceAmount, date } = req.body as {
      name: string;
      email?: string;
      contactPerson1Name?: string;
      contactPerson1Phone?: string;
      contactPerson2Name?: string;
      contactPerson2Phone?: string;
      type?: string | null;
      status?: string | null;
      documentRef?: string | null;
      details?: string | null;
      invoiceAmount?: number | null;
      date?: string | null;
    };
    if (!name?.trim())
      return res.status(400).json({ error: "Name is required" });
    if (date == null || String(date).trim() === "")
      return res.status(400).json({ error: "Date is required" });
    const projectDate = new Date(date as string);
    if (Number.isNaN(projectDate.getTime()))
      return res.status(400).json({ error: "Invalid date" });
    const validType = type === "Quotation" || type === "Invoice" ? type : null;
    const validStatus = status === "Running" || status === "Due" || status === "Closed" ? status : null;
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        email: email?.trim() ?? null,
        contactPerson1Name: contactPerson1Name?.trim() ?? null,
        contactPerson1Phone: contactPerson1Phone?.trim() ?? null,
        contactPerson2Name: contactPerson2Name?.trim() ?? null,
        contactPerson2Phone: contactPerson2Phone?.trim() ?? null,
        ...(validType && { type: validType }),
        ...(validStatus && { status: validStatus }),
        ...(documentRef !== undefined && { documentRef: documentRef?.trim() ?? null }),
        ...(details !== undefined && {
          details: details == null || String(details).trim() === "" ? null : String(details).trim(),
        }),
        ...(invoiceAmount != null && { invoiceAmount: Number(invoiceAmount) }),
        date: projectDate,
      },
    });
    res.status(201).json(project);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create project" });
  }
});

projectsRouter.get("/:id", async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        lineItems: {
          include: {
            vendor: { select: { id: true, name: true } },
            paymentMethod: { select: { id: true, name: true, type: true } },
          },
        },
        projectPayments: {
          include: {
            paymentMethod: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    const billed = project.lineItems.reduce((s, i) => s + i.amount, 0);
    const paid = project.projectPayments.reduce((s, i) => s + i.amount, 0);
    res.json({ ...project, balance: billed - paid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get project" });
  }
});

projectsRouter.patch("/:id", async (req, res) => {
  try {
    const { name, email, contactPerson1Name, contactPerson1Phone, contactPerson2Name, contactPerson2Phone, type, status, documentRef, details, invoiceAmount, date } = req.body as {
      name?: string;
      email?: string;
      contactPerson1Name?: string;
      contactPerson1Phone?: string;
      contactPerson2Name?: string;
      contactPerson2Phone?: string;
      type?: string | null;
      status?: string | null;
      documentRef?: string | null;
      details?: string | null;
      invoiceAmount?: number | null;
      date?: string | null;
    };
    const validType = type === "Quotation" || type === "Invoice" ? type : type === null || type === "" ? null : undefined;
    const validStatus = status === "Running" || status === "Due" || status === "Closed" ? status : status === null || status === "" ? null : undefined;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email?.trim() ?? null }),
        ...(contactPerson1Name !== undefined && { contactPerson1Name: contactPerson1Name?.trim() ?? null }),
        ...(contactPerson1Phone !== undefined && { contactPerson1Phone: contactPerson1Phone?.trim() ?? null }),
        ...(contactPerson2Name !== undefined && { contactPerson2Name: contactPerson2Name?.trim() ?? null }),
        ...(contactPerson2Phone !== undefined && { contactPerson2Phone: contactPerson2Phone?.trim() ?? null }),
        ...(validType !== undefined && { type: validType }),
        ...(validStatus !== undefined && { status: validStatus }),
        ...(documentRef !== undefined && { documentRef: documentRef?.trim() ?? null }),
        ...(details !== undefined && {
          details: details == null || String(details).trim() === "" ? null : String(details).trim(),
        }),
        ...(invoiceAmount !== undefined && { invoiceAmount: invoiceAmount == null ? null : Number(invoiceAmount) }),
        ...(date !== undefined && { date: date == null || date === "" ? null : new Date(date) }),
      },
    });
    res.json(project);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update project" });
  }
});

projectsRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// Ledger = no payment method (null or empty). Only then do we sync to vendor side.
function isLedger(paymentMethodId: string | null | undefined): boolean {
  return paymentMethodId == null || String(paymentMethodId).trim() === "";
}

// Line items
projectsRouter.post("/:id/line-items", async (req, res) => {
  try {
    const { description, amount, date, vendorId, rate, qty, paymentMethodId } =
      req.body as {
        description: string;
        amount?: number;
        date?: string;
        vendorId?: string;
        rate?: number;
        qty?: number;
        paymentMethodId?: string | null;
      };
    if (!description?.trim()) {
      return res.status(400).json({ error: "Description is required" });
    }
    const hasRateQty = rate != null && qty != null;
    const totalAmount = hasRateQty
      ? Number(rate) * Number(qty)
      : amount != null
        ? Number(amount)
        : null;
    if (totalAmount == null || totalAmount < 0) {
      return res
        .status(400)
        .json({ error: "Amount or both rate and qty are required" });
    }
    const item = await prisma.lineItem.create({
      data: {
        projectId: req.params.id,
        description: description.trim(),
        amount: totalAmount,
        ...(rate != null && { rate: Number(rate) }),
        ...(qty != null && { qty: Number(qty) }),
        ...(date && { date: new Date(date) }),
        ...(vendorId && { vendorId: vendorId.trim() || undefined }),
        ...(paymentMethodId !== undefined && {
          paymentMethodId: paymentMethodId?.trim() || null,
        }),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        paymentMethod: { select: { id: true, name: true, type: true } },
      },
    });
    // When ledger + vendor, add to vendor side
    const effectiveVendorId = vendorId?.trim();
    if (isLedger(paymentMethodId) && effectiveVendorId) {
      await prisma.vendorItem.create({
        data: {
          vendorId: effectiveVendorId,
          description: item.description,
          amount: item.amount,
          date: item.date,
          lineItemId: item.id,
        },
      });
    }
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to add line item" });
  }
});

projectsRouter.patch("/:projectId/line-items/:itemId", async (req, res) => {
  try {
    const { description, amount, date, vendorId, rate, qty, paymentMethodId } =
      req.body as {
        description?: string;
        amount?: number;
        date?: string;
        vendorId?: string | null;
        rate?: number | null;
        qty?: number | null;
        paymentMethodId?: string | null;
      };
    const existing = await prisma.lineItem.findFirst({
      where: { id: req.params.itemId, projectId: req.params.projectId },
    });
    if (!existing)
      return res.status(404).json({ error: "Line item not found" });
    const hasRateQty = rate != null && qty != null;
    const totalAmount = hasRateQty
      ? Number(rate) * Number(qty)
      : amount !== undefined
        ? Number(amount)
        : existing.amount;
    const item = await prisma.lineItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(description !== undefined && { description: description.trim() }),
        ...(amount !== undefined || hasRateQty ? { amount: totalAmount } : {}),
        ...(rate !== undefined && { rate: rate == null ? null : Number(rate) }),
        ...(qty !== undefined && { qty: qty == null ? null : Number(qty) }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(vendorId !== undefined && { vendorId: vendorId?.trim() || null }),
        ...(paymentMethodId !== undefined && {
          paymentMethodId: paymentMethodId?.trim() || null,
        }),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        paymentMethod: { select: { id: true, name: true, type: true } },
      },
    });
    // Sync vendor side: only ledger (no payment method) items appear on vendor
    const nowLedger = isLedger(item.paymentMethodId);
    const newVendorId = item.vendorId?.trim() ?? null;
    const existingVendorItem = await prisma.vendorItem.findFirst({
      where: { lineItemId: req.params.itemId },
    });
    if (existingVendorItem) {
      if (!nowLedger || !newVendorId) {
        await prisma.vendorItem.delete({
          where: { id: existingVendorItem.id },
        });
      } else if (existingVendorItem.vendorId !== newVendorId) {
        await prisma.vendorItem.delete({ where: { id: existingVendorItem.id } });
        await prisma.vendorItem.create({
          data: {
            vendorId: newVendorId,
            description: item.description,
            amount: item.amount,
            date: item.date,
            lineItemId: item.id,
          },
        });
      } else {
        await prisma.vendorItem.update({
          where: { id: existingVendorItem.id },
          data: {
            description: item.description,
            amount: item.amount,
            date: item.date,
          },
        });
      }
    } else if (nowLedger && newVendorId) {
      await prisma.vendorItem.create({
        data: {
          vendorId: newVendorId,
          description: item.description,
          amount: item.amount,
          date: item.date,
          lineItemId: item.id,
        },
      });
    }
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update line item" });
  }
});

projectsRouter.delete("/:projectId/line-items/:itemId", async (req, res) => {
  try {
    await prisma.vendorItem.deleteMany({
      where: { lineItemId: req.params.itemId },
    });
    await prisma.lineItem.deleteMany({
      where: { id: req.params.itemId, projectId: req.params.projectId },
    });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete line item" });
  }
});

// Project payments
projectsRouter.post("/:id/payments", async (req, res) => {
  try {
    const { amount, date, note, paymentMethodId } = req.body as {
      amount: number;
      date?: string;
      note?: string;
      paymentMethodId?: string;
    };
    if (amount == null)
      return res.status(400).json({ error: "Amount is required" });
    const payment = await prisma.projectPayment.create({
      data: {
        projectId: req.params.id,
        amount: Number(amount),
        ...(date && { date: new Date(date) }),
        ...(note !== undefined && { note: note?.trim() ?? null }),
        ...(paymentMethodId && {
          paymentMethodId: paymentMethodId.trim() || undefined,
        }),
      },
      include: {
        paymentMethod: { select: { id: true, name: true, type: true } },
      },
    });
    res.status(201).json(payment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

projectsRouter.patch("/:projectId/payments/:paymentId", async (req, res) => {
  try {
    const { amount, date, note, paymentMethodId } = req.body as {
      amount?: number;
      date?: string;
      note?: string | null;
      paymentMethodId?: string | null;
    };
    const existing = await prisma.projectPayment.findFirst({
      where: { id: req.params.paymentId, projectId: req.params.projectId },
    });
    if (!existing)
      return res.status(404).json({ error: "Payment not found" });
    const payment = await prisma.projectPayment.update({
      where: { id: req.params.paymentId },
      data: {
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(note !== undefined && { note: note?.trim() ?? null }),
        ...(paymentMethodId !== undefined && {
          paymentMethodId: paymentMethodId?.trim() || null,
        }),
      },
      include: {
        paymentMethod: { select: { id: true, name: true, type: true } },
      },
    });
    res.json(payment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update payment" });
  }
});

projectsRouter.delete("/:projectId/payments/:paymentId", async (req, res) => {
  try {
    await prisma.projectPayment.deleteMany({
      where: { id: req.params.paymentId, projectId: req.params.projectId },
    });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete payment" });
  }
});
