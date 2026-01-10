/*
  Warnings:

  - A unique constraint covering the columns `[date,shift]` on the table `TipPool` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shift` to the `TipPool` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TipPool" ADD COLUMN     "shift" "WorkShift" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TipPool_date_shift_key" ON "TipPool"("date", "shift");
