-- AlterTable: Add delivery tracking, retry timestamp, and update audit columns
ALTER TABLE "BookingOutbox" ADD COLUMN IF NOT EXISTS "lastError" VARCHAR(1000);
ALTER TABLE "BookingOutbox" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMPTZ(3);
ALTER TABLE "BookingOutbox" ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMPTZ(3);
ALTER TABLE "BookingOutbox" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingOutbox_status_nextRetryAt_idx" ON "BookingOutbox"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingOutbox_bookingId_idx" ON "BookingOutbox"("bookingId");
