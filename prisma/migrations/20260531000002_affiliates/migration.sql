-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'AFFILIATE_BONUS';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'AFFILIATE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'AFFILIATE_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'AFFILIATE_BONUS_EARNED';

-- CreateTable: affiliates
CREATE TABLE "affiliates" (
    "id"               TEXT NOT NULL,
    "user_id"          TEXT NOT NULL,
    "status"           "AffiliateStatus" NOT NULL DEFAULT 'PENDING',
    "promo_code"       TEXT NOT NULL,
    "application_note" TEXT,
    "review_note"      TEXT,
    "reviewed_at"      TIMESTAMP(3),
    "reviewed_by_id"   TEXT,
    "approved_at"      TIMESTAMP(3),
    "earnings_total"   DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: affiliate_referrals
CREATE TABLE "affiliate_referrals" (
    "id"               TEXT NOT NULL,
    "affiliate_id"     TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "bonus_paid"       BOOLEAN NOT NULL DEFAULT false,
    "bonus_paid_at"    TIMESTAMP(3),
    "bonus_ref"        TEXT,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_user_id_key"       ON "affiliates"("user_id");
CREATE UNIQUE INDEX "affiliates_promo_code_key"     ON "affiliates"("promo_code");
CREATE        INDEX "affiliates_status_idx"         ON "affiliates"("status");
CREATE        INDEX "affiliates_promo_code_idx"     ON "affiliates"("promo_code");

CREATE UNIQUE INDEX "affiliate_referrals_referred_user_id_key" ON "affiliate_referrals"("referred_user_id");
CREATE UNIQUE INDEX "affiliate_referrals_bonus_ref_key"        ON "affiliate_referrals"("bonus_ref");
CREATE        INDEX "affiliate_referrals_affiliate_id_idx"     ON "affiliate_referrals"("affiliate_id");

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_reviewed_by_id_fkey"
    FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_affiliate_id_fkey"
    FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_referred_user_id_fkey"
    FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
