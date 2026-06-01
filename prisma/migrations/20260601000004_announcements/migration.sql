-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('INFO', 'WARNING', 'PROMOTION');

-- CreateEnum
CREATE TYPE "AnnouncementTarget" AS ENUM ('ALL', 'WORKERS', 'SELLERS', 'DISTRIBUTORS', 'VIEWERS');

-- CreateTable
CREATE TABLE "announcements" (
    "id"           TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "body"         TEXT NOT NULL,
    "type"         "AnnouncementType" NOT NULL,
    "target"       "AnnouncementTarget" NOT NULL DEFAULT 'ALL',
    "expires_at"   TIMESTAMP(3),
    "sent_at"      TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "announcements_type_idx"       ON "announcements"("type");
CREATE INDEX "announcements_expires_at_idx" ON "announcements"("expires_at");
