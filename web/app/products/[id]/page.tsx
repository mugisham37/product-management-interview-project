'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Product } from '@/app/types/product';
import { apiClient } from '@/lib/api-client';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { DeleteConfirmationDialog } from '@/app/components/DeleteConfirmationDialog';
import { PageHeader } from '@/app/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Load product data
  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getProduct(productId);
        setProduct(data);
      } catch (err: unknown) {
        console.error('Failed to load product:', err);
        const error = err as { isNetworkError?: boolean; message?: string };
        const errorMessage = error.isNetworkError 
          ? 'Unable to load product. Please check your connection and try again.'
          : error.message || 'Failed to load product. Please try again.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      loadProduct();
    }
  }, [productId]);

  // Handle product deletion
  const handleDeleteConfirm = async (id: string) => {
    setIsDeletingProduct(true);
    
    try {
      await apiClient.deleteProduct(id);
      router.push('/'); // Navigate back to dashboard
    } catch (err: unknown) {
      console.error('Failed to delete product:', err);
      const error = err as { isNetworkError?: boolean; message?: string };
      const errorMessage = error.isNetworkError 
        ? 'Unable to delete product. Please check your connection and try again.'
        : error.message || 'Failed to delete product. Please try again.';
      setError(errorMessage);
    } finally {
      setIsDeletingProduct(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <LoadingSpinner />
              <span className="text-muted-foreground">Loading product...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="py-12">
            <ErrorMessage
              message={error || 'Product not found'}
              onRetry={() => window.location.reload()}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Actions */}
        <PageHeader
          title={product.name}
          description="Product Details"
          actions={
            <>
              <Link href={`/products/${product.id}/edit`} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Product
                </Button>
              </Link>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full sm:w-auto"
              >
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                  Delete Product
                </Button>
              </>
            }
          />

        {/* Product Information */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Description</h3>
                  <p className="mt-1">{product.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Category</h3>
                    <Badge variant="secondary" className="mt-1">
                      {product.category}
                    </Badge>
                  </div>
                  
                  {product.sku && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">SKU</h3>
                      <p className="mt-1 font-mono text-sm">{product.sku}</p>
                    </div>
                  )}
                </div>

                {product.tags && product.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Tags</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {product.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {product.notes && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Notes</h3>
                    <p className="mt-1 text-sm">{product.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing and Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Price</h3>
                    <p className="mt-1 text-2xl font-bold">${product.price.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Quantity</h3>
                    <p className="mt-1 text-2xl font-bold">{product.quantity}</p>
                  </div>

                  {product.costPrice && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Cost Price</h3>
                      <p className="mt-1 text-lg font-semibold">${product.costPrice.toFixed(2)}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Min Stock</h3>
                    <p className="mt-1 text-lg font-semibold">{product.minStockLevel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Physical Properties */}
            {(product.weight || product.dimensions) && (
              <Card>
                <CardHeader>
                  <CardTitle>Physical Properties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {product.weight && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Weight</h3>
                        <p className="mt-1">{product.weight} kg</p>
                      </div>
                    )}
                    
                    {product.dimensions && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dimensions</h3>
                        <p className="mt-1">
                          {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} {product.dimensions.unit}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Product Image */}
            {product.imageUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Product Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active</span>
                  <Badge variant={product.isActive ? 'default' : 'secondary'}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stock Status</span>
                  <Badge variant={product.quantity <= product.minStockLevel ? 'destructive' : 'default'}>
                    {product.quantity <= product.minStockLevel ? 'Low Stock' : 'In Stock'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle>Timestamps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Created</h3>
                  <p className="mt-1 text-sm">{new Date(product.createdAt).toLocaleString()}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Last Updated</h3>
                  <p className="mt-1 text-sm">{new Date(product.updatedAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        product={product}
        open={isDeleteDialogOpen}
        isDeleting={isDeletingProduct}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}