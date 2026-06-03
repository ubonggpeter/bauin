ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'MILESTONE_BONUS';

CREATE TABLE "milestones" (
    "id"                TEXT        NOT NULL,
    "type"              TEXT        NOT NULL,
    "label"             TEXT        NOT NULL,
    "headline"          TEXT        NOT NULL,
    "hit_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "banner_expires_at" TIMESTAMP(3) NOT NULL,
    "bonus_paid"        BOOLEAN     NOT NULL DEFAULT false,
    "users_rewarded"    INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "milestones_type_key"              ON "milestones"("type");
CREATE INDEX        "milestones_banner_expires_at_idx" ON "milestones"("banner_expires_at");
