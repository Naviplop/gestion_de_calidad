import { Module } from '@nestjs/common';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentsService } from './services/documents.service';
import { DocumentRepository } from './repositories/document.repository';
import { DocumentVersionRepository } from './repositories/document-version.repository';
import { DocumentReviewerRepository } from './repositories/document-reviewer.repository';
import { DocumentApprovalRepository } from './repositories/document-approval.repository';
import { DocumentDistributionRepository } from './repositories/document-distribution.repository';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../../common/common.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule, CommonModule, AuditLogsModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentRepository,
    DocumentVersionRepository,
    DocumentReviewerRepository,
    DocumentApprovalRepository,
    DocumentDistributionRepository,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
