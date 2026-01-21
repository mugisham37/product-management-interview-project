'use client';

import { Product } from '@/app/types/product';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DeleteConfirmationDialogProps {
  /** The product to be deleted */
  product: Product | null;
  /** Whether the dialog is open */
  open: boolean;
  /** Whether the delete operation is in progress */
  isDeleting?: boolean;
  /** Callback when the dialog should be closed */
  onClose: () => void;
  /** Callback when deletion is confirmed */
  onConfirm: (productId: string) => void;
}

export function DeleteConfirmationDialog({
  product,
  open,
  isDeleting = false,
  onClose,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const handleConfirm = () => {
    if (product) {
      onConfirm(product.id);
    }
  };

  const handleCancel = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  // Don't render if no product is selected
  if (!product) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isDeleting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            Delete Product
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this product? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Product Information Display */}
        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="space-y-3">
              {/* Product Name and Category */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">
                    {product.name}
                  </h4>
                  <Badge variant="outline" className="mt-1">
                    {product.category}
                  </Badge>
                </div>
                {product.imageUrl && (
                  <div className="w-12 h-12 bg-background rounded border overflow-hidden shrink-0">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <p className="font-semibold text-foreground">
                    {formatPrice(product.price)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity:</span>
                  <p className="font-semibold text-foreground">
                    {product.quantity}
                  </p>
                </div>
              </div>

              {/* SKU if available */}
              {product.sku && (
                <div className="text-sm">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="ml-2 font-mono text-xs text-foreground">
                    {product.sku}
                  </span>
                </div>
              )}

              {/* Description (truncated) */}
              {product.description && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Description:</span>
                  <p className="text-foreground mt-1 line-clamp-2">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Warning Message */}
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <svg
              className="w-5 h-5 text-destructive shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-destructive">
                This action is permanent
              </p>
              <p className="text-destructive/80 mt-1">
                The product will be permanently removed from your inventory and cannot be recovered.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 sm:flex-none"
          >
            {isDeleting ? (
              <>
                <svg
                  className="w-4 h-4 mr-2 animate-spin"
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
                Deleting...
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete Product
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}