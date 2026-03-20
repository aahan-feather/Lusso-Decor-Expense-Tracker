import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const lineItemsRouter = Router();

lineItemsRouter.get("/", async (req, res) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const items = await prisma.lineItem.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { date: "desc" },
      include: {
        project: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
      },
    });
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list line items" });
  }
});
