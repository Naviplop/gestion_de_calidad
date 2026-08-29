import { validateEnv } from './env';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw when DATABASE_URL is missing', () => {
    process.env.DATABASE_URL = '';
    expect(() => validateEnv()).toThrow('Missing required environment variable: DATABASE_URL');
  });

  it('should not throw when DATABASE_URL is present', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret';
    expect(() => validateEnv()).not.toThrow();
  });
});
