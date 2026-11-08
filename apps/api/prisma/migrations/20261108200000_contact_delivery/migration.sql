-- Delivery tracking for stored contact inquiries: studio alert, visitor confirmation (Resend), HubSpot sync.
-- Each step is PENDING, SENT, FAILED or SKIPPED so failed steps can be retried without resending finished ones.
ALTER TABLE "ContactInquiry"
  ADD COLUMN "ownerEmailStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "visitorEmailStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "hubspotStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "hubspotContactId" VARCHAR(40),
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastError" VARCHAR(1000),
  ADD COLUMN "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Inquiries stored before this migration were never emailed; do not blast them now.
UPDATE "ContactInquiry" SET "ownerEmailStatus"='SKIPPED', "visitorEmailStatus"='SKIPPED', "hubspotStatus"='SKIPPED';

CREATE INDEX "ContactInquiry_pending_idx" ON "ContactInquiry"("updatedAt")
  WHERE "ownerEmailStatus" IN ('PENDING','FAILED') OR "visitorEmailStatus" IN ('PENDING','FAILED') OR "hubspotStatus" IN ('PENDING','FAILED');
