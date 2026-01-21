'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/app/types/product';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStockStatus = (quantity: number, minStockLevel: number) => {
    if (quantity === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (quantity <= minStockLevel) return { label: 'Low Stock', variant: 'secondary' as const };
    return { label: 'In Stock', variant: 'default' as const };
  };

  const stockStatus = getStockStatus(product.quantity, product.minStockLevel);

  return (
    <Card className="product-card h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <Link href={`/products/${product.id}`} className="flex-1">
            <CardTitle className="text-lg font-semibold line-clamp-2 hover:text-primary transition-colors cursor-pointer">
              {product.name}
            </CardTitle>
          </Link>
          <Badge variant={stockStatus.variant} className="ml-2 shrink-0">
            {stockStatus.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Product Image */}
        <Link href={`/products/${product.id}`}>
          <div className="relative w-full h-40 sm:h-48 bg-muted rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <svg
                  className="w-8 h-8 sm:w-12 sm:h-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>
        </Link>

        {/* Product Details */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
            {product.description}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div>
              <span className="font-medium text-foreground text-xs sm:text-sm">Price:</span>
              <p className="text-lg sm:text-xl font-bold text-primary">
                {formatPrice(product.price)}
              </p>
            </div>
            <div>
              <span className="font-medium text-foreground text-xs sm:text-sm">Quantity:</span>
              <p className="text-lg sm:text-xl font-semibold">
                {product.quantity}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground text-xs sm:text-sm">Category:</span>
              <Badge variant="outline" className="text-xs">
                {product.category}
              </Badge>
            </div>

            {product.sku && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground text-xs sm:text-sm">SKU:</span>
                <span className="text-muted-foreground font-mono text-xs break-all">
                  {product.sku}
                </span>
              </div>
            )}

            {product.tags && product.tags.length > 0 && (
              <div>
                <span className="font-medium text-foreground text-xs sm:text-sm">Tags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {product.tags.slice(0, 2).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {product.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{product.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Created: {formatDate(product.createdAt)}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 sm:pt-4 border-t p-4 sm:p-6">
        <div className="flex flex-col gap-2 w-full">
          {/* Mobile: Stack all buttons vertically for better touch targets */}
          <Link href={`/products/${product.id}`} className="w-full">
            <Button variant="outline" size="sm" className="w-full justify-center">
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              View Details
            </Button>
          </Link>
          
          {/* Mobile: Stack edit and delete buttons, Desktop: Side by side */}
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => onEdit?.(product)}
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit Product
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="w-full justify-center"
              onClick={() => onDelete?.(product.id)}
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
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}