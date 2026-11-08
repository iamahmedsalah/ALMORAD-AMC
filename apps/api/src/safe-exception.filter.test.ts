import {expect,it,vi} from 'vitest';
import {SafeExceptionFilter} from './safe-exception.filter.js';
import type {ArgumentsHost} from '@nestjs/common';
it('keeps unexpected exception details and client data out of logs and responses',()=>{const log=vi.spyOn(console,'error').mockImplementation(()=>{});const json=vi.fn();const response={getHeader:()=> 'fixture-request',status:vi.fn().mockReturnValue({json})};const host={switchToHttp:()=>({getResponse:()=>response})} as unknown as ArgumentsHost;new SafeExceptionFilter().catch(new Error('private-client-data'),host);expect(log).toHaveBeenCalledWith(JSON.stringify({event:'http_error',requestId:'fixture-request',code:'UNEXPECTED',status:500}));expect(JSON.stringify(json.mock.calls)).not.toContain('private-client-data');log.mockRestore();});
