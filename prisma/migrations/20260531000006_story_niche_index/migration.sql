-- Add niche field and index to stories table
ALTER TABLE "stories" ADD COLUMN "niche" TEXT;
CREATE INDEX "stories_niche_idx" ON "stories"("niche");
