BEGIN;
-- Preserve existing administrator accounts while removing the obsolete CEO name.
ALTER TYPE "StaffRole" RENAME VALUE 'CEO' TO 'ADMIN';
ALTER TABLE "Booking" ADD COLUMN "assignedToId" UUID;
ALTER TABLE "Booking" ADD COLUMN "deletedAt" TIMESTAMPTZ(3);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Booking_assignedToId_startsAt_idx" ON "Booking"("assignedToId", "startsAt");
CREATE INDEX "Booking_phone_recovery_idx" ON "Booking" (regexp_replace("phone", '[^0-9]', '', 'g'));
UPDATE "BookingSettings" SET "officeAddressEn"='18 Zaki Ragab Street, High Class 1 Tower, Floor 7', "officeAddressAr"='١٨ شارع زكي رجب، برج هاي كلاس ١، الدور السابع', "version"="version"+1 WHERE "id"='agency';

-- Keep the same agency-wide overlap guarantee for all non-deleted bookings.
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_no_overlap";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap" EXCLUDE USING gist ("calendarId" WITH =,tstzrange("blockedStartsAt","blockedEndsAt",'[)') WITH &&) WHERE ("status" <> 'CANCELLED' AND "deletedAt" IS NULL);
COMMIT;
