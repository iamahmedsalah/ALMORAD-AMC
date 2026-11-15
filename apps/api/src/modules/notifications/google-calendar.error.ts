import {ServiceUnavailableException} from '@nestjs/common';

export type GoogleMeetErrorCode = 'GOOGLE_MEET_NOT_CONFIGURED' | 'GOOGLE_MEET_AUTH_FAILED' | 'GOOGLE_MEET_ACCESS_DENIED' | 'GOOGLE_MEET_CALENDAR_NOT_FOUND' | 'GOOGLE_MEET_REJECTED' | 'GOOGLE_MEET_UNAVAILABLE' | 'GOOGLE_MEET_PENDING' | 'GOOGLE_MEET_CREATION_FAILED' | 'GOOGLE_MEET_INVALID_RESPONSE';

// Only these bounded fields may be logged. Never retain the original provider error.
export class GoogleMeetError extends ServiceUnavailableException {
 constructor(readonly code:GoogleMeetErrorCode,readonly stage:'configuration'|'authorization'|'calendar'|'conference',readonly providerStatus?:number,readonly reason?:'invalid_grant'|'unauthorized_client'|'invalid_client'|'access_denied'){
  super({statusCode:503,code,message:'Google Meet is temporarily unavailable'});
 }
}
