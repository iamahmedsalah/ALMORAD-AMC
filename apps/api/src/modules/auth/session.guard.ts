import {cookieToken,tokenHash} from './security.js';
import {type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException} from '@nestjs/common';
import type {Request} from 'express';
import type {StaffRole} from '@amc/shared';
import {PrismaService} from '../../prisma/prisma.service.js';
export type StaffRequest = Request & {staff?: {id: string; role: StaffRole}; sessionId?: string; sessionToken?: string};
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<StaffRequest>();
    const bearer = cookieToken(req.headers.cookie) || req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!bearer) throw new UnauthorizedException();
    const session = await this.prisma.staffSession.findUnique({where: {tokenHash: tokenHash(bearer)}, include: {user: true}});
    if (!session || session.expiresAt <= new Date() || !session.user.active) throw new UnauthorizedException();
    req.staff = {id: session.user.id, role: session.user.role};
    req.sessionId=session.id; req.sessionToken=bearer;
    return true;
  }
}
