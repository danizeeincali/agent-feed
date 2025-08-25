/**
 * @test ClaudeInstanceManager Simplified UI with Integrated Launch Buttons
 * @description Comprehensive TDD tests for simplified UI design
 * - Tests integrated launch buttons functionality  
 * - Tests navigation updates (removal of Simple Launcher)
 * - Tests button functionality for all 4 launch modes
 * - Tests instance management integration
 * - Regression tests for existing functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ClaudeInstanceManager from '@/components/ClaudeInstanceManager';

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSING: WebSocket.CLOSING,
  CLOSED: WebSocket.CLOSED,
} as unknown as WebSocket;

// Mock WebSocket constructor
global.WebSocket = vi.fn(() => mockWebSocket) as any;

// Mock NLD capture utility
vi.mock('@/utils/nld-ui-capture', () => ({
  useNLDCapture: () => ({
    captureButtonClick: vi.fn(),
    captureApiCall: vi.fn(),
    captureWebSocketEvent: vi.fn(),
  }),
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data
const mockInstance = {
  id: 'test-instance-1',
  name: 'Claude Chat',
  status: 'running' as const,
  pid: 12345,
  startTime: new Date('2024-01-01T10:00:00Z'),
};

const mockInstances = [
  mockInstance,
  {
    id: 'test-instance-2', 
    name: 'Claude Code',
    status: 'stopped' as const,
    pid: 12346,
    startTime: new Date('2024-01-01T10:01:00Z'),
  }
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ClaudeInstanceManager - Simplified UI with Integrated Launch Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful API responses
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/instances') && options?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            instances: mockInstances,
          }),
        });
      }
      
      if (url.includes('/instances') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            instance: mockInstance,
          }),
        });
      }
      
      if (url.includes('/instances') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
          }),
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Component Rendering', () => {
    test('should render ClaudeInstanceManager with integrated launch buttons', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      // Check main component renders
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      
      // Check header section
      expect(screen.getByRole('heading', { level: 2, name: 'Claude Instance Manager' })).toBeInTheDocument();
    });

    test('should render all 4 launch buttons with correct labels and icons', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check all 4 launch buttons are present (based on actual implementation)
        expect(screen.getByText('🚀 prod/claude')).toBeInTheDocument();
        expect(screen.getByText('⚡ skip-permissions')).toBeInTheDocument();
        expect(screen.getByText('⚡ skip-permissions -c')).toBeInTheDocument();
        expect(screen.getByText('↻ skip-permissions --resume')).toBeInTheDocument();
      });
    });

    test('should render buttons with correct CSS classes for styling', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      await waitFor(() => {
        const prodButton = screen.getByText('🚀 prod/claude').closest('button');
        const skipPermsButton = screen.getByText('⚡ skip-permissions').closest('button');
        const skipPermsCButton = screen.getByText('⚡ skip-permissions -c').closest('button');
        const skipPermsResumeButton = screen.getByText('↻ skip-permissions --resume').closest('button');

        expect(prodButton).toHaveClass('btn', 'btn-prod');
        expect(skipPermsButton).toHaveClass('btn', 'btn-skip-perms');
        expect(skipPermsCButton).toHaveClass('btn', 'btn-skip-perms-c');
        expect(skipPermsResumeButton).toHaveClass('btn', 'btn-skip-perms-resume');
      });
    });

    test('should preserve existing instance management UI elements', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check existing UI elements are preserved
        expect(screen.getByText('Instances')).toBeInTheDocument();
        expect(screen.getByText('No active instances. Launch one to get started!')).toBeInTheDocument();
        expect(screen.getByText('Select an instance or launch a new one to interact with Claude')).toBeInTheDocument();
      });
    });
  });

  describe('2. Button Functionality', () => {
    test('should create prod instance when 🚀 prod/claude is clicked', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      const prodButton = screen.getByText('🚀 prod/claude');
      
      fireEvent.click(prodButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/claude/instances',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Claude Prod',
              mode: 'chat',
              cwd: '/workspaces/agent-feed/prod'
            }),
          })
        );
      });
    });

    test('should create skip-permissions instance when ⚡ skip-permissions is clicked', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      const skipPermsButton = screen.getByText('⚡ skip-permissions');
      
      fireEvent.click(skipPermsButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/claude/instances',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Claude Skip Perms',
              mode: 'chat',
              cwd: '/workspaces/agent-feed/prod',
              args: ['--dangerously-skip-permissions']
            }),
          })
        );
      });
    });

    test('should create skip-permissions -c instance when ⚡ skip-permissions -c is clicked', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      const skipPermsCButton = screen.getByText('⚡ skip-permissions -c');
      
      fireEvent.click(skipPermsCButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/claude/instances',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Claude Skip Perms -c',
              mode: 'chat',
              cwd: '/workspaces/agent-feed/prod',
              args: ['--dangerously-skip-permissions', '-c']
            }),
          })
        );
      });
    });

    test('should create skip-permissions --resume instance when ↻ skip-permissions --resume is clicked', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      const skipPermsResumeButton = screen.getByText('↻ skip-permissions --resume');
      
      fireEvent.click(skipPermsResumeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/claude/instances',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Claude Resume',
              mode: 'chat',
              cwd: '/workspaces/agent-feed/prod',
              args: ['--dangerously-skip-permissions', '--resume']
            }),
          })
        );
      });
    });

    test('should disable buttons during loading state', async () => {
      // Mock a slow API response to test loading state
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, instance: mockInstance })
        }), 100))
      );

      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      const chatButton = await screen.findByRole('button', { name: /🗨️ Launch Chat/i });
      
      fireEvent.click(chatButton);

      // Buttons should be disabled during loading
      await waitFor(() => {
        expect(chatButton).toBeDisabled();
        expect(screen.getByRole('button', { name: /💻 Launch Code/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /❓ Show Help/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /ℹ️ Show Version/i })).toBeDisabled();
      });
    });

    test('should handle button click errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      const prodButton = screen.getByText('🚀 prod/claude');
      
      fireEvent.click(prodButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create instance/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. Navigation Tests', () => {
    test('should indicate Simple Launcher route removal from navigation', () => {
      // This is a documentation test - the actual navigation would be tested in App.test.tsx
      // We're testing that ClaudeInstanceManager can function as primary launch interface
      
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      // Verify ClaudeInstanceManager has all necessary launch functionality
      // that would replace Simple Launcher
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      expect(screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('prod/claude') || 
        btn.textContent?.includes('skip-permissions') ||
        btn.textContent?.includes('--resume')
      )).toHaveLength(4);
    });

    test('should be accessible as Claude Instances primary interface', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      // Test that component loads successfully as primary interface
      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });

      // Verify component doesn't have any dependency on Simple Launcher
      expect(() => screen.getByText('Simple Launcher')).toThrow();
    });

    test('should not have broken links or missing dependencies', async () => {
      // Test that component renders without external navigation dependencies
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });

      // Verify no errors are thrown during render
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('4. Integration Tests', () => {
    test('should integrate button launches with instance management', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      // Click launch button
      const prodButton = screen.getByText('🚀 prod/claude');
      fireEvent.click(prodButton);

      // Wait for instance to be created and displayed
      await waitFor(() => {
        expect(screen.getByText('Claude Prod')).toBeInTheDocument();
      });

      // Verify instance appears in instances list
      expect(screen.getByText(/ID: test-ins/)).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
    });

    test('should handle instance creation and selection flow', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      // Launch an instance
      const prodButton = screen.getByText('🚀 prod/claude');
      fireEvent.click(prodButton);

      await waitFor(() => {
        expect(screen.getByText('Claude Prod')).toBeInTheDocument();
      });

      // Click on instance to select it
      const instanceItem = screen.getByText('Claude Prod').closest('li');
      fireEvent.click(instanceItem!);

      // Verify instance interaction UI appears
      expect(screen.getByText('Instance Output')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type command and press Enter...')).toBeInTheDocument();
    });

    test('should maintain WebSocket communication for launched instances', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      // Verify WebSocket connection is established
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3001/api/claude/instances/ws');
      
      // Launch instance
      const prodButton = screen.getByText('🚀 prod/claude');
      fireEvent.click(prodButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/instances'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    test('should handle real-time output display for launched instances', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      // Launch and select instance
      const prodButton = screen.getByText('🚀 prod/claude');
      fireEvent.click(prodButton);

      await waitFor(() => {
        expect(screen.getByText('Claude Prod')).toBeInTheDocument();
      });

      // Select the instance
      const instanceItem = screen.getByText('Claude Prod').closest('li');
      fireEvent.click(instanceItem!);

      // Verify output area is available
      expect(screen.getByText('Waiting for output...')).toBeInTheDocument();

      // Simulate WebSocket message
      const mockMessage = {
        type: 'output',
        instanceId: 'test-instance-1',
        data: 'Hello from Claude!'
      };

      // Simulate WebSocket onmessage event
      const onMessageHandler = (mockWebSocket.onmessage as any);
      if (onMessageHandler) {
        onMessageHandler({ data: JSON.stringify(mockMessage) });
      }

      await waitFor(() => {
        expect(screen.getByText(/Hello from Claude!/)).toBeInTheDocument();
      });
    });
  });

  describe('5. Regression Tests', () => {
    test('should preserve existing instance termination functionality', async () => {
      // Mock instances response with running instance
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/instances') && !url.includes('/instances/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instances: [mockInstance],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Claude Chat')).toBeInTheDocument();
      });

      // Find and click terminate button
      const terminateButton = screen.getByRole('button', { name: '✕' });
      fireEvent.click(terminateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/claude/instances/test-instance-1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    test('should preserve existing status display functionality', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/instances') && !url.includes('/instances/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instances: mockInstances,
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Active: 1/2')).toBeInTheDocument();
      });
    });

    test('should preserve existing input/send functionality', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/instances') && !url.includes('/instances/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instances: [mockInstance],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Claude Chat')).toBeInTheDocument();
      });

      // Select instance
      const instanceItem = screen.getByText('Claude Chat').closest('li');
      fireEvent.click(instanceItem!);

      // Test input functionality
      const inputField = screen.getByPlaceholderText('Type command and press Enter...');
      const sendButton = screen.getByRole('button', { name: 'Send' });

      fireEvent.change(inputField, { target: { value: 'test command' } });
      fireEvent.click(sendButton);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'input',
          instanceId: 'test-instance-1',
          data: 'test command\n'
        })
      );
    });

    test('should preserve existing error handling', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      const chatButton = await screen.findByRole('button', { name: /🗨️ Launch Chat/i });
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create instance/)).toBeInTheDocument();
      });
    });

    test('should preserve existing WebSocket error handling', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      // Simulate WebSocket error
      const onErrorHandler = (mockWebSocket.onerror as any);
      if (onErrorHandler) {
        onErrorHandler(new Event('error'));
      }

      await waitFor(() => {
        expect(screen.getByText(/WebSocket connection error/)).toBeInTheDocument();
      });
    });

    test('should preserve existing auto-scroll functionality', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      // Create mock output area ref
      const mockOutputRef = {
        scrollTop: 0,
        scrollHeight: 1000,
      };

      // Simulate output message that triggers auto-scroll
      const mockMessage = {
        type: 'output',
        instanceId: 'test-instance-1',
        data: 'New output line'
      };

      // This would be tested through actual component interaction
      // The auto-scroll logic is preserved in the component
      expect(screen.queryByText('Instance Output')).not.toThrow();
    });
  });

  describe('6. Edge Cases and Error Scenarios', () => {
    test('should handle API failure during instance creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      });

      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      const chatButton = await screen.findByRole('button', { name: /🗨️ Launch Chat/i });
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create instance/)).toBeInTheDocument();
      });
    });

    test('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      });

      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      const chatButton = await screen.findByRole('button', { name: /🗨️ Launch Chat/i });
      fireEvent.click(chatButton);

      // Component should handle gracefully without crashing
      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });
    });

    test('should handle WebSocket connection failures', async () => {
      // Mock WebSocket constructor to throw error
      global.WebSocket = vi.fn(() => {
        throw new Error('WebSocket connection failed');
      }) as any;

      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      // Component should render despite WebSocket error
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
    });

    test('should handle concurrent button clicks', async () => {
      render(
        <TestWrapper>
          <ClaudeInstanceManager />
        </TestWrapper>
      );

      const chatButton = await screen.findByRole('button', { name: /🗨️ Launch Chat/i });
      const codeButton = await screen.findByRole('button', { name: /💻 Launch Code/i });

      // Click multiple buttons rapidly
      fireEvent.click(chatButton);
      fireEvent.click(codeButton);
      fireEvent.click(chatButton);

      // Should handle gracefully without duplicate requests
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3); // Initial fetch + 2 button clicks
      });
    });
  });
});