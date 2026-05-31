-- AlterTable: User — add ninHash, fraudSuspendedAt
ALTER TABLE "users" ADD COLUMN "nin_hash" TEXT;
ALTER TABLE "users" ADD COLUMN "fraud_suspended_at" TIMESTAMP(3);
ALTER TABLE "users" ADD CONSTRAINT "users_nin_hash_key" UNIQUE ("nin_hash");

-- AlterTable: QuizEntry — add ipAddress, minAnswerTimeMs
ALTER TABLE "quiz_entries" ADD COLUMN "ip_address" TEXT;
ALTER TABLE "quiz_entries" ADD COLUMN "min_answer_time_ms" INTEGER;

-- CreateEnum: FraudFlagType
CREATE TYPE "FraudFlagType" AS ENUM ('RAPID_ANSWERS', 'SAME_IP_QUIZ_REPLAY', 'SHARED_PHONE');

-- CreateEnum: FraudSeverity
CREATE TYPE "FraudSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable: KycDocument
CREATE TABLE "kyc_documents" (
    "id"              TEXT NOT NULL,
    "user_id"         TEXT NOT NULL,
    "nin_hash"        TEXT NOT NULL,
    "doc_type"        TEXT NOT NULL,
    "doc_key"         TEXT NOT NULL,
    "auto_approved"   BOOLEAN NOT NULL DEFAULT false,
    "review_note"     TEXT,
    "reviewed_at"     TIMESTAMP(3),
    "reviewed_by_id"  TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kyc_documents_user_id_key"  ON "kyc_documents"("user_id");
CREATE UNIQUE INDEX "kyc_documents_nin_hash_key" ON "kyc_documents"("nin_hash");
CREATE INDEX "kyc_documents_reviewed_by_id_idx" ON "kyc_documents"("reviewed_by_id");

ALTER TABLE "kyc_documents"
    ADD CONSTRAINT "kyc_documents_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: FraudFlag
CREATE TABLE "fraud_flags" (
    "id"              TEXT NOT NULL,
    "user_id"         TEXT NOT NULL,
    "type"            "FraudFlagType" NOT NULL,
    "severity"        "FraudSeverity" NOT NULL,
    "evidence"        JSONB NOT NULL,
    "resolved"        BOOLEAN NOT NULL DEFAULT false,
    "resolved_at"     TIMESTAMP(3),
    "resolved_by_id"  TEXT,
    "note"            TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_flags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fraud_flags_user_id_idx"       ON "fraud_flags"("user_id");
CREATE INDEX "fraud_flags_type_resolved_idx" ON "fraud_flags"("type", "resolved");
CREATE INDEX "fraud_flags_sev_resolved_idx"  ON "fraud_flags"("severity", "resolved");

ALTER TABLE "fraud_flags"
    ADD CONSTRAINT "fraud_flags_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
