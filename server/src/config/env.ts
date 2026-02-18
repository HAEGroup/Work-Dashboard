import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/work_dashboard',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Google Calendar
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/google/callback',

  // Rentvine
  RENTVINE_API_KEY: process.env.RENTVINE_API_KEY || '',
  RENTVINE_API_SECRET: process.env.RENTVINE_API_SECRET || '',
  RENTVINE_BASE_URL: process.env.RENTVINE_BASE_URL || 'https://api.rentvine.com',

  // System SMTP (for password reset emails)
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || '',

  // Frontend URL (for CORS)
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};
