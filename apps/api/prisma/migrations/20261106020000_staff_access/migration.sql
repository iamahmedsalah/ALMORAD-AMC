-- Additive staff access only. Existing accounts require explicit credential provisioning.
ALTER TABLE "StaffUser" ADD COLUMN "passwordHash" VARCHAR(200);
CREATE TABLE "StaffAuditEvent" (
  "id" UUID NOT NULL,
  "actorId" UUID,
  "subjectId" UUID,
  "action" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "StaffAuditEvent_createdAt_id_idx" ON "StaffAuditEvent"("createdAt", "id");
CREATE INDEX "StaffAuditEvent_actorId_createdAt_idx" ON "StaffAuditEvent"("actorId", "createdAt");
