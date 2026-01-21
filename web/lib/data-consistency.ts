import { Product } from '@/app/types/product';
import { apiClient } from './api-client';

/**
 * Data Consistency Service
 * Handles data synchronization, conflict resolution, and consistency validation
 * between frontend and backend
 */

export interface DataConsistencyOptions {
  enableAutoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  conflictResolutionStrategy?: 'server-wins' | 'client-wins' | 'merge' | 'prompt-user';
  maxRetries?: number;
  retryDelay?: number;
}

export interface ConsistencyCheckResult {
  isConsistent: boolean;
  conflicts: ProductConflict[];
  lastChecked: Date;
}

export interface ProductConflict {
  productId: string;
  field: keyof Product;
  clientValue: unknown;
  serverValue: unknown;
  lastModified: {
    client: Date;
    server: Date;
  };
}

export interface DataSnapshot {
  products: Product[];
  timestamp: Date;
  checksum: string;
}

export class DataConsistencyService {
  private options: Required<DataConsistencyOptions>;
  private refreshTimer: NodeJS.Timeout | null = null;
  private lastSnapshot: DataSnapshot | null = null;
  private conflictCallbacks: Array<(conflicts: ProductConflict[]) => void> = [];
  private refreshCallbacks: Array<(products: Product[]) => void> = [];

  constructor(options: DataConsistencyOptions = {}) {
    this.options = {
      enableAutoRefresh: options.enableAutoRefresh ?? false,
      refreshInterval: options.refreshInterval ?? 30000, // 30 seconds
      conflictResolutionStrategy: options.conflictResolutionStrategy ?? 'server-wins',
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
    };
  }

  /**
   * Initialize the data consistency service
   */
  public initialize(): void {
    if (this.options.enableAutoRefresh) {
      this.startAutoRefresh();
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopAutoRefresh();
    this.conflictCallbacks = [];
    this.refreshCallbacks = [];
  }

  /**
   * Create a snapshot of current data for consistency checking
   */
  public createSnapshot(products: Product[]): DataSnapshot {
    const timestamp = new Date();
    const checksum = this.calculateChecksum(products);
    
    const snapshot: DataSnapshot = {
      products: JSON.parse(JSON.stringify(products)), // Deep clone
      timestamp,
      checksum,
    };

    this.lastSnapshot = snapshot;
    return snapshot;
  }

  /**
   * Check data consistency between client and server
   */
  public async checkConsistency(clientProducts: Product[]): Promise<ConsistencyCheckResult> {
    try {
      // Fetch current server data
      const serverProducts = await apiClient.getProducts();
      
      // Compare client and server data
      const conflicts = this.detectConflicts(clientProducts, serverProducts);
      
      const result: ConsistencyCheckResult = {
        isConsistent: conflicts.length === 0,
        conflicts,
        lastChecked: new Date(),
      };

      // Notify conflict callbacks if conflicts exist
      if (conflicts.length > 0) {
        this.notifyConflictCallbacks(conflicts);
      }

      return result;
    } catch (error) {
      console.error('Failed to check data consistency:', error);
      throw error;
    }
  }

  /**
   * Refresh data from server and detect changes
   */
  public async refreshData(): Promise<Product[]> {
    try {
      const serverProducts = await apiClient.getProducts();
      
      // Update snapshot
      this.createSnapshot(serverProducts);
      
      // Notify refresh callbacks
      this.notifyRefreshCallbacks(serverProducts);
      
      return serverProducts;
    } catch (error) {
      console.error('Failed to refresh data:', error);
      throw error;
    }
  }

  /**
   * Resolve conflicts based on the configured strategy
   */
  public async resolveConflicts(
    conflicts: ProductConflict[],
    clientProducts: Product[],
    serverProducts: Product[]
  ): Promise<Product[]> {
    switch (this.options.conflictResolutionStrategy) {
      case 'server-wins':
        return this.resolveServerWins(conflicts, serverProducts);
      
      case 'client-wins':
        return this.resolveClientWins(conflicts, clientProducts, serverProducts);
      
      case 'merge':
        return this.resolveMerge(conflicts, clientProducts, serverProducts);
      
      case 'prompt-user':
        // This would typically show a UI dialog - for now, default to server wins
        console.warn('User prompt conflict resolution not implemented, defaulting to server wins');
        return this.resolveServerWins(conflicts, serverProducts);
      
      default:
        return serverProducts;
    }
  }

  /**
   * Validate product data integrity
   */
  public validateProductData(product: Product): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!product.id) errors.push('Product ID is required');
    if (!product.name?.trim()) errors.push('Product name is required');
    if (!product.description?.trim()) errors.push('Product description is required');
    if (typeof product.price !== 'number' || product.price <= 0) {
      errors.push('Product price must be a positive number');
    }
    if (typeof product.quantity !== 'number' || product.quantity < 0) {
      errors.push('Product quantity must be a non-negative number');
    }
    if (!product.category?.trim()) errors.push('Product category is required');

    // Optional fields validation
    if (product.imageUrl && !this.isValidUrl(product.imageUrl)) {
      errors.push('Product image URL must be a valid URL');
    }
    if (product.weight && (typeof product.weight !== 'number' || product.weight < 0)) {
      errors.push('Product weight must be a non-negative number');
    }
    if (product.costPrice && (typeof product.costPrice !== 'number' || product.costPrice < 0)) {
      errors.push('Product cost price must be a non-negative number');
    }

    // Timestamp validation
    if (!product.createdAt) errors.push('Product creation timestamp is required');
    if (!product.updatedAt) errors.push('Product update timestamp is required');

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Perform optimistic update with rollback capability
   */
  public async performOptimisticUpdate<T>(
    operation: () => Promise<T>,
    rollback: () => void,
    retries: number = this.options.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Rollback optimistic changes
      rollback();
      
      // Retry if retries remaining
      if (retries > 0) {
        await this.delay(this.options.retryDelay);
        return this.performOptimisticUpdate(operation, rollback, retries - 1);
      }
      
      throw error;
    }
  }

  /**
   * Register callback for conflict notifications
   */
  public onConflictDetected(callback: (conflicts: ProductConflict[]) => void): void {
    this.conflictCallbacks.push(callback);
  }

  /**
   * Register callback for data refresh notifications
   */
  public onDataRefresh(callback: (products: Product[]) => void): void {
    this.refreshCallbacks.push(callback);
  }

  /**
   * Remove conflict callback
   */
  public removeConflictCallback(callback: (conflicts: ProductConflict[]) => void): void {
    const index = this.conflictCallbacks.indexOf(callback);
    if (index > -1) {
      this.conflictCallbacks.splice(index, 1);
    }
  }

  /**
   * Remove refresh callback
   */
  public removeRefreshCallback(callback: (products: Product[]) => void): void {
    const index = this.refreshCallbacks.indexOf(callback);
    if (index > -1) {
      this.refreshCallbacks.splice(index, 1);
    }
  }

  // Private methods

  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshData();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, this.options.refreshInterval);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private calculateChecksum(products: Product[]): string {
    // Simple checksum based on product data
    const dataString = JSON.stringify(
      products
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(p => ({ id: p.id, updatedAt: p.updatedAt }))
    );
    
    // Simple hash function (for production, use a proper hash library)
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  private detectConflicts(clientProducts: Product[], serverProducts: Product[]): ProductConflict[] {
    const conflicts: ProductConflict[] = [];
    
    // Create maps for efficient lookup
    const clientMap = new Map(clientProducts.map(p => [p.id, p]));
    const serverMap = new Map(serverProducts.map(p => [p.id, p]));
    
    // Check for conflicts in existing products
    for (const [id, clientProduct] of clientMap) {
      const serverProduct = serverMap.get(id);
      
      if (serverProduct) {
        const productConflicts = this.compareProducts(clientProduct, serverProduct);
        conflicts.push(...productConflicts);
      }
    }
    
    return conflicts;
  }

  private compareProducts(clientProduct: Product, serverProduct: Product): ProductConflict[] {
    const conflicts: ProductConflict[] = [];
    
    // Compare updatedAt timestamps first
    const clientUpdated = new Date(clientProduct.updatedAt);
    const serverUpdated = new Date(serverProduct.updatedAt);
    
    // If server version is newer and data differs, there's a conflict
    if (serverUpdated > clientUpdated) {
      const fieldsToCheck: (keyof Product)[] = [
        'name', 'description', 'price', 'quantity', 'category', 
        'imageUrl', 'sku', 'weight', 'isActive', 'minStockLevel', 'costPrice', 'notes'
      ];
      
      for (const field of fieldsToCheck) {
        if (JSON.stringify(clientProduct[field]) !== JSON.stringify(serverProduct[field])) {
          conflicts.push({
            productId: clientProduct.id,
            field,
            clientValue: clientProduct[field],
            serverValue: serverProduct[field],
            lastModified: {
              client: clientUpdated,
              server: serverUpdated,
            },
          });
        }
      }
    }
    
    return conflicts;
  }

  private resolveServerWins(conflicts: ProductConflict[], serverProducts: Product[]): Product[] {
    // Server wins - return server data as-is
    return serverProducts;
  }

  private async resolveClientWins(
    conflicts: ProductConflict[], 
    clientProducts: Product[], 
    serverProducts: Product[]
  ): Promise<Product[]> {
    // Client wins - update server with client data for conflicted products
    const conflictedProductIds = new Set(conflicts.map(c => c.productId));
    const updatedProducts: Product[] = [];
    
    for (const clientProduct of clientProducts) {
      if (conflictedProductIds.has(clientProduct.id)) {
        try {
          // Update server with client data
          const updated = await apiClient.updateProduct(clientProduct.id, {
            name: clientProduct.name,
            description: clientProduct.description,
            price: clientProduct.price,
            quantity: clientProduct.quantity,
            category: clientProduct.category,
            imageUrl: clientProduct.imageUrl,
            sku: clientProduct.sku,
            weight: clientProduct.weight,
            dimensions: clientProduct.dimensions,
            tags: clientProduct.tags,
            isActive: clientProduct.isActive,
            minStockLevel: clientProduct.minStockLevel,
            costPrice: clientProduct.costPrice,
            notes: clientProduct.notes,
          });
          updatedProducts.push(updated);
        } catch (error) {
          console.error(`Failed to update product ${clientProduct.id}:`, error);
          // Fall back to server version
          const serverProduct = serverProducts.find(p => p.id === clientProduct.id);
          if (serverProduct) {
            updatedProducts.push(serverProduct);
          }
        }
      } else {
        updatedProducts.push(clientProduct);
      }
    }
    
    return updatedProducts;
  }

  private resolveMerge(
    conflicts: ProductConflict[], 
    clientProducts: Product[], 
    serverProducts: Product[]
  ): Product[] {
    // Merge strategy - combine client and server data intelligently
    const mergedProducts: Product[] = [];
    const clientMap = new Map(clientProducts.map(p => [p.id, p]));
    const serverMap = new Map(serverProducts.map(p => [p.id, p]));
    
    // Get all unique product IDs
    const allIds = new Set([...clientMap.keys(), ...serverMap.keys()]);
    
    for (const id of allIds) {
      const clientProduct = clientMap.get(id);
      const serverProduct = serverMap.get(id);
      
      if (clientProduct && serverProduct) {
        // Merge logic: use newer timestamp for each field
        const merged = this.mergeProducts(clientProduct, serverProduct);
        mergedProducts.push(merged);
      } else if (clientProduct) {
        mergedProducts.push(clientProduct);
      } else if (serverProduct) {
        mergedProducts.push(serverProduct);
      }
    }
    
    return mergedProducts;
  }

  private mergeProducts(clientProduct: Product, serverProduct: Product): Product {
    const clientUpdated = new Date(clientProduct.updatedAt);
    const serverUpdated = new Date(serverProduct.updatedAt);
    
    // Use the product with the newer timestamp as base
    const baseProduct = serverUpdated > clientUpdated ? serverProduct : clientProduct;
    
    // For merge strategy, we could implement field-level merging
    // For now, just return the newer product
    return baseProduct;
  }

  private notifyConflictCallbacks(conflicts: ProductConflict[]): void {
    this.conflictCallbacks.forEach(callback => {
      try {
        callback(conflicts);
      } catch (error) {
        console.error('Error in conflict callback:', error);
      }
    });
  }

  private notifyRefreshCallbacks(products: Product[]): void {
    this.refreshCallbacks.forEach(callback => {
      try {
        callback(products);
      } catch (error) {
        console.error('Error in refresh callback:', error);
      }
    });
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const dataConsistencyService = new DataConsistencyService();