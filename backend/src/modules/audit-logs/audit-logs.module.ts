import { Module } from '@nestjs/common';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AuditLogsController],
  providers: [AuditLogService, AuditLogRepository],
  exports: [AuditLogService],
})
export class AuditLogsModule {}
