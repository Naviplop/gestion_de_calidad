import { Module } from '@nestjs/common';
import { OrganizationsController } from './controllers/organizations.controller';
import { OrganizationMembershipController } from './controllers/organization-membership.controller';
import { OrganizationsService } from './services/organizations.service';
import { OrganizationMembershipService } from './services/organization-membership.service';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationMembershipRepository } from './repositories/organization-membership.repository';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { AntiIdorGuard } from '../../common/guards/anti-idor.guard';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule, SecurityEventsModule, AuditLogsModule],
  controllers: [OrganizationsController, OrganizationMembershipController],
  providers: [
    OrganizationsService,
    OrganizationRepository,
    OrganizationMembershipService,
    OrganizationMembershipRepository,
    TenantContextGuard,
    AntiIdorGuard,
  ],
  exports: [
    OrganizationsService,
    OrganizationRepository,
    OrganizationMembershipService,
    OrganizationMembershipRepository,
  ],
})
export class OrganizationsModule {}
