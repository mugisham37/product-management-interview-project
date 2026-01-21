'use client';

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';

// Error types
export interface AppError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  title?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  dismissible?: boolean;
  autoHide?: boolean;
  duration?: number; // in milliseconds
}

// Error state
interface ErrorState {
  errors: AppError[];
  globalError: AppError | null;
}

// Error actions
type ErrorAction =
  | { type: 'ADD_ERROR'; payload: Omit<AppError, 'id' | 'timestamp'> }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_GLOBAL_ERROR'; payload: AppError | null }
  | { type: 'CLEAR_GLOBAL_ERROR' };

// Initial state
const initialState: ErrorState = {
  errors: [],
  globalError: null,
};

// Error reducer
function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'ADD_ERROR':
      const newError: AppError = {
        ...action.payload,
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };
      return {
        ...state,
        errors: [...state.errors, newError],
      };

    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload),
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
      };

    case 'SET_GLOBAL_ERROR':
      return {
        ...state,
        globalError: action.payload,
      };

    case 'CLEAR_GLOBAL_ERROR':
      return {
        ...state,
        globalError: null,
      };

    default:
      return state;
  }
}

// Context type
interface ErrorContextType {
  state: ErrorState;
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => string;
  removeError: (id: string) => void;
  clearErrors: () => void;
  setGlobalError: (error: AppError | null) => void;
  clearGlobalError: () => void;
  // Convenience methods
  showError: (message: string, options?: Partial<Omit<AppError, 'id' | 'timestamp' | 'message' | 'type'>>) => string;
  showWarning: (message: string, options?: Partial<Omit<AppError, 'id' | 'timestamp' | 'message' | 'type'>>) => string;
  showInfo: (message: string, options?: Partial<Omit<AppError, 'id' | 'timestamp' | 'message' | 'type'>>) => string;
}

// Create context
const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

// Error provider component
interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  // Add error
  const addError = useCallback((error: Omit<AppError, 'id' | 'timestamp'>) => {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    dispatch({ type: 'ADD_ERROR', payload: error });
    
    // Auto-hide error if specified
    if (error.autoHide && error.duration) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_ERROR', payload: errorId });
      }, error.duration);
    }
    
    return errorId;
  }, []);

  // Remove error
  const removeError = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: id });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  // Set global error
  const setGlobalError = useCallback((error: AppError | null) => {
    dispatch({ type: 'SET_GLOBAL_ERROR', payload: error });
  }, []);

  // Clear global error
  const clearGlobalError = useCallback(() => {
    dispatch({ type: 'CLEAR_GLOBAL_ERROR' });
  }, []);

  // Convenience method for showing errors
  const showError = useCallback((
    message: string, 
    options?: Partial<Omit<AppError, 'id' | 'timestamp' | 'message' | 'type'>>
  ) => {
    return addError({
      message,
      type: 'error',
      dismissible: true,
      ...options,
    });
  }, [addError]);

  // Convenience method for showing warnings
  const showWarning = useCallback((
    message: string, 
    options?: Partial<Omit<AppError, 'id' | 'timestamp' | 'message' | 'type'>>
  ) => {
    return addError({
      message,
      type: 'warning',
      dismissible: true,
      autoHide: true,
      duration: 5000,
      ...options,
    });
  }, [addError]);

  // Convenience method for showing info messages
  const showInfo = useCallback((
    message: string, 
    options?: Partial<Omit<AppError, 'id' | 'timestamp' | 'message' | 'type'>>
  ) => {
    return addError({
      message,
      type: 'info',
      dismissible: true,
      autoHide: true,
      duration: 3000,
      ...options,
    });
  }, [addError]);

  const contextValue: ErrorContextType = {
    state,
    addError,
    removeError,
    clearErrors,
    setGlobalError,
    clearGlobalError,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
}

// Hook to use error context
export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

// Hook for handling API errors specifically
export function useApiErrorHandler() {
  const { showError, showWarning } = useError();

  const handleApiError = useCallback((error: unknown, context?: string) => {
    console.error(`API Error${context ? ` in ${context}` : ''}:`, error);

    // Handle different error types
    if (error && typeof error === 'object') {
      const apiError = error as Record<string, unknown>;

      // Network errors
      if (apiError.isNetworkError) {
        return showError((apiError.message as string) || 'Network connection failed', {
          title: 'Connection Error',
          details: { context, code: apiError.code },
        });
      }

      // API errors with status codes
      if (apiError.statusCode) {
        const isWarning = (apiError.statusCode as number) >= 400 && (apiError.statusCode as number) < 500;
        const handler = isWarning ? showWarning : showError;
        
        return handler((apiError.message as string) || 'An error occurred', {
          title: (apiError.error as string) || 'API Error',
          details: { 
            context, 
            statusCode: apiError.statusCode,
            details: apiError.details 
          },
        });
      }
    }

    // Generic error fallback
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return showError(message, {
      title: 'Error',
      details: { context },
    });
  }, [showError, showWarning]);

  return handleApiError;
}