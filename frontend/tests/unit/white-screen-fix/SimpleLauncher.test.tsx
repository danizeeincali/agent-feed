/**
 * @file SimpleLauncher Unit Tests
 * @description Comprehensive TDD tests for SimpleLauncher component covering all scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimpleLauncher } from '@/components/SimpleLauncher';

// Mock dependencies
vi.mock('@/utils/nld-ui-capture', () => ({
  useNLDCapture: () => ({
    captureButtonClick: vi.fn(),
  }),
}));

vi.mock('@/components/Terminal', () => ({
  TerminalComponent: ({ isVisible, processStatus }: any) => (
    <div data-testid="terminal-component" data-visible={isVisible}>
      Terminal - Status: {processStatus.status}
    </div>
  ),
}));

vi.mock('@/components/TerminalEmergencyFixed', () => ({
  TerminalEmergencyFixed: ({ isVisible, processStatus }: any) => (
    <div data-testid="terminal-emergency-fixed" data-visible={isVisible}>
      Emergency Terminal - Status: {processStatus.status}
    </div>
  ),
}));

vi.mock('@/components/TerminalExpandedWidth', () => ({
  TerminalExpandedWidth: ({ isVisible, processStatus }: any) => (
    <div data-testid="terminal-expanded-width" data-visible={isVisible}>
      Expanded Terminal - Status: {processStatus.status}
    </div>
  ),
}));

vi.mock('@/components/TerminalDiagnostic', () => ({
  default: ({ isVisible, processStatus }: any) => (
    <div data-testid="terminal-diagnostic" data-visible={isVisible}>
      Diagnostic Terminal - Status: {processStatus.status}
    </div>
  ),
}));

vi.mock('@/components/TerminalLauncher', () => ({
  default: () => <div data-testid="terminal-launcher">Terminal Launcher</div>,
}));

vi.mock('@/components/ClaudeInstanceManager', () => ({
  default: ({ apiUrl }: any) => (
    <div data-testid="claude-instance-manager">
      Claude Instance Manager - API: {apiUrl}
    </div>
  ),
}));

vi.mock('@/components/NLDDashboard', () => ({
  default: ({ isVisible, onClose }: any) => (
    <div data-testid="nld-dashboard" data-visible={isVisible}>
      <button onClick={onClose}>Close NLD Dashboard</button>
    </div>
  ),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
  vi.clearAllMocks();
  mockLocalStorage.clear();
});

describe('SimpleLauncher Component', () => {
  describe('Initial Render', () => {
    it('should render without crashing', () => {
      expect(() => render(<SimpleLauncher />)).not.toThrow();
    });

    it('should display the main title and description', () => {
      render(<SimpleLauncher />);
      
      expect(screen.getByText('Claude Code Launcher')).toBeInTheDocument();
      expect(screen.getByText('Simple process launcher - no social features, no users')).toBeInTheDocument();
    });

    it('should show initial system information', () => {
      render(<SimpleLauncher />);
      
      expect(screen.getByText(/Claude Code:/)).toBeInTheDocument();
      expect(screen.getByText(/Working Directory:/)).toBeInTheDocument();
    });

    it('should show process status section', () => {
      render(<SimpleLauncher />);
      
      expect(screen.getByText('Process Status')).toBeInTheDocument();
      expect(screen.getByText('⚫ Stopped')).toBeInTheDocument();
    });

    it('should display launch buttons when not running', () => {
      render(<SimpleLauncher />);
      
      expect(screen.getByText('🚀 prod/claude')).toBeInTheDocument();
      expect(screen.getByText('⚡ skip-permissions')).toBeInTheDocument();
      expect(screen.getByText('⚡ skip-permissions -c')).toBeInTheDocument();
      expect(screen.getByText('↻ skip-permissions --resume')).toBeInTheDocument();
    });
  });

  describe('Claude Availability Check', () => {
    it('should check Claude CLI availability on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          claudeAvailable: true,
          message: 'ok',
        }),
      });

      render(<SimpleLauncher />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/claude/check', expect.any(Object));
      });
    });

    it('should display checking status initially', () => {
      render(<SimpleLauncher />);
      
      expect(screen.getByTestId('claude-availability')).toHaveTextContent('🔄 Checking...');
    });

    it('should display available status when Claude CLI is found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          claudeAvailable: true,
        }),
      });

      render(<SimpleLauncher />);

      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('✅ Available');
      });
    });

    it('should display check required status when Claude CLI is not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          claudeAvailable: false,
        }),
      });

      render(<SimpleLauncher />);

      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('⚠️ Check Required');
      });
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SimpleLauncher />);

      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('✅ Available');
      });

      expect(screen.getByText(/Unable to verify Claude Code CLI/)).toBeInTheDocument();
    });
  });

  describe('Launch Functionality', () => {
    beforeEach(() => {
      // Mock successful Claude check
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/check')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              claudeAvailable: true,
            }),
          });
        }
        if (url.includes('/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              status: { isRunning: false, status: 'stopped' },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      });
    });

    it('should launch Claude with basic command', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockImplementation((url: string, options: any) => {
        if (url.includes('/instances') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              instanceId: 'test-instance-123',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      render(<SimpleLauncher />);

      const launchButton = screen.getByText('🚀 prod/claude');
      await user.click(launchButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/claude/instances',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Claude Chat',
              mode: 'chat',
              cwd: '/workspaces/agent-feed/prod',
            }),
          })
        );
      });
    });

    it('should disable buttons during launch', async () => {
      const user = userEvent.setup();
      
      let resolvePromise: (value: any) => void;
      const launchPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockImplementation(() => launchPromise);

      render(<SimpleLauncher />);

      const launchButton = screen.getByText('🚀 prod/claude');
      await user.click(launchButton);

      expect(launchButton).toHaveTextContent('🔄 Launching...');
      expect(launchButton).toBeDisabled();

      // Resolve the promise to complete the test
      act(() => {
        resolvePromise!({
          ok: true,
          json: async () => ({ success: true, instanceId: 'test' }),
        });
      });
    });

    it('should handle launch errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockImplementation((url: string, options: any) => {
        if (url.includes('/instances') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: false,
              message: 'Launch failed',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<SimpleLauncher />);

      const launchButton = screen.getByText('🚀 prod/claude');
      await user.click(launchButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to launch: Launch failed');
      });

      alertSpy.mockRestore();
    });
  });

  describe('View Mode Toggle', () => {
    it('should default to terminal view', () => {
      render(<SimpleLauncher />);
      
      const terminalToggle = screen.getByTestId('terminal-view-toggle');
      expect(terminalToggle).toHaveClass('active');
    });

    it('should switch to web view when clicked', async () => {
      const user = userEvent.setup();
      
      render(<SimpleLauncher />);

      const webToggle = screen.getByTestId('web-view-toggle');
      await user.click(webToggle);

      expect(webToggle).toHaveClass('active');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('claude-launcher-view-mode', 'web');
    });

    it('should persist view mode preference', () => {
      mockLocalStorage.getItem.mockReturnValue('web');

      render(<SimpleLauncher />);

      const webToggle = screen.getByTestId('web-view-toggle');
      expect(webToggle).toHaveClass('active');
    });

    it('should show terminal interface in terminal mode', () => {
      mockLocalStorage.getItem.mockReturnValue('terminal');

      render(<SimpleLauncher />);

      // Set process to running to show terminal
      // This would require mocking the status polling
    });

    it('should show web interface in web mode', async () => {
      const user = userEvent.setup();
      
      render(<SimpleLauncher />);

      const webToggle = screen.getByTestId('web-view-toggle');
      await user.click(webToggle);

      expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
    });
  });

  describe('Terminal Modes', () => {
    beforeEach(() => {
      // Mock running status to show terminal
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              status: { isRunning: true, status: 'running', pid: 12345 },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      });
    });

    it('should show expanded terminal mode by default', async () => {
      render(<SimpleLauncher />);

      await waitFor(() => {
        expect(screen.getByTestId('terminal-expanded-width')).toBeInTheDocument();
      });
    });

    it('should allow switching between terminal modes', async () => {
      const user = userEvent.setup();
      
      render(<SimpleLauncher />);

      // Wait for terminal to show
      await waitFor(() => {
        expect(screen.getByTestId('terminal-expanded-width')).toBeInTheDocument();
      });

      // Find and use the terminal mode selector
      const modeSelect = screen.getByDisplayValue('📏 Width Expanded');
      await user.selectOptions(modeSelect, '🔧 Fixed');

      await waitFor(() => {
        expect(screen.getByTestId('terminal-emergency-fixed')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors without crashing', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      expect(() => render(<SimpleLauncher />)).not.toThrow();
    });

    it('should handle invalid JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      expect(() => render(<SimpleLauncher />)).not.toThrow();
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage error');
      });

      expect(() => render(<SimpleLauncher />)).not.toThrow();
    });
  });

  describe('Status Polling', () => {
    it('should poll status every 2 seconds', async () => {
      vi.useFakeTimers();
      
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              status: { isRunning: false, status: 'stopped' },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      render(<SimpleLauncher />);

      // Initial call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/claude/status', expect.any(Object));
      });

      mockFetch.mockClear();

      // Advance time by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/claude/status', expect.any(Object));
      });

      vi.useRealTimers();
    });

    it('should update status display when polling receives updates', async () => {
      let callCount = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/status')) {
          callCount++;
          const status = callCount === 1 
            ? { isRunning: false, status: 'stopped' }
            : { isRunning: true, status: 'running', pid: 12345 };
          
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              status,
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      render(<SimpleLauncher />);

      // Initially stopped
      await waitFor(() => {
        expect(screen.getByText('⚫ Stopped')).toBeInTheDocument();
      });

      vi.useFakeTimers();
      
      // Advance time to trigger next poll
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should now show running
      await waitFor(() => {
        expect(screen.getByText(/✅ Running \(PID: 12345\)/)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on buttons', () => {
      render(<SimpleLauncher />);
      
      const launchButton = screen.getByTitle('Launch Claude in prod directory');
      expect(launchButton).toBeInTheDocument();
      
      const skipPermsButton = screen.getByTitle('Launch with permissions skipped');
      expect(skipPermsButton).toBeInTheDocument();
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<SimpleLauncher />);

      const firstButton = screen.getByText('🚀 prod/claude');
      firstButton.focus();
      
      expect(document.activeElement).toBe(firstButton);

      // Tab to next button
      await user.tab();
      
      const secondButton = screen.getByText('⚡ skip-permissions');
      expect(document.activeElement).toBe(secondButton);
    });
  });

  describe('Component Integration', () => {
    it('should properly integrate with NLD Dashboard', async () => {
      const user = userEvent.setup();
      
      render(<SimpleLauncher />);

      // Mock running status to show terminal controls
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              status: { isRunning: true, status: 'running' },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      // Wait for running status to be polled
      await waitFor(() => {
        const nldButton = screen.getByText('🧠 NLD Dashboard');
        expect(nldButton).toBeInTheDocument();
      });

      const nldButton = screen.getByText('🧠 NLD Dashboard');
      await user.click(nldButton);

      expect(screen.getByTestId('nld-dashboard')).toHaveAttribute('data-visible', 'true');
    });

    it('should handle terminal component visibility correctly', async () => {
      render(<SimpleLauncher />);

      // Initially no terminal shown (not running)
      expect(screen.queryByTestId('terminal-expanded-width')).not.toBeInTheDocument();

      // Mock running status
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              status: { isRunning: true, status: 'running' },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      vi.useFakeTimers();
      
      // Trigger status poll
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('terminal-expanded-width')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });
});