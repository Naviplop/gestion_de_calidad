import { Module } from '@nestjs/common';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentTypesController } from './controllers/document-types.controller';
import { DocumentsService } from './services/documents.service';
import { DocumentTypesService } from './services/document-types.service';
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
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule, CommonModule, AuditLogsModule],
  controllers: [DocumentsController, DocumentTypesController],
  providers: [
    DocumentsService,
    DocumentTypesService,
    DocumentRepository,
    DocumentVersionRepository,
    DocumentReviewerRepository,
    DocumentApprovalRepository,
    DocumentDistributionRepository,
    CreateDocumentTypeDto,
    UpdateDocumentTypeDto,
  ],
  exports: [DocumentsService, DocumentTypesService],
})
export class DocumentsModule {}
