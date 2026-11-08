CREATE TABLE "ContactInquiry" (
  "id" UUID NOT NULL,
  "idempotencyKey" UUID NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "message" VARCHAR(2000) NOT NULL,
  "locale" VARCHAR(2) NOT NULL,
  "consentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContactInquiry_locale_check" CHECK ("locale" IN ('en', 'ar'))
);
CREATE UNIQUE INDEX "ContactInquiry_idempotencyKey_key" ON "ContactInquiry"("idempotencyKey");
CREATE INDEX "ContactInquiry_createdAt_id_idx" ON "ContactInquiry"("createdAt", "id");
