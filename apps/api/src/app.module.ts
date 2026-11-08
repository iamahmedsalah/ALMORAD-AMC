import {BookingsService} from './modules/bookings/bookings.service.js';
import {PublicBookingController,StaffBookingsController,BookingSettingsController,BookingAnalyticsController,BookingOriginGuard} from './modules/bookings/bookings.controller.js';
import {Module} from '@nestjs/common';
import {APP_GUARD, Reflector} from '@nestjs/core';
import {getOptionsToken, getStorageToken, ThrottlerGuard, ThrottlerModule, type ThrottlerModuleOptions, type ThrottlerStorage} from '@nestjs/throttler';
import {AuthService} from './modules/auth/auth.service.js';
import {AuthController,SecurityController} from './modules/auth/auth.controller.js';
import {CsrfGuard,CsrfService} from './modules/auth/csrf.js';
import {ProxyGuard,type ProxyRequest} from './modules/auth/proxy.guard.js';
import {PostgresThrottleStorage} from './modules/auth/throttle.storage.js';
import {OperationsController} from './operations.controller.js';
import {PrismaService} from './prisma/prisma.service.js';
import {HealthController} from './modules/health/health.controller.js';
import {StaffController} from './modules/auth/staff.controller.js';
import {SessionGuard} from './modules/auth/session.guard.js';
import {PermissionGuard} from './modules/auth/permission.guard.js';
import {NotificationsModule} from './modules/notifications/notifications.module.js';
import {ContactController} from './modules/contact/contact.controller.js';
import {ContactService} from './modules/contact/contact.service.js';
import {HubSpotClient} from './modules/contact/hubspot.client.js';
@Module({
  imports: [
    NotificationsModule,
    ThrottlerModule.forRoot([{ttl: 60000, limit: 60, getTracker:req=>(req as ProxyRequest).trustedClient||String(req.ip||'unknown')}])
  ],
  controllers: [ContactController,PublicBookingController,StaffBookingsController,BookingSettingsController,BookingAnalyticsController,HealthController, StaffController, AuthController, SecurityController, OperationsController],
  providers: [
    ContactService, HubSpotClient, BookingsService, BookingOriginGuard, PrismaService, SessionGuard, PermissionGuard, Reflector, AuthService, CsrfService, CsrfGuard, ProxyGuard,
    {provide:APP_GUARD,useExisting:ProxyGuard},
    {provide:getStorageToken(),useClass:PostgresThrottleStorage},
    {
      provide: APP_GUARD,
      // Explicit tokens keep the third-party guard independent of decorator
      // metadata identity across the ESM application and CommonJS dependency.
      inject: [getOptionsToken(), getStorageToken(), Reflector],
      useFactory: (options: ThrottlerModuleOptions, storage: ThrottlerStorage, reflector: Reflector) => new ThrottlerGuard(options, storage, reflector)
    }
  ]
})
export class AppModule {}
