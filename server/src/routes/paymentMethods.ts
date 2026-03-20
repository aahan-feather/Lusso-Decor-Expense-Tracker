import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { buildPaymentMethodRegister } from "../lib/buildPaymentMethodRegister.js";

export const paymentMethodsRouter = Router();

const BANK_ONLY_CATEGORIES = new Set(["fee", "interest", "adjustment", "other"]);

function parseBankOnlyBody(body: unknown): {
  date?: Date;
  amount: number;
  direction: "in" | "out";
  description: string;
  category: string | null;
} | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const o = body as Record<string, unknown>;
  const amount = typeof o.amount === "number" ? o.amount : Number(o.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "amount must be a positive number" };
  const description = typeof o.description === "string" ? o.description.trim() : "";
  if (!description) return { error: "description is required" };
  const dirRaw = typeof o.direction === "string" ? o.direction.toLowerCase() : "";
  if (dirRaw !== "in" && dirRaw !== "out") return { error: "direction must be in or out" };
  let date: Date | undefined;
  if (o.date !== undefined && o.date !== null && o.date !== "") {
    const d = new Date(String(o.date));
    if (Number.isNaN(d.getTime())) return { error: "Invalid date" };
    date = d;
  }
  let category: string | null = null;
  if (o.category !== undefined && o.category !== null && o.category !== "") {
    const c = String(o.category).toLowerCase().trim();
    if (!BANK_ONLY_CATEGORIES.has(c)) return { error: "Invalid category" };
    category = c;
  }
  return { date, amount, direction: dirRaw, description, category };
}

paymentMethodsRouter.get("/", async (_req, res) => {
  try {
    const list = await prisma.paymentMethod.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list payment methods" });
  }
});

paymentMethodsRouter.post("/", async (req, res) => {
  try {
    const { name, type } = req.body as { name: string; type: string };
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
    const method = await prisma.paymentMethod.create({
      data: { name: name.trim(), type: (type?.trim() ?? "other").toLowerCase() },
    });
    res.status(201).json(method);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create payment method" });
  }
});

paymentMethodsRouter.get("/:id/register", async (req, res) => {
  try {
    const pm = await prisma.paymentMethod.findUnique({ where: { id: req.params.id } });
    if (!pm) return res.status(404).json({ error: "Payment method not found" });
    const rows = await buildPaymentMethodRegister(prisma, req.params.id);
    res.json({ paymentMethod: pm, rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load register" });
  }
});

paymentMethodsRouter.post("/:id/bank-only", async (req, res) => {
  try {
    const pm = await prisma.paymentMethod.findUnique({ where: { id: req.params.id } });
    if (!pm) return res.status(404).json({ error: "Payment method not found" });
    const parsed = parseBankOnlyBody(req.body);
    if ("error" in parsed) return res.status(400).json({ error: parsed.error });
    const row = await prisma.bankOnlyTransaction.create({
      data: {
        paymentMethodId: req.params.id,
        amount: parsed.amount,
        direction: parsed.direction,
        description: parsed.description,
        category: parsed.category,
        ...(parsed.date && { date: parsed.date }),
      },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create bank-only entry" });
  }
});

paymentMethodsRouter.patch("/:id/bank-only/:entryId", async (req, res) => {
  try {
    const existing = await prisma.bankOnlyTransaction.findFirst({
      where: { id: req.params.entryId, paymentMethodId: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: "Entry not found" });
    const body = req.body as Record<string, unknown>;

    let amount = existing.amount;
    if (body.amount !== undefined) {
      const n = typeof body.amount === "number" ? body.amount : Number(body.amount);
      if (!Number.isFinite(n) || n <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }
      amount = n;
    }

    let direction = existing.direction;
    if (body.direction !== undefined) {
      const d = String(body.direction).toLowerCase();
      if (d !== "in" && d !== "out") {
        return res.status(400).json({ error: "direction must be in or out" });
      }
      direction = d;
    }

    let description = existing.description;
    if (body.description !== undefined) {
      const s = String(body.description).trim();
      if (!s) return res.status(400).json({ error: "description is required" });
      description = s;
    }

    let date = existing.date;
    if (body.date !== undefined) {
      if (body.date === null || body.date === "") {
        return res.status(400).json({ error: "Invalid date" });
      }
      const dt = new Date(String(body.date));
      if (Number.isNaN(dt.getTime())) return res.status(400).json({ error: "Invalid date" });
      date = dt;
    }

    let category = existing.category;
    if (body.category !== undefined) {
      if (body.category === null || body.category === "") category = null;
      else {
        const c = String(body.category).toLowerCase().trim();
        if (!BANK_ONLY_CATEGORIES.has(c)) {
          return res.status(400).json({ error: "Invalid category" });
        }
        category = c;
      }
    }

    const row = await prisma.bankOnlyTransaction.update({
      where: { id: req.params.entryId },
      data: { amount, direction, description, date, category },
    });
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update bank-only entry" });
  }
});

paymentMethodsRouter.delete("/:id/bank-only/:entryId", async (req, res) => {
  try {
    const existing = await prisma.bankOnlyTransaction.findFirst({
      where: { id: req.params.entryId, paymentMethodId: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: "Entry not found" });
    await prisma.bankOnlyTransaction.delete({ where: { id: req.params.entryId } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete bank-only entry" });
  }
});

paymentMethodsRouter.patch("/:id", async (req, res) => {
  try {
    const { name, type } = req.body as { name?: string; type?: string };
    const method = await prisma.paymentMethod.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type: type.trim().toLowerCase() }),
      },
    });
    res.json(method);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update payment method" });
  }
});

paymentMethodsRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.paymentMethod.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete payment method" });
  }
});
