/**
 * Clears all data from the database (tables remain).
 * Run from server dir: npx tsx src/scripts/clearDb.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearDb() {
  // Delete in order to respect foreign keys (children first)
  await prisma.vendorPaymentAllocation.deleteMany();
  await prisma.vendorPayment.deleteMany();
  await prisma.vendorItem.deleteMany();
  await prisma.officeExpense.deleteMany();
  await prisma.officeExpenseType.deleteMany();
  await prisma.inventoryExpense.deleteMany();
  await prisma.inventoryExpenseType.deleteMany();
  await prisma.lineItem.deleteMany();
  await prisma.projectPayment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.bankOnlyTransaction.deleteMany();
  await prisma.paymentMethod.deleteMany();

  console.log("All data cleared.");
}

clearDb()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
