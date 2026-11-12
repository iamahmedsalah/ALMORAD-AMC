import {expect,it} from 'vitest';
import {staffEmailSchema,likelyStaffEmailTypo} from './staff.js';
it('canonicalizes staff email before validation without altering passwords',()=>{
 expect(staffEmailSchema.parse('  PERSON@Example.com  ')).toBe('person@example.com');
 for(const value of ['bad','a@','user name@example.com','x'.repeat(255)+'@example.com'])expect(staffEmailSchema.safeParse(value).success).toBe(false);
});
it('flags likely local-part typos without conflating exact identities or domains',()=>{
 expect(likelyStaffEmailTypo('mo.khaledmord@almorad-amc.com','mo.khaledmorad@almorad-amc.com')).toBe(true);
 expect(likelyStaffEmailTypo('someone@example.com','somoene@example.com')).toBe(true);
 expect(likelyStaffEmailTypo('person@example.com','Person@example.com')).toBe(false);
 expect(likelyStaffEmailTypo('person@example.com','person@other.com')).toBe(false);
 expect(likelyStaffEmailTypo('ab@example.com','ac@example.com')).toBe(false);
 expect(likelyStaffEmailTypo('mohamed@example.com','mahmoud@example.com')).toBe(false);
});
