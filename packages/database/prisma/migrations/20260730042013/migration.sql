/*
  Warnings:

  - The values [GOOGLE_PLACES,GOOGLE_BUSINESS_PROFILE] on the enum `BusinessLocationSource` will be removed. If these variants are still used in the database, this will fail.
  - The values [GOOGLE_MAPS] on the enum `SourceType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `businessStatus` on the `business_locations` table. All the data in the column will be lost.
  - You are about to drop the column `googleLocationId` on the `business_locations` table. All the data in the column will be lost.
  - You are about to drop the column `googlePlaceId` on the `business_locations` table. All the data in the column will be lost.
  - You are about to drop the column `googlePlaceIdRefreshedAt` on the `business_locations` table. All the data in the column will be lost.
  - You are about to drop the column `googlePlaceLastFetchedAt` on the `business_locations` table. All the data in the column will be lost.
  - You are about to drop the column `googlePlaceLinkStatus` on the `business_locations` table. All the data in the column will be lost.
  - You are about to drop the column `googlePlaceLinkedAt` on the `business_locations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[serpapiPlaceId]` on the table `business_locations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[serpapiLocationId]` on the table `business_locations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SerpApiLinkStatus" AS ENUM ('LINKED', 'DISCONNECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "BusinessLocationSource_new" AS ENUM ('MANUAL', 'SERPAPI');
ALTER TABLE "public"."business_locations" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "business_locations" ALTER COLUMN "source" TYPE "BusinessLocationSource_new" USING ("source"::text::"BusinessLocationSource_new");
ALTER TYPE "BusinessLocationSource" RENAME TO "BusinessLocationSource_old";
ALTER TYPE "BusinessLocationSource_new" RENAME TO "BusinessLocationSource";
DROP TYPE "public"."BusinessLocationSource_old";
ALTER TABLE "business_locations" ALTER COLUMN "source" SET DEFAULT 'MANUAL';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SourceType_new" AS ENUM ('MANUAL', 'EXCEL', 'CSV', 'SERPAPI');
ALTER TABLE "data_sources" ALTER COLUMN "sourceType" TYPE "SourceType_new" USING ("sourceType"::text::"SourceType_new");
ALTER TYPE "SourceType" RENAME TO "SourceType_old";
ALTER TYPE "SourceType_new" RENAME TO "SourceType";
DROP TYPE "public"."SourceType_old";
COMMIT;

-- DropIndex
DROP INDEX "business_locations_googlePlaceId_idx";

-- DropIndex
DROP INDEX "business_locations_organizationId_googlePlaceId_key";

-- AlterTable
ALTER TABLE "business_locations" DROP COLUMN "businessStatus",
DROP COLUMN "googleLocationId",
DROP COLUMN "googlePlaceId",
DROP COLUMN "googlePlaceIdRefreshedAt",
DROP COLUMN "googlePlaceLastFetchedAt",
DROP COLUMN "googlePlaceLinkStatus",
DROP COLUMN "googlePlaceLinkedAt",
ADD COLUMN     "serpapiLocationId" TEXT,
ADD COLUMN     "serpapiPlaceId" TEXT,
ADD COLUMN     "serpapiPlaceLinkStatus" "SerpApiLinkStatus";

-- DropEnum
DROP TYPE "GooglePlaceLinkStatus";

-- CreateIndex
CREATE UNIQUE INDEX "business_locations_serpapiPlaceId_key" ON "business_locations"("serpapiPlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "business_locations_serpapiLocationId_key" ON "business_locations"("serpapiLocationId");
