import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().default('pfs-dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.string().default('3002'),
  CLIENT_URL: z.string().default('http://localhost:5174'),
});

export const env = envSchema.parse(process.env);
