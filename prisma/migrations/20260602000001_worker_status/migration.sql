-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('AVAILABLE', 'BUSY', 'ON_LEAVE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "worker_status" "WorkerStatus" NOT NULL DEFAULT 'AVAILABLE';
