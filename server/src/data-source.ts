import { DataSource } from 'typeorm';
import { Product } from './products/entities/product.entity';

/**
 * AppDataSource - Used internally for database operations
 * Migration handling is automatic through TypeORM synchronize feature
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '5432'),
  username: process.env['DB_USERNAME'] || 'postgres',
  password: process.env['DB_PASSWORD'] || 'moses',
  database: process.env['DB_DATABASE'] || 'projectmanagement',
  entities: [Product],
  synchronize: process.env['NODE_ENV'] === 'development',
  logging: ['error'],
});