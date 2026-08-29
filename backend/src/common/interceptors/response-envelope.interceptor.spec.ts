import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('ResponseEnvelopeInterceptor', () => {
  const interceptor = new ResponseEnvelopeInterceptor();

  it('should wrap plain response in data envelope', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
    const handler = {
      handle: () => of({ id: '1', name: 'test' }),
    } as unknown as CallHandler;

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({ data: { id: '1', name: 'test' } });
      done();
    });
  });

  it('should not double-wrap response already containing data', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
    const handler = {
      handle: () => of({ data: { id: '1' }, meta: { page: 1 } }),
    } as unknown as CallHandler;

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({ data: { id: '1' }, meta: { page: 1 } });
      done();
    });
  });

  it('should pass null through unchanged', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
    const handler = {
      handle: () => of(null),
    } as unknown as CallHandler;

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toBeNull();
      done();
    });
  });

  it('should pass undefined through unchanged', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
    const handler = {
      handle: () => of(undefined),
    } as unknown as CallHandler;

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toBeUndefined();
      done();
    });
  });
});
