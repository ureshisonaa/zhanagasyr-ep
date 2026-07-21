import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdmissionCyclesController } from './admission-cycles.controller';
import { AdmissionCyclesService } from './admission-cycles.service';

@Module({
  imports: [AuthModule],
  controllers: [AdmissionCyclesController],
  providers: [AdmissionCyclesService],
  exports: [AdmissionCyclesService],
})
export class AdmissionCyclesModule {}
