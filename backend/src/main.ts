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

validateEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const logger = new AppLoggerService();
  app.useLogger(logger);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'http://localhost:5173'],
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
  app.use(new HttpLoggingMiddleware().use);
  app.use(errorHandlerMiddleware);
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(), new RequestIdInterceptor(), new CorrelationIdInterceptor());
  app.setGlobalPrefix('api/v1');
  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`, 'Bootstrap');
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'Bootstrap');
}
bootstrap();
