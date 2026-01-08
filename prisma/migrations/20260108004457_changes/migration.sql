/*
  Warnings:

  - You are about to alter the column `amount` on the `TipDistribution` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Integer`.
  - You are about to drop the column `amountPerWorker` on the `TipPool` table. All the data in the column will be lost.
  - You are about to drop the column `workersCount` on the `TipPool` table. All the data in the column will be lost.
  - You are about to alter the column `totalAmount` on the `TipPool` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - A unique constraint covering the columns `[userId,tipPoolId]` on the table `TipDistribution` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TipDistribution" ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "TipPool" DROP COLUMN "amountPerWorker",
DROP COLUMN "workersCount",
ALTER COLUMN "totalAmount" SET DATA TYPE INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "TipDistribution_userId_tipPoolId_key" ON "TipDistribution"("userId", "tipPoolId");
