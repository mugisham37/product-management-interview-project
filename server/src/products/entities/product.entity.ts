import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  VersionColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  @Index()
  name!: string;

  @Column('text')
  description!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price!: number;

  @Column('int')
  quantity!: number;

  @Column({ length: 100 })
  @Index()
  category!: string;

  @Column({ length: 500, nullable: true })
  imageUrl?: string;

  @Column({ length: 50, nullable: true })
  sku?: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  weight?: number;

  @Column('json', { nullable: true })
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };

  @Column('simple-array', { nullable: true })
  tags?: string[];

  @Column({ default: true })
  isActive!: boolean;

  @Column('int', { default: 0 })
  minStockLevel!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  costPrice?: number;

  @Column('text', { nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}