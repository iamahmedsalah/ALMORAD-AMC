ALTER TABLE "StaffUser" ADD COLUMN "googleId" VARCHAR(255), ADD COLUMN "googleEmail" VARCHAR(254), ADD COLUMN "googleLinkedAt" TIMESTAMPTZ(3);
CREATE UNIQUE INDEX "StaffUser_googleId_key" ON "StaffUser"("googleId");
ALTER TABLE "Booking" ADD COLUMN "googleEventId" VARCHAR(128);
CREATE TABLE "StaffPasswordResetToken" (
 "id" UUID PRIMARY KEY, "userId" UUID NOT NULL REFERENCES "StaffUser"("id") ON DELETE CASCADE,
 "codeHash" CHAR(64) NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" BETWEEN 0 AND 5),
 "expiresAt" TIMESTAMPTZ(3) NOT NULL, "consumedAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "StaffPasswordResetToken_userId_expiresAt_idx" ON "StaffPasswordResetToken"("userId","expiresAt");
CREATE INDEX "StaffPasswordResetToken_expiresAt_idx" ON "StaffPasswordResetToken"("expiresAt");
CREATE TABLE "BookingAssignee" (
 "bookingId" UUID NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
 "staffId" UUID NOT NULL REFERENCES "StaffUser"("id") ON DELETE CASCADE,
 "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("bookingId","staffId")
);
CREATE INDEX "BookingAssignee_staffId_idx" ON "BookingAssignee"("staffId");
INSERT INTO "BookingAssignee" ("bookingId","staffId") SELECT "id","assignedToId" FROM "Booking" WHERE "assignedToId" IS NOT NULL ON CONFLICT DO NOTHING;
