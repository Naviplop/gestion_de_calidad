import { Module } from '@nestjs/common';
import { ProcessesController } from './controllers/processes.controller';
import { ProcessesService } from './services/processes.service';
import { ProcessRepository } from './repositories/process.repository';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AntiIdorGuard } from '../../common/guards/anti-idor.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule],
  controllers: [ProcessesController],
  providers: [ProcessesService, ProcessRepository, PermissionsGuard, AntiIdorGuard],
  exports: [ProcessesService, ProcessRepository],
})
export class ProcessesModule {}
