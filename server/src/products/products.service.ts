import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductVersionedDto } from './dto/update-product-versioned.dto';

export interface ConflictInfo {
  field: string;
  currentValue: unknown;
  attemptedValue: unknown;
  lastModified: Date;
}

export interface ProductWithConflicts extends Product {
  conflicts?: ConflictInfo[];
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    return await this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return await this.productRepository.save(product);
  }

  /**
   * Update product with version-aware conflict detection
   */
  async updateWithVersionCheck(
    id: string, 
    updateProductDto: UpdateProductVersionedDto
  ): Promise<Product> {
    const product = await this.findOne(id);
    
    // Check for version conflicts if version is provided
    if (updateProductDto.version !== undefined && product.version !== updateProductDto.version) {
      throw new ConflictException(
        `Product has been modified by another user. Expected version ${updateProductDto.version}, but current version is ${product.version}. Please refresh and try again.`
      );
    }

    // Check for timestamp conflicts if lastModified is provided
    if (updateProductDto.lastModified !== undefined) {
      const clientLastModified = new Date(updateProductDto.lastModified);
      if (product.updatedAt > clientLastModified) {
        throw new ConflictException(
          `Product has been modified more recently on the server. Please refresh and try again.`
        );
      }
    }

    // Remove version and lastModified from update data
    const { version, lastModified, ...updateData } = updateProductDto;
    
    Object.assign(product, updateData);
    return await this.productRepository.save(product);
  }

  /**
   * Get product with version information for conflict detection
   */
  async findOneWithVersion(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ 
      where: { id },
      select: [
        'id', 'name', 'description', 'price', 'quantity', 'category', 
        'imageUrl', 'sku', 'weight', 'dimensions', 'tags', 'isActive', 
        'minStockLevel', 'costPrice', 'notes', 'createdAt', 'updatedAt', 'version'
      ]
    });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    return product;
  }

  /**
   * Check for data consistency issues across all products
   */
  async checkDataConsistency(): Promise<{ 
    totalProducts: number; 
    lastModified: Date | null; 
    checksum: string 
  }> {
    const products = await this.productRepository.find({
      select: ['id', 'updatedAt', 'version'],
      order: { updatedAt: 'DESC' }
    });

    const totalProducts = products.length;
    const lastModified = products.length > 0 && products[0] ? products[0].updatedAt : null;
    
    // Generate checksum based on product versions and timestamps
    const checksumData = products
      .map(p => `${p.id}:${p.version}:${p.updatedAt.getTime()}`)
      .join('|');
    
    const checksum = this.generateChecksum(checksumData);

    return {
      totalProducts,
      lastModified,
      checksum
    };
  }

  /**
   * Detect conflicts between client and server data
   */
  async detectConflicts(clientProducts: Partial<Product>[]): Promise<ProductWithConflicts[]> {
    const conflicts: ProductWithConflicts[] = [];
    
    for (const clientProduct of clientProducts) {
      if (!clientProduct.id) continue;
      
      try {
        const serverProduct = await this.findOneWithVersion(clientProduct.id);
        const productConflicts = this.compareProductVersions(clientProduct, serverProduct);
        
        if (productConflicts.length > 0) {
          conflicts.push({
            ...serverProduct,
            conflicts: productConflicts
          });
        }
      } catch (error) {
        // Product not found on server - could be a deletion conflict
        if (error instanceof NotFoundException) {
          conflicts.push({
            ...clientProduct as Product,
            conflicts: [{
              field: 'existence',
              currentValue: null,
              attemptedValue: 'exists',
              lastModified: new Date()
            }]
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Bulk update products with conflict detection
   */
  async bulkUpdateWithConflictDetection(
    updates: UpdateProductVersionedDto[]
  ): Promise<{ 
    updated: Product[]; 
    conflicts: ProductWithConflicts[]; 
  }> {
    const updated: Product[] = [];
    const conflicts: ProductWithConflicts[] = [];
    
    for (const updateDto of updates) {
      if (!updateDto.id) {
        throw new BadRequestException('Product ID is required for bulk update');
      }
      
      try {
        const updatedProduct = await this.updateWithVersionCheck(updateDto.id!, updateDto);
        updated.push(updatedProduct);
      } catch (error) {
        if (error instanceof ConflictException) {
          try {
            const serverProduct = await this.findOneWithVersion(updateDto.id);
            conflicts.push({
              ...serverProduct,
              conflicts: [{
                field: 'version',
                currentValue: serverProduct.version,
                attemptedValue: updateDto.version,
                lastModified: serverProduct.updatedAt
              }]
            });
          } catch {
            // Handle case where product was deleted
            conflicts.push({
              ...updateDto as Product,
              conflicts: [{
                field: 'existence',
                currentValue: null,
                attemptedValue: 'exists',
                lastModified: new Date()
              }]
            });
          }
        } else {
          throw error;
        }
      }
    }
    
    return { updated, conflicts };
  }

  // Private helper methods

  private compareProductVersions(
    clientProduct: Partial<Product>, 
    serverProduct: Product
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    
    // Check version conflict
    if (clientProduct.version !== undefined && clientProduct.version !== serverProduct.version) {
      conflicts.push({
        field: 'version',
        currentValue: serverProduct.version,
        attemptedValue: clientProduct.version,
        lastModified: serverProduct.updatedAt
      });
    }
    
    // Check timestamp conflict
    if (clientProduct.updatedAt) {
      const clientUpdated = new Date(clientProduct.updatedAt);
      if (serverProduct.updatedAt > clientUpdated) {
        conflicts.push({
          field: 'updatedAt',
          currentValue: serverProduct.updatedAt,
          attemptedValue: clientUpdated,
          lastModified: serverProduct.updatedAt
        });
      }
    }
    
    return conflicts;
  }

  private generateChecksum(data: string): string {
    // Simple hash function for checksum generation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  /**
   * Get all unique categories from products
   */
  async getCategories(): Promise<string[]> {
    const products = await this.productRepository.find({
      select: ['category']
    });
    
    // Extract unique categories and sort them
    const categories = Array.from(new Set(
      products
        .map(p => p.category)
        .filter(c => c && c.trim() !== '')
    )).sort();
    
    return categories;
  }
}