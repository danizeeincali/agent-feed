/**
 * Test Utilities for White Screen Prevention
 *
 * Purpose: Provide reusable utilities and helpers for white screen testing
 * These utilities help create consistent and comprehensive test scenarios
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

// Types
export interface TestError {
  message: string;
  component: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConsoleCapture {
  errors: string[];
  warnings: string[];
  logs: string[];
  clear: () => void;
  getErrorsByPattern: (pattern: string) => string[];
  getSummary: () => {
    totalErrors: number;
    totalWarnings: number;
    totalLogs: number;
    criticalErrors: number;
  };
}

export interface WhiteScreenTestOptions {
  withRouter?: boolean;
  withQueryClient?: boolean;
  withErrorBoundary?: boolean;
  initialRoute?: string;
  mockConsole?: boolean;
}

// Console capture utility
export function createConsoleCapture(): ConsoleCapture {
  const errors: string[] = [];
  const warnings: string[] = [];
  const logs: string[] = [];

  const originalConsole = { ...console };

  // Override console methods
  console.error = (...args: any[]) => {
    errors.push(args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
    originalConsole.error(...args);
  };

  console.warn = (...args: any[]) => {
    warnings.push(args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
    originalConsole.warn(...args);
  };

  console.log = (...args: any[]) => {
    logs.push(args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
    originalConsole.log(...args);
  };

  return {
    errors,
    warnings,
    logs,
    clear: () => {
      errors.length = 0;
      warnings.length = 0;
      logs.length = 0;
    },
    getErrorsByPattern: (pattern: string) => {
      return errors.filter(error => error.includes(pattern));
    },
    getSummary: () => ({
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      totalLogs: logs.length,
      criticalErrors: errors.filter(error =>
        error.includes('Critical') ||
        error.includes('Fatal') ||
        error.includes('Cannot read property') ||
        error.includes('undefined') ||
        error.includes('null')
      ).length,
    }),
  };
}

// Error simulation utilities
export class ErrorSimulator {
  static createRenderError(message: string = 'Simulated render error') {
    return function ErrorComponent() {
      throw new Error(message);
    };
  }

  static createAsyncError(message: string = 'Simulated async error', delay: number = 100) {
    return function AsyncErrorComponent() {
      React.useEffect(() => {
        setTimeout(() => {
          throw new Error(message);
        }, delay);
      }, []);

      return <div data-testid="async-error-component">Async Error Component</div>;
    };
  }

  static createStateError(message: string = 'Simulated state error') {
    return function StateErrorComponent() {
      const [, setState] = React.useState();

      React.useEffect(() => {
        setState(() => {
          throw new Error(message);
        });
      }, []);

      return <div data-testid="state-error-component">State Error Component</div>;
    };
  }

  static createImportError() {
    return function ImportErrorComponent() {
      React.useEffect(() => {
        import('./non-existent-module').catch(error => {
          console.error('Import error:', error.message);
        });
      }, []);

      return <div data-testid="import-error-component">Import Error Component</div>;
    };
  }
}

// Test environment setup
export function setupTestEnvironment() {
  // Mock window properties
  Object.defineProperty(window, 'location', {
    value: {
      pathname: '/',
      search: '',
      hash: '',
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000/',
      replace: jest.fn(),
      assign: jest.fn(),
    },
    writable: true,
  });

  Object.defineProperty(window, 'history', {
    value: {
      pushState: jest.fn(),
      replaceState: jest.fn(),
      go: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    },
    writable: true,
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: { ...localStorageMock },
    writable: true,
  });

  // Mock performance
  Object.defineProperty(window, 'performance', {
    value: {
      now: jest.fn(() => Date.now()),
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 10000000,
      },
    },
    writable: true,
  });

  return () => {
    // Cleanup function
    jest.clearAllMocks();
  };
}

// Custom render with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options: WhiteScreenTestOptions & RenderOptions = {}
): RenderResult {
  const {
    withRouter = true,
    withQueryClient = true,
    withErrorBoundary = true,
    initialRoute = '/',
    mockConsole = true,
    ...renderOptions
  } = options;

  // Create providers
  const queryClient = withQueryClient ? new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  }) : null;

  // Create wrapper component
  function TestWrapper({ children }: { children: React.ReactNode }) {
    let wrappedChildren = children;

    // Add error boundary
    if (withErrorBoundary) {
      wrappedChildren = (
        <ErrorBoundary
          fallbackRender={({ error }) => (
            <div data-testid="test-error-boundary">
              Test Error: {error?.message}
            </div>
          )}
        >
          {wrappedChildren}
        </ErrorBoundary>
      );
    }

    // Add router
    if (withRouter) {
      wrappedChildren = (
        <MemoryRouter initialEntries={[initialRoute]}>
          {wrappedChildren}
        </MemoryRouter>
      );
    }

    // Add query client
    if (withQueryClient && queryClient) {
      wrappedChildren = (
        <QueryClientProvider client={queryClient}>
          {wrappedChildren}
        </QueryClientProvider>
      );
    }

    return <>{wrappedChildren}</>;
  }

  return render(ui, { wrapper: TestWrapper, ...renderOptions });
}

// White screen detection utilities
export class WhiteScreenDetector {
  static isWhiteScreen(container: HTMLElement): boolean {
    // Check if container is empty or has no visible content
    if (!container.hasChildNodes()) {
      return true;
    }

    // Check if all child nodes are empty
    const hasVisibleContent = Array.from(container.childNodes).some(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent?.trim() !== '';
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        return element.offsetWidth > 0 && element.offsetHeight > 0;
      }
      return false;
    });

    return !hasVisibleContent;
  }

  static hasReactContent(container: HTMLElement): boolean {
    // Check for React-specific attributes or content
    return !!(
      container.querySelector('[data-reactroot]') ||
      container.querySelector('[data-testid]') ||
      container.querySelector('[class*="react"]') ||
      container.innerHTML.includes('data-react')
    );
  }

  static detectRenderingIssues(container: HTMLElement): string[] {
    const issues: string[] = [];

    if (this.isWhiteScreen(container)) {
      issues.push('White screen detected - no visible content');
    }

    if (!this.hasReactContent(container)) {
      issues.push('No React content detected');
    }

    if (container.innerHTML.includes('error')) {
      issues.push('Error content detected in HTML');
    }

    if (container.innerHTML.includes('Loading...') &&
        !container.innerHTML.includes('data-testid')) {
      issues.push('Stuck in loading state');
    }

    return issues;
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = performance.now();
  }

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark?: string): number {
    const endTime = performance.now();
    const startTime = startMark ? this.marks.get(startMark) || this.startTime : this.startTime;
    return endTime - startTime;
  }

  getMemoryUsage(): { used: number; total: number; limit: number } {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }

  checkPerformanceThresholds(): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    const memory = this.getMemoryUsage();

    // Check memory usage (warn if > 50MB)
    if (memory.used > 50 * 1024 * 1024) {
      issues.push(`High memory usage: ${Math.round(memory.used / 1024 / 1024)}MB`);
    }

    // Check if any operation took too long
    for (const [name, time] of this.marks) {
      if (time - this.startTime > 5000) {
        issues.push(`Slow operation '${name}': ${Math.round(time - this.startTime)}ms`);
      }
    }

    return {
      passed: issues.length === 0,
      issues,
    };
  }
}

// Mock component factories
export class MockComponentFactory {
  static createWorkingComponent(name: string) {
    return function WorkingComponent() {
      return <div data-testid={`working-${name}`}>{name} Component</div>;
    };
  }

  static createLoadingComponent(name: string, delay: number = 1000) {
    return function LoadingComponent() {
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        const timer = setTimeout(() => setLoading(false), delay);
        return () => clearTimeout(timer);
      }, []);

      if (loading) {
        return <div data-testid={`loading-${name}`}>Loading {name}...</div>;
      }

      return <div data-testid={`loaded-${name}`}>{name} Loaded</div>;
    };
  }

  static createFailingComponent(name: string, errorMessage?: string) {
    return function FailingComponent() {
      throw new Error(errorMessage || `${name} component failed`);
    };
  }
}

// Test data generators
export class TestDataGenerator {
  static generateLargeDataset(size: number): any[] {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      data: Math.random().toString(36),
    }));
  }

  static generateErrorScenarios(): Array<{ name: string; error: Error }> {
    return [
      { name: 'TypeError', error: new TypeError('Cannot read property of undefined') },
      { name: 'ReferenceError', error: new ReferenceError('Variable is not defined') },
      { name: 'SyntaxError', error: new SyntaxError('Unexpected token') },
      { name: 'RangeError', error: new RangeError('Maximum call stack size exceeded') },
      { name: 'NetworkError', error: new Error('Network request failed') },
    ];
  }
}

// Export all utilities
export default {
  createConsoleCapture,
  ErrorSimulator,
  setupTestEnvironment,
  renderWithProviders,
  WhiteScreenDetector,
  PerformanceMonitor,
  MockComponentFactory,
  TestDataGenerator,
};