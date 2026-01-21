'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Product, ProductQueryParams } from '@/app/types';
import { apiClient } from '@/lib/api-client';
import { ProductCard } from './ProductCard';
import { LoadingSpinner, PageLoadingSpinner } from './LoadingSpinner';
import { ErrorMessage, NetworkErrorMessage } from './ErrorMessage';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductDashboardProps {
  className?: string;
  onProductCreated?: (product: Product) => void;
  onProductUpdated?: (product: Product) => void;
}

export function ProductDashboard({ className, onProductCreated, onProductUpdated }: ProductDashboardProps) {
  const router = useRouter();
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'quantity' | 'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [operationsInProgress, setOperationsInProgress] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Delete confirmation dialog state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Load products with current filters
  const loadProducts = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const queryParams: ProductQueryParams = {
        sortBy,
        sortOrder,
      };

      if (searchQuery.trim()) {
        queryParams.search = searchQuery.trim();
      }

      if (selectedCategory) {
        queryParams.category = selectedCategory;
      }

      const data = await apiClient.getProducts(queryParams);
      setProducts(data);
    } catch (err: unknown) {
      console.error('Failed to load products:', err);
      const error = err as { isNetworkError?: boolean; message?: string };
      if (error.isNetworkError) {
        setError('Unable to connect to the server. Please check your internet connection.');
      } else {
        setError(error.message || 'Failed to load products. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, selectedCategory, sortBy, sortOrder]);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const data = await apiClient.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
      // Don't show error for categories as it's not critical
    }
  }, []);

  // Handle product edit
  const handleEdit = useCallback((product: Product) => {
    router.push(`/products/${product.id}/edit`);
  }, [router]);

  // Handle product delete initiation - opens confirmation dialog
  const handleDeleteInitiate = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setProductToDelete(product);
      setIsDeleteDialogOpen(true);
    }
  }, [products]);

  // Handle confirmed product delete with optimistic updates
  const handleDeleteConfirm = useCallback(async (productId: string) => {
    if (!productToDelete) return;

    setIsDeletingProduct(true);
    
    // Add to operations in progress
    setOperationsInProgress(prev => new Set(prev).add(`delete-${productId}`));
    
    // Store original products for potential revert
    const originalProducts = [...products];
    
    // Optimistic update - immediately remove from UI
    setProducts(prev => prev.filter(p => p.id !== productId));

    try {
      await apiClient.deleteProduct(productId);
      
      // Success - close dialog and show success message
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      setSuccessMessage('Product deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to delete product:', err);
      
      // Revert optimistic update on failure
      setProducts(originalProducts);
      
      // Show error message
      const error = err as { isNetworkError?: boolean; message?: string };
      const errorMessage = error.isNetworkError 
        ? 'Unable to delete product. Please check your connection and try again.'
        : error.message || 'Failed to delete product. Please try again.';
      
      setError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsDeletingProduct(false);
      
      // Remove from operations in progress
      setOperationsInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(`delete-${productId}`);
        return newSet;
      });
    }
  }, [products, productToDelete]);

  // Handle delete dialog close
  const handleDeleteCancel = useCallback(() => {
    if (!isDeletingProduct) {
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  }, [isDeletingProduct]);

  // Handle optimistic product creation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOptimisticCreate = useCallback((newProduct: Product) => {
    // Optimistically add the new product to the beginning of the list
    setProducts(prev => [newProduct, ...prev]);
    
    // Show success message
    setSuccessMessage('Product created successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
    
    // Call the callback if provided
    onProductCreated?.(newProduct);
  }, [onProductCreated]);

  // Handle optimistic product update
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOptimisticUpdate = useCallback((updatedProduct: Product) => {
    // Store original products for potential revert
    const originalProducts = [...products];
    
    // Optimistically update the product in the list
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    
    // Show success message
    setSuccessMessage('Product updated successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
    
    // Call the callback if provided
    onProductUpdated?.(updatedProduct);
    
    return originalProducts; // Return for potential revert
  }, [products, onProductUpdated]);

  // Revert optimistic update (can be called from parent components)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const revertOptimisticUpdate = useCallback((originalProducts: Product[]) => {
    setProducts(originalProducts);
  }, []);

  // Handle search input changes with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Handle category filter changes
  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value === 'all' ? '' : value);
  }, []);

  // Handle sort changes
  const handleSortChange = useCallback((field: string, order: string) => {
    setSortBy(field as 'name' | 'price' | 'quantity' | 'createdAt' | 'updatedAt');
    setSortOrder(order as 'ASC' | 'DESC');
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setSortBy('createdAt');
    setSortOrder('DESC');
  }, []);

  // Initial load
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== '' || selectedCategory !== '') {
        loadProducts();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, loadProducts]);

  // Sort effect
  useEffect(() => {
    loadProducts();
  }, [sortBy, sortOrder, loadProducts]);

  // Render loading state
  if (loading && !isRefreshing) {
    return <PageLoadingSpinner message="Loading products..." />;
  }

  // Render network error state
  if (error && !products.length && !isRefreshing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <NetworkErrorMessage onRetry={() => loadProducts()} />
      </div>
    );
  }

  return (
    <div className={`container mx-auto px-4 py-8 ${className || ''}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product inventory and catalog
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => loadProducts(true)}
            disabled={isRefreshing}
            className="shrink-0"
          >
            {isRefreshing ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Refreshing...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </>
            )}
          </Button>
          <Link href="/products/new">
            <Button className="shrink-0">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <Input
                placeholder="Search products by name, description, or SKU..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-48">
              <Select value={selectedCategory || 'all'} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Options */}
            <div className="w-full sm:w-48">
              <Select 
                value={`${sortBy}-${sortOrder}`} 
                onValueChange={(value) => {
                  const [field, order] = value.split('-');
                  handleSortChange(field, order);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-DESC">Newest First</SelectItem>
                  <SelectItem value="createdAt-ASC">Oldest First</SelectItem>
                  <SelectItem value="name-ASC">Name A-Z</SelectItem>
                  <SelectItem value="name-DESC">Name Z-A</SelectItem>
                  <SelectItem value="price-ASC">Price Low-High</SelectItem>
                  <SelectItem value="price-DESC">Price High-Low</SelectItem>
                  <SelectItem value="quantity-ASC">Stock Low-High</SelectItem>
                  <SelectItem value="quantity-DESC">Stock High-Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedCategory || sortBy !== 'createdAt' || sortOrder !== 'DESC') && (
              <Button variant="outline" onClick={clearFilters} className="shrink-0">
                Clear Filters
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {(searchQuery || selectedCategory) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: &quot;{searchQuery}&quot;
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Badge>
              )}
              {selectedCategory && (
                <Badge variant="secondary" className="gap-1">
                  Category: {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6">
          <div className="flex items-center gap-3 p-4 border border-green-200 bg-green-50 text-green-800 rounded-md">
            <svg
              className="w-5 h-5 text-green-600 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto hover:bg-green-100 rounded-full p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6">
          <ErrorMessage
            message={error}
            onRetry={() => setError(null)}
            retryText="Dismiss"
            variant="banner"
          />
        </div>
      )}

      {/* Products Grid */}
      <div className="space-y-6">
        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {products.length === 0 ? (
              'No products found'
            ) : (
              `Showing ${products.length} product${products.length === 1 ? '' : 's'}`
            )}
          </div>
          {isRefreshing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoadingSpinner size="sm" />
              Refreshing...
            </div>
          )}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">No products found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory
                    ? 'Try adjusting your search criteria or filters.'
                    : 'Get started by adding your first product.'}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                {(searchQuery || selectedCategory) && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
                <Link href="/products/new">
                  <Button>Add Your First Product</Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="relative">
                <ProductCard
                  product={product}
                  onEdit={handleEdit}
                  onDelete={handleDeleteInitiate}
                />
                {/* Operation in progress overlay */}
                {operationsInProgress.has(`delete-${product.id}`) && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <LoadingSpinner size="sm" />
                      Deleting...
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        product={productToDelete}
        open={isDeleteDialogOpen}
        isDeleting={isDeletingProduct}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}