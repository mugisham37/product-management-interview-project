'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
  variant?: 'inline' | 'card' | 'banner';
}

const ErrorIcon = () => (
  <svg
    className="w-5 h-5 text-destructive shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export function ErrorMessage({
  message,
  title = 'Error',
  onRetry,
  retryText = 'Try Again',
  className,
  variant = 'inline'
}: ErrorMessageProps) {

  if (variant === 'card') {
    return (
      <Card className={cn('border-destructive/20 bg-destructive/5', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ErrorIcon />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
        {onRetry && (
          <CardFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <svg
                className="w-4 h-4 mr-1"
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
              {retryText}
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={cn(
        'flex items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-md',
        className
      )}>
        <div className="flex items-center gap-3">
          <ErrorIcon />
          <div>
            <h4 className="font-medium text-destructive">{title}</h4>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0"
          >
            <svg
              className="w-4 h-4 mr-1"
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
            {retryText}
          </Button>
        )}
      </div>
    );
  }

  // Default inline variant
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 border border-destructive/20 bg-destructive/5 rounded-md',
      className
    )}>
      <ErrorIcon />
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-destructive">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <svg
              className="w-4 h-4 mr-1"
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
            {retryText}
          </Button>
        )}
      </div>
    </div>
  );
}

// Specialized error components for common use cases
export function NetworkErrorMessage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      retryText="Retry Connection"
      variant="card"
    />
  );
}

export function NotFoundErrorMessage({ 
  resource = 'item',
  onGoBack 
}: { 
  resource?: string;
  onGoBack?: () => void;
}) {
  return (
    <ErrorMessage
      title="Not Found"
      message={`The ${resource} you're looking for could not be found.`}
      onRetry={onGoBack}
      retryText="Go Back"
      variant="card"
    />
  );
}

export function ValidationErrorMessage({ 
  errors,
  onDismiss 
}: { 
  errors: string[];
  onDismiss?: () => void;
}) {
  return (
    <div className="space-y-2">
      <ErrorMessage
        title="Validation Error"
        message="Please fix the following issues:"
        variant="banner"
      />
      <ul className="list-disc list-inside space-y-1 text-sm text-destructive ml-4">
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
      {onDismiss && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}