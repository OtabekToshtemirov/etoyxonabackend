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

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
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

  const port = configService.get('app.port') || 4000;
  await app.listen(port);

  logger.log(`🚀 iToyxona API ishga tushdi: http://localhost:${port}`);
  logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
