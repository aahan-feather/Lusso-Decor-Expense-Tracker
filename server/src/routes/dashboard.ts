import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res) => {
  try {
    const [projects, vendors, lineItems, projectPayments, vendorItems, vendorPayments] =
      await Promise.all([
        prisma.project.findMany({ select: { id: true } }),
        prisma.vendor.findMany({ select: { id: true } }),
        prisma.lineItem.findMany({ select: { amount: true } }),
        prisma.projectPayment.findMany({ select: { amount: true } }),
        prisma.vendorItem.findMany({ select: { amount: true } }),
        prisma.vendorPayment.findMany({ select: { amount: true } }),
      ]);

    const totalBilled = lineItems.reduce((s, i) => s + i.amount, 0);
    const totalReceived = projectPayments.reduce((s, i) => s + i.amount, 0);
    const totalVendorBill = vendorItems.reduce((s, i) => s + i.amount, 0);
    const totalPaidToVendors = vendorPayments.reduce((s, i) => s + i.amount, 0);

    const outstandingFromProjects = totalBilled - totalReceived;
    const outstandingToVendors = totalVendorBill - totalPaidToVendors;

    const recentProjectPayments = await prisma.projectPayment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { name: true } },
        paymentMethod: { select: { name: true, type: true } },
      },
    });

    const recentVendorPayments = await prisma.vendorPayment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { name: true } },
        paymentMethod: { select: { name: true, type: true } },
        allocations: { include: { vendorItem: { select: { description: true, amount: true } } } },
      },
    });

    res.json({
      counts: {
        projects: projects.length,
        vendors: vendors.length,
      },
      totals: {
        totalBilled,
        totalReceived,
        totalVendorBill,
        totalPaidToVendors,
        outstandingFromProjects,
        outstandingToVendors,
      },
      recent: {
        projectPayments: recentProjectPayments,
        vendorPayments: recentVendorPayments,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});
