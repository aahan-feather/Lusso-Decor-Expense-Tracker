import AdmZip from "adm-zip";
import type { Prisma } from "@prisma/client";
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  modelToDelegate,
  modelsInImportOrder,
} from "./backupExport.js";
import { prisma } from "./prisma.js";

type Manifest = {
  format: string;
  formatVersion: number;
  exportedAt: string;
  tables: Array<{
    file: string;
    model: string;
    importOrder: number;
    count: number;
  }>;
};

export type ImportBackupResult = {
  importedAt: string;
  tables: Array<{ model: string; count: number }>;
};

type PrismaDelegate = {
  deleteMany: () => Promise<unknown>;
  createMany: (args: { data: unknown[] }) => Promise<{ count: number }>;
};

function prismaDelegates(
  client: Prisma.TransactionClient | typeof prisma,
): Record<string, PrismaDelegate> {
  return client as unknown as Record<string, PrismaDelegate>;
}

function parseManifest(zip: AdmZip): Manifest {
  const entry = zip.getEntry("manifest.json");
  if (!entry) throw new Error("Backup zip is missing manifest.json");
  const manifest = JSON.parse(entry.getData().toString("utf8")) as Manifest;
  if (manifest.format !== BACKUP_FORMAT) {
    throw new Error(`Invalid backup format (expected ${BACKUP_FORMAT})`);
  }
  if (manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Unsupported backup version ${manifest.formatVersion} (expected ${BACKUP_FORMAT_VERSION})`,
    );
  }
  if (!Array.isArray(manifest.tables) || manifest.tables.length === 0) {
    throw new Error("Backup manifest has no tables");
  }
  return manifest;
}

function readTableRows(zip: AdmZip, filePath: string): unknown[] {
  const entry = zip.getEntry(filePath);
  if (!entry) throw new Error(`Backup zip is missing ${filePath}`);
  const data = JSON.parse(entry.getData().toString("utf8"));
  if (!Array.isArray(data)) throw new Error(`${filePath} must be a JSON array`);
  return data;
}

async function deleteAllModels(tx: Prisma.TransactionClient): Promise<void> {
  const ordered = modelsInImportOrder();
  const delegates = prismaDelegates(tx);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const name = ordered[i].name;
    const delegate = delegates[modelToDelegate(name)];
    if (!delegate?.deleteMany) {
      throw new Error(`Backup import: no Prisma delegate for model "${name}"`);
    }
    await delegate.deleteMany();
  }
}

async function insertModelRows(
  tx: Prisma.TransactionClient,
  modelName: string,
  rows: unknown[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const delegate = prismaDelegates(tx)[modelToDelegate(modelName)];
  if (!delegate?.createMany) {
    throw new Error(`Backup import: no Prisma delegate for model "${modelName}"`);
  }
  const result = await delegate.createMany({ data: rows });
  return result.count;
}

export async function importBackupFromZip(buffer: Buffer): Promise<ImportBackupResult> {
  const zip = new AdmZip(buffer);
  const manifest = parseManifest(zip);

  const knownModels = new Set(modelsInImportOrder().map((m) => m.name));
  const tables = [...manifest.tables].sort((a, b) => a.importOrder - b.importOrder);

  const tableData = tables.map((table) => {
    if (!knownModels.has(table.model)) {
      throw new Error(`Backup references unknown model "${table.model}"`);
    }
    const rows = readTableRows(zip, table.file);
    if (rows.length !== table.count) {
      throw new Error(
        `Row count mismatch for ${table.model}: manifest says ${table.count}, file has ${rows.length}`,
      );
    }
    return { model: table.model, rows };
  });

  await prisma.$transaction(
    async (tx) => {
      await deleteAllModels(tx);
      for (const { model, rows } of tableData) {
        await insertModelRows(tx, model, rows);
      }
    },
    { timeout: 120_000 },
  );

  return {
    importedAt: new Date().toISOString(),
    tables: tableData.map(({ model, rows }) => ({ model, count: rows.length })),
  };
}
