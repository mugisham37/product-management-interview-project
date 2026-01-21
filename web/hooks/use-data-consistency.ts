import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '@/app/types/product';
import { 
  dataConsistencyService, 
  DataConsistencyOptions, 
  ConsistencyCheckResult, 
  ProductConflict 
} from '@/lib/data-consistency';

export interface UseDataConsistencyOptions extends DataConsistencyOptions {
  autoCheck?: boolean;
  checkInterval?: number;
}

export interface DataConsistencyState {
  isChecking: boolean;
  lastCheck: Date | null;
  conflicts: ProductConflict[];
  isConsistent: boolean;
  error: string | null;
}

export interface DataConsistencyActions {
  checkConsistency: (products: Product[]) => Promise<void>;
  refreshData: () => Promise<Product[]>;
  resolveConflicts: (products: Product[]) => Promise<Product[]>;
  createSnapshot: (products: Product[]) => void;
  clearError: () => void;
}

/**
 * React hook for managing data consistency between frontend and backend
 */
export function useDataConsistency(
  options: UseDataConsistencyOptions = {}
): [DataConsistencyState, DataConsistencyActions] {
  const [state, setState] = useState<DataConsistencyState>({
    isChecking: false,
    lastCheck: null,
    conflicts: [],
    isConsistent: true,
    error: null,
  });

  const optionsRef = useRef(options);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize data consistency service
  useEffect(() => {
    const service = dataConsistencyService;
    
    // Initialize service with options
    // Note: The singleton instance is already created, so we just initialize it
    service.initialize();

    // Set up conflict detection callback
    const handleConflicts = (conflicts: ProductConflict[]) => {
      setState(prev => ({
        ...prev,
        conflicts,
        isConsistent: conflicts.length === 0,
      }));
    };

    service.onConflictDetected(handleConflicts);

    return () => {
      service.removeConflictCallback(handleConflicts);
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
      }
    };
  }, [options]);

  // Auto-check consistency if enabled
  useEffect(() => {
    if (options.autoCheck && options.checkInterval) {
      checkTimerRef.current = setInterval(() => {
        // This would need access to current products - 
        // in practice, this should be managed by the parent component
        console.log('Auto-check triggered - implement in parent component');
      }, options.checkInterval);

      return () => {
        if (checkTimerRef.current) {
          clearInterval(checkTimerRef.current);
        }
      };
    }
  }, [options.autoCheck, options.checkInterval]);

  // Check data consistency
  const checkConsistency = useCallback(async (products: Product[]) => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const result: ConsistencyCheckResult = await dataConsistencyService.checkConsistency(products);
      
      setState(prev => ({
        ...prev,
        isChecking: false,
        lastCheck: result.lastChecked,
        conflicts: result.conflicts,
        isConsistent: result.isConsistent,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check data consistency';
      setState(prev => ({
        ...prev,
        isChecking: false,
        error: errorMessage,
      }));
    }
  }, []);

  // Refresh data from server
  const refreshData = useCallback(async (): Promise<Product[]> => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const products = await dataConsistencyService.refreshData();
      
      setState(prev => ({
        ...prev,
        lastCheck: new Date(),
        conflicts: [],
        isConsistent: true,
      }));

      return products;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  // Resolve conflicts
  const resolveConflicts = useCallback(async (products: Product[]): Promise<Product[]> => {
    setState(prev => ({ ...prev, error: null }));

    try {
      // Get fresh server data
      const serverProducts = await dataConsistencyService.refreshData();
      
      // Resolve conflicts
      const resolvedProducts = await dataConsistencyService.resolveConflicts(
        state.conflicts,
        products,
        serverProducts
      );

      setState(prev => ({
        ...prev,
        conflicts: [],
        isConsistent: true,
        lastCheck: new Date(),
      }));

      return resolvedProducts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve conflicts';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    }
  }, [state.conflicts]);

  // Create data snapshot
  const createSnapshot = useCallback((products: Product[]) => {
    dataConsistencyService.createSnapshot(products);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const actions: DataConsistencyActions = {
    checkConsistency,
    refreshData,
    resolveConflicts,
    createSnapshot,
    clearError,
  };

  return [state, actions];
}

/**
 * Hook for optimistic updates with automatic rollback on failure
 */
export function useOptimisticUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);

  const performOptimisticUpdate = useCallback(async <T>(
    optimisticUpdate: () => void,
    serverOperation: () => Promise<T>,
    rollback: () => void
  ): Promise<T> => {
    setIsUpdating(true);

    try {
      // Apply optimistic update immediately
      optimisticUpdate();

      // Perform server operation
      const result = await dataConsistencyService.performOptimisticUpdate(
        serverOperation,
        rollback
      );

      return result;
    } catch (error) {
      // Rollback is handled by the service
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    isUpdating,
    performOptimisticUpdate,
  };
}

/**
 * Hook for managing data refresh with conflict detection
 */
export function useDataRefresh(products: Product[]) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async (): Promise<Product[]> => {
    setIsRefreshing(true);

    try {
      // Check for conflicts before refreshing
      const consistencyResult = await dataConsistencyService.checkConsistency(products);
      
      if (!consistencyResult.isConsistent) {
        console.warn('Data conflicts detected during refresh:', consistencyResult.conflicts);
      }

      // Refresh data
      const refreshedProducts = await dataConsistencyService.refreshData();
      setLastRefresh(new Date());

      return refreshedProducts;
    } catch (error) {
      console.error('Failed to refresh data:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [products]);

  return {
    isRefreshing,
    lastRefresh,
    refresh,
  };
}