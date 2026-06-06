-- CreateEnum
CREATE TYPE "ChangelogCategory" AS ENUM ('FEATURE', 'IMPROVEMENT', 'BUGFIX', 'SECURITY', 'BREAKING');

-- CreateTable
CREATE TABLE "changelog_entries" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" "ChangelogCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "changelog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "changelog_entries_date_idx" ON "changelog_entries"("date" DESC);
