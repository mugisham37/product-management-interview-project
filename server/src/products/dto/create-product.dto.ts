import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsInt,
  IsOptional,
  IsUrl,
  MaxLength,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class DimensionsDto {
  @IsNumber()
  @IsPositive()
  length!: number;

  @IsNumber()
  @IsPositive()
  width!: number;

  @IsNumber()
  @IsPositive()
  height!: number;

  @IsEnum(['cm', 'in'])
  unit!: 'cm' | 'in';
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @IsPositive()
  @Transform(({ value }: { value: any }) => parseFloat(value))
  price!: number;

  @IsInt()
  @IsPositive()
  @Transform(({ value }: { value: any }) => parseInt(value))
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }: { value: any }) => parseFloat(value))
  weight?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStockLevel?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }: { value: any }) => parseFloat(value))
  costPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}