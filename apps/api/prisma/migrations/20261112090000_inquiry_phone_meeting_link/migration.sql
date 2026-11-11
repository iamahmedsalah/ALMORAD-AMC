-- Additive only. Existing inquiries and bookings retain null values.
ALTER TABLE "ContactInquiry" ADD COLUMN "phone" VARCHAR(40);
ALTER TABLE "Booking" ADD COLUMN "meetingUrl" VARCHAR(1000);
