export const AUTH_COOKIE_NAME = 'refreshToken';
export const AUTH_COOKIE_PATH = '/api/v1/auth';
export const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export interface AuthCookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  maxAge?: number;
}

export function buildAuthCookieOptions(options: AuthCookieOptions = {}): Required<AuthCookieOptions> {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: options.httpOnly ?? true,
    secure: options.secure ?? isProduction,
    sameSite: options.sameSite ?? (isProduction ? 'strict' : 'lax'),
    path: options.path ?? AUTH_COOKIE_PATH,
    maxAge: options.maxAge ?? AUTH_COOKIE_MAX_AGE,
  };
}
