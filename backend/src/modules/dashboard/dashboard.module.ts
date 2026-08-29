import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository, PermissionsGuard],
  exports: [DashboardService],
})
export class DashboardModule {}
