import { RequestIdInterceptor } from './request-id.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('RequestIdInterceptor', () => {
  const interceptor = new RequestIdInterceptor();

  it('should use existing request id when provided', (done) => {
    const request = {
      headers: { 'x-request-id': 'abc-123' },
    };
    const response = {
      setHeader: jest.fn(),
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const handler = {
      handle: () => of('ok'),
    } as unknown as CallHandler;

    interceptor.intercept(context, handler).subscribe(() => {
      expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'abc-123');
      done();
    });
  });

  it('should generate UUID request id when missing', (done) => {
    const request = {
      headers: {},
    };
    const response = {
      setHeader: jest.fn(),
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const handler = {
      handle: () => of('ok'),
    } as unknown as CallHandler;

    interceptor.intercept(context, handler).subscribe(() => {
      expect(response.setHeader).toHaveBeenCalled();
      const calledWith = (response.setHeader as jest.Mock).mock.calls[0][1];
      expect(calledWith).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      done();
    });
  });
});
