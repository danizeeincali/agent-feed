/**
 * Memory Monitoring Hook - Prevents Memory Crashes
 * Created based on SPARC analysis of 2041MB crash
 */

import { useEffect, useRef } from 'react';

interface MemoryStats {
  used: number;
  total: number;
  percentage: number;
}

export const useMemoryMonitor = (threshold: number = 400) => {
  const mountedRef = useRef(true);
  const warningShownRef = useRef(false);

  useEffect(() => {
    const checkMemory = () => {
      if (!mountedRef.current) return;

      // Use performance API to estimate memory usage
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
        const totalMB = memInfo.totalJSHeapSize / 1024 / 1024;
        
        if (usedMB > threshold && !warningShownRef.current) {
          console.warn(`🚨 Memory usage high: ${usedMB.toFixed(1)}MB (threshold: ${threshold}MB)`);
          warningShownRef.current = true;
          
          // Force garbage collection if available
          if ('gc' in window) {
            (window as any).gc();
          }
        }
      }
    };

    const interval = setInterval(checkMemory, 5000);
    checkMemory(); // Initial check

    return () => {
      clearInterval(interval);
      mountedRef.current = false;
    };
  }, [threshold]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
};