CREATE TYPE "FeedbackFeature"   AS ENUM ('CERTIFICATION', 'WITHDRAWAL', 'QUIZ');
CREATE TYPE "FeedbackScoreType" AS ENUM ('STARS', 'THUMBS', 'EMOJI');

CREATE TABLE "feedback" (
    "id"         TEXT                  NOT NULL,
    "user_id"    TEXT                  NOT NULL,
    "feature"    "FeedbackFeature"     NOT NULL,
    "score_type" "FeedbackScoreType"   NOT NULL,
    "score"      INTEGER               NOT NULL,
    "comment"    TEXT,
    "metadata"   JSONB,
    "created_at" TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feedback_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "feedback_feature_created_at_idx" ON "feedback"("feature", "created_at" DESC);
CREATE INDEX "feedback_user_id_feature_idx"    ON "feedback"("user_id", "feature");
