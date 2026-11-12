import {Controller, Get, Inject, ServiceUnavailableException} from '@nestjs/common';
import {SkipThrottle} from '@nestjs/throttler';
import {ApiTags, ApiOperation, ApiResponse} from '@nestjs/swagger';
import {PrismaService} from '../../prisma/prisma.service.js';
import {databaseFailure} from '../../prisma/database-failure.js';

@ApiTags('Health & Readiness')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'Process Liveness check', description: 'Returns 200 OK when the API process is alive and responsive.' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  @Get()
  live() { return {status: 'ok'}; }

  @ApiOperation({ summary: 'Database readiness check', description: 'Validates PostgreSQL connection and schema integrity.' })
  @ApiResponse({ status: 200, description: 'Database connection is verified and operational' })
  @ApiResponse({ status: 503, description: 'Database is currently unreachable' })
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT u."passwordHash", b."hubspotContactId", b."hubspotMeetingId", b."meetingUrl", ci."phone", ci."nextRetryAt", bo."nextRetryAt" FROM "StaffUser" u LEFT JOIN "StaffSession" s ON FALSE LEFT JOIN "StaffAuditEvent" a ON FALSE LEFT JOIN "RequestThrottle" r ON FALSE LEFT JOIN "BookingSettings" cfg ON FALSE LEFT JOIN "Booking" b ON FALSE LEFT JOIN "ContactInquiry" ci ON FALSE LEFT JOIN "BookingOutbox" bo ON FALSE WHERE FALSE`;
      return {status: 'ok', database: 'up'};
    } catch (error: unknown) {
      const failure=databaseFailure(error);
      console.error(JSON.stringify({event: 'database_readiness_failed', ...failure}));
      throw new ServiceUnavailableException({status: 'unavailable', database: 'down', category: failure.category});
    }
  }
}
