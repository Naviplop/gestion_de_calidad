import { Module } from '@nestjs/common';
import { RisksService } from './services/risks.service';
import { RiskRepository } from './repositories/risk.repository';
import { RiskAssessmentRepository } from './repositories/risk-assessment.repository';
import { RiskControlRepository } from './repositories/risk-control.repository';
import { RiskTreatmentRepository } from './repositories/risk-treatment.repository';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AntiIdorGuard } from '../../common/guards/anti-idor.guard';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RisksController } from './controllers/risks.controller';
import { RiskTreatmentsController } from './controllers/risk-treatments.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule, SecurityEventsModule, AuditLogsModule],
  controllers: [RisksController, RiskTreatmentsController],
  providers: [
    RisksService,
    RiskRepository,
    RiskAssessmentRepository,
    RiskControlRepository,
    RiskTreatmentRepository,
    PermissionsGuard,
    AntiIdorGuard,
  ],
  exports: [RisksService],
})
export class RisksModule {}
