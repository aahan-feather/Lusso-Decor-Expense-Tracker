-- AlterTable
ALTER TABLE "LineItem" ADD COLUMN "inventoryExpenseTypeId" TEXT;

-- AlterTable
ALTER TABLE "InventoryExpense" ADD COLUMN "lineItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryExpense_lineItemId_key" ON "InventoryExpense"("lineItemId");

-- AddForeignKey
ALTER TABLE "LineItem" ADD CONSTRAINT "LineItem_inventoryExpenseTypeId_fkey" FOREIGN KEY ("inventoryExpenseTypeId") REFERENCES "InventoryExpenseType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryExpense" ADD CONSTRAINT "InventoryExpense_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "LineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
