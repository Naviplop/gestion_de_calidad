import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['password', 'token', 'secret', 'authorization', 'cookie'],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

@Injectable()
export class AppLoggerService implements LoggerService {
  private format(context?: string) {
    return {
      service: 'qms-backend',
      environment: process.env.NODE_ENV || 'development',
      ...(context ? { context } : {}),
    };
  }

  log(message: unknown, context?: string) {
    logger.info({ ...this.format(context), message: String(message) });
  }

  error(message: unknown, trace?: string, context?: string) {
    logger.error({
      ...this.format(context),
      message: String(message),
      trace: trace ? String(trace) : undefined,
    });
  }

  warn(message: unknown, context?: string) {
    logger.warn({ ...this.format(context), message: String(message) });
  }

  debug(message: unknown, context?: string) {
    logger.debug({ ...this.format(context), message: String(message) });
  }

  verbose(message: unknown, context?: string) {
    logger.trace({ ...this.format(context), message: String(message) });
  }
}
