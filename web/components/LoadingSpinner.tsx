'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  className,
  text = 'Loading...'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-2', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-muted border-t-primary transition-all duration-300',
          sizeClasses[size]
        )}
        role="status"
        aria-label={text}
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse transition-opacity duration-300">
          {text}
        </p>
      )}
    </div>
  );
}

// Inline spinner for buttons and small spaces
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-current transition-all duration-200',
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

// Full page loading spinner with fade-in animation
export function PageLoadingSpinner({ message = 'Loading page...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full animate-in fade-in duration-300">
      <LoadingSpinner size="lg" text={message} />
    </div>
  );
}

// Skeleton loader for product cards
export function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-6 animate-pulse">
      <div className="space-y-4">
        {/* Image skeleton */}
        <div className="aspect-video bg-muted rounded-md" />
        
        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
        
        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
        
        {/* Price and actions skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-6 bg-muted rounded w-20" />
          <div className="flex space-x-2">
            <div className="h-8 w-16 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton loader for product grid
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Form skeleton loader
export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-20" />
        <div className="h-10 bg-muted rounded w-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="h-24 bg-muted rounded w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-16" />
          <div className="h-10 bg-muted rounded w-full" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-20" />
          <div className="h-10 bg-muted rounded w-full" />
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <div className="h-10 w-20 bg-muted rounded" />
        <div className="h-10 w-20 bg-muted rounded" />
      </div>
    </div>
  );
}

// Loading overlay for forms and modals
export function LoadingOverlay({ 
  isVisible, 
  message = 'Processing...',
  className 
}: { 
  isVisible: boolean; 
  message?: string;
  className?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      'absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50',
      'animate-in fade-in duration-200',
      className
    )}>
      <LoadingSpinner text={message} />
    </div>
  );
}