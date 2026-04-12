-- CreateTable
CREATE TABLE "OfficeExpenseTypePayable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "officeExpenseTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficeExpenseTypePayable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OfficeExpenseTypePayable" ADD CONSTRAINT "OfficeExpenseTypePayable_officeExpenseTypeId_fkey" FOREIGN KEY ("officeExpenseTypeId") REFERENCES "OfficeExpenseType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
