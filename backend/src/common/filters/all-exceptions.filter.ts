import { Catch, ArgumentsHost, Logger, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = request.headers?.['x-correlation-id'] as string | undefined;

    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';

    if (exception instanceof BadRequestException) {
      status = 400;
      code = 'BAD_REQUEST';
      message = exception.getResponse() as string;
    } else if (exception && typeof exception === 'object' && 'status' in exception) {
      status = (exception as { status: number }).status;
      code = (exception as { code?: string }).code ?? 'ERROR';
      message = (exception as { message?: string }).message ?? message;
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      {
        exception: exception instanceof Error ? exception.message : String(exception),
        correlationId,
      }
    );

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        requestId: request.headers?.['x-request-id'],
        correlationId,
      },
    });
  }
}
