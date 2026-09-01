import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_PATH, AUTH_COOKIE_MAX_AGE, buildAuthCookieOptions } from '../constants/cookie.constants';

interface TokenResponse {
  refreshToken?: string;
}

@Injectable()
export class CookieInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<TokenResponse> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data: TokenResponse) => {
        if (data && data.refreshToken) {
          const cookieOptions = buildAuthCookieOptions();
          response.cookie(AUTH_COOKIE_NAME, data.refreshToken, cookieOptions);
          const { refreshToken, ...rest } = data as { refreshToken: string } & Record<string, unknown>;
          void refreshToken;
          return rest as TokenResponse;
        }
        return data;
      }),
    );
  }
}
