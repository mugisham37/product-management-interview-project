'use client';

import React from 'react';
import { useToast } from '@/app/contexts/ToastContext';
import { ToastContainer } from '@/app/components/Toast';

/**
 * Global Toast Display Component
 * Renders all active toasts from the toast context
 */
export function GlobalToastDisplay() {
  const { toasts, removeToast } = useToast();

  return (
    <ToastContainer
      toasts={toasts}
      onDismiss={removeToast}
      position="top-right"
    />
  );
}