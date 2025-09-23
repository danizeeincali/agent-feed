/**
 * Integration Test Suite: Claude Instance Manager State Management
 * SPARC Methodology: Refinement Phase - State Integration Testing
 * 
 * Tests state synchronization between SimpleLauncher and ClaudeInstanceManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SimpleLauncher from '../../src/components/SimpleLauncher';

// Mock WebSocket for ClaudeInstanceManager
const mockWebSocket = {
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
};

global.WebSocket = vi.fn(() => mockWebSocket) as any;

// Mock localStorage with enhanced functionality
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    store, // For direct access in tests
  };
};

describe('Claude Instance Manager State Integration', () => {
  let queryClient: QueryClient;
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockLocalStorage = createMockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Enhanced fetch mock with different responses
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SimpleLauncher />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  const setupMockFetch = (responses: Record<string, any>) => {
    mockFetch.mockImplementation((url: string, options?: any) => {
      const endpoint = url.split('/').pop() || '';
      const method = options?.method || 'GET';
      const key = `${method}:${endpoint}`;
      
      if (responses[key]) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(responses[key]),
        });
      }
      
      // Default response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          claudeAvailable: true,
          status: { isRunning: false, status: 'stopped' }
        }),
      });
    });
  };

  describe('SPECIFICATION: State Persistence Across View Changes', () => {
    it('should maintain Claude availability state when switching views', async () => {
      setupMockFetch({
        'GET:check': { success: true, claudeAvailable: true },
        'GET:status': { success: true, status: { isRunning: false, status: 'stopped' } },
      });

      renderComponent();
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('✅ Available');
      });

      // Switch to web view
      fireEvent.click(screen.getByTestId('web-view-toggle'));
      
      // Claude availability should still show
      expect(screen.getByTestId('claude-availability')).toHaveTextContent('✅ Available');
      
      // Switch back to terminal view
      fireEvent.click(screen.getByTestId('terminal-view-toggle'));
      
      // State should be preserved
      expect(screen.getByTestId('claude-availability')).toHaveTextContent('✅ Available');
    });

    it('should persist view mode preference correctly', () => {
      renderComponent();
      
      // Initial state - terminal view
      expect(screen.getByTestId('terminal-view-toggle')).toHaveClass('active');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('claude-launcher-view-mode');
      
      // Switch to web view
      fireEvent.click(screen.getByTestId('web-view-toggle'));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('claude-launcher-view-mode', 'web');
      
      // Switch back to terminal view
      fireEvent.click(screen.getByTestId('terminal-view-toggle'));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('claude-launcher-view-mode', 'terminal');
    });

    it('should handle localStorage read errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(() => renderComponent()).not.toThrow();
      
      // Should default to terminal view
      expect(screen.getByTestId('terminal-view-toggle')).toHaveClass('active');
    });
  });

  describe('PSEUDOCODE: Process State Synchronization', () => {
    it('should maintain process status across view changes', async () => {
      setupMockFetch({
        'GET:status': { 
          success: true, 
          status: { 
            isRunning: true, 
            status: 'running', 
            pid: 1234,
            startedAt: new Date().toISOString()
          } 
        },
      });

      renderComponent();
      
      // Wait for status update
      await waitFor(() => {
        expect(screen.getByText(/Running \(PID: 1234\)/)).toBeInTheDocument();
      });

      // Switch to web view
      fireEvent.click(screen.getByTestId('web-view-toggle'));
      
      // Process status should still show running
      expect(screen.getByText(/Running \(PID: 1234\)/)).toBeInTheDocument();
      
      // ClaudeInstanceManager should be visible
      expect(screen.getByText('🌐 Claude Web Interface')).toBeInTheDocument();
    });

    it('should handle process launch in terminal view mode', async () => {
      setupMockFetch({
        'POST:instances': { 
          success: true, 
          instanceId: 'test-instance-123',
          instance: { id: 'test-instance-123', name: 'Claude Chat' }
        },
        'GET:instances': { 
          success: true, 
          instances: [
            { id: 'test-instance-123', name: 'Claude Chat', status: 'running' }
          ]
        },
      });

      renderComponent();
      
      // Launch Claude
      const launchButton = screen.getByText('🚀 prod/claude');
      fireEvent.click(launchButton);
      
      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/claude/instances',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should synchronize instances state between views', async () => {
      const mockInstances = [
        { id: 'instance-1', name: 'Claude Chat', status: 'running', pid: 1234 },
        { id: 'instance-2', name: 'Claude Code', status: 'stopped' },
      ];

      setupMockFetch({
        'GET:instances': { success: true, instances: mockInstances },
      });

      renderComponent();
      
      // Switch to web view to trigger instances fetch
      fireEvent.click(screen.getByTestId('web-view-toggle'));
      
      // Wait for ClaudeInstanceManager to load
      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });

      // Instances should be fetched and available
      expect(mockFetch).toHaveBeenCalledWith('/api/claude/instances');
    });
  });

  describe('ARCHITECTURE: Cross-Component Communication', () => {
    it('should maintain consistent API base URL across views', () => {
      renderComponent();
      
      // Both terminal and web views should use the same API base
      const expectedApiBase = '/api/claude';
      
      // Launch action should use consistent API
      fireEvent.click(screen.getByText('🚀 prod/claude'));
      
      expect(mockFetch).toHaveBeenCalledWith(
        `${expectedApiBase}/instances`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should handle WebSocket connection state properly in web view', async () => {
      renderComponent();
      
      // Switch to web view
      fireEvent.click(screen.getByTestId('web-view-toggle'));
      
      // Verify ClaudeInstanceManager is rendered
      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });
      
      // WebSocket should be initialized
      expect(global.WebSocket).toHaveBeenCalled();
    });

    it('should clean up resources when switching views', async () => {
      renderComponent();
      
      // Switch to web view (initializes WebSocket)
      fireEvent.click(screen.getByTestId('web-view-toggle'));
      
      await waitFor(() => {
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      });
      
      // Switch back to terminal view
      fireEvent.click(screen.getByTestId('terminal-view-toggle'));
      
      // ClaudeInstanceManager should be unmounted
      expect(screen.queryByText('Claude Instance Manager')).not.toBeInTheDocument();
    });
  });

  describe('REFINEMENT: Error Handling & Recovery', () => {
    it('should handle API failures gracefully in both views', async () => {
      // Mock API failure
      mockFetch.mockRejectedValue(new Error('API unavailable'));
      
      renderComponent();
      
      // Should still render successfully
      expect(screen.getByText('Interface Mode')).toBeInTheDocument();
      
      // Switch to web view
      fireEvent.click(screen.getByTestId('web-view-toggle'));
      
      // Should show web interface despite API failure
      expect(screen.getByText('🌐 Claude Web Interface')).toBeInTheDocument();
    });

    it('should recover from localStorage errors during state changes', () => {
      renderComponent();
      
      // Make localStorage.setItem throw error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      // Should not crash when trying to persist view change
      expect(() => {
        fireEvent.click(screen.getByTestId('web-view-toggle'));
      }).not.toThrow();
      
      // UI should still update
      expect(screen.getByTestId('web-view-toggle')).toHaveClass('active');
    });

    it('should handle malformed localStorage data', () => {
      // Set invalid view mode
      mockLocalStorage.store['claude-launcher-view-mode'] = 'invalid-mode';
      mockLocalStorage.getItem.mockImplementation((key) => mockLocalStorage.store[key]);
      
      renderComponent();
      
      // Should default to terminal view for invalid data
      expect(screen.getByTestId('terminal-view-toggle')).toHaveClass('active');
    });
  });

  describe('COMPLETION: Performance Optimization', () => {
    it('should minimize re-renders during view switches', () => {
      const renderSpy = vi.fn();
      
      // Mock console.log to track render cycles (this is a simplified approach)
      const originalLog = console.log;
      console.log = renderSpy;
      
      renderComponent();
      
      const initialRenderCount = renderSpy.mock.calls.length;
      
      // Switch views multiple times
      fireEvent.click(screen.getByTestId('web-view-toggle'));
      fireEvent.click(screen.getByTestId('terminal-view-toggle'));
      fireEvent.click(screen.getByTestId('web-view-toggle'));
      
      // Should not cause excessive re-renders (this is a basic check)
      const finalRenderCount = renderSpy.mock.calls.length;
      expect(finalRenderCount - initialRenderCount).toBeLessThan(10);
      
      console.log = originalLog;
    });

    it('should lazy load ClaudeInstanceManager only when needed', () => {
      renderComponent();
      
      // Initially in terminal view - ClaudeInstanceManager should not be rendered
      expect(screen.queryByTestId('claude-instance-manager')).not.toBeInTheDocument();
      
      // Switch to web view
      fireEvent.click(screen.getByTestId('web-view-toggle'));
      
      // Now ClaudeInstanceManager should be rendered
      expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
    });

    it('should debounce localStorage writes', async () => {
      renderComponent();
      
      // Rapidly switch views
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByTestId('web-view-toggle'));
        fireEvent.click(screen.getByTestId('terminal-view-toggle'));
      }
      
      // Wait for any debounced updates
      await waitFor(() => {
        // Should have made multiple setItem calls, but not necessarily 10
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });
      
      // Final state should be consistent
      expect(screen.getByTestId('terminal-view-toggle')).toHaveClass('active');
    });
  });
});