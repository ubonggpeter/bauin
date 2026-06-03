CREATE TYPE "ReportReason" AS ENUM ('ADULT_CONTENT', 'SCAM', 'COPYRIGHT', 'HATE_SPEECH', 'OTHER');

ALTER TABLE "users"
  ADD COLUMN "seller_suspended_at" TIMESTAMP(3),
  ADD COLUMN "seller_banned_at"    TIMESTAMP(3);

ALTER TABLE "stories"
  ADD COLUMN "report_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "stories_report_count_idx" ON "stories"("report_count" DESC);

CREATE TABLE "story_reports" (
    "id"              TEXT         NOT NULL,
    "story_id"        TEXT         NOT NULL,
    "reporter_id"     TEXT         NOT NULL,
    "reason"          "ReportReason" NOT NULL,
    "details"         TEXT,
    "status"          TEXT         NOT NULL DEFAULT 'PENDING',
    "reviewed_at"     TIMESTAMP(3),
    "reviewed_by_id"  TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "story_reports_story_id_fkey"    FOREIGN KEY ("story_id")    REFERENCES "stories"("id") ON DELETE CASCADE,
    CONSTRAINT "story_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX "story_reports_story_reporter_key" ON "story_reports"("story_id", "reporter_id");
CREATE INDEX        "story_reports_story_id_idx"       ON "story_reports"("story_id");
CREATE INDEX        "story_reports_status_idx"         ON "story_reports"("status");

CREATE TABLE "story_strikes" (
    "id"            TEXT         NOT NULL,
    "story_id"      TEXT         NOT NULL,
    "author_id"     TEXT         NOT NULL,
    "strike_number" INTEGER      NOT NULL,
    "note"          TEXT         NOT NULL,
    "issued_by_id"  TEXT         NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story_strikes_pkey"          PRIMARY KEY ("id"),
    CONSTRAINT "story_strikes_story_fkey"    FOREIGN KEY ("story_id")     REFERENCES "stories"("id") ON DELETE CASCADE,
    CONSTRAINT "story_strikes_author_fkey"   FOREIGN KEY ("author_id")    REFERENCES "users"("id"),
    CONSTRAINT "story_strikes_issuer_fkey"   FOREIGN KEY ("issued_by_id") REFERENCES "users"("id")
);

CREATE INDEX "story_strikes_author_id_idx" ON "story_strikes"("author_id");
CREATE INDEX "story_strikes_story_id_idx"  ON "story_strikes"("story_id");
