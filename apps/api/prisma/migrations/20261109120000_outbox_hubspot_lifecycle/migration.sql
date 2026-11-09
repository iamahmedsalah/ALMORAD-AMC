-- AlterTable: Add HubSpot tracking columns to Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "hubspotContactId" VARCHAR(64);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "hubspotMeetingId" VARCHAR(64);

-- AlterTable: Add explicit nextRetryAt column to ContactInquiry
ALTER TABLE "ContactInquiry" ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMPTZ(3);

-- AlterIndex: Drop single-column unique constraint on BookingOutbox.eventId and create composite unique constraint
DROP INDEX IF EXISTS "BookingOutbox_eventId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "BookingOutbox_eventId_kind_key" ON "BookingOutbox"("eventId", "kind");
