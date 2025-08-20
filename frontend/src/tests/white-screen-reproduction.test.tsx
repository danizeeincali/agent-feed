/**
 * TDD Test Engineer - White Screen Reproduction Tests
 * These tests systematically reproduce and fix the white screen issue
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Mock WebSocket context to prevent connection errors during testing
jest.mock('../context/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock components that might cause import issues
jest.mock('../components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => <div data-testid="notifications">Notifications</div>,
}));

jest.mock('../components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status">Connected</div>,
}));

describe('White Screen Issue Reproduction', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    });
    
    // Clear any console errors
    jest.clearAllMocks();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  it('FAILING TEST: Should render main app without white screen', async () => {
    // This test should fail initially if there's a white screen issue
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for app to render
    await waitFor(() => {
      expect(screen.getByText('AgentLink')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Check that the main content area is present and not empty
    const mainContent = screen.getByTestId('agent-feed');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).not.toBeEmptyDOMElement();

    // Verify essential UI elements are rendered
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();

    // Check for any error boundaries being triggered
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Error loading/i)).not.toBeInTheDocument();

    // Verify the app has actual content, not just loading states
    expect(container.firstChild).toHaveClass();
    expect(container.innerHTML).not.toBe('<div></div>');
  });

  it('FAILING TEST: Should handle TypeScript compilation errors gracefully', () => {
    // Mock console.error to catch compilation errors
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // No TypeScript compilation errors should reach the console
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('TS6133')
    );
  });

  it('FAILING TEST: Should render feed content on default route', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Should show the social media feed by default
    await waitFor(() => {
      // Look for any indication that content is loading/loaded
      const mainArea = screen.getByTestId('agent-feed');
      expect(mainArea).toBeInTheDocument();
      
      // The content should not be completely empty
      expect(mainArea.children.length).toBeGreaterThan(0);
    });
  });

  it('DIAGNOSTIC: Log any JavaScript errors that could cause white screen', () => {
    const errors: string[] = [];
    const originalError = console.error;
    
    console.error = (...args) => {
      errors.push(args.join(' '));
      originalError(...args);
    };

    try {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      );
    } catch (error) {
      errors.push(`Render error: ${error}`);
    }

    // Log all captured errors for debugging
    if (errors.length > 0) {
      console.log('CAPTURED ERRORS THAT COULD CAUSE WHITE SCREEN:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    console.error = originalError;
  });
});