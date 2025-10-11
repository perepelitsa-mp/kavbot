-- Enable required extension for UUID defaults
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('general', 'specialist');

-- AlterTable
ALTER TABLE "listings"
  ADD COLUMN "listing_type" "ListingType" NOT NULL DEFAULT 'general',
  ADD COLUMN "services" JSONB;

-- Backfill existing listings
UPDATE "listings" SET "listing_type" = 'general' WHERE "listing_type" IS NULL;

-- CreateTable
CREATE TABLE "listing_reviews" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "listing_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "text" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "listing_reviews_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "listing_reviews_listing_id_user_id_key" ON "listing_reviews"("listing_id", "user_id");
CREATE INDEX "listing_reviews_listing_id_idx" ON "listing_reviews"("listing_id");
CREATE INDEX "listing_reviews_user_id_idx" ON "listing_reviews"("user_id");

-- Foreign keys
ALTER TABLE "listing_reviews"
  ADD CONSTRAINT "listing_reviews_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_reviews"
  ADD CONSTRAINT "listing_reviews_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comment replies FK
ALTER TABLE "comments"
  ADD CONSTRAINT "comments_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
