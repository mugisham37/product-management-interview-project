import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductQueryParams,
  StockUpdateRequest,
  ApiResponse,
  PaginatedResponse,
  ApiError,
  NetworkError,
} from '@/app/types';
import { trackApiCall } from './performance-monitor';

/**
 * Extend Axios config type to support custom metadata
 */
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
      cacheHit: boolean;
    };
  }
}

/**
 * API Client for Product Management System
 * Handles all HTTP communication with the backend server
 * Optimized for performance with caching and request deduplication
 */
class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private cache: Map<string, { data: unknown; timestamp: number; ttl: number }>;
  private pendingRequests: Map<string, Promise<unknown>>;
  private readonly DEFAULT_CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.cache = new Map();
    this.pendingRequests = new Map();
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(url: string, params?: unknown): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}${paramString}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cacheEntry: { data: unknown; timestamp: number; ttl: number }): boolean {
    return Date.now() - cacheEntry.timestamp < cacheEntry.ttl;
  }

  /**
   * Get data from cache if valid
   */
  private getFromCache<T>(key: string): T | null {
    const cacheEntry = this.cache.get(key);
    if (cacheEntry && this.isCacheValid(cacheEntry)) {
      return cacheEntry.data as T;
    }
    if (cacheEntry) {
      this.cache.delete(key); // Remove expired entry
    }
    return null;
  }

  /**
   * Store data in cache
   */
  private setCache(key: string, data: unknown, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear cache entries matching pattern
   */
  private clearCachePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Deduplicate concurrent requests
   */
  private async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Set up request and response interceptors for centralized error handling
   */
  private setupInterceptors(): void {
    // Request interceptor - optimized for performance with tracking
    this.client.interceptors.request.use(
      (config) => {
        // Add performance tracking metadata
        config.metadata = {
          startTime: performance.now(),
          cacheHit: false
        };
        
        // Only add cache-busting for non-GET requests or when explicitly needed
        if (config.method !== 'get' && config.headers?.['Cache-Control'] !== 'no-cache') {
          // Allow browser caching for GET requests to improve performance
          delete config.params?._t;
        }
        return config;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor with performance tracking
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Track successful API calls
        const config = response.config;
        if (config.metadata?.startTime) {
          trackApiCall(
            config.method?.toUpperCase() || 'GET',
            config.url || '',
            config.metadata.startTime,
            performance.now(),
            response.status,
            config.metadata.cacheHit
          );
        }
        return response;
      },
      (error: AxiosError) => {
        // Track failed API calls
        const config = error.config;
        if (config?.metadata?.startTime) {
          trackApiCall(
            config.method?.toUpperCase() || 'GET',
            config.url || '',
            config.metadata.startTime,
            performance.now(),
            error.response?.status,
            false
          );
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Centralized error handling for API requests
   */
  private handleError(error: AxiosError): ApiError | NetworkError {
    // Network connectivity issues
    if (!error.response) {
      const networkError: NetworkError = {
        message: error.code === 'ECONNABORTED' 
          ? 'Request timeout - please check your connection and try again'
          : 'Network error - please check your internet connection',
        code: error.code || 'NETWORK_ERROR',
        isNetworkError: true,
      };
      return networkError;
    }

    // Server responded with error status
    const { status, data } = error.response;
    const errorData = data as { message?: string; errors?: unknown; [key: string]: unknown };
    
    // Handle different HTTP status codes
    switch (status) {
      case 400:
        return {
          message: errorData?.message || 'Invalid request data',
          statusCode: status,
          error: 'Bad Request',
          details: (errorData?.errors || errorData) as Record<string, unknown> | undefined,
        };
      
      case 401:
        return {
          message: 'Authentication required',
          statusCode: status,
          error: 'Unauthorized',
        };
      
      case 403:
        return {
          message: 'Access forbidden',
          statusCode: status,
          error: 'Forbidden',
        };
      
      case 404:
        return {
          message: errorData?.message || 'Resource not found',
          statusCode: status,
          error: 'Not Found',
        };
      
      case 409:
        return {
          message: errorData?.message || 'Conflict with existing data',
          statusCode: status,
          error: 'Conflict',
        };
      
      case 422:
        return {
          message: errorData?.message || 'Validation failed',
          statusCode: status,
          error: 'Unprocessable Entity',
          details: (errorData?.errors || errorData) as Record<string, unknown> | undefined,
        };
      
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          message: 'Server error occurred - please try again later',
          statusCode: status,
          error: 'Server Error',
        };
      
      default:
        return {
          message: errorData?.message || 'An unexpected error occurred',
          statusCode: status,
          error: 'Unknown Error',
          details: errorData as Record<string, unknown> | undefined,
        };
    }
  }

  /**
   * Get the base URL for the API
   */
  public getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Check if the API is reachable
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // ==================== PRODUCT API METHODS ====================

  /**
   * Get all products with optional query parameters (cached)
   */
  public async getProducts(params?: ProductQueryParams): Promise<Product[]> {
    const cacheKey = this.getCacheKey('/products', params);
    
    // Check cache first
    const cachedData = this.getFromCache<Product[]>(cacheKey);
    if (cachedData) {
      // Track cache hit for performance monitoring
      trackApiCall('GET', '/products', performance.now(), performance.now(), 200, true);
      return cachedData;
    }

    // Deduplicate concurrent requests
    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const response = await this.client.get<ApiResponse<Product[]>>('/products', {
          params,
        });
        const data = response.data.data;
        
        // Cache the result
        this.setCache(cacheKey, data);
        return data;
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * Get paginated products with optional query parameters
   */
  public async getProductsPaginated(params?: ProductQueryParams): Promise<PaginatedResponse<Product>> {
    try {
      const response = await this.client.get<ApiResponse<PaginatedResponse<Product>>>('/products', {
        params,
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single product by ID (cached)
   */
  public async getProduct(id: string): Promise<Product> {
    const cacheKey = this.getCacheKey(`/products/${id}`);
    
    // Check cache first
    const cachedData = this.getFromCache<Product>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Deduplicate concurrent requests
    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const response = await this.client.get<ApiResponse<Product>>(`/products/${id}`);
        const data = response.data.data;
        
        // Cache the result with longer TTL for individual products
        this.setCache(cacheKey, data, 60000); // 1 minute
        return data;
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * Create a new product (invalidates cache)
   */
  public async createProduct(productData: CreateProductRequest): Promise<Product> {
    try {
      const response = await this.client.post<ApiResponse<Product>>('/products', productData);
      const data = response.data.data;
      
      // Invalidate products list cache
      this.clearCachePattern('/products');
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an existing product (invalidates cache)
   */
  public async updateProduct(id: string, productData: UpdateProductRequest): Promise<Product> {
    try {
      const response = await this.client.put<ApiResponse<Product>>(`/products/${id}`, productData);
      const data = response.data.data;
      
      // Invalidate related cache entries
      this.clearCachePattern('/products');
      this.cache.delete(this.getCacheKey(`/products/${id}`));
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a product by ID (invalidates cache)
   */
  public async deleteProduct(id: string): Promise<void> {
    try {
      await this.client.delete<ApiResponse<null>>(`/products/${id}`);
      
      // Invalidate related cache entries
      this.clearCachePattern('/products');
      this.cache.delete(this.getCacheKey(`/products/${id}`));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create multiple products in bulk
   */
  public async createProductsBulk(products: CreateProductRequest[]): Promise<Product[]> {
    try {
      const response = await this.client.post<ApiResponse<Product[]>>('/products/bulk', products);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete multiple products in bulk
   */
  public async deleteProductsBulk(ids: string[]): Promise<void> {
    try {
      await this.client.delete<ApiResponse<null>>('/products/bulk', {
        data: ids,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update product stock
   */
  public async updateProductStock(id: string, stockUpdate: StockUpdateRequest): Promise<Product> {
    try {
      const response = await this.client.patch<ApiResponse<Product>>(`/products/${id}/stock`, stockUpdate);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Toggle product active status
   */
  public async toggleProductActive(id: string): Promise<Product> {
    try {
      const response = await this.client.patch<ApiResponse<Product>>(`/products/${id}/toggle-active`);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all product categories (cached with longer TTL)
   */
  public async getCategories(): Promise<string[]> {
    const cacheKey = this.getCacheKey('/products/categories');
    
    // Check cache first - categories change less frequently
    const cachedData = this.getFromCache<string[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const response = await this.client.get<ApiResponse<string[]>>('/products/categories');
        const data = response.data.data;
        
        // Cache categories for longer (5 minutes)
        this.setCache(cacheKey, data, 300000);
        return data;
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * Clear all cache entries
   */
  public clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Search products by query string
   */
  public async searchProducts(query: string): Promise<Product[]> {
    try {
      const response = await this.client.get<ApiResponse<Product[]>>('/products/search', {
        params: { q: query },
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get products with low stock levels
   */
  public async getLowStockProducts(): Promise<Product[]> {
    try {
      const response = await this.client.get<ApiResponse<Product[]>>('/products/low-stock');
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== DATA CONSISTENCY METHODS ====================

  /**
   * Get product with version information for conflict detection
   */
  public async getProductWithVersion(id: string): Promise<Product> {
    try {
      const response = await this.client.get<ApiResponse<Product>>(`/products/${id}/version`);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update product with version checking for conflict detection
   */
  public async updateProductWithVersionCheck(
    id: string, 
    productData: UpdateProductRequest
  ): Promise<Product> {
    try {
      const response = await this.client.put<ApiResponse<Product>>(
        `/products/${id}/versioned`, 
        productData
      );
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check overall data consistency
   */
  public async checkDataConsistency(): Promise<{
    totalProducts: number;
    lastModified: Date | null;
    checksum: string;
  }> {
    try {
      const response = await this.client.post<ApiResponse<{
        totalProducts: number;
        lastModified: Date | null;
        checksum: string;
      }>>('/products/consistency-check');
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Detect conflicts between client and server data
   */
  public async detectConflicts(clientProducts: Partial<Product>[]): Promise<Product[]> {
    try {
      const response = await this.client.post<ApiResponse<Product[]>>(
        '/products/detect-conflicts',
        clientProducts
      );
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk update products with conflict detection
   */
  public async bulkUpdateWithConflictDetection(
    updates: UpdateProductRequest[]
  ): Promise<{
    updated: Product[];
    conflicts: Product[];
  }> {
    try {
      const response = await this.client.patch<ApiResponse<{
        updated: Product[];
        conflicts: Product[];
      }>>('/products/bulk-update', updates);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;