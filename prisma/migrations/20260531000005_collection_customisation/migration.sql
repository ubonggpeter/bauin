-- AlterTable: Add customisation fields to distributor_collections
ALTER TABLE "distributor_collections"
  ADD COLUMN "custom_alias"      TEXT,
  ADD COLUMN "cta_text"          TEXT,
  ADD COLUMN "accent_color"      TEXT,
  ADD COLUMN "logo_url"          TEXT,
  ADD COLUMN "welcome_message"   TEXT;

-- CreateUniqueIndex on custom_alias
CREATE UNIQUE INDEX "distributor_collections_custom_alias_key"
  ON "distributor_collections"("custom_alias");

CREATE INDEX "distributor_collections_custom_alias_idx"
  ON "distributor_collections"("custom_alias");
