/*
  Warnings:

  - Added the required column `last4` to the `ApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ApiKey" ADD COLUMN     "last4" TEXT NOT NULL;
