import {Body,Controller,Get,Header,Inject,Post,Query,Req,UseGuards,ForbiddenException,Injectable,type CanActivate,type ExecutionContext} from '@nestjs/common';
import {waitUntil} from '@vercel/functions';
import {Throttle} from '@nestjs/throttler';
import {ApiTags, ApiOperation, ApiResponse, ApiQuery} from '@nestjs/swagger';
import type {Request} from 'express';
import {BookingsService} from './bookings.service.js';
import {NotificationsService} from '../notifications/notifications.service.js';
import {SessionGuard,type StaffRequest} from '../auth/session.guard.js';
import {PermissionGuard,RequirePermission} from '../auth/permission.guard.js';
import {CsrfGuard} from '../auth/csrf.js';
import {sameOrigin} from '../auth/security.js';

@Injectable()
export class BookingOriginGuard implements CanActivate {
  canActivate(context:ExecutionContext){
    const request=context.switchToHttp().getRequest<Request>();
    if(request.method!=='GET'&&!sameOrigin(request.headers.origin))throw new ForbiddenException();
    return true;
  }
}

@ApiTags('Public Booking')
@Controller('booking')
@UseGuards(BookingOriginGuard)
export class PublicBookingController {
  constructor(@Inject(BookingsService) private readonly bookings:BookingsService,@Inject(NotificationsService) private readonly notifications:NotificationsService){}

  @ApiOperation({ summary: 'Get public booking configuration', description: 'Returns business days, working hours, services, and formats.' })
  @ApiResponse({ status: 200, description: 'Public booking configuration' })
  @Get('config') @Header('Cache-Control','no-store')
  config(){return this.bookings.publicConfig();}

  @ApiOperation({ summary: 'Available booking slots', description: 'Queries available appointment slots for a specific date, service, and format.' })
  @ApiQuery({ name: 'date', required: true, description: 'Target date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'service', required: true, description: 'Service slug' })
  @ApiQuery({ name: 'format', required: true, description: 'ONLINE or IN_PERSON' })
  @ApiQuery({ name: 'duration', required: false, description: 'Meeting length in minutes (30–300, in 30-minute steps)' })
  @Get('slots') @Header('Cache-Control','no-store')
  slots(@Query('date') date:unknown,@Query('service') service:unknown,@Query('format') format:unknown,@Query('duration') duration?:unknown){return this.bookings.slots(date,service,format,duration);}

  @ApiOperation({ summary: 'Create appointment reservation', description: 'Books an appointment slot with client contact info.' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @Post('create') @Header('Cache-Control','no-store') @Throttle({default:{limit:5,ttl:60000}})
  async create(@Body() input:unknown){
    const result=await this.bookings.create(input);
    this.deliver();
    return result;
  }

  @ApiOperation({ summary: 'Manage client booking', description: 'Fetches booking by confirmation access code/token.' })
  @Post('manage') @Header('Cache-Control','no-store')
  manage(@Body() input:unknown){return this.bookings.manage(input);}

  @ApiOperation({ summary: 'Client booking action', description: 'Request reschedule or cancellation by client.' })
  @Post('action') @Header('Cache-Control','no-store') @Throttle({default:{limit:10,ttl:60000}})
  async action(@Body() input:unknown){const result=await this.bookings.clientAction(input);this.deliver();return result;}
  private deliver(){const job=Promise.allSettled([this.notifications.drain(10),this.bookings.drainCrm(10)]).then(results=>{if(results.some(result=>result.status==='rejected'))console.error('Booking background delivery failed');});if(process.env.VERCEL)waitUntil(job);else void job;}
}

@ApiTags('Staff Appointments')
@Controller('staff/appointments')
@UseGuards(SessionGuard,CsrfGuard,PermissionGuard)
@RequirePermission('appointments:read')
export class StaffBookingsController {
  constructor(@Inject(BookingsService) private readonly bookings:BookingsService,@Inject(NotificationsService) private readonly notifications:NotificationsService){}
  private deliver(){const job=Promise.allSettled([this.notifications.drain(10),this.bookings.drainCrm(10)]).then(results=>{if(results.some(result=>result.status==='rejected'))console.error('Booking background delivery failed');});if(process.env.VERCEL)waitUntil(job);else void job;}

  @ApiOperation({ summary: 'List appointments', description: 'Filter and paginate studio client bookings.' })
  @Get() @Header('Cache-Control','no-store')
  list(@Query() input:Record<string,unknown>){return this.bookings.list(input);}

  @ApiOperation({ summary: 'Appointment detail', description: 'Get complete appointment record including audit history.' })
  @ApiQuery({ name: 'id', required: true, description: 'Booking ID' })
  @Get('detail') @Header('Cache-Control','no-store')
  detail(@Query('id') id:string){return this.bookings.staffDetail(id);}

  @ApiOperation({ summary: 'Staff create appointment', description: 'Create an internal appointment with staff confirmation.' })
  @Post('create') @Header('Cache-Control','no-store') @RequirePermission('appointments:write')
  async create(@Req() request:StaffRequest,@Body() input:unknown){const result=await this.bookings.create(input,request.staff!.id);this.deliver();return result;}

  @ApiOperation({ summary: 'Staff update appointment action', description: 'Confirm, reschedule, complete, or cancel booking.' })
  @Post('action') @Header('Cache-Control','no-store') @RequirePermission('appointments:write')
  async action(@Req() request:StaffRequest,@Body() input:unknown){const result=await this.bookings.staffAction(input,request.staff!.id);this.deliver();return result;}
}

@ApiTags('Staff Booking Settings')
@Controller('staff/booking-settings')
@UseGuards(SessionGuard,CsrfGuard,PermissionGuard)
@RequirePermission('settings:write')
export class BookingSettingsController {
  constructor(@Inject(BookingsService) private readonly bookings:BookingsService){}

  @ApiOperation({ summary: 'Get booking settings', description: 'Retrieves booking configuration, operating days, and buffer times.' })
  @Get() @Header('Cache-Control','no-store')
  get(){return this.bookings.getSettings();}

  @ApiOperation({ summary: 'Save booking settings', description: 'Updates studio booking configuration and scheduling rules.' })
  @Post() @Header('Cache-Control','no-store')
  save(@Req() request:StaffRequest,@Body() input:unknown){return this.bookings.saveSettings(input,request.staff!.id);}
}

@ApiTags('Staff Booking Analytics')
@Controller('staff/booking-analytics')
@UseGuards(SessionGuard,PermissionGuard)
@RequirePermission('analytics:read')
export class BookingAnalyticsController {
  constructor(@Inject(BookingsService) private readonly bookings:BookingsService){}

  @ApiOperation({ summary: 'Booking analytics & KPIs', description: 'Calculates studio appointment metrics, volume, conversion, and service breakdown.' })
  @Get() @Header('Cache-Control','no-store')
  analytics(@Query() input:Record<string,unknown>){return this.bookings.analytics(input);}
}
