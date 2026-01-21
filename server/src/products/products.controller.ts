import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ProductsService, ProductWithConflicts } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductVersionedDto } from './dto/update-product-versioned.dto';
import { Product } from './entities/product.entity';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(): Promise<ApiResponse<Product[]>> {
    const products = await this.productsService.findAll();
    return {
      success: true,
      data: products,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<Product>> {
    const product = await this.productsService.findOne(id);
    return {
      success: true,
      data: product,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductDto: CreateProductDto): Promise<ApiResponse<Product>> {
    const product = await this.productsService.create(createProductDto);
    return {
      success: true,
      data: product,
      message: 'Product created successfully',
    };
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ApiResponse<Product>> {
    const product = await this.productsService.update(id, updateProductDto);
    return {
      success: true,
      data: product,
      message: 'Product updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<null>> {
    await this.productsService.remove(id);
    return {
      success: true,
      data: null,
      message: 'Product deleted successfully',
    };
  }

  // Data Consistency Endpoints

  @Get(':id/version')
  async getProductWithVersion(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<Product>> {
    const product = await this.productsService.findOneWithVersion(id);
    return {
      success: true,
      data: product,
    };
  }

  @Put(':id/versioned')
  async updateWithVersionCheck(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductVersionedDto,
  ): Promise<ApiResponse<Product>> {
    const product = await this.productsService.updateWithVersionCheck(id, updateProductDto);
    return {
      success: true,
      data: product,
      message: 'Product updated successfully',
    };
  }

  @Post('consistency-check')
  async checkDataConsistency(): Promise<ApiResponse<{
    totalProducts: number;
    lastModified: Date | null;
    checksum: string;
  }>> {
    const result = await this.productsService.checkDataConsistency();
    return {
      success: true,
      data: result,
    };
  }

  @Post('detect-conflicts')
  async detectConflicts(
    @Body() clientProducts: Partial<Product>[],
  ): Promise<ApiResponse<ProductWithConflicts[]>> {
    const conflicts = await this.productsService.detectConflicts(clientProducts);
    return {
      success: true,
      data: conflicts,
      message: conflicts.length > 0 
        ? `Found ${conflicts.length} conflict(s)` 
        : 'No conflicts detected',
    };
  }

  @Patch('bulk-update')
  async bulkUpdateWithConflictDetection(
    @Body() updates: UpdateProductVersionedDto[],
  ): Promise<ApiResponse<{
    updated: Product[];
    conflicts: ProductWithConflicts[];
  }>> {
    const result = await this.productsService.bulkUpdateWithConflictDetection(updates);
    return {
      success: true,
      data: result,
      message: `Updated ${result.updated.length} product(s), ${result.conflicts.length} conflict(s) detected`,
    };
  }
}