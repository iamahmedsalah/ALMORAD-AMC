/** Explicit delivery check: sends one email, without database/application writes. */
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {fileURLToPath} from 'node:url';

const file=fileURLToPath(new URL('../.env',import.meta.url));
if(existsSync(file))loadEnvFile(file);
const index=process.argv.indexOf('--to');
const to=index>=0?process.argv[index+1]:process.env.EMAIL_TEST_TO;
if(!to||!/^\S+@[^\s@]+\.[^\s@]+$/.test(to)){
  console.error('Provide a controlled recipient: pnpm email:test --to you@example.com (or set EMAIL_TEST_TO).');
  process.exitCode=1;
}else if(!process.env.RESEND_API_KEY||process.env.RESEND_API_KEY==='mock'||!process.env.RESEND_FROM_EMAIL){
  console.error('Set real RESEND_API_KEY and RESEND_FROM_EMAIL in .env. No email was sent.');
  process.exitCode=1;
}else{
  try{
    const require=createRequire(new URL('../apps/api/package.json',import.meta.url));
    const {Resend}=require('resend');
    const resend=new Resend(process.env.RESEND_API_KEY);
    const result=await resend.emails.send({from:process.env.RESEND_FROM_EMAIL,to,subject:'ALMORAD AMC — local email delivery check',text:'This email was explicitly requested from the local ALMORAD AMC workspace using its real provider configuration. No booking or contact inquiry was created.',...(process.env.REPLY_TO_EMAIL?{replyTo:process.env.REPLY_TO_EMAIL}:{})},{headers:{'Idempotency-Key':`local-email-check-${randomUUID()}`}});
    if(result.error){
      const detail=result.error.message||'';
      const category=/api.?key|unauthori[sz]ed|authentication/i.test(detail)?'authentication':/verify|verified|domain/i.test(detail)?'sender_verification':/rate|limit/i.test(detail)?'provider_limit':/recipient|testing.*email|own.*email/i.test(detail)?'recipient_restriction':'provider_rejected';
      console.error(JSON.stringify({event:'email_test_rejected',category,status:typeof result.error.statusCode==='number'?result.error.statusCode:null}));
      process.exitCode=1;
    }else{
      if(!result.data?.id)throw new Error('Provider returned no message identifier.');
      console.log(JSON.stringify({event:'email_test_accepted',messageId:result.data.id,inboxReceiptVerified:false}));
    }
  }catch{
    console.error('Email delivery check failed. Inspect sender verification, provider permissions and network access. Credentials and recipient were not logged.');
    process.exitCode=1;
  }
}
