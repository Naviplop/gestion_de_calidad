import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { errorHandlerMiddleware } from './common/middleware/error-handler.middleware';
import { HttpLoggingMiddleware } from './common/middleware/http-logging.middleware';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { validateEnv } from './common/config/env';
import { AppLoggerService } from './common/logger/logger.service';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import * as cookieParser from 'cookie-parser';

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error(`Unhandled Rejection: ${message}`);
  if (reason instanceof Error && reason.stack) {
    console.error(reason.stack);
  }
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Uncaught Exception: ${message}`);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

validateEnv();

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    const logger = new AppLoggerService();
    (app as any).useLogger(logger);
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", process.env.CORS_ORIGIN || 'http://localhost:5173'].filter(Boolean),
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
    }));
    app.enableCors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Correlation-ID', 'Idempotency-Key'],
      maxAge: 86400,
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.use(new HttpLoggingMiddleware().use);
    app.use(errorHandlerMiddleware);
    app.use(cookieParser());
    app.use(new CsrfMiddleware().use.bind(new CsrfMiddleware()));
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(), new RequestIdInterceptor(), new CorrelationIdInterceptor());
    app.setGlobalPrefix('api/v1');
    const port = parseInt(process.env.PORT || '3001', 10);
    await app.listen(port);
    console.log(`Application is running on: ${await app.getUrl()}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  }
}
bootstrap().catch((error) => {
  console.error('Bootstrap promise rejected:', error);
  process.exit(1);
});
