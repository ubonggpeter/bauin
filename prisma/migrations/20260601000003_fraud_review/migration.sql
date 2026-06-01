-- CreateEnum
CREATE TYPE "FraudFlagStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "FraudAppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: add status column to fraud_flags
ALTER TABLE "fraud_flags" ADD COLUMN "status" "FraudFlagStatus" NOT NULL DEFAULT 'PENDING';

-- Drop old indexes (will be recreated with new shape)
DROP INDEX IF EXISTS "fraud_flags_type_resolved_idx";
DROP INDEX IF EXISTS "fraud_flags_sev_resolved_idx";

-- Backfill: flags where resolved=true get CONFIRMED (best-effort)
UPDATE "fraud_flags" SET "status" = 'CONFIRMED' WHERE "resolved" = true;

-- New indexes
CREATE INDEX "fraud_flags_type_status_idx" ON "fraud_flags"("type", "status");
CREATE INDEX "fraud_flags_sev_status_idx"  ON "fraud_flags"("severity", "status");

-- CreateTable
CREATE TABLE "fraud_appeals" (
    "id"              TEXT NOT NULL,
    "flag_id"         TEXT NOT NULL,
    "user_id"         TEXT NOT NULL,
    "reason"          TEXT NOT NULL,
    "status"          "FraudAppealStatus" NOT NULL DEFAULT 'PENDING',
    "review_note"     TEXT,
    "reviewed_by_id"  TEXT,
    "reviewed_at"     TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_appeals_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "fraud_appeals_flag_id_idx" ON "fraud_appeals"("flag_id");
CREATE INDEX "fraud_appeals_user_id_idx" ON "fraud_appeals"("user_id");
CREATE INDEX "fraud_appeals_status_idx"  ON "fraud_appeals"("status");

-- Foreign keys
ALTER TABLE "fraud_appeals"
    ADD CONSTRAINT "fraud_appeals_flag_id_fkey"
    FOREIGN KEY ("flag_id") REFERENCES "fraud_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fraud_appeals"
    ADD CONSTRAINT "fraud_appeals_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
