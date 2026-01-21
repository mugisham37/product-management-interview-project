'use client';

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { Toast } from '@/components/Toast';

// Toast state
interface ToastState {
  toasts: Toast[];
}

// Toast actions
type ToastAction =
  | { type: 'ADD_TOAST'; payload: Omit<Toast, 'id'> }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_TOASTS' };

// Initial state
const initialState: ToastState = {
  toasts: [],
};

// Toast reducer
function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      const newToast: Toast = {
        ...action.payload,
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      return {
        ...state,
        toasts: [...state.toasts, newToast],
      };

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload),
      };

    case 'CLEAR_TOASTS':
      return {
        ...state,
        toasts: [],
      };

    default:
      return state;
  }
}

// Context type
interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  // Convenience methods
  showSuccess: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => string;
  showError: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => string;
  showWarning: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => string;
  showInfo: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => string;
}

// Create context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast provider component
interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [state, dispatch] = useReducer(toastReducer, initialState);

  // Add toast
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    dispatch({ type: 'ADD_TOAST', payload: toast });
    return toastId;
  }, []);

  // Remove toast
  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, []);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    dispatch({ type: 'CLEAR_TOASTS' });
  }, []);

  // Convenience method for success toasts
  const showSuccess = useCallback((
    message: string, 
    options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>
  ) => {
    return addToast({
      message,
      type: 'success',
      duration: 4000,
      dismissible: true,
      ...options,
    });
  }, [addToast]);

  // Convenience method for error toasts
  const showError = useCallback((
    message: string, 
    options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>
  ) => {
    return addToast({
      message,
      type: 'error',
      duration: 6000,
      dismissible: true,
      ...options,
    });
  }, [addToast]);

  // Convenience method for warning toasts
  const showWarning = useCallback((
    message: string, 
    options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>
  ) => {
    return addToast({
      message,
      type: 'warning',
      duration: 5000,
      dismissible: true,
      ...options,
    });
  }, [addToast]);

  // Convenience method for info toasts
  const showInfo = useCallback((
    message: string, 
    options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>
  ) => {
    return addToast({
      message,
      type: 'info',
      duration: 3000,
      dismissible: true,
      ...options,
    });
  }, [addToast]);

  const contextValue: ToastContextType = {
    toasts: state.toasts,
    addToast,
    removeToast,
    clearToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
}

// Hook to use toast context
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Hook for success feedback specifically
export function useSuccessFeedback() {
  const { showSuccess } = useToast();

  const showOperationSuccess = useCallback((operation: string, item?: string) => {
    const messages = {
      create: `${item || 'Item'} created successfully`,
      update: `${item || 'Item'} updated successfully`,
      delete: `${item || 'Item'} deleted successfully`,
      save: `${item || 'Changes'} saved successfully`,
      copy: `${item || 'Item'} copied successfully`,
      import: `${item || 'Data'} imported successfully`,
      export: `${item || 'Data'} exported successfully`,
    };

    const message = messages[operation as keyof typeof messages] || `${operation} completed successfully`;
    
    return showSuccess(message, {
      title: 'Success',
    });
  }, [showSuccess]);

  return {
    showSuccess,
    showOperationSuccess,
  };
}