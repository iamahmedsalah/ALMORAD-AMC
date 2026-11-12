import {expect,it} from 'vitest';
import {officeAddress} from '@amc/shared';
import {renderContactVisitorEmail,renderContactOwnerEmail} from '../contact/contact-emails.js';
import {emailArtwork} from './email-artwork.js';
const input={locale:'en',name:'Client fixture',email:'client@example.invalid',phone:'+20 100 123 4567',message:'Private inquiry that must not be quoted to the visitor.'};
it('acknowledges receipt without copying the inquiry into the visitor email',()=>{
 const result=renderContactVisitorEmail(input);
 expect(result.html).not.toContain(input.message);expect(result.text).not.toContain(input.message);
 expect(result.text).toContain('reply soon');expect(result.html).toContain(officeAddress.en);
 expect(result.html).toContain('text-align:center');expect(result.html).toContain('cid:almorad-logo');
});
it('keeps studio inquiry details and actionable phone/email while escaping message HTML',()=>{
 const result=renderContactOwnerEmail({...input,id:'fixture',message:'<script>private</script>'});
 expect(result.html).toContain('tel:+201001234567');expect(result.html).toContain('mailto:client@example.invalid');
 expect(result.html).toContain('&lt;script&gt;private&lt;/script&gt;');expect(result.html).not.toContain('<script>private');
});
it('embeds original PNG artwork with the Content-ID used in every email shell',()=>{
 const artwork=emailArtwork()[0]!;
 expect(artwork.contentId).toBe('almorad-logo');expect(artwork.content.subarray(1,4).toString()).toBe('PNG');
 expect(renderContactVisitorEmail({...input,locale:'ar'}).html).toContain(officeAddress.ar);
});
