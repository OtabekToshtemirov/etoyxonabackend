import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters';
import { TransformInterceptor, LoggingInterceptor } from './common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const port = configService.get<number>('app.port') || 4000;
  const host = configService.get<string>('app.host') || '0.0.0.0';
  const baseUrl = configService.get<string>('app.url') || `http://${host}:${port}`;
  const corsOrigins = configService.get<string[]>('app.corsOrigins') || ['http://localhost:3000'];
  const swaggerEnabled = configService.get<boolean>('app.swaggerEnabled') ?? true;
  const jwtSecret = configService.get<string>('jwt.secret');
  const jwtRefreshSecret = configService.get<string>('jwt.refreshSecret');

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT secrets must be configured before starting the application');
  }

  app.enableShutdownHooks();

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('iToyxona API')
      .setDescription('To\'yxona boshqaruv tizimi API hujjatlari')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Autentifikatsiya')
      .addTag('users', 'Foydalanuvchilar')
      .addTag('venues', 'To\'yxonalar')
      .addTag('halls', 'Zallar')
      .addTag('menu', 'Menyu')
      .addTag('services', 'Xizmatlar')
      .addTag('bookings', 'Band qilishlar')
      .addTag('payments', 'To\'lovlar')
      .addTag('clients', 'Mijozlar')
      .addTag('finance', 'Moliya')
      .addTag('dashboard', 'Dashboard')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port, host);

  logger.log(`iToyxona API ishga tushdi: ${baseUrl}`);
  if (swaggerEnabled) {
    logger.log(`Swagger: ${baseUrl}/api/docs`);
  }
}

bootstrap();
