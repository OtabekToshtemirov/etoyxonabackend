import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { appConfig, databaseConfig, jwtConfig } from './config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VenuesModule } from './modules/venues/venues.module';
import { HallsModule } from './modules/halls/halls.module';
import { MenuModule } from './modules/menu/menu.module';
import { ServicesModule } from './modules/services/services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ClientsModule } from './modules/clients/clients.module';
import { FinanceModule } from './modules/finance/finance.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AdminModule } from './modules/admin/admin.module';
import { VenuePackagesModule } from './modules/venue-packages/venue-packages.module';
import { SmsModule } from './modules/sms/sms.module';
import { EventTypesModule } from './modules/event-types/event-types.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PaymeModule } from './modules/payments/payme/payme.module';
import { ClickModule } from './modules/payments/click/click.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: '.env',
    }),

    // Rate Limiting — global: 60 requests per minute
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [__dirname + '/modules/**/entities/*.entity{.ts,.js}'],
        synchronize: configService.get('app.env') === 'development',
        logging: configService.get('app.env') === 'development',
      }),
    }),

    // Feature Modules
    AuthModule,
    UsersModule,
    VenuesModule,
    HallsModule,
    MenuModule,
    ServicesModule,
    BookingsModule,
    PaymentsModule,
    ClientsModule,
    FinanceModule,
    DashboardModule,
    AdminModule,
    VenuePackagesModule,
    SmsModule,
    EventTypesModule,
    AnalyticsModule,

    // Payment Providers
    PaymeModule,
    ClickModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
