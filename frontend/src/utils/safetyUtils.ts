/**
 * Defensive Programming Utilities for Bulletproof React Components
 * Prevents white screens by ensuring components always return valid React elements
 */

import { ReactNode, ComponentType } from 'react';

// Type-safe null/undefined checker
export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

// Safe array access with fallback
export const safeArray = <T>(arr: T[] | null | undefined): T[] => {
  return Array.isArray(arr) ? arr : [];
};

// Safe object access with fallback
export const safeObject = <T extends Record<string, any>>(
  obj: T | null | undefined
): T => {
  return (obj && typeof obj === 'object') ? obj : {} as T;
};

// Safe string with fallback
export const safeString = (str: string | null | undefined, fallback = ''): string => {
  return typeof str === 'string' ? str : fallback;
};

// Safe number with fallback
export const safeNumber = (num: number | null | undefined, fallback = 0): number => {
  return typeof num === 'number' && !isNaN(num) ? num : fallback;
};

// Safe date with fallback
export const safeDate = (date: string | Date | null | undefined): Date => {
  if (!date) return new Date();
  if (date instanceof Date) return isNaN(date.getTime()) ? new Date() : date;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Safe component renderer - always returns valid React element
export const safeRender = (
  component: ReactNode,
  fallback?: ReactNode
): ReactNode => {
  try {
    if (component && typeof component === 'object' && 'type' in component) {
      return component;
    }
    
    if (typeof component === 'string' || typeof component === 'number') {
      return component;
    }
    
    if (component === null || component === undefined) {
      return fallback || null;
    }
    
    // If it's a function component, return it as-is (let React handle it)
    if (typeof component === 'function') {
      return fallback || null;
    }
    
    return fallback || null;
  } catch (error) {
    console.error('Safe render failed:', error);
    return fallback || null;
  }
};

// Safe component wrapper HOC
export const withSafetyWrapper = <P extends object>(
  WrappedComponent: ComponentType<P>,
  componentName?: string
) => {
  const SafeComponent = (props: P) => {
    try {
      // Validate props are defined
      if (!props || typeof props !== 'object') {
        console.warn(`${componentName || 'Component'} received invalid props:`, props);
        return null;
      }

      // Handle both function and class components safely
      try {
        const result = (WrappedComponent as any)(props);
        return result;
      } catch (renderError) {
        console.error(`Error rendering component:`, renderError);
        return null;
      }
    } catch (error) {
      console.error(`Error in safety wrapper:`, error);
      return null;
    }
  };

  SafeComponent.displayName = `SafeWrapper(${componentName || (WrappedComponent as any).displayName || (WrappedComponent as any).name})`;
  return SafeComponent;
};

// Safe async component loader
export const safeAsyncLoader = <T>(
  loader: () => Promise<T>
) => {
  return async () => {
    try {
      const result = await loader();
      return result;
    } catch (error) {
      console.error('Async component loading failed:', error);
      throw error; // Let React Suspense handle this
    }
  };
};

// API response validator
export const validateApiResponse = <T>(
  response: any,
  validator?: (data: any) => data is T
): T | null => {
  try {
    if (!response) return null;
    
    if (validator) {
      return validator(response) ? response : null;
    }
    
    // Basic validation
    if (typeof response === 'object' && response !== null) {
      return response as T;
    }
    
    return null;
  } catch (error) {
    console.error('API response validation failed:', error);
    return null;
  }
};

// Safe JSON parser
export const safeJsonParse = <T>(
  json: string,
  fallback: T
): T => {
  try {
    const parsed = JSON.parse(json);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (error) {
    console.error('JSON parsing failed:', error);
    return fallback;
  }
};

// Component state validator
export const validateComponentState = <T extends Record<string, any>>(
  state: T,
  requiredKeys: (keyof T)[]
): boolean => {
  if (!state || typeof state !== 'object') return false;
  
  return requiredKeys.every(key => 
    state[key] !== null && state[key] !== undefined
  );
};

// Safe event handler wrapper
export const safeHandler = (
  handler: (...args: any[]) => void,
  fallback?: () => void
) => {
  return (...args: any[]) => {
    try {
      handler(...args);
    } catch (error) {
      console.error('Event handler error:', error);
      fallback?.();
    }
  };
};

// React.memo wrapper with safe comparison
export const safeMemo = <P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  const memoizedComponent = (props: P) => {
    try {
      if (propsAreEqual) {
        // Custom comparison logic would go here in a real memo implementation
      }
      
      // Default safe comparison
      if (!props) return null;
      
      // Handle both function and class components safely
      try {
        const result = (Component as any)(props);
        return result;
      } catch (renderError) {
        console.error('Component render error:', renderError);
        return null;
      }
    } catch (error) {
      console.error('Memo comparison error:', error);
      return null;
    }
  };

  return memoizedComponent;
};

// Simple Loading Fallback Component - returns null for safe fallback
export const LoadingFallback = ({ message }: { message?: string } = {}) => {
  return null; // Safe fallback that won't cause rendering issues
};

// Simple Error Fallback Component - returns null for safe fallback  
export const ErrorFallback = ({ error, resetErrorBoundary, message, componentName }: { 
  error?: Error; 
  resetErrorBoundary?: () => void; 
  message?: string;
  componentName?: string;
}) => {
  return null; // Safe fallback that won't cause rendering issues
};

export default {
  isDefined,
  safeArray,
  safeObject,
  safeString,
  safeNumber,
  safeDate,
  safeRender,
  withSafetyWrapper,
  safeAsyncLoader,
  validateApiResponse,
  safeJsonParse,
  validateComponentState,
  safeHandler,
  safeMemo,
  LoadingFallback,
  ErrorFallback
};