import {Body,Controller,Get,Header,HttpCode,Inject,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {CsrfGuard} from './csrf.js';
import {PermissionGuard,RequirePermission} from './permission.guard.js';
import {SessionGuard,type StaffRequest} from './session.guard.js';
import {StaffAccountsService} from './staff-accounts.service.js';

@ApiTags('Staff Account Management')
@ApiBearerAuth()
@Controller('staff/accounts')
@UseGuards(SessionGuard,CsrfGuard,PermissionGuard)
@RequirePermission('staff:manage')
export class StaffAccountsController {
  constructor(@Inject(StaffAccountsService) private readonly accounts:StaffAccountsService){}
  @Get() @Header('Cache-Control','no-store')
  list(){return this.accounts.list();}
  @Post('create') @HttpCode(200) @Header('Cache-Control','no-store')
  create(@Req() req:StaffRequest,@Body() input:unknown){return this.accounts.create(req.staff!.id,input);}
  @Post('update') @HttpCode(200) @Header('Cache-Control','no-store')
  update(@Req() req:StaffRequest,@Body() input:unknown){return this.accounts.update(req.staff!.id,input);}
  @Post('deactivate') @HttpCode(200) @Header('Cache-Control','no-store')
  deactivate(@Req() req:StaffRequest,@Body() input:unknown){return this.accounts.deactivate(req.staff!.id,input);}
}
