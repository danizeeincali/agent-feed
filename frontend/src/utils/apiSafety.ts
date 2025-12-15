/**
 * API Safety Utilities for Bulletproof Error Handling
 * Comprehensive API call protection with retries and fallbacks
 */

import { safeObject, safeArray, validateApiResponse } from './safetyUtils';

export interface ApiOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  fallbackValue?: any;
  validateResponse?: (data: any) => boolean;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number, error: Error) => void;
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: Error;
  isSuccess: boolean;
  isError: boolean;
  isLoading: boolean;
  statusCode?: number;
  retryCount: number;
}

// Enhanced fetch with timeout
const fetchWithTimeout = async (
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> => {
  const { timeout = 10000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Sleep utility for retry delays
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Safe API call with comprehensive error handling
export const safeApiCall = async <T>(
  url: string,
  options: ApiOptions & RequestInit = {}
): Promise<ApiResponse<T>> => {
  const {
    timeout = 10000,
    retries = 3,
    retryDelay = 1000,
    fallbackValue,
    validateResponse,
    onError,
    onRetry,
    headers = {},
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;
  let retryCount = 0;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        await sleep(retryDelay * attempt); // Exponential backoff
        retryCount = attempt;
        if (onRetry && lastError) {
          onRetry(attempt, lastError);
        }
      }

      const response = await fetchWithTimeout(url, {
        ...fetchOptions,
        headers: defaultHeaders,
        timeout
      });

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      // Validate response if validator provided
      if (validateResponse && !validateResponse(data)) {
        throw new Error('Response validation failed');
      }

      return {
        data,
        isSuccess: true,
        isError: false,
        isLoading: false,
        statusCode: response.status,
        retryCount
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError.message = 'Request timed out';
          break;
        }
        
        // Check for non-retryable HTTP errors
        if (error.message.includes('HTTP 4')) {
          break; // Client errors shouldn't be retried
        }
      }

      // Continue retrying for network errors and 5xx server errors
      if (attempt === retries) {
        break;
      }
    }
  }

  // Handle final error
  if (onError && lastError) {
    onError(lastError);
  }

  return {
    data: fallbackValue,
    error: lastError || new Error('Unknown API error'),
    isSuccess: false,
    isError: true,
    isLoading: false,
    retryCount
  };
};

// GET request wrapper
export const safeGet = async <T>(
  url: string,
  options: Omit<ApiOptions, 'method'> = {}
): Promise<ApiResponse<T>> => {
  return safeApiCall<T>(url, { ...options, method: 'GET' });
};

// POST request wrapper
export const safePost = async <T>(
  url: string,
  body?: any,
  options: Omit<ApiOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> => {
  return safeApiCall<T>(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  });
};

// PUT request wrapper
export const safePut = async <T>(
  url: string,
  body?: any,
  options: Omit<ApiOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> => {
  return safeApiCall<T>(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined
  });
};

// DELETE request wrapper
export const safeDelete = async <T>(
  url: string,
  options: Omit<ApiOptions, 'method'> = {}
): Promise<ApiResponse<T>> => {
  return safeApiCall<T>(url, { ...options, method: 'DELETE' });
};

// Batch API calls with error isolation
export const safeBatchApiCalls = async <T>(
  calls: Array<() => Promise<ApiResponse<T>>>
): Promise<Array<ApiResponse<T>>> => {
  const results = await Promise.allSettled(calls.map(call => call()));
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Batch API call ${index} failed:`, result.reason);
      return {
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        isSuccess: false,
        isError: true,
        isLoading: false,
        retryCount: 0
      };
    }
  });
};

// API response cache for reducing duplicate calls
class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
}

export const apiCache = new ApiCache();

// Cached API call
export const safeCachedApiCall = async <T>(
  url: string,
  options: ApiOptions & RequestInit & { cacheKey?: string; cacheTtl?: number } = {}
): Promise<ApiResponse<T>> => {
  const { cacheKey = url, cacheTtl = 5 * 60 * 1000, ...apiOptions } = options;
  
  // Check cache first
  const cached = apiCache.get<T>(cacheKey);
  if (cached) {
    return {
      data: cached,
      isSuccess: true,
      isError: false,
      isLoading: false,
      retryCount: 0
    };
  }
  
  // Make API call
  const result = await safeApiCall<T>(url, apiOptions);
  
  // Cache successful responses
  if (result.isSuccess && result.data) {
    apiCache.set(cacheKey, result.data, cacheTtl);
  }
  
  return result;
};

// Network status checker
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Wait for network to be available
export const waitForNetwork = (timeout: number = 30000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onlineHandler);
      resolve(false);
    }, timeout);
    
    const onlineHandler = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', onlineHandler);
      resolve(true);
    };
    
    window.addEventListener('online', onlineHandler);
  });
};

// API health checker
export const checkApiHealth = async (baseUrl: string): Promise<boolean> => {
  try {
    const result = await safeGet(`${baseUrl}/health`, {
      timeout: 5000,
      retries: 1
    });
    return result.isSuccess;
  } catch {
    return false;
  }
};

// Response validators
export const validators = {
  isArray: (data: any): data is any[] => Array.isArray(data),
  isObject: (data: any): data is object => typeof data === 'object' && data !== null && !Array.isArray(data),
  hasProperty: (property: string) => (data: any): boolean => 
    typeof data === 'object' && data !== null && property in data,
  isValidAgent: (data: any): boolean => 
    validators.isObject(data) && 
    typeof data.id === 'string' && 
    typeof data.name === 'string',
  isValidPost: (data: any): boolean => 
    validators.isObject(data) && 
    typeof data.id === 'string' && 
    typeof data.content === 'string'
};

export default {
  safeApiCall,
  safeGet,
  safePost,
  safePut,
  safeDelete,
  safeBatchApiCalls,
  safeCachedApiCall,
  apiCache,
  isOnline,
  waitForNetwork,
  checkApiHealth,
  validators
};