'use client';

import React from 'react';
import { ProductForm } from '@/app/components/ProductForm';

export default function NewProductPage() {
  return (
    <ProductForm 
      mode="create"
    />
  );
}