import { useState, useCallback, useRef, useEffect } from 'react';

export interface ErrorState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  lastErrorTime: number;
}

export interface UseErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  onError?: (error: Error) => void;
  onRetry?: (retryCount: number) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

export interface UseErrorHandlerReturn {
  errorState: ErrorState;
  handleError: (error: Error) => void;
  resetError: () => void;
  retry: () => void;
  canRetry: boolean;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    enableLogging = true,
    onError,
    onRetry,
    onMaxRetriesReached
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    retryCount: 0,
    lastErrorTime: 0
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const handleError = useCallback((error: Error) => {
    const now = Date.now();
    
    if (enableLogging) {
      console.error('Error caught by useErrorHandler:', error);
    }

    setErrorState(prev => ({
      hasError: true,
      error,
      retryCount: prev.retryCount + 1,
      lastErrorTime: now
    }));

    onError?.(error);

    // Check if max retries reached
    if (errorState.retryCount + 1 >= maxRetries) {
      onMaxRetriesReached?.(error);
    }
  }, [enableLogging, onError, onMaxRetriesReached, errorState.retryCount, maxRetries]);

  const resetError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setErrorState({
      hasError: false,
      error: null,
      retryCount: 0,
      lastErrorTime: 0
    });
  }, []);

  const retry = useCallback(() => {
    if (errorState.retryCount >= maxRetries) {
      return;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      setErrorState(prev => ({
        ...prev,
        hasError: false,
        error: null
      }));

      onRetry?.(errorState.retryCount);
    }, retryDelay);
  }, [errorState.retryCount, maxRetries, retryDelay, onRetry]);

  const canRetry = errorState.retryCount < maxRetries;

  return {
    errorState,
    handleError,
    resetError,
    retry,
    canRetry
  };
};