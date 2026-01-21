import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProduct: Product = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    quantity: 10,
    category: 'Electronics',
    imageUrl: 'https://example.com/image.jpg',
    sku: 'TEST-001',
    weight: 1.5,
    dimensions: { length: 10, width: 5, height: 3, unit: 'cm' },
    tags: ['test', 'electronics'],
    isActive: true,
    minStockLevel: 5,
    costPrice: 50.00,
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all products with success response', async () => {
      const products = [mockProduct];
      mockProductsService.findAll.mockResolvedValue(products);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: products,
      });
    });
  });

  describe('findOne', () => {
    it('should return a product with success response', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne(mockProduct.id);

      expect(service.findOne).toHaveBeenCalledWith(mockProduct.id);
      expect(result).toEqual({
        success: true,
        data: mockProduct,
      });
    });
  });

  describe('create', () => {
    it('should create a product and return success response', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        quantity: 10,
        category: 'Electronics',
        imageUrl: 'https://example.com/image.jpg',
      };

      mockProductsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createProductDto);

      expect(service.create).toHaveBeenCalledWith(createProductDto);
      expect(result).toEqual({
        success: true,
        data: mockProduct,
        message: 'Product created successfully',
      });
    });
  });

  describe('update', () => {
    it('should update a product and return success response', async () => {
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
        price: 149.99,
      };

      const updatedProduct = { ...mockProduct, ...updateProductDto };
      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update(mockProduct.id, updateProductDto);

      expect(service.update).toHaveBeenCalledWith(mockProduct.id, updateProductDto);
      expect(result).toEqual({
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully',
      });
    });
  });

  describe('remove', () => {
    it('should remove a product and return success response', async () => {
      mockProductsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockProduct.id);

      expect(service.remove).toHaveBeenCalledWith(mockProduct.id);
      expect(result).toEqual({
        success: true,
        data: null,
        message: 'Product deleted successfully',
      });
    });
  });
});