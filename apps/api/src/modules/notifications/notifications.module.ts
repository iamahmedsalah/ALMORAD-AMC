import {Module} from '@nestjs/common';
import {NotificationsService} from './notifications.service.js';
import {PrismaService} from '../../prisma/prisma.service.js';

@Module({
  providers: [NotificationsService, PrismaService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
