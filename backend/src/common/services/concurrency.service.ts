import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';

@Injectable()
export class ConcurrencyService {
  validateIfMatch<T extends { updatedAt: Date | null }>(entity: T, ifMatch: string | undefined): void {
    if (!ifMatch) {
      return;
    }

    const expected = new Date(ifMatch);
    if (isNaN(expected.getTime())) {
      throw new BadRequestException('InvalidIfMatchFormat');
    }

    if (!entity.updatedAt || entity.updatedAt.getTime() !== expected.getTime()) {
      throw new ConflictException('CONCURRENT_UPDATE');
    }
  }
}
