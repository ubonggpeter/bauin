-- ── Step 1: Create the new UserRole enum type ─────────────────────────────────
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'WORKER', 'DISTRIBUTOR', 'SELLER', 'VIEWER');

-- ── Step 2: Migrate the column, mapping old values to new ─────────────────────
ALTER TABLE "users"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "UserRole_new"
    USING (
      CASE "role"::text
        WHEN 'SUPER_ADMIN'  THEN 'SUPER_ADMIN'::"UserRole_new"
        WHEN 'ADMIN'        THEN 'ADMIN'::"UserRole_new"
        WHEN 'MODERATOR'    THEN 'ADMIN'::"UserRole_new"
        WHEN 'DISTRIBUTOR'  THEN 'DISTRIBUTOR'::"UserRole_new"
        WHEN 'SELLER'       THEN 'SELLER'::"UserRole_new"
        WHEN 'WORKER'       THEN 'WORKER'::"UserRole_new"
        WHEN 'MEMBER'       THEN 'VIEWER'::"UserRole_new"
        ELSE 'VIEWER'::"UserRole_new"
      END
    );

-- ── Step 3: Swap types ────────────────────────────────────────────────────────
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- ── Step 4: Restore default ───────────────────────────────────────────────────
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIEWER'::"UserRole";

-- ── Step 5: 2FA fields on users ───────────────────────────────────────────────
ALTER TABLE "users"
  ADD COLUMN "two_factor_secret"  TEXT,
  ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;

-- ── Step 6: AuditLog table ────────────────────────────────────────────────────
CREATE TABLE "audit_logs" (
  "id"          TEXT NOT NULL,
  "admin_id"    TEXT NOT NULL,
  "action"      TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id"   TEXT NOT NULL,
  "old_value"   JSONB,
  "new_value"   JSONB,
  "ip"          TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "audit_logs_admin_id_idx"    ON "audit_logs"("admin_id");
CREATE INDEX "audit_logs_target_idx"      ON "audit_logs"("target_type", "target_id");
CREATE INDEX "audit_logs_created_at_idx"  ON "audit_logs"("created_at" DESC);
