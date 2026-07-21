import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CalendarCronService } from './calendar.cron';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [NotificationsModule, ActivityLogModule],
  controllers: [CalendarController],
  providers: [CalendarService, CalendarCronService],
  exports: [CalendarService],
})
export class CalendarModule {}
