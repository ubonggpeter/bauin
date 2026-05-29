-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MODERATOR', 'DISTRIBUTOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RetryPolicy" AS ENUM ('IMMEDIATE', 'AFTER_24H', 'AFTER_7D', 'AFTER_30D');

-- CreateEnum
CREATE TYPE "CorrectOption" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'REFERRAL_BONUS', 'INVESTMENT_RETURN', 'STORY_PURCHASE', 'CATEGORY_REGISTRATION', 'CATEGORY_MONTHLY_FEE', 'CATEGORY_RETRY_FEE', 'BET_STAKE', 'BET_PAYOUT', 'TOOL_POOL_FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BetType" AS ENUM ('TOP1', 'TOP3', 'TOP5', 'TOP10');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('OPEN', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('WORKER', 'VIEWER');

-- CreateEnum
CREATE TYPE "InvestmentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'MATURED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ToolPoolMemberRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "referral_code" TEXT NOT NULL,
    "referred_by_id" TEXT,
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "wallet_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "phone_number" TEXT,
    "country" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "registration_fee" DECIMAL(18,2) NOT NULL,
    "monthly_fee" DECIMAL(18,2) NOT NULL,
    "retry_fee" DECIMAL(18,2) NOT NULL,
    "retry_policy" "RetryPolicy" NOT NULL DEFAULT 'IMMEDIATE',
    "pass_percentage" INTEGER NOT NULL DEFAULT 70,
    "question_count" INTEGER NOT NULL DEFAULT 20,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "paid_registration" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_topics" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "media_url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_topic_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sub_topic_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "time_spent_sec" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_topic_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_questions" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_option" "CorrectOption" NOT NULL,
    "explanation" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "score_pct" DECIMAL(5,2) NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers_json" JSONB NOT NULL,
    "duration_sec" INTEGER,
    "is_retry" BOOLEAN NOT NULL DEFAULT false,
    "retry_fee_paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "author_id" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "description" TEXT,
    "content_url" TEXT,
    "game_content_json" JSONB NOT NULL,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_id" TEXT,
    "episode_id" TEXT,
    "amount_paid" DECIMAL(18,2) NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributor_collections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "public_link_code" TEXT NOT NULL,
    "is_in_use" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_activate_at" TIMESTAMP(3),
    "description" TEXT,
    "max_participants" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributor_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_sessions" (
    "id" TEXT NOT NULL,
    "category_id" TEXT,
    "episode_id" TEXT,
    "distributor_collection_id" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_entries" (
    "id" TEXT NOT NULL,
    "quiz_session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phase1_score" INTEGER NOT NULL DEFAULT 0,
    "phase2_score" INTEGER NOT NULL DEFAULT 0,
    "phase3_score" INTEGER NOT NULL DEFAULT 0,
    "phase4_score" INTEGER NOT NULL DEFAULT 0,
    "phase5_score" INTEGER NOT NULL DEFAULT 0,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quiz_session_id" TEXT NOT NULL,
    "type" "BetType" NOT NULL,
    "stake" DECIMAL(18,2) NOT NULL,
    "predicted_ids" JSONB NOT NULL,
    "payout" DECIMAL(18,2),
    "status" "BetStatus" NOT NULL DEFAULT 'OPEN',
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_deposited" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_withdrawn" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_earned" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balance_before" DECIMAL(18,2) NOT NULL,
    "balance_after" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referred_id" TEXT NOT NULL,
    "type" "ReferralType" NOT NULL,
    "recruits_count" INTEGER NOT NULL DEFAULT 0,
    "earnings_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlock_threshold" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_earnings" (
    "id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "status" "InvestmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "request_id" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "return_rate" DECIMAL(7,4) NOT NULL,
    "expected_return" DECIMAL(18,2) NOT NULL,
    "maturity_date" TIMESTAMP(3) NOT NULL,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "actual_return" DECIMAL(18,2),
    "matured_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_pools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_pool_members" (
    "id" TEXT NOT NULL,
    "tool_pool_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ToolPoolMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_pool_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_approval_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "conditions_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "daily_limit_per_user" INTEGER,
    "sample_review_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_approval_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_referred_by_id_idx" ON "users"("referred_by_id");

-- CreateIndex
CREATE INDEX "users_referral_code_idx" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "user_categories_user_id_idx" ON "user_categories"("user_id");

-- CreateIndex
CREATE INDEX "user_categories_category_id_idx" ON "user_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_categories_user_id_category_id_key" ON "user_categories"("user_id", "category_id");

-- CreateIndex
CREATE INDEX "courses_category_id_idx" ON "courses"("category_id");

-- CreateIndex
CREATE INDEX "topics_course_id_idx" ON "topics"("course_id");

-- CreateIndex
CREATE INDEX "sub_topics_topic_id_idx" ON "sub_topics"("topic_id");

-- CreateIndex
CREATE INDEX "user_topic_progress_user_id_idx" ON "user_topic_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_topic_progress_user_id_sub_topic_id_key" ON "user_topic_progress"("user_id", "sub_topic_id");

-- CreateIndex
CREATE INDEX "test_questions_category_id_idx" ON "test_questions"("category_id");

-- CreateIndex
CREATE INDEX "test_attempts_user_id_idx" ON "test_attempts"("user_id");

-- CreateIndex
CREATE INDEX "test_attempts_category_id_idx" ON "test_attempts"("category_id");

-- CreateIndex
CREATE INDEX "test_attempts_user_id_category_id_idx" ON "test_attempts"("user_id", "category_id");

-- CreateIndex
CREATE INDEX "episodes_story_id_idx" ON "episodes"("story_id");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_story_id_episode_number_key" ON "episodes"("story_id", "episode_number");

-- CreateIndex
CREATE INDEX "story_purchases_user_id_idx" ON "story_purchases"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_purchases_user_id_story_id_key" ON "story_purchases"("user_id", "story_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_purchases_user_id_episode_id_key" ON "story_purchases"("user_id", "episode_id");

-- CreateIndex
CREATE UNIQUE INDEX "distributor_collections_public_link_code_key" ON "distributor_collections"("public_link_code");

-- CreateIndex
CREATE INDEX "distributor_collections_user_id_idx" ON "distributor_collections"("user_id");

-- CreateIndex
CREATE INDEX "distributor_collections_public_link_code_idx" ON "distributor_collections"("public_link_code");

-- CreateIndex
CREATE INDEX "quiz_sessions_distributor_collection_id_idx" ON "quiz_sessions"("distributor_collection_id");

-- CreateIndex
CREATE INDEX "quiz_entries_quiz_session_id_idx" ON "quiz_entries"("quiz_session_id");

-- CreateIndex
CREATE INDEX "quiz_entries_user_id_idx" ON "quiz_entries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_entries_quiz_session_id_user_id_key" ON "quiz_entries"("quiz_session_id", "user_id");

-- CreateIndex
CREATE INDEX "bets_user_id_idx" ON "bets"("user_id");

-- CreateIndex
CREATE INDEX "bets_quiz_session_id_idx" ON "bets"("quiz_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "transactions_wallet_id_idx" ON "transactions"("wallet_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

-- CreateIndex
CREATE INDEX "referrals_referred_id_idx" ON "referrals"("referred_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrer_id_referred_id_key" ON "referrals"("referrer_id", "referred_id");

-- CreateIndex
CREATE INDEX "referral_earnings_referral_id_idx" ON "referral_earnings"("referral_id");

-- CreateIndex
CREATE INDEX "investment_requests_user_id_idx" ON "investment_requests"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "investments_request_id_key" ON "investments"("request_id");

-- CreateIndex
CREATE INDEX "investments_user_id_idx" ON "investments"("user_id");

-- CreateIndex
CREATE INDEX "tool_pool_members_tool_pool_id_idx" ON "tool_pool_members"("tool_pool_id");

-- CreateIndex
CREATE INDEX "tool_pool_members_user_id_idx" ON "tool_pool_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tool_pool_members_tool_pool_id_user_id_key" ON "tool_pool_members"("tool_pool_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_topics" ADD CONSTRAINT "sub_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_topic_progress" ADD CONSTRAINT "user_topic_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_topic_progress" ADD CONSTRAINT "user_topic_progress_sub_topic_id_fkey" FOREIGN KEY ("sub_topic_id") REFERENCES "sub_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_purchases" ADD CONSTRAINT "story_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_purchases" ADD CONSTRAINT "story_purchases_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_purchases" ADD CONSTRAINT "story_purchases_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributor_collections" ADD CONSTRAINT "distributor_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_distributor_collection_id_fkey" FOREIGN KEY ("distributor_collection_id") REFERENCES "distributor_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_entries" ADD CONSTRAINT "quiz_entries_quiz_session_id_fkey" FOREIGN KEY ("quiz_session_id") REFERENCES "quiz_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_entries" ADD CONSTRAINT "quiz_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_quiz_session_id_fkey" FOREIGN KEY ("quiz_session_id") REFERENCES "quiz_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_requests" ADD CONSTRAINT "investment_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "investment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_pool_members" ADD CONSTRAINT "tool_pool_members_tool_pool_id_fkey" FOREIGN KEY ("tool_pool_id") REFERENCES "tool_pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_pool_members" ADD CONSTRAINT "tool_pool_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
