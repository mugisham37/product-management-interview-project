'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/' }
    ];

    let currentPath = '';
    
    for (let i = 0; i < segments.length; i++) {
      currentPath += `/${segments[i]}`;
      
      if (segments[i] === 'products') {
        if (i === segments.length - 1) {
          breadcrumbs.push({ label: 'Products' });
        } else {
          breadcrumbs.push({ label: 'Products', href: '/products' });
        }
      } else if (segments[i] === 'new') {
        breadcrumbs.push({ label: 'Add New Product' });
      } else if (segments[i] === 'edit') {
        breadcrumbs.push({ label: 'Edit Product' });
      } else if (segments[i-1] === 'products' && segments[i] !== 'new') {
        // This is a product ID
        if (i === segments.length - 1) {
          breadcrumbs.push({ label: 'Product Details' });
        } else {
          breadcrumbs.push({ label: 'Product Details', href: currentPath });
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className={`flex items-center space-x-1 text-sm text-muted-foreground ${className || ''}`}>
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <svg
              className="w-4 h-4 mx-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
          {item.href && index < breadcrumbItems.length - 1 ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={index === breadcrumbItems.length - 1 ? 'text-foreground font-medium' : ''}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}