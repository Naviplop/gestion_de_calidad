import { Module } from '@nestjs/common';
import { ProcessesController } from './controllers/processes.controller';
import { ProcessesService } from './services/processes.service';
import { ProcessRepository } from './repositories/process.repository';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../../common/common.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule, CommonModule],
  controllers: [ProcessesController],
  providers: [ProcessesService, ProcessRepository],
  exports: [ProcessesService, ProcessRepository],
})
export class ProcessesModule {}
