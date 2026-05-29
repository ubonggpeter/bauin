-- CreateTable
CREATE TABLE "auto_approval_logs" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT,
    "user_id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "request_data" JSONB NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "decision" TEXT NOT NULL,
    "failed_condition" JSONB,
    "is_sample_review" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_approval_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auto_approval_logs_user_id_idx" ON "auto_approval_logs"("user_id");

-- CreateIndex
CREATE INDEX "auto_approval_logs_request_type_idx" ON "auto_approval_logs"("request_type");

-- CreateIndex
CREATE INDEX "auto_approval_logs_created_at_idx" ON "auto_approval_logs"("created_at");

-- CreateIndex
CREATE INDEX "auto_approval_rules_rule_type_idx" ON "auto_approval_rules"("rule_type");

-- AddForeignKey
ALTER TABLE "auto_approval_logs" ADD CONSTRAINT "auto_approval_logs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "auto_approval_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
