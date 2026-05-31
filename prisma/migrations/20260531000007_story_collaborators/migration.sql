-- Add royalty fields to stories
ALTER TABLE "stories" ADD COLUMN "royalty_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "stories" ADD COLUMN "royalty_pct" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Create story_collaborators table
CREATE TABLE "story_collaborators" (
    "id"                TEXT NOT NULL,
    "story_id"          TEXT NOT NULL,
    "collaborator_id"   TEXT NOT NULL,
    "role"              TEXT NOT NULL DEFAULT 'CO-WRITER',
    "revenue_share_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "invited_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story_collaborators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "story_collaborators_story_id_collaborator_id_key"
    ON "story_collaborators"("story_id", "collaborator_id");
CREATE INDEX "story_collaborators_collaborator_id_idx"
    ON "story_collaborators"("collaborator_id");

ALTER TABLE "story_collaborators"
    ADD CONSTRAINT "story_collaborators_story_id_fkey"
    FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "story_collaborators"
    ADD CONSTRAINT "story_collaborators_collaborator_id_fkey"
    FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
