ALTER TABLE "stories"
  ADD COLUMN "rating"           DECIMAL(4,2)  NOT NULL DEFAULT 0,
  ADD COLUMN "rating_count"     INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN "avg_stars"        DECIMAL(4,2)  NOT NULL DEFAULT 0,
  ADD COLUMN "is_featured"      BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN "hidden_for_review" BOOLEAN      NOT NULL DEFAULT false;

CREATE INDEX "stories_rating_idx"     ON "stories"("rating" DESC);
CREATE INDEX "stories_is_featured_idx" ON "stories"("is_featured");

CREATE TABLE "story_reviews" (
    "id"         TEXT         NOT NULL,
    "story_id"   TEXT         NOT NULL,
    "user_id"    TEXT         NOT NULL,
    "stars"      INTEGER      NOT NULL,
    "comment"    TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "story_reviews_story_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE,
    CONSTRAINT "story_reviews_user_fkey"  FOREIGN KEY ("user_id")  REFERENCES "users"("id")
);

CREATE UNIQUE INDEX "story_reviews_story_user_key" ON "story_reviews"("story_id", "user_id");
CREATE INDEX        "story_reviews_story_id_idx"   ON "story_reviews"("story_id");
