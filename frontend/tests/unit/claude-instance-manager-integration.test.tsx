/**
 * TDD Test Suite: Claude Instance Manager Integration
 * SPARC Methodology: Refinement Phase - Test-Driven Development
 * 
 * Tests view toggle functionality, route integration, and backward compatibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SimpleLauncher from '../../src/components/SimpleLauncher';

// Mock ClaudeInstanceManager component
vi.mock('../../src/components/ClaudeInstanceManager', () => ({
  default: () => <div data-testid="claude-instance-manager">Claude Instance Manager</div>
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Claude Instance Manager Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    
    // Mock fetch for API calls
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          claudeAvailable: true,
          status: { isRunning: false, status: 'stopped' }
        }),
      })
    ) as any;
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

  describe('SPECIFICATION: View Toggle Functionality', () => {
    it('should display view mode toggle section', () => {
      renderComponent();
      
      expect(screen.getByText('Interface Mode')).toBeInTheDocument();
      expect(screen.getByText('Choose between terminal or web interface for Claude interaction')).toBeInTheDocument();
      expect(screen.getByTestId('terminal-view-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('web-view-toggle')).toBeInTheDocument();
    });

    it('should default to terminal view when no preference is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      renderComponent();
      
      const terminalToggle = screen.getByTestId('terminal-view-toggle');
      expect(terminalToggle).toHaveClass('active');
      expect(screen.getByTestId('web-view-toggle')).not.toHaveClass('active');
    });

    it('should respect stored view preference', () => {
      localStorageMock.getItem.mockReturnValue('web');
      renderComponent();
      
      const webToggle = screen.getByTestId('web-view-toggle');
      expect(webToggle).toHaveClass('active');
      expect(screen.getByTestId('terminal-view-toggle')).not.toHaveClass('active');
    });
  });

  describe('PSEUDOCODE: Toggle State Management', () => {
    it('should switch to web view and persist preference', () => {
      renderComponent();
      
      const webToggle = screen.getByTestId('web-view-toggle');
      fireEvent.click(webToggle);
      
      expect(webToggle).toHaveClass('active');
      expect(screen.getByTestId('terminal-view-toggle')).not.toHaveClass('active');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('claude-launcher-view-mode', 'web');
    });

    it('should switch to terminal view and persist preference', () => {
      localStorageMock.getItem.mockReturnValue('web');
      renderComponent();
      
      const terminalToggle = screen.getByTestId('terminal-view-toggle');
      fireEvent.click(terminalToggle);
      
      expect(terminalToggle).toHaveClass('active');
      expect(screen.getByTestId('web-view-toggle')).not.toHaveClass('active');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('claude-launcher-view-mode', 'terminal');
    });

    it('should display correct view descriptions', () => {
      renderComponent();
      
      // Default terminal view description
      expect(screen.getByText('💻 Classic terminal interface with real-time output and diagnostic tools')).toBeInTheDocument();
      
      // Switch to web view
      fireEvent.click(screen.getByTestId('web-view-toggle'));
      expect(screen.getByText('🚀 Modern web interface with multiple instances and advanced management')).toBeInTheDocument();
    });
  });

  describe('ARCHITECTURE: Component Integration', () => {
    it('should render ClaudeInstanceManager when in web view', () => {
      localStorageMock.getItem.mockReturnValue('web');
      renderComponent();
      
      expect(screen.getByTestId('claude-instance-manager')).toBeInTheDocument();
      expect(screen.getByText('🌐 Claude Web Interface')).toBeInTheDocument();
    });

    it('should not render ClaudeInstanceManager when in terminal view', () => {
      localStorageMock.getItem.mockReturnValue('terminal');
      renderComponent();
      
      expect(screen.queryByTestId('claude-instance-manager')).not.toBeInTheDocument();
    });

    it('should render terminal section only when process is running and in terminal view', async () => {
      // Mock running process
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            status: { isRunning: true, status: 'running', pid: 1234 }
          }),
        })
      ) as any;

      renderComponent();
      
      // Wait for status update
      await waitFor(() => {
        expect(screen.getByText('✅ Running (PID: 1234)')).toBeInTheDocument();
      });

      // Terminal section should be visible in terminal mode
      expect(screen.getByText('🔬 Claude Terminal - Deep Diagnostic')).toBeInTheDocument();
    });
  });

  describe('REFINEMENT: Backward Compatibility', () => {
    it('should maintain all existing SimpleLauncher functionality', () => {
      renderComponent();
      
      // Check core elements are still present
      expect(screen.getByText('Claude Code Launcher')).toBeInTheDocument();
      expect(screen.getByText('Simple process launcher - no social features, no users')).toBeInTheDocument();
      expect(screen.getByTestId('claude-availability')).toBeInTheDocument();
      expect(screen.getByText('🚀 prod/claude')).toBeInTheDocument();
    });

    it('should preserve launch button functionality', async () => {
      renderComponent();
      
      const launchButton = screen.getByText('🚀 prod/claude');
      fireEvent.click(launchButton);
      
      // Verify API call was made
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/claude/instances',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      expect(() => renderComponent()).not.toThrow();
      
      // Should default to terminal view
      const terminalToggle = screen.getByTestId('terminal-view-toggle');
      expect(terminalToggle).toHaveClass('active');
    });
  });

  describe('COMPLETION: Responsive Design', () => {
    it('should apply mobile-responsive classes', () => {
      renderComponent();
      
      const toggleSection = screen.getByText('Interface Mode').closest('.view-toggle-section');
      expect(toggleSection).toBeInTheDocument();
      
      // Check CSS classes are applied (testing structure, actual responsive behavior tested in E2E)
      expect(screen.getByTestId('terminal-view-toggle')).toHaveClass('toggle-button');
      expect(screen.getByTestId('web-view-toggle')).toHaveClass('toggle-button');
    });
  });
});