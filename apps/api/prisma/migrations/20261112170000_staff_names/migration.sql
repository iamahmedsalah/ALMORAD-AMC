ALTER TABLE "StaffUser" ADD COLUMN "firstName" VARCHAR(80) NOT NULL DEFAULT '', ADD COLUMN "lastName" VARCHAR(80) NOT NULL DEFAULT '';
-- The owner explicitly identified this default manager; never infer names for other accounts.
UPDATE "StaffUser" SET "firstName"='Mohamed', "lastName"='Khaled Morad'
WHERE "email"='mo.khaledmorad@almorad-amc.com' AND "firstName"='' AND "lastName"='';
