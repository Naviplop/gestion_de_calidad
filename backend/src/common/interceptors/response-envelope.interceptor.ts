import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((response) => {
        if (response === null || response === undefined) {
          return response;
        }

        if (typeof response === 'object' && response !== null && 'data' in response) {
          return response;
        }

        return { data: response };
      }),
    );
  }
}
