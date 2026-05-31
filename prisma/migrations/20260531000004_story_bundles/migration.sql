-- AlterEnum: Add BUNDLE_PURCHASE to TransactionType
ALTER TYPE "TransactionType" ADD VALUE 'BUNDLE_PURCHASE';

-- AlterTable: Add preview_url to episodes
ALTER TABLE "episodes" ADD COLUMN "preview_url" TEXT;

-- CreateTable: story_bundles
CREATE TABLE "story_bundles" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "bundle_price" DECIMAL(18,2) NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "story_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: story_bundle_items
CREATE TABLE "story_bundle_items" (
    "id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story_bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bundle_purchases
CREATE TABLE "bundle_purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "amount_paid" DECIMAL(18,2) NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bundle_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_bundles_seller_id_idx" ON "story_bundles"("seller_id");
CREATE INDEX "story_bundles_is_published_idx" ON "story_bundles"("is_published");
CREATE UNIQUE INDEX "story_bundle_items_bundle_id_story_id_key" ON "story_bundle_items"("bundle_id", "story_id");
CREATE INDEX "story_bundle_items_bundle_id_idx" ON "story_bundle_items"("bundle_id");
CREATE UNIQUE INDEX "bundle_purchases_user_id_bundle_id_key" ON "bundle_purchases"("user_id", "bundle_id");
CREATE INDEX "bundle_purchases_user_id_idx" ON "bundle_purchases"("user_id");
CREATE INDEX "bundle_purchases_bundle_id_idx" ON "bundle_purchases"("bundle_id");

-- AddForeignKey
ALTER TABLE "story_bundles" ADD CONSTRAINT "story_bundles_seller_id_fkey"
    FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "story_bundle_items" ADD CONSTRAINT "story_bundle_items_bundle_id_fkey"
    FOREIGN KEY ("bundle_id") REFERENCES "story_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "story_bundle_items" ADD CONSTRAINT "story_bundle_items_story_id_fkey"
    FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bundle_purchases" ADD CONSTRAINT "bundle_purchases_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bundle_purchases" ADD CONSTRAINT "bundle_purchases_bundle_id_fkey"
    FOREIGN KEY ("bundle_id") REFERENCES "story_bundles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
