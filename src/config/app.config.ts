import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT || '4000', 10),
  host: process.env.APP_HOST || '0.0.0.0',
  env: process.env.APP_ENV || process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'iToyxona API',
  url: process.env.APP_URL || 'http://localhost:4000',
  corsOrigins: (process.env.APP_CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  swaggerEnabled: (process.env.APP_SWAGGER_ENABLED || 'true') === 'true',
}));
