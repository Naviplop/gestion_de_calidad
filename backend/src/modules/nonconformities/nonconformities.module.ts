import { Module } from '@nestjs/common';
import { NonconformitiesService } from './services/nonconformities.service';
import { NonconformityRepository } from './repositories/nonconformity.repository';
import { RootCauseAnalysisRepository } from './repositories/root-cause.repository';
import { CorrectiveActionRepository } from './repositories/corrective-action.repository';
import { CorrectiveActionVerificationRepository } from './repositories/corrective-action-verification.repository';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AntiIdorGuard } from '../../common/guards/anti-idor.guard';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NonconformitiesController } from './controllers/nonconformities.controller';
import { CorrectiveActionsController } from './controllers/nonconformities.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule, SecurityEventsModule, AuditLogsModule],
  controllers: [NonconformitiesController, CorrectiveActionsController],
  providers: [
    NonconformitiesService,
    NonconformityRepository,
    RootCauseAnalysisRepository,
    CorrectiveActionRepository,
    CorrectiveActionVerificationRepository,
    PermissionsGuard,
    AntiIdorGuard,
  ],
  exports: [NonconformitiesService],
})
export class NonconformitiesModule {}
