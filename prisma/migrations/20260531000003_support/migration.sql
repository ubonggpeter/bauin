-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('BOT', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable: support_tickets
CREATE TABLE "support_tickets" (
    "id"             TEXT NOT NULL,
    "user_id"        TEXT,
    "subject"        TEXT,
    "status"         "SupportTicketStatus" NOT NULL DEFAULT 'BOT',
    "ai_replies"     INTEGER NOT NULL DEFAULT 0,
    "assigned_to_id" TEXT,
    "resolved_at"    TIMESTAMP(3),
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: support_messages
CREATE TABLE "support_messages" (
    "id"         TEXT NOT NULL,
    "ticket_id"  TEXT NOT NULL,
    "role"       TEXT NOT NULL,
    "body"       TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_tickets_user_id_idx"       ON "support_tickets"("user_id");
CREATE INDEX "support_tickets_status_idx"         ON "support_tickets"("status");
CREATE INDEX "support_tickets_assigned_to_id_idx" ON "support_tickets"("assigned_to_id");
CREATE INDEX "support_messages_ticket_id_idx"     ON "support_messages"("ticket_id", "created_at" ASC);

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_id_fkey"
    FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
