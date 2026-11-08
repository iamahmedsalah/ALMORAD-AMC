import {Controller, Get, Req, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import {SessionGuard, type StaffRequest} from './session.guard.js';
import {PermissionGuard, RequirePermission} from './permission.guard.js';

@ApiTags('Staff Profile & Permissions')
@ApiBearerAuth()
@Controller('staff')
@UseGuards(SessionGuard, PermissionGuard)
export class StaffController {
  @ApiOperation({ summary: 'Current staff details', description: 'Returns verified staff identity and active permissions.' })
  @ApiResponse({ status: 200, description: 'Staff profile details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('me')
  @RequirePermission('appointments:read')
  me(@Req() request: StaffRequest) {
    return request.staff;
  }

  @ApiOperation({ summary: 'Check settings permission', description: 'Verifies whether current staff has settings:write privileges.' })
  @ApiResponse({ status: 200, description: 'Permission confirmed' })
  @Get('access/settings')
  @RequirePermission('settings:write')
  settingsAccess() {
    return {allowed: true};
  }
}
