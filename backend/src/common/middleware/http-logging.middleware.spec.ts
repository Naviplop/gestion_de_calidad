import { HttpLoggingMiddleware } from './http-logging.middleware';

describe('HttpLoggingMiddleware', () => {
  it('should call next and log on finish', (done) => {
    const res = {
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          callback();
        }
      }),
      statusCode: 200,
      originalUrl: '/test',
    };
    const req = {
      method: 'GET',
      originalUrl: '/test',
      headers: {
        'x-request-id': 'req-123',
        'x-correlation-id': 'corr-456',
      },
    };
    const next = jest.fn();
    const middleware = new HttpLoggingMiddleware();

    middleware.use(req as Parameters<typeof middleware.use>[0], res as Parameters<typeof middleware.use>[1], next);

    expect(next).toHaveBeenCalled();
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    done();
  });
});
