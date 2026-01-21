/**
 * Performance monitoring utility for tracking API calls and user interactions
 * Helps identify bottlenecks and optimize user experience
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface ApiCallMetric extends PerformanceMetric {
  method: string;
  url: string;
  status?: number;
  cacheHit?: boolean;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private apiMetrics: ApiCallMetric[] = [];
  private readonly maxMetrics = 100; // Limit memory usage

  /**
   * Start tracking a performance metric
   */
  startMetric(name: string, metadata?: Record<string, unknown>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End tracking a performance metric
   */
  endMetric(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metric.metadata);
    }

    return duration;
  }

  /**
   * Track API call performance
   */
  trackApiCall(method: string, url: string, startTime: number, endTime: number, status?: number, cacheHit?: boolean): void {
    const metric: ApiCallMetric = {
      name: `API_${method}_${url}`,
      method,
      url,
      startTime,
      endTime,
      duration: endTime - startTime,
      status,
      cacheHit
    };

    this.apiMetrics.push(metric);

    // Limit array size to prevent memory leaks
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics.shift();
    }

    // Log slow API calls in development
    if (process.env.NODE_ENV === 'development' && metric.duration && metric.duration > 2000) {
      console.warn(`Slow API call: ${method} ${url} took ${metric.duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalApiCalls: number;
    averageApiTime: number;
    slowestApiCall: ApiCallMetric | null;
    cacheHitRate: number;
    recentMetrics: PerformanceMetric[];
  } {
    const completedMetrics = Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
    const apiCallsWithDuration = this.apiMetrics.filter(m => m.duration !== undefined);
    
    const totalApiTime = apiCallsWithDuration.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageApiTime = apiCallsWithDuration.length > 0 ? totalApiTime / apiCallsWithDuration.length : 0;
    
    const slowestApiCall = apiCallsWithDuration.reduce((slowest, current) => {
      return (!slowest || (current.duration || 0) > (slowest.duration || 0)) ? current : slowest;
    }, null as ApiCallMetric | null);

    const cacheHits = this.apiMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = this.apiMetrics.length > 0 ? (cacheHits / this.apiMetrics.length) * 100 : 0;

    return {
      totalApiCalls: this.apiMetrics.length,
      averageApiTime,
      slowestApiCall,
      cacheHitRate,
      recentMetrics: completedMetrics.slice(-10) // Last 10 metrics
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.apiMetrics.length = 0;
  }

  /**
   * Log performance summary to console (development only)
   */
  logSummary(): void {
    if (process.env.NODE_ENV !== 'development') return;

    const stats = this.getStats();
    console.group('🚀 Performance Summary');
    console.log(`Total API calls: ${stats.totalApiCalls}`);
    console.log(`Average API time: ${stats.averageApiTime.toFixed(2)}ms`);
    console.log(`Cache hit rate: ${stats.cacheHitRate.toFixed(1)}%`);
    
    if (stats.slowestApiCall) {
      console.log(`Slowest API call: ${stats.slowestApiCall.method} ${stats.slowestApiCall.url} (${stats.slowestApiCall.duration?.toFixed(2)}ms)`);
    }
    
    console.groupEnd();
  }

  /**
   * Track component render time
   */
  trackComponentRender<T>(componentName: string, renderFn: () => T): T {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    this.trackApiCall('RENDER', componentName, startTime, endTime);
    return result;
  }

  /**
   * Track user interaction
   */
  trackUserInteraction(action: string, metadata?: Record<string, unknown>): void {
    this.startMetric(`USER_${action}`, metadata);
    
    // Auto-end after a reasonable timeout
    setTimeout(() => {
      this.endMetric(`USER_${action}`);
    }, 5000);
  }

  /**
   * Measure Core Web Vitals
   */
  measureWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming;
        console.log('FID:', fidEntry.processingStart - fidEntry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    new PerformanceObserver((entryList) => {
      let clsValue = 0;
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        const clsEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (clsEntry && !clsEntry.hadRecentInput) {
          clsValue += (clsEntry.value ?? 0);
        }
      });
      console.log('CLS:', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start web vitals measurement in browser
if (typeof window !== 'undefined') {
  performanceMonitor.measureWebVitals();
}

// Export utility functions
export const trackApiCall = (method: string, url: string, startTime: number, endTime: number, status?: number, cacheHit?: boolean) => {
  performanceMonitor.trackApiCall(method, url, startTime, endTime, status, cacheHit);
};

export const trackUserInteraction = (action: string, metadata?: Record<string, unknown>) => {
  performanceMonitor.trackUserInteraction(action, metadata);
};

export const getPerformanceStats = () => performanceMonitor.getStats();

export default performanceMonitor;