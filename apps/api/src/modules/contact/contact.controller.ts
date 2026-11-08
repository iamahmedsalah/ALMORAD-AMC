import {Body, Controller, Header, Inject, Post, UseGuards} from '@nestjs/common';
import {Throttle} from '@nestjs/throttler';
import {ApiOperation, ApiTags} from '@nestjs/swagger';
import {BookingOriginGuard} from '../bookings/bookings.controller.js';
import {ContactService} from './contact.service.js';
@ApiTags('Contact')
@Controller('contact')
@UseGuards(BookingOriginGuard)
export class ContactController {
  constructor(@Inject(ContactService) private readonly contact: ContactService) {}
  @Post('submit')
  @Header('Cache-Control', 'no-store')
  @Throttle({default: {limit: 3, ttl: 60000}})
  @ApiOperation({summary: 'Submit a contact inquiry. Does not create an appointment.'})
  submit(@Body() input: unknown) { return this.contact.submit(input); }
}
