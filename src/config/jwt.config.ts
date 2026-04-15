import { registerAs } from '@nestjs/config';

const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const isProduction = appEnv === 'production';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || (isProduction ? undefined : 'super-secret-jwt-key'),
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || (isProduction ? undefined : 'super-secret-refresh-key'),
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));
