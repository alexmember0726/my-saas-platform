/*
  Warnings:

  - You are about to drop the column `active` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `last4` on the `ApiKey` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ApiKey" DROP COLUMN "active",
DROP COLUMN "last4",
ADD COLUMN     "name" TEXT,
ADD COLUMN     "rotatedAt" TIMESTAMP(3);
