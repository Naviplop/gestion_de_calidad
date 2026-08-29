import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_PATH, AUTH_COOKIE_MAX_AGE } from '../constants/cookie.constants';

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
          response.cookie(AUTH_COOKIE_NAME, data.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: AUTH_COOKIE_PATH,
            maxAge: AUTH_COOKIE_MAX_AGE,
          });
          const { refreshToken, ...rest } = data as { refreshToken: string } & Record<string, unknown>;
          void refreshToken;
          return rest as TokenResponse;
        }
        return data;
      }),
    );
  }
}
