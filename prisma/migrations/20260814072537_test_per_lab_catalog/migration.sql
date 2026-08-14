-- AlterTable
ALTER TABLE "tests" ADD COLUMN     "labId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "tests_labId_idx" ON "tests"("labId");

-- CreateIndex
CREATE UNIQUE INDEX "tests_labId_name_key" ON "tests"("labId", "name");

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_labId_fkey" FOREIGN KEY ("labId") REFERENCES "labs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

