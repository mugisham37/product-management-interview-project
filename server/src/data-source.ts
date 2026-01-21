import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Product } from './products/entities/product.entity';

// Create a configuration service instance for migration purposes
const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '5432'),
  username: process.env['DB_USERNAME'] || 'postgres',
  password: process.env['DB_PASSWORD'] || 'password',
  database: process.env['DB_DATABASE'] || 'product_management',
  entities: [Product],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false, // Always false for migrations
  logging: process.env['NODE_ENV'] === 'development',
});