CREATE TABLE "email_subscribers" (
    "id"               TEXT        NOT NULL,
    "email"            TEXT        NOT NULL,
    "name"             TEXT,
    "source"           TEXT        NOT NULL DEFAULT 'LANDING',
    "welcome_step"     INTEGER     NOT NULL DEFAULT 0,
    "next_welcome_at"  TIMESTAMP(3),
    "unsub_token"      TEXT        NOT NULL,
    "subscribed_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed_at"  TIMESTAMP(3),
    CONSTRAINT "email_subscribers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_subscribers_email_key"       ON "email_subscribers"("email");
CREATE UNIQUE INDEX "email_subscribers_unsub_token_key" ON "email_subscribers"("unsub_token");
CREATE INDEX        "email_subscribers_next_welcome_at_idx" ON "email_subscribers"("next_welcome_at");
CREATE INDEX        "email_subscribers_welcome_step_idx"    ON "email_subscribers"("welcome_step");

CREATE TABLE "email_campaigns" (
    "id"               TEXT        NOT NULL,
    "subject"          TEXT        NOT NULL,
    "preview_text"     TEXT,
    "body_text"        TEXT        NOT NULL,
    "created_by"       TEXT        NOT NULL,
    "sent_at"          TIMESTAMP(3),
    "recipient_count"  INTEGER     NOT NULL DEFAULT 0,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_campaigns_created_at_idx" ON "email_campaigns"("created_at" DESC);
