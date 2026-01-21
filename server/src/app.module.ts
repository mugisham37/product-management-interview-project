import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database module - Auto-syncs entities in development, manual migrations in production
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const isDevelopment = configService.get('NODE_ENV') === 'development';

        return {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST') || 'localhost',
          port: configService.get<number>('DB_PORT') || 5432,
          username: configService.get<string>('DB_USERNAME') || 'postgres',
          password: configService.get<string>('DB_PASSWORD') || 'moses',
          database: configService.get<string>('DB_DATABASE') || 'projectmanagement',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: isDevelopment,
          logging: isDevelopment ? ['error'] : false,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
          retryAttempts: 3,
          retryDelay: 1000,
        };
      },
      inject: [ConfigService],
    }),

    // Feature modules
    ProductsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}