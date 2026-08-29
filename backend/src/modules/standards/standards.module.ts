import { Module } from '@nestjs/common';
import { StandardsController } from './controllers/standards.controller';
import { StandardsService } from './services/standards.service';
import { StandardRepository } from './repositories/standard.repository';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule],
  controllers: [StandardsController],
  providers: [StandardsService, StandardRepository],
  exports: [StandardsService, StandardRepository],
})
export class StandardsModule {}
