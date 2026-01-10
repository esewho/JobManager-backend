-- CreateEnum
CREATE TYPE "WorkShift" AS ENUM ('MIDDAY', 'NIGHT');

-- AlterTable
ALTER TABLE "WorkSession" ADD COLUMN     "shift" "WorkShift";
