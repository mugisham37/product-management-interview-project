import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVersionColumn1704067300000 implements MigrationInterface {
  name = 'AddVersionColumn1704067300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD COLUMN "version" integer NOT NULL DEFAULT 1
    `);
    
    // Create index on version column for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_products_version" ON "products" ("version")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_products_version"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "version"`);
  }
}