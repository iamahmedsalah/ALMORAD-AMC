-- Shared, atomic serverless rate-limit state. Keys are opaque hashes, never raw IPs.
CREATE TABLE "RequestThrottle" (
 "key" CHAR(64) NOT NULL,
 "totalHits" INTEGER NOT NULL,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 "blockedUntil" TIMESTAMPTZ(3),
 CONSTRAINT "RequestThrottle_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RequestThrottle_expiresAt_idx" ON "RequestThrottle"("expiresAt");
