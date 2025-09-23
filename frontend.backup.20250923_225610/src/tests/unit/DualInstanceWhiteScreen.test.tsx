/**
 * TDD London School Test Suite for Dual Instance White Screen Issue
 * 
 * This test uses London School (mockist) TDD methodology to:
 * 1. Create failing tests that expose the exact white screen issue
 * 2. Mock all dependencies to isolate rendering behavior
 * 3. Verify the conversation between components and their collaborators
 * 4. Focus on interaction testing rather than state testing
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { jest } from '@jest/globals';

// Mock all external dependencies using London School approach
jest.mock('@/components/ui/card', () => ({
  Card: jest.fn(({ children, className }) => <div data-testid="card" className={className}>{children}</div>),
  CardHeader: jest.fn(({ children, className }) => <div data-testid="card-header" className={className}>{children}</div>),
  CardTitle: jest.fn(({ children, className }) => <h3 data-testid="card-title" className={className}>{children}</h3>),
  CardContent: jest.fn(({ children, className }) => <div data-testid="card-content" className={className}>{children}</div>),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: jest.fn(({ children, variant, className }) => 
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: jest.fn(({ children, onClick, variant, size, className }) => 
    <button 
      data-testid="button" 
      onClick={onClick} 
      data-variant={variant} 
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: jest.fn(({ children, value, onValueChange, className }) => 
    <div data-testid="tabs" data-value={value} className={className}>{children}</div>
  ),
  TabsList: jest.fn(({ children, className }) => 
    <div data-testid="tabs-list" className={className}>{children}</div>
  ),
  TabsTrigger: jest.fn(({ children, value, className }) => 
    <button data-testid="tabs-trigger" data-value={value} className={className}>{children}</button>
  ),
  TabsContent: jest.fn(({ children, value, className }) => 
    <div data-testid="tabs-content" data-value={value} className={className}>{children}</div>
  ),
}));

// Mock the useDualInstanceMonitoring hook with proper contract
const mockUseDualInstanceMonitoring = jest.fn(() => ({
  status: {
    development: { status: 'running', health: { workspace: '/workspaces/agent-feed' } },
    production: { status: 'running', health: { workspace: 'agent_workspace' } }
  },
  messages: [],
  pendingConfirmations: [],
  isLoading: false,
  sendHandoff: jest.fn(),
  handleConfirmation: jest.fn(),
  isConnected: true,
}));

jest.mock('../hooks/useDualInstanceMonitoring', () => ({
  useDualInstanceMonitoring: mockUseDualInstanceMonitoring
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  }
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const MockIcon = ({ className, ...props }: any) => 
    <span data-testid="lucide-icon" className={className} {...props} />;
  
  return {
    Activity: MockIcon,
    Code: MockIcon,
    Briefcase: MockIcon,
    ArrowRightLeft: MockIcon,
    Users: MockIcon,
    Bot: MockIcon,
    Zap: MockIcon,
    CheckCircle: MockIcon,
    XCircle: MockIcon,
    AlertCircle: MockIcon,
    Send: MockIcon,
    Server: MockIcon,
    Clock: MockIcon,
    RefreshCw: MockIcon,
    CheckCheck: MockIcon,
    X: MockIcon,
    Loader2: MockIcon,
  };
});

// Import component after mocks are set up
import DualInstanceDashboardEnhanced from '@/components/DualInstanceDashboardEnhanced';

describe('TDD London School: Dual Instance White Screen Fix', () => {
  let queryClient: QueryClient;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock fetch with proper contract
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponentWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('FAILING TESTS: White Screen Issue Detection', () => {
    test('should fail: component does not render basic structure', async () => {
      // ARRANGE: Mock fetch to return proper responses
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ agents: [] })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ agents: [] })
        });

      // ACT: Attempt to render the component
      renderComponentWithProviders(<DualInstanceDashboardEnhanced />);

      // ASSERT: These assertions should FAIL initially, exposing the white screen issue
      await waitFor(() => {
        expect(screen.getByText('Dual Instance Monitor')).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText('Real-time monitoring of development and production Claude instances')).toBeInTheDocument();
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByText('Development Instance')).toBeInTheDocument();
      expect(screen.getByText('Production Instance')).toBeInTheDocument();
    });

    test('should fail: UI components are not properly instantiated', async () => {
      // ARRANGE: Set up component rendering
      renderComponentWithProviders(<DualInstanceDashboardEnhanced />);

      // ACT & ASSERT: Verify that mocked UI components are called with correct contracts
      await waitFor(() => {
        const { Card, CardHeader, CardTitle, CardContent } = require('@/components/ui/card');
        
        // These should fail initially if components aren't rendering
        expect(Card).toHaveBeenCalled();
        expect(CardHeader).toHaveBeenCalled();
        expect(CardTitle).toHaveBeenCalled();
        expect(CardContent).toHaveBeenCalled();
      });
    });

    test('should fail: hook collaborations are not established', async () => {
      // ARRANGE: Render component
      renderComponentWithProviders(<DualInstanceDashboardEnhanced />);

      // ACT & ASSERT: Verify hook is called (should fail if import path is wrong)
      await waitFor(() => {
        expect(mockUseDualInstanceMonitoring).toHaveBeenCalled();
      });

      // Verify hook returns expected contract
      const hookResult = mockUseDualInstanceMonitoring.mock.results[0]?.value;
      expect(hookResult).toEqual(
        expect.objectContaining({
          status: expect.any(Object),
          messages: expect.any(Array),
          pendingConfirmations: expect.any(Array),
          isLoading: expect.any(Boolean),
          sendHandoff: expect.any(Function),
          handleConfirmation: expect.any(Function),
          isConnected: expect.any(Boolean),
        })
      );
    });

    test('should fail: fetch interactions are not properly mocked', async () => {
      // ARRANGE: Set up fetch responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ agents: [
            {
              id: 'dev-1',
              name: 'Dev Agent',
              status: 'active',
              instance: 'development'
            }
          ]})
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ agents: [
            {
              id: 'prod-1',
              name: 'Prod Agent',
              status: 'active',
              instance: 'production'
            }
          ]})
        });

      // ACT: Render component
      renderComponentWithProviders(<DualInstanceDashboardEnhanced />);

      // ASSERT: Verify fetch calls are made with correct URLs
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/agents/development');
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/agents/production');
      });
    });
  });

  describe('LONDON SCHOOL: Contract Verification Tests', () => {
    test('verifies UI component contracts and interactions', async () => {
      // ARRANGE: Mock successful data fetching
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ agents: [] })
      });

      // ACT: Render component
      renderComponentWithProviders(<DualInstanceDashboardEnhanced />);

      // ASSERT: Verify component collaborations
      await waitFor(() => {
        const { Card } = require('@/components/ui/card');
        const { Badge } = require('@/components/ui/badge');
        const { Button } = require('@/components/ui/button');
        const { Tabs } = require('@/components/ui/tabs');

        // Verify components are called (London School focuses on interactions)
        expect(Card).toHaveBeenCalled();
        expect(Badge).toHaveBeenCalled();
        expect(Button).toHaveBeenCalled();
        expect(Tabs).toHaveBeenCalled();
      });
    });

    test('verifies hook interaction contract', async () => {
      // ARRANGE & ACT: Render component
      renderComponentWithProviders(<DualInstanceDashboardEnhanced />);

      // ASSERT: Verify the component properly collaborates with the hook
      await waitFor(() => {
        expect(mockUseDualInstanceMonitoring).toHaveBeenCalledTimes(1);
      });

      // Verify hook contract is satisfied
      const hookCall = mockUseDualInstanceMonitoring.mock.calls[0];
      expect(hookCall).toBeDefined();
    });

    test('verifies error boundary behavior with mock failures', async () => {
      // ARRANGE: Force hook to throw error
      mockUseDualInstanceMonitoring.mockImplementation(() => {
        throw new Error('Hook initialization failed');
      });

      // ACT & ASSERT: Component should handle errors gracefully
      expect(() => {
        renderComponentWithProviders(<DualInstanceDashboardEnhanced />);
      }).not.toThrow();
    });
  });

  describe('BEHAVIOR VERIFICATION: Component Interactions', () => {
    test('verifies tab interaction behavior', async () => {
      // ARRANGE: Mock successful rendering
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ agents: [] })
      });

      renderComponentWithProviders(<DualInstanceDashboardEnhanced />);

      // ACT: Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('tabs')).toBeInTheDocument();
      });

      // ASSERT: Verify tabs component receives correct props
      const { Tabs } = require('@/components/ui/tabs');
      const tabsCall = Tabs.mock.calls[0];
      expect(tabsCall[0]).toEqual(
        expect.objectContaining({
          value: 'unified',
          onValueChange: expect.any(Function),
        })
      );
    });

    test('verifies handoff sending interaction', async () => {
      // ARRANGE: Set up mocks
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      const mockSendHandoff = jest.fn();
      mockUseDualInstanceMonitoring.mockReturnValue({
        status: null,
        messages: [],
        pendingConfirmations: [],
        isLoading: false,
        sendHandoff: mockSendHandoff,
        handleConfirmation: jest.fn(),
        isConnected: true,
      });

      renderComponentWithProviders(<DualInstanceDashboardEnhanced />);

      // ACT: Simulate user interaction (if buttons render)
      await waitFor(() => {
        const buttons = screen.queryAllByTestId('button');
        if (buttons.length > 0) {
          // Simulate sending handoff
          fireEvent.click(buttons[0]);
        }
      });

      // ASSERT: Verify interaction contract
      // (This test will help us understand if interactions work once rendering is fixed)
    });
  });

  describe('DIAGNOSIS: Import Path and Dependency Issues', () => {
    test('diagnoses import path resolution', () => {
      // Test if path aliases are working
      expect(() => {
        require('@/components/ui/card');
        require('@/components/ui/badge');
        require('@/components/ui/button');
        require('@/components/ui/tabs');
      }).not.toThrow();
    });

    test('diagnoses hook import resolution', () => {
      expect(() => {
        require('../hooks/useDualInstanceMonitoring');
      }).not.toThrow();
    });

    test('diagnoses component import resolution', () => {
      expect(() => {
        require('@/components/DualInstanceDashboardEnhanced');
      }).not.toThrow();
    });
  });
});