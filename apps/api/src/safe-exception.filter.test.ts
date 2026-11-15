import {expect,it,vi} from 'vitest';
import {SafeExceptionFilter} from './safe-exception.filter.js';
import type {ArgumentsHost} from '@nestjs/common';
import {GoogleMeetError} from './modules/notifications/google-calendar.error.js';
it('logs bounded Google diagnostics with request ID and returns a recoverable code',()=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>{});const json=vi.fn();const response={getHeader:()=> 'fixture-request',status:vi.fn().mockReturnValue({json})};const host={switchToHttp:()=>({getResponse:()=>response})} as unknown as ArgumentsHost;
 new SafeExceptionFilter().catch(new GoogleMeetError('GOOGLE_MEET_AUTH_FAILED','authorization',undefined,'unauthorized_client'),host);
 expect(log).toHaveBeenCalledWith(JSON.stringify({event:'google_meet_error',requestId:'fixture-request',code:'GOOGLE_MEET_AUTH_FAILED',stage:'authorization',reason:'unauthorized_client',status:503}));
 expect(response.status).toHaveBeenCalledWith(503);expect(json).toHaveBeenCalledWith(expect.objectContaining({code:'GOOGLE_MEET_AUTH_FAILED'}));log.mockRestore();
});
it('keeps unexpected exception details and client data out of logs and responses',()=>{const log=vi.spyOn(console,'error').mockImplementation(()=>{});const json=vi.fn();const response={getHeader:()=> 'fixture-request',status:vi.fn().mockReturnValue({json})};const host={switchToHttp:()=>({getResponse:()=>response})} as unknown as ArgumentsHost;new SafeExceptionFilter().catch(new Error('private-client-data'),host);expect(log).toHaveBeenCalledWith(JSON.stringify({event:'http_error',requestId:'fixture-request',code:'UNEXPECTED',status:500}));expect(JSON.stringify(json.mock.calls)).not.toContain('private-client-data');log.mockRestore();});
