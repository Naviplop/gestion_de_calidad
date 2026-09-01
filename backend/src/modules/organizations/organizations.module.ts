import { Module } from '@nestjs/common';
import { OrganizationsController } from './controllers/organizations.controller';
import { OrganizationMembershipController } from './controllers/organization-membership.controller';
import { OrganizationsService } from './services/organizations.service';
import { OrganizationMembershipService } from './services/organization-membership.service';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationMembershipRepository } from './repositories/organization-membership.repository';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../../common/common.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule, CommonModule, AuditLogsModule],
  controllers: [OrganizationsController, OrganizationMembershipController],
  providers: [
    OrganizationsService,
    OrganizationRepository,
    OrganizationMembershipService,
    OrganizationMembershipRepository,
  ],
  exports: [
    OrganizationsService,
    OrganizationRepository,
    OrganizationMembershipService,
    OrganizationMembershipRepository,
  ],
})
export class OrganizationsModule {}
