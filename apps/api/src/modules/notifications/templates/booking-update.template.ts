import {escapeHtml,renderEmailLayout} from './email-layout.js';
import type {BookingConfirmationTemplateInput,EmailContent} from './booking-confirmation.template.js';

const updates:Record<string,[string,string,string,string]>={
 CHANGE_REQUESTED:['Change request received','Your request is awaiting staff approval. Your current appointment stays unchanged.','تم استلام طلب التغيير','طلبك بانتظار موافقة الفريق. موعدك الحالي لم يتغير.'],
 CHANGE_UNDER_REVIEW:['Your request is under review','Our team is reviewing your request. Your current appointment stays unchanged.','طلبك قيد المراجعة','يراجع الفريق طلبك. موعدك الحالي لم يتغير.'],
 CHANGE_DECLINED:['Change request declined','Your requested change was declined. Your current appointment stays unchanged.','لم تتم الموافقة على طلب التغيير','لم تتم الموافقة على التغيير المطلوب. موعدك الحالي لم يتغير.'],
 CHANGE_WITHDRAWN:['Change request withdrawn','Your change request was withdrawn. Your current appointment stays unchanged.','تم سحب طلب التغيير','تم سحب طلب التغيير. موعدك الحالي لم يتغير.'],
 CHANGE_ALTERNATIVE_PROPOSED:['An alternative time is available','Review and accept the proposed time using your private management link. It is not reserved until accepted.','تم اقتراح موعد بديل','راجع الموعد المقترح ووافق عليه عبر رابط الإدارة الخاص. لا يُحجز حتى تتم الموافقة.'],
 BOOKING_EDIT:['Appointment details updated','Your appointment details were updated. Review the current meeting information below.','تم تحديث تفاصيل الموعد','تم تحديث بيانات موعدك. راجع تفاصيل الاجتماع الحالية أدناه.'],
 BOOKING_CONFIRM:['Appointment confirmed','Your appointment has been confirmed by our team.','تم تأكيد الموعد','أكد الفريق موعدك.'],
 BOOKING_COMPLETE:['Appointment completed','Your appointment has been marked as completed.','تم إكمال الموعد','تم تسجيل موعدك كمكتمل.'],
 BOOKING_NO_SHOW:['Appointment attendance updated','Your appointment was marked as not attended. Contact our team if this needs correcting.','تم تحديث حضور الموعد','تم تسجيل عدم الحضور. تواصل مع الفريق إذا كانت هناك حاجة لتصحيح ذلك.']
};
export function renderBookingUpdateEmail(input:BookingConfirmationTemplateInput&{kind:string;proposedStartAt?:string|null}):EmailContent {
 const ar=input.locale==='ar',copy=updates[input.kind]||['Appointment update','Review your current appointment using the private link.','تحديث الموعد','راجع موعدك الحالي عبر الرابط الخاص.'];
 const heading=copy[ar?2:0],intro=copy[ar?3:1];
 const format=(value:Date)=>new Intl.DateTimeFormat(ar?'ar-EG':'en-US',{dateStyle:'full',timeStyle:'short',timeZone:input.timezone}).format(value);
 const location=input.meetingType==='IN_PERSON'?input.officeAddress:input.meetingUrl;
 const proposed=input.proposedStartAt?`${ar?'الموعد المقترح':'Proposed time'}: ${format(new Date(input.proposedStartAt))}`:'';
 const fallback=input.meetingType==='ONLINE'?(ar?'سيضيف الفريق رابط الاجتماع بعد تجهيزه.':'Our team will add the meeting link when ready.'):(ar?'في المكتب':'In person');
 const details=[input.managerName?(ar?'\u0645\u0639: ':'Meeting with: ')+input.managerName:null,input.reference,input.serviceTitle,`${format(input.startsAt)} – ${format(input.endsAt)} (${input.timezone})`,location||fallback,proposed].filter(Boolean);
 const text=`${heading}\n\n${intro}\n\n${details.join('\n')}\n\n${input.managementUrl}`;
 const html=renderEmailLayout({locale:input.locale,heading,preheader:intro,bodyHtml:`<p>${escapeHtml(intro)}</p>${details.map(value=>`<p>${escapeHtml(value!)}</p>`).join('')}`,cta:{label:ar?'إدارة الموعد':'Manage appointment',url:input.managementUrl}});
 return {subject:`${heading} | ${input.reference}`,text,html};
}
