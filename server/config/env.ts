import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env in project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://dhushyandh:ffpullingo07@renewx.wbla0rz.mongodb.net/?appName=RenewX',
  JWT_SECRET: process.env.JWT_SECRET || 'renewx_secret_jwt_key_2026_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  ADMIN_EMAIL:
    process.env.ADMIN_EMAIL ||
    process.env.VITE_ADMIN_EMAIL ||
    'dhushyandhneduncheziyan4896@gmail.com',
};
