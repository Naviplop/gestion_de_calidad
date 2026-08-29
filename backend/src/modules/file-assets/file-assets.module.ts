import { Module } from '@nestjs/common';
import { FileAssetService } from './services/file-asset.service';
import { FileAssetsController } from './controllers/file-assets.controller';
import { DatabaseModule } from '../../database/database.module';
import { ConfigModule } from '@nestjs/config';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, ConfigModule, SecurityEventsModule, AuditLogsModule, AuthModule],
  controllers: [FileAssetsController],
  providers: [FileAssetService],
  exports: [FileAssetService],
})
export class FileAssetsModule {}
