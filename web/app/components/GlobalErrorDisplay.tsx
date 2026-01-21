'use client';

import React, { useEffect } from 'react';
import { useError } from '@/app/contexts/ErrorContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Global Error Display Component
 * Shows errors from the global error context
 */
export function GlobalErrorDisplay() {
  const { state, removeError, clearGlobalError } = useError();

  // Auto-hide errors with duration
  useEffect(() => {
    state.errors.forEach(error => {
      if (error.autoHide && error.duration) {
        const timer = setTimeout(() => {
          removeError(error.id);
        }, error.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [state.errors, removeError]);

  // Render global error (takes precedence over individual errors)
  if (state.globalError) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ErrorIcon />
              {state.globalError.title || 'Critical Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {state.globalError.message}
            </p>
            
            {state.globalError.details && process.env.NODE_ENV === 'development' && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium text-destructive mb-2">
                  Error Details (Development)
                </summary>
                <div className="bg-muted p-3 rounded text-xs font-mono overflow-auto max-h-32">
                  <pre>{JSON.stringify(state.globalError.details, null, 2)}</pre>
                </div>
              </details>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={clearGlobalError}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Dismiss
              </Button>
              <Button
                variant="default"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render individual errors as notifications
  if (state.errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-40 space-y-2 max-w-sm">
      {state.errors.map(error => (
        <ErrorNotification
          key={error.id}
          error={error}
          onDismiss={() => removeError(error.id)}
        />
      ))}
    </div>
  );
}

/**
 * Individual Error Notification Component
 */
interface ErrorNotificationProps {
  error: {
    id: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    title?: string;
    dismissible?: boolean;
  };
  onDismiss: () => void;
}

function ErrorNotification({ error, onDismiss }: ErrorNotificationProps) {
  const getIcon = () => {
    switch (error.type) {
      case 'warning':
        return <WarningIcon />;
      case 'info':
        return <InfoIcon />;
      default:
        return <ErrorIcon />;
    }
  };

  const getStyles = () => {
    switch (error.type) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-destructive/20 bg-destructive/5 text-destructive';
    }
  };

  return (
    <Card className={cn('shadow-lg animate-in slide-in-from-right-full', getStyles())}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            {error.title && (
              <h4 className="font-medium text-sm mb-1">
                {error.title}
              </h4>
            )}
            <p className="text-sm opacity-90">
              {error.message}
            </p>
          </div>
          {error.dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="shrink-0 h-6 w-6 p-0 hover:bg-current hover:bg-opacity-10"
            >
              <CloseIcon />
              <span className="sr-only">Dismiss</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Icon components
function ErrorIcon() {
  return (
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
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
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
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
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
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}