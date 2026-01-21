import { Product } from './product';

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message: string;
  code?: string;
  retryable?: boolean;
}

export interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onView?: (product: Product) => void;
}

export interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Product>;
  onSubmit: (data: Partial<Product>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export interface ProductDashboardProps {
  products: Product[];
  loading: LoadingState;
  error: ErrorState;
  onRefresh: () => void;
  onProductCreate: () => void;
  onProductEdit: (product: Product) => void;
  onProductDelete: (productId: string) => void;
}

export interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  productName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryable?: boolean;
}

export interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  duration?: number;
}