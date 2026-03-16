import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT || '4000', 10),
  env: process.env.APP_ENV || 'development',
  name: process.env.APP_NAME || 'iToyxona API',
  url: process.env.APP_URL || 'http://localhost:4000',
}));
