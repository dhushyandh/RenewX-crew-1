import dotenv from 'dotenv';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, 'server', '.env') });

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const parsePort = (value: string | undefined): number => {
  const port = Number(value || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
};

const parseCorsOrigins = (value: string | undefined): string[] => {
  if (!value || value.trim() === '*') return ['*'];
  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
};

export const env = {
  NODE_ENV: process.env.NODE_ENV?.trim() || 'development',
  PORT: parsePort(process.env.PORT),
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN),
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN?.trim() || '7d',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL?.trim() || '',
};

export const isProduction = env.NODE_ENV === 'production';
