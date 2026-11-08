import {type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable, SetMetadata} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {can, type Permission} from '@amc/shared';
import type {StaffRequest} from './session.guard.js';
export const RequirePermission = (permission: Permission) => SetMetadata('permission', permission);
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const permission = this.reflector.getAllAndOverride<Permission | undefined>('permission', [context.getHandler(), context.getClass()]);
    const staff = context.switchToHttp().getRequest<StaffRequest>().staff;
    if (!staff || !permission || !can(staff.role, permission)) throw new ForbiddenException();
    return true;
  }
}
