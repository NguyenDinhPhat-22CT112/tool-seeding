CREATE TYPE "BusinessLocationSource" AS ENUM (
  'MANUAL',
  'GOOGLE_PLACES',
  'GOOGLE_BUSINESS_PROFILE'
);

CREATE TYPE "GooglePlaceLinkStatus" AS ENUM (
  'LINKED',
  'OUTDATED',
  'NOT_FOUND',
  'DISCONNECTED'
);

ALTER TABLE "business_locations"
  ADD COLUMN "source" "BusinessLocationSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "googlePlaceLinkStatus" "GooglePlaceLinkStatus",
  ADD COLUMN "googlePlaceLinkedAt" TIMESTAMP(3),
  ADD COLUMN "googlePlaceLastFetchedAt" TIMESTAMP(3),
  ADD COLUMN "googlePlaceIdRefreshedAt" TIMESTAMP(3);

CREATE INDEX "business_locations_googlePlaceId_idx"
  ON "business_locations"("googlePlaceId");

CREATE INDEX "business_locations_source_idx"
  ON "business_locations"("source");
