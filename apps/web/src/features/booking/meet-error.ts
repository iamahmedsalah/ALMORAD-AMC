import type {Locale} from '@amc/shared';
import {BookingError} from './helpers';

export function meetErrorMessage(error:unknown,locale:Locale,fallback:string){
 if(!(error instanceof BookingError))return fallback;
 const ar=locale==='ar';
 switch(error.code){
  case 'GOOGLE_MEET_PENDING':return ar?'لا يزال Google يُنشئ رابط الاجتماع. انتظر قليلًا ثم أعد المحاولة.':'Google is still creating the meeting link. Wait a moment, then try again.';
  case 'GOOGLE_MEET_NOT_CONFIGURED':return ar?'خدمة Google Meet غير مُعدّة. تواصل مع مسؤول النظام أو أضف رابط الاجتماع يدويًا.':'Google Meet is not configured. Contact your administrator or add a meeting link manually.';
  case 'GOOGLE_MEET_AUTH_FAILED':
  case 'GOOGLE_MEET_ACCESS_DENIED':return ar?'تعذّر الوصول إلى تقويم Google. اطلب من مسؤول النظام مراجعة صلاحيات التكامل، أو أضف رابط الاجتماع يدويًا.':'Google Calendar access failed. Ask your administrator to check the integration permissions, or add a meeting link manually.';
  case 'GOOGLE_MEET_CALENDAR_NOT_FOUND':return ar?'تعذّر العثور على تقويم Google المُعدّ. تواصل مع مسؤول النظام أو أضف رابط الاجتماع يدويًا.':'The configured Google Calendar could not be found. Contact your administrator or add a meeting link manually.';
  case 'GOOGLE_MEET_CREATION_FAILED':
  case 'GOOGLE_MEET_REJECTED':return ar?'تعذّر إنشاء Google Meet لهذا التقويم. اطلب من مسؤول النظام مراجعة إعدادات التقويم وMeet، أو أضف رابطًا يدويًا.':'Google Meet could not be created for this calendar. Ask your administrator to check Calendar and Meet settings, or add a link manually.';
  case 'GOOGLE_MEET_UNAVAILABLE':
  case 'GOOGLE_MEET_INVALID_RESPONSE':return ar?'خدمة Google Meet غير متاحة الآن. أعد المحاولة لاحقًا أو أضف رابط الاجتماع يدويًا.':'Google Meet is unavailable right now. Try again later or add a meeting link manually.';
  default:return fallback;
 }
}
