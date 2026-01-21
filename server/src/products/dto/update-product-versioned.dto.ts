import { IsOptional, IsNumber, IsInt, Min, IsString } from 'class-validator';
import { UpdateProductDto } from './update-product.dto';

export class UpdateProductVersionedDto extends UpdateProductDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  version?: number;

  @IsOptional()
  @IsNumber()
  lastModified?: number; // Unix timestamp for client-side tracking
}