/**
 * Comprehensive tests for bulletproof React architecture
 * Tests error boundaries, fallbacks, and zero white screen scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Import components to test
import { ErrorBoundary, RouteErrorBoundary, ComponentErrorBoundary } from '../components/ErrorBoundary';
import FallbackComponents from '../components/FallbackComponents';
import { withSafetyWrapper, safeRender, isDefined, safeArray } from '../utils/safetyUtils';
import { useErrorHandler } from '../hooks/useErrorHandler';

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock component that throws errors
const ErrorThrowingComponent: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = true, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Component works!</div>;
};

describe('Bulletproof Architecture Tests', () => {
  beforeEach(() => {
    // Suppress console errors in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ErrorBoundary Components', () => {
    test('ErrorBoundary catches and displays error fallback', async () => {
      render(
        <TestWrapper>
          <ErrorBoundary>
            <ErrorThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
    });

    test('RouteErrorBoundary handles route-specific errors', async () => {
      render(
        <TestWrapper>
          <RouteErrorBoundary routeName="TestRoute">
            <ErrorThrowingComponent errorMessage="Route error" />
          </RouteErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('Safety Utilities', () => {
    test('safeRender handles various input types', () => {
      // Valid React element
      expect(safeRender(<div>Valid</div>)).toEqual(<div>Valid</div>);
      
      // String
      expect(safeRender('Valid string')).toBe('Valid string');
      
      // Number
      expect(safeRender(42)).toBe(42);
      
      // Null/undefined
      expect(safeRender(null)).toBe(null);
      expect(safeRender(undefined)).toBe(null);
    });

    test('isDefined correctly identifies defined values', () => {
      expect(isDefined('test')).toBe(true);
      expect(isDefined(0)).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined([])).toBe(true);
      expect(isDefined({})).toBe(true);
      
      expect(isDefined(null)).toBe(false);
      expect(isDefined(undefined)).toBe(false);
    });

    test('safeArray handles various inputs', () => {
      expect(safeArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(safeArray(null)).toEqual([]);
      expect(safeArray(undefined)).toEqual([]);
      expect(safeArray('not array' as any)).toEqual([]);
    });
  });

  describe('Zero White Screen Scenarios', () => {
    test('App renders fallback instead of white screen when main component fails', () => {
      const FailingApp: React.FC = () => {
        throw new Error('App failure');
      };

      render(
        <TestWrapper>
          <ErrorBoundary>
            <FailingApp />
          </ErrorBoundary>
        </TestWrapper>
      );

      // Should show error boundary instead of white screen
      expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    });
  });
});