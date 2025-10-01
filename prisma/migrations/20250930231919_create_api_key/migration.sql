/*
  Warnings:

  - You are about to drop the column `last4` on the `ApiKey` table. All the data in the column will be lost.
  - Added the required column `apiKey` to the `ApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ApiKey" DROP COLUMN "last4",
ADD COLUMN     "apiKey" TEXT NOT NULL;
