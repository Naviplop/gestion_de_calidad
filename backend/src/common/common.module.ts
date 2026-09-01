import { Module } from '@nestjs/common';
import { SecurityEventsModule } from '../modules/security-events/security-events.module';
import { DatabaseModule } from '../database/database.module';
import { PermissionsGuard } from './guards/permissions.guard';
import { AntiIdorGuard } from './guards/anti-idor.guard';
import { TenantContextGuard } from './guards/tenant-context.guard';
import { ConcurrencyService } from './services/concurrency.service';

@Module({
  imports: [DatabaseModule, SecurityEventsModule],
  providers: [PermissionsGuard, AntiIdorGuard, TenantContextGuard, ConcurrencyService],
  exports: [PermissionsGuard, AntiIdorGuard, TenantContextGuard, ConcurrencyService, SecurityEventsModule],
})
export class CommonModule {}
