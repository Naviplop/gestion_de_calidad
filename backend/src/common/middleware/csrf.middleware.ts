import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const method = req.method;
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next();
    }

    const hasAuthHeader = !!req.headers?.authorization;
    if (hasAuthHeader) {
      const csrfToken = req.headers?.['x-csrf-token'];
      const cookieToken = req.cookies?.['x-csrftoken'];

      if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
        this.logger.warn('CSRF validation failed', {
          url: req.url,
          method: req.method,
          ip: req.ip,
        });
        throw new BadRequestException('InvalidCsrfToken');
      }
    }

    next();
  }
}
