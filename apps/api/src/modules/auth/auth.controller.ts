import {Body,Controller,ForbiddenException,Get,Header,HttpCode,Inject,Post,Query,Req,Res,UseGuards} from '@nestjs/common';
import {Throttle} from '@nestjs/throttler';
import {ApiTags, ApiOperation, ApiResponse, ApiQuery} from '@nestjs/swagger';
import type {Response} from 'express';
import {AuthService} from './auth.service.js';
import {SessionGuard,type StaffRequest} from './session.guard.js';
import {CsrfGuard} from './csrf.js';
import {PermissionGuard,RequirePermission} from './permission.guard.js';
import {cookieToken,sameOrigin,sessionCookieName} from './security.js';

const cookieOptions=()=>({httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/'});

@ApiTags('Staff Authentication')
@Controller('staff/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth:AuthService){}

  @ApiOperation({ summary: 'Staff login', description: 'Authenticates staff member and issues HttpOnly session cookie.' })
  @ApiResponse({ status: 200, description: 'Staff member authenticated successfully' })
  @ApiResponse({ status: 403, description: 'Untrusted origin or invalid credentials' })
  @Post('login') @HttpCode(200) @Header('Cache-Control','no-store') @Throttle({default:{limit:5,ttl:60000}})
  async login(@Req() req:StaffRequest,@Body() input:unknown,@Res({passthrough:true}) res:Response) {
    if(!sameOrigin(req.headers.origin))throw new ForbiddenException();
    const result=await this.auth.login(input,cookieToken(req.headers.cookie));res.cookie(sessionCookieName(),result.token,{...cookieOptions(),expires:result.expiresAt});return {staff:result.staff,csrfToken:result.csrfToken};
  }

  @Post('forgot-password') @HttpCode(200) @Header('Cache-Control','no-store') @Throttle({default:{limit:3,ttl:60000}})
  forgot(@Req() req:StaffRequest,@Body() input:unknown){if(!sameOrigin(req.headers.origin))throw new ForbiddenException();return this.auth.forgotPassword(input);}
  @Post('reset-password') @HttpCode(200) @Header('Cache-Control','no-store') @Throttle({default:{limit:5,ttl:60000}})
  async reset(@Req() req:StaffRequest,@Body() input:unknown,@Res({passthrough:true}) res:Response){if(!sameOrigin(req.headers.origin))throw new ForbiddenException();const result=await this.auth.resetPassword(input);res.clearCookie(sessionCookieName(),cookieOptions());return result;}
  @Post('google') @HttpCode(200) @Header('Cache-Control','no-store') @Throttle({default:{limit:10,ttl:60000}})
  async google(@Req() req:StaffRequest,@Body() input:unknown,@Res({passthrough:true}) res:Response){if(!sameOrigin(req.headers.origin))throw new ForbiddenException();const result=await this.auth.googleLogin(input,cookieToken(req.headers.cookie));res.cookie(sessionCookieName(),result.token,{...cookieOptions(),expires:result.expiresAt});return {staff:result.staff,csrfToken:result.csrfToken};}
  @Post('google/link') @HttpCode(200) @Header('Cache-Control','no-store') @UseGuards(SessionGuard,CsrfGuard) @Throttle({default:{limit:5,ttl:60000}})
  link(@Req() req:StaffRequest,@Body() input:unknown){return this.auth.googleLink(req,input);}
  @Post('google/unlink') @HttpCode(200) @Header('Cache-Control','no-store') @UseGuards(SessionGuard,CsrfGuard)
  unlink(@Req() req:StaffRequest){return this.auth.googleUnlink(req);}

  @ApiOperation({ summary: 'Current staff session', description: 'Returns the current authenticated staff identity and permissions.' })
  @ApiResponse({ status: 200, description: 'Active session returned' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @Get('session') @Header('Cache-Control','no-store') @UseGuards(SessionGuard)
  session(@Req() req:StaffRequest){return this.auth.session(req);}

  @ApiOperation({ summary: 'Staff logout', description: 'Revokes the active session in PostgreSQL and clears the session cookie.' })
  @ApiResponse({ status: 200, description: 'Signed out successfully' })
  @Post('logout') @HttpCode(200) @Header('Cache-Control','no-store') @UseGuards(SessionGuard,CsrfGuard)
  async logout(@Req() req:StaffRequest,@Res({passthrough:true}) res:Response){await this.auth.logout(req);res.clearCookie(sessionCookieName(),cookieOptions());return {signedOut:true};}

  @ApiOperation({ summary: 'Update password', description: 'Changes staff password and revokes all active sessions for security.' })
  @ApiResponse({ status: 200, description: 'Password changed and old sessions revoked' })
  @Post('password') @HttpCode(200) @Header('Cache-Control','no-store') @UseGuards(SessionGuard,CsrfGuard) @Throttle({default:{limit:5,ttl:60000}})
  async password(@Req() req:StaffRequest,@Body() input:unknown,@Res({passthrough:true}) res:Response){await this.auth.password(req,input);res.clearCookie(sessionCookieName(),cookieOptions());return {signedOut:true};}
}

@ApiTags('Staff Security & Audit')
@Controller('staff/security')
@UseGuards(SessionGuard,CsrfGuard)
export class SecurityController {
  constructor(@Inject(AuthService) private readonly auth:AuthService){}

  @ApiOperation({ summary: 'List active sessions', description: 'Returns list of non-expired sessions for the logged-in staff member.' })
  @Get('sessions') @Header('Cache-Control','no-store')
  sessions(@Req() req:StaffRequest){return this.auth.sessions(req);}

  @ApiOperation({ summary: 'Revoke specific session', description: 'Terminates an active session by token hash.' })
  @Post('revoke') @HttpCode(200) @Header('Cache-Control','no-store')
  async revoke(@Req() req:StaffRequest,@Body() input:unknown,@Res({passthrough:true}) res:Response){const result=await this.auth.revoke(req,input);if(result.signedOut)res.clearCookie(sessionCookieName(),cookieOptions());return result;}

  @ApiOperation({ summary: 'Security overview metrics', description: 'Management view of active sessions and recent security alerts (Requires settings:write).' })
  @Get('overview') @Header('Cache-Control','no-store') @UseGuards(PermissionGuard) @RequirePermission('settings:write')
  overview(){return this.auth.overview();}

  @ApiOperation({ summary: 'Audit log pagination', description: 'Auditing log for staff actions and security events (Requires settings:write).' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @Get('audit') @Header('Cache-Control','no-store') @UseGuards(PermissionGuard) @RequirePermission('settings:write')
  audit(@Query('page') page:unknown){return this.auth.audit(page);}
}
