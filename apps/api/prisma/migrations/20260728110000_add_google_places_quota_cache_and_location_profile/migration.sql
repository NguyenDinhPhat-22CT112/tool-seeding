ALTER TABLE "business_locations"
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "primaryType" TEXT,
  ADD COLUMN "businessStatus" TEXT,
  ADD COLUMN "rating" DOUBLE PRECISION,
  ADD COLUMN "userRatingCount" INTEGER;

UPDATE "business_locations" AS location
SET "organizationId" = business."organizationId"
FROM "businesses" AS business
WHERE location."businessId" = business."id";

ALTER TABLE "business_locations"
  ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "business_locations"
  DROP CONSTRAINT "business_locations_businessId_fkey";

DROP INDEX "business_locations_businessId_googlePlaceId_key";

ALTER TABLE "business_locations"
  ADD CONSTRAINT "business_locations_businessId_organizationId_fkey"
  FOREIGN KEY ("businessId", "organizationId")
  REFERENCES "businesses"("id", "organizationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "business_locations_organizationId_googlePlaceId_key"
  ON "business_locations"("organizationId", "googlePlaceId");

CREATE INDEX "business_locations_organizationId_idx"
  ON "business_locations"("organizationId");

CREATE TABLE "google_place_preview_cache" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "placeId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "google_place_preview_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "google_place_preview_cache_organizationId_placeId_key"
  ON "google_place_preview_cache"("organizationId", "placeId");

CREATE INDEX "google_place_preview_cache_expiresAt_idx"
  ON "google_place_preview_cache"("expiresAt");

CREATE TABLE "external_api_usage" (
  "id" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "external_api_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_api_usage_scopeKey_provider_sku_period_key"
  ON "external_api_usage"("scopeKey", "provider", "sku", "period");

CREATE INDEX "external_api_usage_provider_sku_period_idx"
  ON "external_api_usage"("provider", "sku", "period");
