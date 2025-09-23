/**
 * Test Utilities for Avi DM Functionality
 * TDD London School Approach - Mocks, Stubs, and Test Helpers
 */

import { vi } from 'vitest';

// Mock data factories
export const createMockAviMessage = (overrides = {}) => ({
  id: `msg-${Date.now()}`,
  role: 'user' as const,
  content: 'Test message content',
  timestamp: new Date(),
  status: 'sent' as const,
  images: [],
  ...overrides
});

export const createMockApiResponse = (overrides = {}) => ({
  success: true,
  responses: [
    { content: 'Mock AI response' }
  ],
  ...overrides
});

export const createMockFile = (name = 'test.jpg', type = 'image/jpeg') => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'name', { value: name });
  return file;
};

// Connection state mock
export const createConnectionStateMock = () => {
  const callbacks: Array<(state: string) => void> = [];

  return {
    subscribe: (callback: (state: string) => void) => {
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      };
    },
    emit: (state: string) => {
      callbacks.forEach(callback => callback(state));
    }
  };
};

// FileReader mock
export const createFileReaderMock = () => {
  const mock = {
    onload: null as ((event: any) => void) | null,
    onerror: null as ((event: any) => void) | null,
    result: null as string | null,
    readAsDataURL: vi.fn((file: File) => {
      setTimeout(() => {
        mock.result = `data:${file.type};base64,mockbase64data`;
        mock.onload?.({ target: { result: mock.result } });
      }, 0);
    })
  };

  return mock;
};

// Fetch mock factory
export const createFetchMock = () => {
  const mock = vi.fn();

  // Helper methods for common responses
  mock.mockSuccess = (data: any) => {
    mock.mockResolvedValueOnce({
      ok: true,
      json: async () => data
    });
    return mock;
  };

  mock.mockError = (status = 500, message = 'Server Error') => {
    mock.mockResolvedValueOnce({
      ok: false,
      status,
      statusText: message
    });
    return mock;
  };

  mock.mockNetworkError = (error = new Error('Network Error')) => {
    mock.mockRejectedValueOnce(error);
    return mock;
  };

  mock.mockDelay = (ms: number, response: any) => {
    mock.mockImplementationOnce(() =>
      new Promise(resolve =>
        setTimeout(() => resolve(response), ms)
      )
    );
    return mock;
  };

  return mock;
};

// EventSource mock for streaming
export const createEventSourceMock = () => {
  const mock = {
    onopen: null as ((event: any) => void) | null,
    onmessage: null as ((event: any) => void) | null,
    onerror: null as ((event: any) => void) | null,
    readyState: 0,
    close: vi.fn(),
    url: '',
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2,

    // Test helpers
    triggerOpen: () => {
      mock.readyState = 1;
      mock.onopen?.({});
    },
    triggerMessage: (data: any) => {
      mock.onmessage?.({ data: JSON.stringify(data) });
    },
    triggerError: (error = {}) => {
      mock.readyState = 2;
      mock.onerror?.(error);
    }
  };

  return mock;
};

// Component prop builders
export const createAviSDKProps = (overrides = {}) => ({
  onMessageSent: vi.fn(),
  onConnectionStateChange: vi.fn(),
  onError: vi.fn(),
  className: 'test-class',
  isLoading: false,
  ...overrides
});

export const createPostingInterfaceProps = (overrides = {}) => ({
  className: 'test-class',
  onPostCreated: vi.fn(),
  isLoading: false,
  ...overrides
});

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000'
    },
    writable: true
  });

  // Mock console methods to avoid noise in tests
  const originalConsole = { ...console };
  console.error = vi.fn();
  console.warn = vi.fn();
  console.log = vi.fn();

  return {
    restore: () => {
      Object.assign(console, originalConsole);
    }
  };
};

// Custom matchers for better assertions
export const customMatchers = {
  toHaveConnectionState: (received: HTMLElement, expected: string) => {
    const statusElement = received.querySelector('[data-testid="connection-status"]');
    const hasState = statusElement?.textContent?.includes(expected);

    return {
      pass: !!hasState,
      message: () => `Expected element to have connection state "${expected}"`
    };
  },

  toHaveMessageCount: (received: HTMLElement, expected: number) => {
    const messages = received.querySelectorAll('[data-testid="message"]');
    const count = messages.length;

    return {
      pass: count === expected,
      message: () => `Expected ${expected} messages, but found ${count}`
    };
  },

  toHaveTypingIndicator: (received: HTMLElement) => {
    const indicator = received.querySelector('.animate-bounce');

    return {
      pass: !!indicator,
      message: () => 'Expected typing indicator to be visible'
    };
  }
};

// Test scenario builders
export const createTestScenario = {
  successfulMessageSend: (mockFetch: any) => {
    mockFetch.mockSuccess({
      success: true,
      responses: [{ content: 'AI response' }]
    });
  },

  apiError: (mockFetch: any, status = 500) => {
    mockFetch.mockError(status, 'API Error');
  },

  networkError: (mockFetch: any) => {
    mockFetch.mockNetworkError();
  },

  slowResponse: (mockFetch: any, delay = 1000) => {
    mockFetch.mockDelay(delay, {
      ok: true,
      json: async () => ({ success: true, responses: [] })
    });
  },

  imageUpload: (files: File[]) => {
    return {
      files,
      changeEvent: { target: { files } }
    };
  }
};

// Performance testing utilities
export const performanceHelpers = {
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    return end - start;
  },

  measureAsyncOperation: async (operation: () => Promise<void>) => {
    const start = performance.now();
    await operation();
    const end = performance.now();
    return end - start;
  },

  createPerformanceObserver: (callback: (entries: PerformanceEntry[]) => void) => {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      return observer;
    }
    return null;
  }
};

// Accessibility testing helpers
export const a11yHelpers = {
  checkAriaLabels: (container: HTMLElement) => {
    const elementsNeedingLabels = container.querySelectorAll(
      'button:not([aria-label]):not([aria-labelledby]), input:not([aria-label]):not([aria-labelledby])'
    );
    return Array.from(elementsNeedingLabels);
  },

  checkTabOrder: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(focusableElements);
  },

  checkColorContrast: (element: HTMLElement) => {
    const styles = window.getComputedStyle(element);
    return {
      color: styles.color,
      backgroundColor: styles.backgroundColor
    };
  }
};

// Integration test helpers
export const integrationHelpers = {
  simulateUserFlow: {
    quickPost: async (userEvent: any, content: string) => {
      const textarea = document.querySelector('[data-testid="mention-input"]');
      const submitButton = document.querySelector('button[type="submit"]');

      if (textarea && submitButton) {
        await userEvent.type(textarea, content);
        await userEvent.click(submitButton);
      }
    },

    tabNavigation: async (userEvent: any, tabName: string) => {
      const tab = document.querySelector(`[role="tab"][aria-label*="${tabName}"]`);
      if (tab) {
        await userEvent.click(tab);
      }
    },

    imageUpload: async (userEvent: any, files: File[]) => {
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        await userEvent.upload(fileInput, files);
      }
    }
  }
};

// Error boundary testing
export const errorBoundaryHelpers = {
  createThrowingComponent: (error: Error) => {
    return () => {
      throw error;
    };
  },

  triggerError: (component: any, error: Error) => {
    // Simulate component error
    const originalConsoleError = console.error;
    console.error = vi.fn();

    try {
      throw error;
    } catch (e) {
      // Error should be caught by error boundary
    }

    console.error = originalConsoleError;
  }
};

// Memory leak detection helpers
export const memoryHelpers = {
  detectLeaks: () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    return {
      getMemoryDiff: () => {
        const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
        return currentMemory - initialMemory;
      }
    };
  },

  simulateMemoryPressure: () => {
    // Create large arrays to simulate memory pressure
    const arrays: number[][] = [];
    for (let i = 0; i < 100; i++) {
      arrays.push(new Array(10000).fill(i));
    }
    return () => {
      arrays.length = 0; // Cleanup
    };
  }
};

export default {
  createMockAviMessage,
  createMockApiResponse,
  createMockFile,
  createConnectionStateMock,
  createFileReaderMock,
  createFetchMock,
  createEventSourceMock,
  createAviSDKProps,
  createPostingInterfaceProps,
  setupTestEnvironment,
  customMatchers,
  createTestScenario,
  performanceHelpers,
  a11yHelpers,
  integrationHelpers,
  errorBoundaryHelpers,
  memoryHelpers
};