import { Module } from '@nestjs/common';
import { SecurityEventService } from './services/security-event.service';
import { SecurityEventRepository } from './repositories/security-event.repository';
import { SecurityEventsController } from './controllers/security-events.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SecurityEventsController],
  providers: [SecurityEventService, SecurityEventRepository],
  exports: [SecurityEventService],
})
export class SecurityEventsModule {}
