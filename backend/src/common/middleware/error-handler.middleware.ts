import { Request, Response, NextFunction } from 'express';

interface HttpError {
  status?: number;
  message?: string;
  code?: string;
}

function isHttpError(error: unknown): error is HttpError {
  return typeof error === 'object' && error !== null && !Array.isArray(error);
}

function mapStatusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'AUTHENTICATION_ERROR';
    case 403:
      return 'AUTHORIZATION_ERROR';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'BUSINESS_RULE_ERROR';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'INFRASTRUCTURE_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}

export function errorHandlerMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string | undefined;
  const correlationId = req.headers['x-correlation-id'] as string | undefined;

  const httpError = isHttpError(error) ? error : {};
  const status = httpError.status || 500;
  const message = httpError.message || 'Internal server error';
  const code = httpError.code || mapStatusToCode(status);

  res.status(status).json({
    success: false,
    error: {
      code,
      message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
      requestId,
      correlationId,
    },
  });
}
