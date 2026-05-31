-- Add is_auto_purchase flag to story_purchases
ALTER TABLE "story_purchases" ADD COLUMN "is_auto_purchase" BOOLEAN NOT NULL DEFAULT false;

-- Create seller_subscriptions table
CREATE TABLE "seller_subscriptions" (
  "id"            TEXT          NOT NULL,
  "subscriber_id" TEXT          NOT NULL,
  "seller_id"     TEXT          NOT NULL,
  "auto_purchase" BOOLEAN       NOT NULL DEFAULT false,
  "created_at"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seller_subscriptions_subscriber_id_seller_id_key"
  ON "seller_subscriptions"("subscriber_id", "seller_id");

CREATE INDEX "seller_subscriptions_seller_id_idx"
  ON "seller_subscriptions"("seller_id");

ALTER TABLE "seller_subscriptions"
  ADD CONSTRAINT "seller_subscriptions_subscriber_id_fkey"
  FOREIGN KEY ("subscriber_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seller_subscriptions"
  ADD CONSTRAINT "seller_subscriptions_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
