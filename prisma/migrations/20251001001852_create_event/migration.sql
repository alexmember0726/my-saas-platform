/*
  Warnings:

  - You are about to drop the column `type` on the `Event` table. All the data in the column will be lost.
  - Added the required column `last4` to the `ApiKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ApiKey" ADD COLUMN     "last4" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Event" DROP COLUMN "type",
ADD COLUMN     "name" TEXT NOT NULL;
