-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('ONLINE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "ChangeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'ALTERNATIVE_PROPOSED', 'APPROVED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ChangeKind" AS ENUM ('RESCHEDULE', 'CANCEL');

-- CreateTable
CREATE TABLE "BookingSettings" (
    "id" VARCHAR(40) NOT NULL DEFAULT 'agency',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "timezone" VARCHAR(80) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "stepMinutes" INTEGER NOT NULL,
    "bufferBeforeMinutes" INTEGER NOT NULL,
    "bufferAfterMinutes" INTEGER NOT NULL,
    "leadMinutes" INTEGER NOT NULL,
    "lookaheadDays" INTEGER NOT NULL,
    "changeCutoffMinutes" INTEGER NOT NULL,
    "onlineEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inPersonEnabled" BOOLEAN NOT NULL DEFAULT false,
    "officeAddressEn" VARCHAR(500),
    "officeAddressAr" VARCHAR(500),
    "directionsUrl" VARCHAR(1000),
    "weeklyHours" JSONB NOT NULL,
    "blackoutDates" JSONB NOT NULL,
    "serviceSlugs" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BookingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingService" (
    "slug" VARCHAR(80) NOT NULL,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(24) NOT NULL,
    "calendarId" VARCHAR(40) NOT NULL DEFAULT 'agency',
    "serviceSlug" VARCHAR(80) NOT NULL,
    "meetingType" "MeetingType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "clientName" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(40),
    "company" VARCHAR(120),
    "notes" VARCHAR(1500),
    "locale" VARCHAR(2) NOT NULL,
    "timezone" VARCHAR(80) NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "blockedStartsAt" TIMESTAMPTZ(3) NOT NULL,
    "blockedEndsAt" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tokenNonce" CHAR(64) NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "tokenHash" CHAR(64) NOT NULL,
    "tokenExpiresAt" TIMESTAMPTZ(3) NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingChangeRequest" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "kind" "ChangeKind" NOT NULL,
    "status" "ChangeStatus" NOT NULL DEFAULT 'OPEN',
    "requestedStartAt" TIMESTAMPTZ(3),
    "proposedStartAt" TIMESTAMPTZ(3),
    "reason" VARCHAR(1000) NOT NULL,
    "staffResponse" VARCHAR(1000),
    "respondedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "resolvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "BookingChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "actorId" UUID,
    "kind" VARCHAR(64) NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingCommand" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "actorKey" VARCHAR(70) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "resultVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingOutbox" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "kind" VARCHAR(64) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'UNCONFIGURED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Booking_startsAt_status_idx" ON "Booking"("startsAt", "status");

-- CreateIndex
CREATE INDEX "Booking_createdAt_serviceSlug_idx" ON "Booking"("createdAt", "serviceSlug");

-- CreateIndex
CREATE INDEX "Booking_email_idx" ON "Booking"("email");

-- CreateIndex
CREATE INDEX "BookingChangeRequest_status_createdAt_idx" ON "BookingChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingChangeRequest_bookingId_createdAt_idx" ON "BookingChangeRequest"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingOutbox_eventId_key" ON "BookingOutbox"("eventId");

-- CreateIndex
CREATE INDEX "BookingOutbox_status_createdAt_idx" ON "BookingOutbox"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "BookingSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceSlug_fkey" FOREIGN KEY ("serviceSlug") REFERENCES "BookingService"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingCommand" ADD CONSTRAINT "BookingCommand_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingOutbox" ADD CONSTRAINT "BookingOutbox_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Single agency calendar, no automatic employee allocation. All non-cancelled
-- appointments consume the buffered interval. Adjacent [start,end) intervals fit.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_valid_interval" CHECK ("endsAt">"startsAt" AND "blockedStartsAt"<="startsAt" AND "blockedEndsAt">="endsAt");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap" EXCLUDE USING gist ("calendarId" WITH =,tstzrange("blockedStartsAt","blockedEndsAt",'[)') WITH &&) WHERE ("status" <> 'CANCELLED');
CREATE UNIQUE INDEX "BookingChangeRequest_one_open" ON "BookingChangeRequest"("bookingId") WHERE "status" IN ('OPEN','UNDER_REVIEW','ALTERNATIVE_PROPOSED');
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_requested_time" CHECK ("kind" <> 'RESCHEDULE' OR "requestedStartAt" IS NOT NULL);
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_alternative" CHECK ("status" <> 'ALTERNATIVE_PROPOSED' OR ("kind"='RESCHEDULE' AND "proposedStartAt" IS NOT NULL));
ALTER TABLE "BookingSettings" ADD CONSTRAINT "BookingSettings_limits" CHECK ("durationMinutes" BETWEEN 5 AND 240 AND "stepMinutes" BETWEEN 5 AND 120 AND "bufferBeforeMinutes" BETWEEN 0 AND 240 AND "bufferAfterMinutes" BETWEEN 0 AND 240 AND "leadMinutes" BETWEEN 0 AND 10080 AND "lookaheadDays" BETWEEN 1 AND 90 AND "changeCutoffMinutes" BETWEEN 0 AND 10080);
INSERT INTO "BookingService" ("slug") VALUES ('social-media-management'),('personal-branding'),('market-research-analysis'),('branding'),('media-buying'),('outdoor-advertising'),('corporate-events'),('ecommerce-consulting'),('management-consulting'),('ecommerce-website-development'),('company-websites-landing-pages');
