-- Fail safely if legacy accounts collide after canonicalization; do not merge identities.
CREATE UNIQUE INDEX "StaffUser_email_canonical_key"
ON "StaffUser" (lower(btrim("email")));
