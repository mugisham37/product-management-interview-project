'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Product, CreateProductRequest, UpdateProductRequest } from '@/app/types/product';
import { apiClient } from '@/lib/api-client';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { PageHeader } from './PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface ProductFormProps {
  mode: 'create' | 'edit';
  productId?: string;
  initialData?: Product;
  onSuccess?: (product: Product) => void;
  onCancel?: () => void;
  className?: string;
}

interface FormData {
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  imageUrl?: string;
  sku?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  tags?: string[];
  isActive?: boolean;
  minStockLevel?: number;
  costPrice?: number;
  notes?: string;
}

export function ProductForm({ 
  mode, 
  productId, 
  initialData, 
  onSuccess, 
  onCancel,
  className 
}: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form setup with react-hook-form
  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      quantity: 0,
      category: '',
      imageUrl: '',
      sku: '',
      weight: undefined,
      dimensions: undefined,
      tags: [],
      isActive: true,
      minStockLevel: 0,
      costPrice: undefined,
      notes: '',
    },
    mode: 'onChange', // Enable real-time validation
  });

  const { handleSubmit, formState: { errors, isValid, isDirty }, reset, setValue, watch } = form;

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const data = await apiClient.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
      // Don't show error for categories as it's not critical
    }
  }, []);

  // Load product data for edit mode
  const loadProduct = useCallback(async () => {
    if (mode === 'edit' && productId && !initialData) {
      try {
        setLoadingProduct(true);
        setError(null);
        const product = await apiClient.getProduct(productId);
        
        // Populate form with product data
        reset({
          name: product.name,
          description: product.description,
          price: product.price,
          quantity: product.quantity,
          category: product.category,
          imageUrl: product.imageUrl || '',
          sku: product.sku || '',
          weight: product.weight,
          dimensions: product.dimensions,
          tags: product.tags || [],
          isActive: product.isActive,
          minStockLevel: product.minStockLevel,
          costPrice: product.costPrice,
          notes: product.notes || '',
        });
      } catch (err: unknown) {
        console.error('Failed to load product:', err);
        const error = err as { isNetworkError?: boolean; message?: string };
        const errorMessage = error.isNetworkError 
          ? 'Unable to load product. Please check your connection and try again.'
          : error.message || 'Failed to load product. Please try again.';
        setError(errorMessage);
      } finally {
        setLoadingProduct(false);
      }
    } else if (initialData) {
      // Use provided initial data
      reset({
        name: initialData.name,
        description: initialData.description,
        price: initialData.price,
        quantity: initialData.quantity,
        category: initialData.category,
        imageUrl: initialData.imageUrl || '',
        sku: initialData.sku || '',
        weight: initialData.weight,
        dimensions: initialData.dimensions,
        tags: initialData.tags || [],
        isActive: initialData.isActive,
        minStockLevel: initialData.minStockLevel,
        costPrice: initialData.costPrice,
        notes: initialData.notes || '',
      });
    }
  }, [mode, productId, initialData, reset]);

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError(null);

      // Prepare request data
      const requestData: CreateProductRequest | UpdateProductRequest = {
        name: data.name.trim(),
        description: data.description.trim(),
        price: Number(data.price),
        quantity: Number(data.quantity),
        category: data.category,
        imageUrl: data.imageUrl?.trim() || undefined,
        sku: data.sku?.trim() || undefined,
        weight: data.weight ? Number(data.weight) : undefined,
        dimensions: data.dimensions,
        tags: data.tags?.filter(tag => tag.trim()) || undefined,
        isActive: data.isActive,
        minStockLevel: data.minStockLevel ? Number(data.minStockLevel) : 0,
        costPrice: data.costPrice ? Number(data.costPrice) : undefined,
        notes: data.notes?.trim() || undefined,
      };

      let result: Product;

      if (mode === 'create') {
        result = await apiClient.createProduct(requestData as CreateProductRequest);
        setSuccessMessage('Product created successfully!');
      } else {
        if (!productId) {
          throw new Error('Product ID is required for update');
        }
        result = await apiClient.updateProduct(productId, requestData as UpdateProductRequest);
        setSuccessMessage('Product updated successfully!');
      }

      // Call success callback
      onSuccess?.(result);

      // Show success message briefly then navigate
      setTimeout(() => {
        setSuccessMessage(null);
        if (!onSuccess) {
          router.push('/'); // Navigate back to dashboard
        }
      }, 2000);

    } catch (err: unknown) {
      console.error('Failed to save product:', err);
      const error = err as { 
        isNetworkError?: boolean; 
        message?: string; 
        statusCode?: number;
        details?: Record<string, unknown>;
      };
      
      if (error.isNetworkError) {
        setError('Unable to save product. Please check your connection and try again.');
      } else if (error.statusCode === 400 || error.statusCode === 422) {
        // Handle validation errors
        if (error.details && typeof error.details === 'object') {
          const validationErrors = Object.entries(error.details)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          setError(`Validation failed: ${validationErrors}`);
        } else {
          setError(error.message || 'Invalid data provided. Please check your inputs.');
        }
      } else {
        setError(error.message || 'Failed to save product. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/'); // Navigate back to dashboard
    }
  };

  // Handle tags input (convert comma-separated string to array)
  const handleTagsChange = (value: string) => {
    const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setValue('tags', tagsArray, { shouldValidate: true, shouldDirty: true });
  };

  // Convert tags array to string for display
  const tagsValue = watch('tags')?.join(', ') || '';

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadProduct();
  }, [loadCategories, loadProduct]);

  // Show loading state for edit mode
  if (loadingProduct) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
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

  return (
    <div className={`container mx-auto px-4 py-8 ${className || ''}`}>
      {/* Page Header */}
      <PageHeader
        title={mode === 'create' ? 'Add New Product' : 'Edit Product'}
        description={mode === 'create' 
          ? 'Fill in the details below to add a new product to your inventory.'
          : 'Update the product information below.'}
        className="mb-8"
      />

      <Card className="max-w-2xl mx-auto">
        <CardContent>
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 flex items-center gap-3 p-4 border border-green-200 bg-green-50 text-green-800 rounded-md">
              <svg
                className="w-5 h-5 text-green-600 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6">
              <ErrorMessage
                message={error}
                onRetry={() => setError(null)}
                retryText="Dismiss"
                variant="banner"
              />
            </div>
          )}

          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                {/* Product Name */}
                <FormField
                  control={form.control}
                  name="name"
                  rules={{
                    required: 'Product name is required',
                    minLength: { value: 1, message: 'Product name cannot be empty' },
                    maxLength: { value: 255, message: 'Product name must be less than 255 characters' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter product name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  rules={{
                    required: 'Product description is required',
                    minLength: { value: 1, message: 'Product description cannot be empty' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter product description"
                          className="min-h-20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  rules={{
                    required: 'Product category is required'
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                          {/* Allow custom category input */}
                          <SelectItem value="custom">
                            Other (specify below)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Custom Category Input */}
                {watch('category') === 'custom' && (
                  <FormField
                    control={form.control}
                    name="category"
                    rules={{
                      required: 'Please specify the category',
                      maxLength: { value: 100, message: 'Category must be less than 100 characters' }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Category *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter custom category"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Pricing and Inventory */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing & Inventory</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Price */}
                  <FormField
                    control={form.control}
                    name="price"
                    rules={{
                      required: 'Price is required',
                      min: { value: 0.01, message: 'Price must be greater than 0' },
                      max: { value: 999999.99, message: 'Price must be less than 1,000,000' }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="999999.99"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quantity */}
                  <FormField
                    control={form.control}
                    name="quantity"
                    rules={{
                      required: 'Quantity is required',
                      min: { value: 0, message: 'Quantity cannot be negative' },
                      max: { value: 999999, message: 'Quantity must be less than 1,000,000' }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="999999"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cost Price */}
                  <FormField
                    control={form.control}
                    name="costPrice"
                    rules={{
                      min: { value: 0, message: 'Cost price cannot be negative' },
                      max: { value: 999999.99, message: 'Cost price must be less than 1,000,000' }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="999999.99"
                            placeholder="0.00"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Minimum Stock Level */}
                  <FormField
                    control={form.control}
                    name="minStockLevel"
                    rules={{
                      min: { value: 0, message: 'Minimum stock level cannot be negative' },
                      max: { value: 999999, message: 'Minimum stock level must be less than 1,000,000' }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Stock Level</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="999999"
                            placeholder="0"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SKU */}
                  <FormField
                    control={form.control}
                    name="sku"
                    rules={{
                      maxLength: { value: 50, message: 'SKU must be less than 50 characters' }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter SKU"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Weight */}
                  <FormField
                    control={form.control}
                    name="weight"
                    rules={{
                      min: { value: 0, message: 'Weight cannot be negative' },
                      max: { value: 99999.99, message: 'Weight must be less than 100,000' }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="99999.99"
                            placeholder="0.00"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Image URL */}
                <FormField
                  control={form.control}
                  name="imageUrl"
                  rules={{
                    pattern: {
                      value: /^https?:\/\/.+/,
                      message: 'Please enter a valid URL starting with http:// or https://'
                    },
                    maxLength: { value: 500, message: 'Image URL must be less than 500 characters' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tags */}
                <FormField
                  control={form.control}
                  name="tags"
                  render={() => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter tags separated by commas"
                          value={tagsValue}
                          onChange={(e) => handleTagsChange(e.target.value)}
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Separate multiple tags with commas (e.g., electronics, laptop, gaming)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about the product"
                          className="min-h-16"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                <Button
                  type="submit"
                  disabled={loading || !isValid}
                  className="flex-1 sm:flex-none"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {mode === 'create' ? 'Creating...' : 'Updating...'}
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {mode === 'create' ? 'Create Product' : 'Update Product'}
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 sm:flex-none"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Cancel
                </Button>
              </div>

              {/* Form Status */}
              {isDirty && !isValid && (
                <div className="text-sm text-muted-foreground">
                  Please fix the errors above before submitting.
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}