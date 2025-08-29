import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock theme based on Claudable patterns
const mockTheme = {
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    hover: '#f3f4f6',
    focus: '#ddd6fe'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem'
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  borders: {
    radius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      full: '9999px'
    }
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms'
    },
    easing: {
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }
};

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={mockTheme}>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render, mockTheme };

// Mock factories for London School testing
export const createMockEventHandler = (name: string = 'handler') => {
  const mock = jest.fn();
  mock.mockName = name;
  return mock;
};

export const createMockSSEStream = () => {
  const mockEventSource = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    close: jest.fn(),
    readyState: 1,
    url: 'mock-sse-url',
    withCredentials: false
  };
  
  return {
    eventSource: mockEventSource,
    simulateMessage: (data: any) => {
      const event = new MessageEvent('message', { data: JSON.stringify(data) });
      const messageCallback = mockEventSource.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      if (messageCallback) messageCallback(event);
    },
    simulateError: () => {
      const event = new Event('error');
      const errorCallback = mockEventSource.addEventListener.mock.calls
        .find(call => call[0] === 'error')?.[1];
      if (errorCallback) errorCallback(event);
    },
    simulateOpen: () => {
      const event = new Event('open');
      const openCallback = mockEventSource.addEventListener.mock.calls
        .find(call => call[0] === 'open')?.[1];
      if (openCallback) openCallback(event);
    }
  };
};

export const createMockClaudeInstance = (overrides = {}) => ({
  id: 'test-instance-123',
  name: 'Test Claude Instance',
  status: 'connected',
  isConnected: true,
  isLoading: false,
  lastActivity: new Date().toISOString(),
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
  sendMessage: jest.fn().mockResolvedValue({ id: 'msg-123', content: 'response' }),
  ...overrides
});

export const createMockMessage = (overrides = {}) => ({
  id: 'msg-123',
  content: 'Test message content',
  role: 'user',
  timestamp: new Date().toISOString(),
  status: 'sent',
  ...overrides
});

// Animation testing utilities
export const waitForAnimation = (duration: number = 300) => 
  new Promise(resolve => setTimeout(resolve, duration));

// Accessibility testing helpers
export const axeMatchers = {
  toHaveNoViolations: expect.extend({
    async toHaveNoViolations(received) {
      const { axe } = await import('jest-axe');
      const results = await axe(received);
      const pass = results.violations.length === 0;
      
      return {
        pass,
        message: () => 
          pass 
            ? `Expected element to have accessibility violations, but none were found.`
            : `Expected element to have no accessibility violations, but found:\n${results.violations
                .map(violation => `- ${violation.description}`)
                .join('\n')}`
      };
    }
  }).toHaveNoViolations
};