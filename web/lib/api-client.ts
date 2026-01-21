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

/**
 * API Client for Product Management System
 * Handles all HTTP communication with the backend server
 */
class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
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
   * Set up request and response interceptors for centralized error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp to prevent caching issues
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          };
        }
        return config;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
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
   * Get all products with optional query parameters
   */
  public async getProducts(params?: ProductQueryParams): Promise<Product[]> {
    try {
      const response = await this.client.get<ApiResponse<Product[]>>('/products', {
        params,
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
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
   * Get a single product by ID
   */
  public async getProduct(id: string): Promise<Product> {
    try {
      const response = await this.client.get<ApiResponse<Product>>(`/products/${id}`);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new product
   */
  public async createProduct(productData: CreateProductRequest): Promise<Product> {
    try {
      const response = await this.client.post<ApiResponse<Product>>('/products', productData);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  public async updateProduct(id: string, productData: UpdateProductRequest): Promise<Product> {
    try {
      const response = await this.client.put<ApiResponse<Product>>(`/products/${id}`, productData);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a product by ID
   */
  public async deleteProduct(id: string): Promise<void> {
    try {
      await this.client.delete<ApiResponse<null>>(`/products/${id}`);
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
   * Get all product categories
   */
  public async getCategories(): Promise<string[]> {
    try {
      const response = await this.client.get<ApiResponse<string[]>>('/products/categories');
      return response.data.data;
    } catch (error) {
      throw error;
    }
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
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;