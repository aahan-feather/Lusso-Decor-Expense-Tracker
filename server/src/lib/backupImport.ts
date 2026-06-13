import AdmZip from "adm-zip";
import { Prisma } from "@prisma/client";
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  modelToDelegate,
  modelsInImportOrder,
} from "./backupExport.js";
import { prisma } from "./prisma.js";

type DmmfModel = (typeof Prisma.dmmf.datamodel.models)[number];

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

function scalarFields(model: DmmfModel): Set<string> {
  return new Set(
    model.fields.filter((field) => field.kind === "scalar" || field.kind === "enum").map((f) => f.name),
  );
}

/** Drop unknown keys so older/newer backups stay compatible with the current schema. */
export function normalizeRowsForModel(modelName: string, rows: unknown[]): unknown[] {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
  if (!model) return rows;
  const allowed = scalarFields(model);
  return rows.map((row) => {
    if (typeof row !== "object" || row === null || Array.isArray(row)) return row;
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (allowed.has(key)) normalized[key] = value;
    }
    return normalized;
  });
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
  const result = await delegate.createMany({ data: normalizeRowsForModel(modelName, rows) });
  return result.count;
}

export async function importBackupFromZip(buffer: Buffer): Promise<ImportBackupResult> {
  const zip = new AdmZip(buffer);
  const manifest = parseManifest(zip);

  const orderedModels = modelsInImportOrder();
  const knownModels = new Set(orderedModels.map((m) => m.name));
  const orderIndex = new Map(orderedModels.map((model, index) => [model.name, index]));
  const tables = [...manifest.tables].sort(
    (a, b) => (orderIndex.get(a.model) ?? 0) - (orderIndex.get(b.model) ?? 0),
  );

  const manifestModels = new Set(tables.map((table) => table.model));
  for (const model of orderedModels) {
    if (!manifestModels.has(model.name)) {
      console.warn(`Backup import: manifest omits ${model.name}; table will be empty after import`);
    }
  }

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
