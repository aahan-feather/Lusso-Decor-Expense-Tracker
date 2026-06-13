/**
 * Clears all data from the database (tables remain).
 * Run from server dir: npx tsx src/scripts/clearDb.ts
 */
import { modelsInImportOrder, modelToDelegate } from "../lib/backupExport.js";
import { prisma } from "../lib/prisma.js";

async function clearDb() {
  const ordered = modelsInImportOrder();
  const client = prisma as unknown as Record<string, { deleteMany: () => Promise<unknown> }>;

  for (let i = ordered.length - 1; i >= 0; i--) {
    const delegate = client[modelToDelegate(ordered[i].name)];
    if (!delegate?.deleteMany) {
      throw new Error(`clearDb: no Prisma delegate for model "${ordered[i].name}"`);
    }
    await delegate.deleteMany();
  }

  console.log("All data cleared.");
}

clearDb()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
