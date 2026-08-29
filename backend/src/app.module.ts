import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ProcessesModule } from './modules/processes/processes.module';
import { StandardsModule } from './modules/standards/standards.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AuditsModule } from './modules/audits/audits.module';
import { NonconformitiesModule } from './modules/nonconformities/nonconformities.module';
import { RisksModule } from './modules/risks/risks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { SecurityEventsModule } from './modules/security-events/security-events.module';
import { FileAssetsModule } from './modules/file-assets/file-assets.module';

@Module({
  imports: [DatabaseModule, HealthModule, AuthModule, UsersModule, OrganizationsModule, DepartmentsModule, ProcessesModule, StandardsModule, DocumentsModule, AuditsModule, NonconformitiesModule, RisksModule, DashboardModule, AuditLogsModule, SecurityEventsModule, FileAssetsModule],
})
export class AppModule {}
