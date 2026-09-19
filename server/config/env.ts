import dotenv from 'dotenv';
import path from 'path';

const projectRoot = path.basename(process.cwd()) === 'server' ? path.resolve(process.cwd(), '..') : process.cwd();

dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, 'server', '.env') });

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const optional = (name: string): string => process.env[name]?.trim() || '';

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
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGIN || process.env.CORS_ORIGINS),
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN?.trim() || '7d',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL?.trim() || '',
  RAZORPAY_KEY_ID: optional('RAZORPAY_KEY_ID'),
  RAZORPAY_KEY_SECRET: optional('RAZORPAY_KEY_SECRET'),
  RAZORPAY_WEBHOOK_SECRET: optional('RAZORPAY_WEBHOOK_SECRET'),
  SUPABASE_URL: process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim() || '',
  SUPABASE_SERVICE_ROLE_KEY: optional('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'product-images',
};

export const isProduction = env.NODE_ENV === 'production';
