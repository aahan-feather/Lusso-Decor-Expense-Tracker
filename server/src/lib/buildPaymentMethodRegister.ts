import type { PrismaClient } from "@prisma/client";

export type RegisterRowSourceType =
  | "project_payment"
  | "vendor_payment"
  | "office_expense"
  | "inventory_expense"
  | "line_item"
  | "bank_only";

export type RegisterRowMeta = {
  projectId?: string;
  vendorId?: string;
  officeExpenseId?: string;
  inventoryExpenseId?: string;
  lineItemId?: string;
};

export type RegisterRow = {
  sortAt: string;
  date: string;
  amount: number;
  direction: "in" | "out";
  label: string;
  sourceType: RegisterRowSourceType;
  sourceId: string;
  meta?: RegisterRowMeta;
  /** Set when sourceType is bank_only */
  category?: string | null;
};

function iso(d: Date): string {
  return d.toISOString();
}

function sortKey(date: Date, createdAt: Date): string {
  return `${date.getTime().toString().padStart(15, "0")}_${createdAt.getTime().toString().padStart(15, "0")}`;
}

export async function buildPaymentMethodRegister(
  prisma: PrismaClient,
  paymentMethodId: string,
): Promise<RegisterRow[]> {
  const [
    projectPayments,
    vendorPayments,
    officeExpenses,
    inventoryExpenses,
    bankOnly,
    lineItems,
  ] = await Promise.all([
    prisma.projectPayment.findMany({
      where: { paymentMethodId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.vendorPayment.findMany({
      where: { paymentMethodId },
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.officeExpense.findMany({
      where: { paymentMethodId },
      include: {
        officeExpenseType: { select: { name: true } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.inventoryExpense.findMany({
      where: { paymentMethodId },
      include: {
        inventoryExpenseType: { select: { name: true } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.bankOnlyTransaction.findMany({
      where: { paymentMethodId },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.lineItem.findMany({
      where: { paymentMethodId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const rows: RegisterRow[] = [];

  for (const p of projectPayments) {
    const note = p.note?.trim();
    rows.push({
      sortAt: sortKey(p.date, p.createdAt),
      date: iso(p.date),
      amount: p.amount,
      direction: "in",
      label: note
        ? `Received — ${p.project.name}: ${note}`
        : `Received — ${p.project.name}`,
      sourceType: "project_payment",
      sourceId: p.id,
      meta: { projectId: p.project.id },
    });
  }

  for (const v of vendorPayments) {
    const note = v.note?.trim();
    rows.push({
      sortAt: sortKey(v.date, v.createdAt),
      date: iso(v.date),
      amount: v.amount,
      direction: "out",
      label: note
        ? `Vendor payment — ${v.vendor.name}: ${note}`
        : `Vendor payment — ${v.vendor.name}`,
      sourceType: "vendor_payment",
      sourceId: v.id,
      meta: { vendorId: v.vendor.id },
    });
  }

  for (const o of officeExpenses) {
    const typeLabel = o.officeExpenseType?.name
      ? ` (${o.officeExpenseType.name})`
      : "";
    rows.push({
      sortAt: sortKey(o.date, o.createdAt),
      date: iso(o.date),
      amount: o.amount,
      direction: "out",
      label: `Office${typeLabel}: ${o.description}`,
      sourceType: "office_expense",
      sourceId: o.id,
      meta: { officeExpenseId: o.id },
    });
  }

  for (const i of inventoryExpenses) {
    const typeLabel = i.inventoryExpenseType?.name
      ? ` (${i.inventoryExpenseType.name})`
      : "";
    rows.push({
      sortAt: sortKey(i.date, i.createdAt),
      date: iso(i.date),
      amount: i.amount,
      direction: "out",
      label: `Inventory${typeLabel}: ${i.description}`,
      sourceType: "inventory_expense",
      sourceId: i.id,
      meta: { inventoryExpenseId: i.id },
    });
  }

  for (const b of bankOnly) {
    const dir = b.direction === "in" ? "in" : "out";
    const cat = b.category ? `[${b.category}] ` : "";
    rows.push({
      sortAt: sortKey(b.date, b.createdAt),
      date: iso(b.date),
      amount: b.amount,
      direction: dir,
      label: `${cat}${b.description}`.trim(),
      sourceType: "bank_only",
      sourceId: b.id,
      category: b.category,
    });
  }

  for (const li of lineItems) {
    rows.push({
      sortAt: sortKey(li.date, li.createdAt),
      date: iso(li.date),
      amount: li.amount,
      direction: "out",
      label: `Project expense — ${li.project.name}: ${li.description}`,
      sourceType: "line_item",
      sourceId: li.id,
      meta: { projectId: li.project.id, lineItemId: li.id },
    });
  }

  rows.sort((a, b) => (a.sortAt < b.sortAt ? -1 : a.sortAt > b.sortAt ? 1 : 0));
  return rows;
}
