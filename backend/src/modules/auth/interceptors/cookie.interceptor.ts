import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AUTH_COOKIE_NAME, buildAuthCookieOptions, CSRF_COOKIE_NAME, buildCsrfCookieOptions } from '../constants/cookie.constants';

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

          const csrfOptions = buildCsrfCookieOptions();
          const csrfToken = context.switchToHttp().getRequest().get('x-csrf-token') || this.generateCsrfToken();
          response.cookie(CSRF_COOKIE_NAME, csrfToken, csrfOptions);

          const { refreshToken, ...rest } = data as { refreshToken: string } & Record<string, unknown>;
          void refreshToken;
          return rest as TokenResponse;
        }
        return data;
      }),
    );
  }

  private generateCsrfToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
