import { createRequire } from "node:module";
import { Prisma } from "@prisma/client";
import type archiverTypes from "archiver";
import { prisma } from "./prisma.js";

const require = createRequire(import.meta.url);
const archiver = require("archiver") as typeof archiverTypes;

export const BACKUP_FORMAT = "accounts-tracker-backup";
export const BACKUP_FORMAT_VERSION = 1;

type DmmfModel = (typeof Prisma.dmmf.datamodel.models)[number];

/** Derived from Prisma schema — new models are included automatically after `prisma generate`. */
export function modelToDelegate(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function modelToFile(modelName: string): string {
  return `${modelToDelegate(modelName)}s.json`;
}

function modelDependencies(model: DmmfModel): string[] {
  return model.fields
    .filter((field) => field.kind === "object" && (field.relationFromFields?.length ?? 0) > 0)
    .map((field) => field.type);
}

/** Foreign-key dependency order for import (parents before children). */
export function modelsInImportOrder(): DmmfModel[] {
  const models = Prisma.dmmf.datamodel.models;
  const byName = new Map(models.map((model) => [model.name, model]));
  const sorted: DmmfModel[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string) {
    if (visited.has(name)) return;
    if (visiting.has(name)) return;
    visiting.add(name);
    const model = byName.get(name);
    if (model) {
      for (const dep of modelDependencies(model)) {
        if (byName.has(dep)) visit(dep);
      }
    }
    visiting.delete(name);
    visited.add(name);
    if (model) sorted.push(model);
  }

  for (const model of models) visit(model.name);
  return sorted;
}

async function fetchModelRecords(modelName: string): Promise<unknown[]> {
  const delegate = modelToDelegate(modelName);
  const client = prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> }>;
  const model = client[delegate];
  if (!model?.findMany) {
    throw new Error(`Backup export: no Prisma delegate for model "${modelName}"`);
  }
  return model.findMany();
}

export function backupFilename(date = new Date()): string {
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Accounts Tracker Backup - ${dateStr}.zip`;
}

export async function createBackupArchive(): Promise<archiverTypes.Archiver> {
  const exportedAt = new Date().toISOString();
  const orderedModels = modelsInImportOrder();
  const tableResults = await Promise.all(
    orderedModels.map(async (model, index) => {
      const file = modelToFile(model.name);
      const records = await fetchModelRecords(model.name);
      return {
        file,
        model: model.name,
        importOrder: index + 1,
        records,
      };
    }),
  );

  const manifest = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    tables: tableResults.map(({ file, model, importOrder, records }) => ({
      file: `data/${file}`,
      model,
      importOrder,
      count: records.length,
    })),
  };

  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

  for (const table of tableResults) {
    archive.append(JSON.stringify(table.records, null, 2), { name: `data/${table.file}` });
  }

  archive.finalize();
  return archive;
}
