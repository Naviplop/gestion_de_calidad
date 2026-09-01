import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
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
import { AuthGuard } from './modules/auth/guards/auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TenantContextGuard } from './common/guards/tenant-context.guard';
import { AntiIdorGuard } from './common/guards/anti-idor.guard';

@Module({
  imports: [DatabaseModule, ConfigModule, HealthModule, AuthModule, UsersModule, OrganizationsModule, DepartmentsModule, ProcessesModule, StandardsModule, DocumentsModule, AuditsModule, NonconformitiesModule, RisksModule, DashboardModule, AuditLogsModule, SecurityEventsModule, FileAssetsModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantContextGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AntiIdorGuard,
    },
  ],
})
export class AppModule {}
