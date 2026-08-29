import { errorHandlerMiddleware } from './error-handler.middleware';

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

function createMockResponse(): MockResponse {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('errorHandlerMiddleware', () => {
  it('should return 500 with INFRASTRUCTURE_ERROR for unknown errors', () => {
    const res = createMockResponse();
    const req = { headers: {} };
    const next = jest.fn();
    const error = new Error('boom');

    errorHandlerMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INFRASTRUCTURE_ERROR',
          message: 'boom',
        }),
      }),
    );
  });

  it('should map 400 to VALIDATION_ERROR', () => {
    const res = createMockResponse();
    const req = { headers: {} };
    const next = jest.fn();
    const error = { status: 400, message: 'invalid payload' };

    errorHandlerMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'invalid payload',
        }),
      }),
    );
  });

  it('should map 401 to AUTHENTICATION_ERROR', () => {
    const res = createMockResponse();
    const req = { headers: {} };
    const next = jest.fn();
    const error = { status: 401, message: 'token missing' };

    errorHandlerMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'AUTHENTICATION_ERROR',
          message: 'token missing',
        }),
      }),
    );
  });

  it('should map 403 to AUTHORIZATION_ERROR', () => {
    const res = createMockResponse();
    const req = { headers: {} };
    const next = jest.fn();
    const error = { status: 403, message: 'forbidden' };

    errorHandlerMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'AUTHORIZATION_ERROR',
          message: 'forbidden',
        }),
      }),
    );
  });

  it('should hide message in production for 500 errors', () => {
    const res = createMockResponse();
    const req = { headers: {} };
    const next = jest.fn();
    const error = new Error('secret');

    process.env.NODE_ENV = 'production';
    errorHandlerMiddleware(error, req, res, next);
    process.env.NODE_ENV = 'development';

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Internal server error',
        }),
      }),
    );
  });
});
