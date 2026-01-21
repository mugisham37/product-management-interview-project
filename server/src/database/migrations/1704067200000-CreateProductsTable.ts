import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProductsTable1704067200000 implements MigrationInterface {
  name = 'CreateProductsTable1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'imageUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'sku',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'dimensions',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'minStockLevel',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'costPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex('products', new TableIndex({
      name: 'IDX_products_name',
      columnNames: ['name']
    }));
    
    await queryRunner.createIndex('products', new TableIndex({
      name: 'IDX_products_category',
      columnNames: ['category']
    }));
    
    await queryRunner.createIndex('products', new TableIndex({
      name: 'IDX_products_created_at',
      columnNames: ['createdAt']
    }));

    // Add constraints
    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD CONSTRAINT "CHK_products_price_positive" 
      CHECK ("price" > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD CONSTRAINT "CHK_products_quantity_non_negative" 
      CHECK ("quantity" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD CONSTRAINT "CHK_products_min_stock_level_non_negative" 
      CHECK ("minStockLevel" >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop constraints first
    await queryRunner.query(`
      ALTER TABLE "products" 
      DROP CONSTRAINT IF EXISTS "CHK_products_price_positive"
    `);

    await queryRunner.query(`
      ALTER TABLE "products" 
      DROP CONSTRAINT IF EXISTS "CHK_products_quantity_non_negative"
    `);

    await queryRunner.query(`
      ALTER TABLE "products" 
      DROP CONSTRAINT IF EXISTS "CHK_products_min_stock_level_non_negative"
    `);

    // Drop indexes
    await queryRunner.dropIndex('products', 'IDX_products_name');
    await queryRunner.dropIndex('products', 'IDX_products_category');
    await queryRunner.dropIndex('products', 'IDX_products_created_at');

    // Drop table
    await queryRunner.dropTable('products');
  }
}