import type {Locale} from '@amc/shared';
export function publicContact(locale:Locale) {
 const email=process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();const phone=process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim();const address=(locale==='ar'?process.env.NEXT_PUBLIC_OFFICE_ADDRESS_AR:process.env.NEXT_PUBLIC_OFFICE_ADDRESS_EN)?.trim();const value=process.env.NEXT_PUBLIC_MAPS_URL?.trim();let maps:string|undefined;
 if(value){const url=new URL(value);if(url.protocol!=='https:'||!['www.google.com','maps.google.com','maps.app.goo.gl','goo.gl'].includes(url.hostname)||url.username||url.password)throw new Error('Maps URL must be an approved HTTPS Google Maps link');maps=url.href;}
 if(email&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))throw new Error('Invalid public contact email');if(phone&&!/^\+?[\d ()-]{6,30}$/.test(phone))throw new Error('Invalid public contact phone');
 return {email,phone,address,maps:address?maps:undefined};
}
