-- AlterTable
ALTER TABLE "VendorItem" ADD COLUMN "inventoryExpenseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VendorItem_inventoryExpenseId_key" ON "VendorItem"("inventoryExpenseId");

-- AddForeignKey
ALTER TABLE "VendorItem" ADD CONSTRAINT "VendorItem_inventoryExpenseId_fkey" FOREIGN KEY ("inventoryExpenseId") REFERENCES "InventoryExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
