'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only show loading if pathname actually changed from the previous one
    if (pathname !== prevPathnameRef.current) {
      // Use a microtask to avoid synchronous setState in effect
      Promise.resolve().then(() => {
        setIsLoading(true);
      });
      
      // Hide loading indicator after a short delay
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      
      // Update the ref for next comparison
      prevPathnameRef.current = pathname;
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-primary/20">
        <div className="h-full bg-primary animate-pulse w-full" />
      </div>
    </div>
  );
}