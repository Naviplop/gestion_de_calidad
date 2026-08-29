const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'] as const;

export function validateEnv() {
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

export const env = {
  NODE_ENV: (process.env.NODE_ENV || 'development') as string,
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL as string | undefined,
  JWT_SECRET: process.env.JWT_SECRET as string | undefined,
  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:5173') as string,
  STORAGE_ROOT: (process.env.STORAGE_ROOT || './storage') as string,
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10),
} as const;
