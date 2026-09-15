import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const httpLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'refresh_token',
      'secret',
      'authorization',
      'cookie',
      'mfaCode',
      'mfa_code',
      'mfaSecret',
      'mfa_secret',
      'code',
      'newPassword',
      'currentPassword',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      httpLogger.info({
        service: 'qms-backend',
        environment: process.env.NODE_ENV || 'development',
        action: 'http.request',
        resource: req.method + ' ' + req.originalUrl,
        statusCode: res.statusCode,
        duration,
        requestId: req.headers['x-request-id'],
        correlationId: req.headers['x-correlation-id'],
        message: `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
      });
    });
    next();
  }
}
