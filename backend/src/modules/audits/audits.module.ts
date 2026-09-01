import { Module } from '@nestjs/common';
import { AuditsService } from './services/audits.service';
import { AuditProgramRepository } from './repositories/audit-program.repository';
import { AuditRepository } from './repositories/audit.repository';
import { AuditChecklistRepository } from './repositories/audit-checklist.repository';
import { AuditChecklistItemRepository } from './repositories/audit-checklist-item.repository';
import { AuditFindingRepository } from './repositories/audit-finding.repository';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../../common/common.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuditProgramsController } from './controllers/audits.controller';
import { AuditsController } from './controllers/audits.controller';
import { AuditChecklistsController } from './controllers/audits.controller';
import { ChecklistsController } from './controllers/audits.controller';
import { AuditFindingsController } from './controllers/audits.controller';
import { FindingsController } from './controllers/audits.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule, CommonModule, AuditLogsModule],
  controllers: [
    AuditProgramsController,
    AuditsController,
    AuditChecklistsController,
    ChecklistsController,
    AuditFindingsController,
    FindingsController,
  ],
  providers: [
    AuditsService,
    AuditProgramRepository,
    AuditRepository,
    AuditChecklistRepository,
    AuditChecklistItemRepository,
    AuditFindingRepository,
  ],
  exports: [AuditsService],
})
export class AuditsModule {}
