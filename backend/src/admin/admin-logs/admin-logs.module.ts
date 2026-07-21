import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AdminLogsController } from './admin-logs.controller';
import { AdminLogsService } from './admin-logs.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminLogsController],
  providers: [AdminLogsService],
})
export class AdminLogsModule {}
