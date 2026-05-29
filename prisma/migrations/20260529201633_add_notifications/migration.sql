-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL_VERIFICATION', 'WELCOME_AFTER_PAYMENT', 'CERTIFICATION_PASSED', 'CERTIFICATION_FAILED', 'STORY_APPROVED', 'STORY_SALE', 'QUIZ_WIN', 'BET_WIN', 'BET_LOSS', 'REFERRAL_EARNED', 'REFERRAL_VIEWER_UNLOCKED', 'WITHDRAWAL_PROCESSED', 'INVESTMENT_FUNDED', 'WEEKLY_LEADERBOARD', 'ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
