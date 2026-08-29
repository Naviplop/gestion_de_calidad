import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { IdempotencyService } from '../../services/idempotency.service';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const organizationId = (req as unknown as Record<string, unknown>).organizationId as string | undefined;
    const key = req.headers['idempotency-key'] as string | undefined;

    if (!key || !organizationId) {
      return next();
    }

    if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
      return next();
    }

    const stored = await this.idempotencyService.getStoredResponse(organizationId, key);
    if (stored) {
      res.status(stored.statusCode);
      return res.json(stored.body);
    }

    const originalSend = res.send.bind(res);
    let responseBody: unknown;

    res.send = (body: unknown) => {
      responseBody = body;
      return originalSend(body);
    };

    next();

    res.on('finish', async () => {
      if (responseBody !== undefined) {
        try {
          await this.idempotencyService.storeResponse(
            organizationId,
            key,
            req.route?.path || req.path,
            req.route?.path || req.path,
            req.method,
            req.path,
            res.statusCode,
            responseBody,
          );
        } catch {
        }
      }
    });
  }
}
