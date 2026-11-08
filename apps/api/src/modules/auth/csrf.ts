import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import {type CanActivate,type ExecutionContext,ForbiddenException,Inject,Injectable} from '@nestjs/common';
import {sameOrigin} from './security.js';
import type {StaffRequest} from './session.guard.js';
@Injectable()
export class CsrfService {
  private readonly secret=process.env.STAFF_CSRF_SECRET||randomBytes(32).toString('hex');
  constructor(){if(process.env.NODE_ENV==='production'&&(!process.env.STAFF_CSRF_SECRET||process.env.STAFF_CSRF_SECRET.length<64))throw new Error('STAFF_CSRF_SECRET must contain at least 64 characters in production');}
  token(sessionToken:string) {return createHmac('sha256',this.secret).update(sessionToken).digest('hex');}
  valid(sessionToken:string,value:string|undefined) {return Boolean(value?.match(/^[a-f0-9]{64}$/))&&timingSafeEqual(Buffer.from(this.token(sessionToken),'hex'),Buffer.from(value!,'hex'));}
}
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(CsrfService) private readonly csrf:CsrfService){}
  canActivate(context:ExecutionContext) {const request=context.switchToHttp().getRequest<StaffRequest>();if(['GET','HEAD'].includes(request.method))return true;if(!sameOrigin(request.headers.origin)||!request.sessionToken||!this.csrf.valid(request.sessionToken,request.get('X-CSRF-Token')))throw new ForbiddenException();return true;}
}
