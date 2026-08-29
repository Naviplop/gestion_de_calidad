import { Module } from '@nestjs/common';
import { DepartmentsController } from './controllers/departments.controller';
import { DepartmentsService } from './services/departments.service';
import { DepartmentRepository } from './repositories/department.repository';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AntiIdorGuard } from '../../common/guards/anti-idor.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService, DepartmentRepository, PermissionsGuard, AntiIdorGuard],
  exports: [DepartmentsService, DepartmentRepository],
})
export class DepartmentsModule {}
