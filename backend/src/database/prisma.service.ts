import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    process.stdout.write('PRISMA ONMODULEINIT START\n');
    await this.$connect();
    process.stdout.write('PRISMA ONMODULEINIT END\n');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}