import { applyDecorators } from '@nestjs/common';

export function Public() {
  return applyDecorators();
}
