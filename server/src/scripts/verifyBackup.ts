/**
 * Validates backup import order and optionally round-trips export → import.
 * Run from server dir: npx tsx src/scripts/verifyBackup.ts [--round-trip]
 */
import AdmZip from "adm-zip";
import { Prisma } from "@prisma/client";
import {
  createBackupArchive,
  modelToDelegate,
  modelsInImportOrder,
} from "../lib/backupExport.js";
import { importBackupFromZip } from "../lib/backupImport.js";
import { prisma } from "../lib/prisma.js";

function verifyImportOrder(): boolean {
  const models = modelsInImportOrder();
  const order = new Map(models.map((m, i) => [m.name, i]));
  let ok = true;

  console.log("Models in import order:");
  for (const [i, model] of models.entries()) {
    console.log(`  ${i + 1}. ${model.name}`);
  }

  for (const model of models) {
    for (const field of model.fields) {
      if (field.kind === "object" && (field.relationFromFields?.length ?? 0) > 0) {
        const dep = field.type;
        if (order.has(dep) && order.get(dep)! >= order.get(model.name)!) {
          console.error(
            `FK order error: ${model.name} depends on ${dep} but is ordered before it`,
          );
          ok = false;
        }
      }
    }
  }

  const dmmfNames = new Set(Prisma.dmmf.datamodel.models.map((m) => m.name));
  const orderedNames = new Set(models.map((m) => m.name));
  if (dmmfNames.size !== orderedNames.size) {
    console.error("Model count mismatch between DMMF and import order");
    ok = false;
  }

  console.log(ok ? "Import order: OK" : "Import order: FAILED");
  return ok;
}

async function bufferFromArchive(): Promise<Buffer> {
  const archive = await createBackupArchive();
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/** Simulates a backup from before Apr–May 2026 schema additions. */
async function testLegacyBackupImport(): Promise<void> {
  console.log("\nLegacy backup import (missing new table + optional columns)...");

  const zipBuffer = await bufferFromArchive();
  const zip = new AdmZip(zipBuffer);
  const manifest = JSON.parse(
    zip.getEntry("manifest.json")!.getData().toString("utf8"),
  ) as {
    format: string;
    formatVersion: number;
    exportedAt: string;
    tables: Array<{ file: string; model: string; importOrder: number; count: number }>;
  };

  manifest.tables = manifest.tables.filter((t) => t.model !== "OfficeExpenseTypePayable");
  manifest.tables.forEach((t, i) => {
    t.importOrder = i + 1;
  });

  const stripKeys = (rows: Record<string, unknown>[], keys: string[]) =>
    rows.map((row) => {
      const copy = { ...row };
      for (const key of keys) delete copy[key];
      return copy;
    });

  const tableRows = new Map<string, Record<string, unknown>[]>();
  for (const table of manifest.tables) {
    const entry = zip.getEntry(table.file);
    if (!entry) continue;
    let rows = JSON.parse(entry.getData().toString("utf8")) as Record<string, unknown>[];
    if (table.model === "Project") rows = stripKeys(rows, ["details"]);
    if (table.model === "LineItem") rows = stripKeys(rows, ["inventoryExpenseTypeId"]);
    if (table.model === "InventoryExpense") rows = stripKeys(rows, ["lineItemId"]);
    if (table.model === "VendorItem") rows = stripKeys(rows, ["inventoryExpenseId"]);
    table.count = rows.length;
    tableRows.set(table.file, rows);
  }

  const legacyZip = new AdmZip();
  legacyZip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
  for (const table of manifest.tables) {
    const rows = tableRows.get(table.file);
    if (!rows) continue;
    legacyZip.addFile(table.file, Buffer.from(JSON.stringify(rows, null, 2)));
  }

  await importBackupFromZip(legacyZip.toBuffer());
  console.log("Legacy backup import: OK");
}

type CountDelegate = { count: () => Promise<number> };

async function countModelRows(modelName: string): Promise<number> {
  const delegate = (prisma as unknown as Record<string, CountDelegate>)[modelToDelegate(modelName)];
  return delegate?.count ? delegate.count() : 0;
}

async function roundTrip(): Promise<void> {
  console.log("\nRound-trip export → import...");

  const before = await Promise.all(
    modelsInImportOrder().map(async (model) => ({
      model: model.name,
      count: await countModelRows(model.name),
    })),
  );

  const zipBuffer = await bufferFromArchive();
  const zip = new AdmZip(zipBuffer);
  const manifest = JSON.parse(zip.getEntry("manifest.json")!.getData().toString("utf8"));
  console.log(`Exported ${manifest.tables.length} tables at ${manifest.exportedAt}`);

  const result = await importBackupFromZip(zipBuffer);
  console.log(`Imported at ${result.importedAt}`);

  const after = await Promise.all(
    modelsInImportOrder().map(async (model) => ({
      model: model.name,
      count: await countModelRows(model.name),
    })),
  );

  let ok = true;
  for (const prev of before) {
    const next = after.find((row) => row.model === prev.model);
    if (!next || next.count !== prev.count) {
      console.error(
        `Count mismatch for ${prev.model}: before=${prev.count}, after=${next?.count ?? "missing"}`,
      );
      ok = false;
    }
  }

  console.log(ok ? "Round-trip: OK" : "Round-trip: FAILED");
  if (!ok) process.exit(1);
}

async function main() {
  const roundTripRequested = process.argv.includes("--round-trip");

  if (!verifyImportOrder()) {
    process.exit(1);
  }

  if (roundTripRequested) {
    await roundTrip();
    await testLegacyBackupImport();
    await roundTrip();
  } else {
    console.log("\nPass --round-trip to test export → import against DATABASE_URL.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
