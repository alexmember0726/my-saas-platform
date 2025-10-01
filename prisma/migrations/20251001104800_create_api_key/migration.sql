/*
  Warnings:

  - You are about to drop the column `prefix` on the `ApiKey` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ApiKey" DROP COLUMN "prefix";
