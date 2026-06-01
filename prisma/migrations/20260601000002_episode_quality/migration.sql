-- Add quality_score column to episodes table
ALTER TABLE "episodes" ADD COLUMN "quality_score" JSONB;
