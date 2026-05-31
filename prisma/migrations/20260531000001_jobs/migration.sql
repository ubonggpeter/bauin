-- AlterEnum: TransactionType
ALTER TYPE "TransactionType" ADD VALUE 'JOB_ESCROW';
ALTER TYPE "TransactionType" ADD VALUE 'JOB_PAYMENT';

-- AlterEnum: NotificationType
ALTER TYPE "NotificationType" ADD VALUE 'JOB_NEW_APPLICATION';
ALTER TYPE "NotificationType" ADD VALUE 'JOB_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'JOB_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'JOB_APPROVED';

-- CreateEnum: JobStatus
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'ASSIGNED', 'SUBMITTED', 'APPROVED', 'CANCELLED', 'DISPUTED');

-- CreateTable: jobs
CREATE TABLE "jobs" (
    "id"                 TEXT NOT NULL,
    "poster_id"          TEXT NOT NULL,
    "category_id"        TEXT NOT NULL,
    "title"              TEXT NOT NULL,
    "description"        TEXT NOT NULL,
    "budget"             DECIMAL(18,2) NOT NULL,
    "deadline"           TIMESTAMP(3) NOT NULL,
    "status"             "JobStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_worker_id" TEXT,
    "escrow_ref"         TEXT,
    "submission_note"    TEXT,
    "submitted_at"       TIMESTAMP(3),
    "approved_at"        TIMESTAMP(3),
    "cancelled_at"       TIMESTAMP(3),
    "cancel_reason"      TEXT,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "jobs_escrow_ref_key"         ON "jobs"("escrow_ref");
CREATE INDEX        "jobs_poster_id_idx"           ON "jobs"("poster_id");
CREATE INDEX        "jobs_assigned_worker_id_idx"  ON "jobs"("assigned_worker_id");
CREATE INDEX        "jobs_category_id_status_idx"  ON "jobs"("category_id", "status");
CREATE INDEX        "jobs_status_idx"              ON "jobs"("status");

ALTER TABLE "jobs"
    ADD CONSTRAINT "jobs_poster_id_fkey"
    FOREIGN KEY ("poster_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "jobs"
    ADD CONSTRAINT "jobs_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "jobs"
    ADD CONSTRAINT "jobs_assigned_worker_id_fkey"
    FOREIGN KEY ("assigned_worker_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: job_applications
CREATE TABLE "job_applications" (
    "id"         TEXT NOT NULL,
    "job_id"     TEXT NOT NULL,
    "worker_id"  TEXT NOT NULL,
    "cover_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_applications_job_id_worker_id_key" ON "job_applications"("job_id", "worker_id");
CREATE INDEX        "job_applications_job_id_idx"           ON "job_applications"("job_id");
CREATE INDEX        "job_applications_worker_id_idx"        ON "job_applications"("worker_id");

ALTER TABLE "job_applications"
    ADD CONSTRAINT "job_applications_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_applications"
    ADD CONSTRAINT "job_applications_worker_id_fkey"
    FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
