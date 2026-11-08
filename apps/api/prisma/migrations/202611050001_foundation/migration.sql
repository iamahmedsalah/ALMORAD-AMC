-- Additive foundation; no bookings or production data changes.
CREATE TYPE "StaffRole" AS ENUM ('RECEPTIONIST', 'MANAGER', 'CEO');
CREATE TABLE "StaffUser" (
  "id" UUID NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "role" "StaffRole" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");
CREATE TABLE "StaffSession" (
  "id" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StaffSession_tokenHash_key" ON "StaffSession"("tokenHash");
CREATE INDEX "StaffSession_userId_idx" ON "StaffSession"("userId");
CREATE INDEX "StaffSession_expiresAt_idx" ON "StaffSession"("expiresAt");
