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
