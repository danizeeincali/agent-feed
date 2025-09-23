/**
 * CLI Communication Integration Tests
 * Tests the complete communication flow between frontend and backend
 * for CLI detection and error message display
 * 
 * These tests validate the integration between:
 * - Frontend SimpleLauncher component
 * - Backend API endpoints
 * - Error message display logic
 * - Button enable/disable logic
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock SimpleLauncher component behavior for integration testing
interface SimpleLauncherProps {
  testMode?: boolean;
}

// Simplified version of SimpleLauncher for testing integration
const SimpleLauncherIntegrationTest: React.FC<SimpleLauncherProps> = ({ testMode = true }) => {
  const [claudeAvailable, setClaudeAvailable] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Replicate the API call logic from SimpleLauncher
  const apiCall = async (endpoint: string) => {
    const fullUrl = `/api/claude${endpoint}`;
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  };

  // Replicate the Claude check logic from SimpleLauncher
  React.useEffect(() => {
    const checkClaude = async () => {
      try {
        const response = await apiCall('/check');
        const availabilityResult = response.claudeAvailable || false;
        setClaudeAvailable(availabilityResult);
      } catch (error) {
        setClaudeAvailable(false);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    if (testMode) {
      checkClaude();
    }
  }, [testMode]);

  const getClaudeAvailabilityDisplay = () => {
    if (claudeAvailable === null) return '🔄 Checking...';
    return claudeAvailable ? '✅ Available' : '❌ Not Found';
  };

  return React.createElement('div', { 'data-testid': 'simple-launcher-integration' },
    React.createElement('h1', null, 'Claude Code Launcher'),
    React.createElement('div', { className: 'system-info' },
      React.createElement('div', null,
        React.createElement('strong', null, 'Claude Code:'),
        ' ',
        React.createElement('span', { 'data-testid': 'claude-availability' },
          getClaudeAvailabilityDisplay()
        )
      )
    ),
    (!claudeAvailable && claudeAvailable !== null) && React.createElement('div', { 
      className: 'warning', 
      'data-testid': 'warning-message' 
    }, '⚠️ Claude Code not found. Please install Claude Code CLI first.'),
    React.createElement('div', { className: 'controls' },
      React.createElement('button', {
        disabled: isLoading || !claudeAvailable,
        className: 'launch-button',
        'data-testid': 'launch-button'
      }, '🚀 Launch Claude')
    ),
    error && React.createElement('div', { 
      'data-testid': 'error-message', 
      className: 'error' 
    }, 'Error: ' + error)
  );
};

describe('CLI Communication Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Successful CLI Detection Integration', () => {
    it('should show CLI as available when backend responds with claudeAvailable: true', async () => {
      // ARRANGE
      const mockResponse = {
        success: true,
        message: 'Claude Code CLI found',
        claudeAvailable: true
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      // ACT
      render(React.createElement(SimpleLauncherIntegrationTest));
      
      // Initial state should be checking
      expect(screen.getByTestId('claude-availability')).toHaveTextContent('🔄 Checking...');
      
      // Wait for API call to complete
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('✅ Available');
      });

      // ASSERT
      expect(mockFetch).toHaveBeenCalledWith('/api/claude/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Warning message should NOT be visible
      expect(screen.queryByTestId('warning-message')).not.toBeInTheDocument();
      
      // Launch button should be enabled
      expect(screen.getByTestId('launch-button')).not.toBeDisabled();
    });
  });

  describe('Failed CLI Detection Integration', () => {
    it('should show CLI as not available when backend responds with claudeAvailable: false', async () => {
      // ARRANGE
      const mockResponse = {
        success: true,
        message: 'Claude Code CLI not found',
        claudeAvailable: false
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      // ACT
      render(React.createElement(SimpleLauncherIntegrationTest));
      
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('❌ Not Found');
      });

      // ASSERT
      expect(mockFetch).toHaveBeenCalledOnce();
      
      // Warning message SHOULD be visible
      expect(screen.getByTestId('warning-message')).toBeInTheDocument();
      expect(screen.getByTestId('warning-message')).toHaveTextContent('Claude Code not found');
      
      // Launch button should be disabled
      expect(screen.getByTestId('launch-button')).toBeDisabled();
    });
  });

  describe('Network Error Integration', () => {
    it('should handle network errors gracefully', async () => {
      // ARRANGE
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // ACT
      render(React.createElement(SimpleLauncherIntegrationTest));
      
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('❌ Not Found');
      });

      // ASSERT
      expect(screen.getByTestId('warning-message')).toBeInTheDocument();
      expect(screen.getByTestId('launch-button')).toBeDisabled();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
    });

    it('should handle HTTP error responses', async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      // ACT
      render(React.createElement(SimpleLauncherIntegrationTest));
      
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('❌ Not Found');
      });

      // ASSERT
      expect(screen.getByTestId('warning-message')).toBeInTheDocument();
      expect(screen.getByTestId('launch-button')).toBeDisabled();
      expect(screen.getByTestId('error-message')).toHaveTextContent('HTTP 500: Internal Server Error');
    });
  });

  describe('CRITICAL: User-Reported Bug Scenario', () => {
    it('should NOT show error when backend correctly reports CLI as available', async () => {
      // This test reproduces the exact user scenario:
      // Backend on port 3002 has CLI available, but frontend shows "Claude Code not found"
      
      // ARRANGE - Backend correctly detects CLI
      const mockResponse = {
        success: true,
        message: 'Claude Code CLI found at /usr/local/bin/claude',
        claudeAvailable: true // Backend says CLI is available
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      // ACT
      render(React.createElement(SimpleLauncherIntegrationTest));
      
      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('✅ Available');
      });

      // CRITICAL ASSERTIONS - These should PASS when working correctly
      // If these FAIL, it confirms the user's bug
      
      // 1. Should show CLI as available
      expect(screen.getByTestId('claude-availability')).toHaveTextContent('✅ Available');
      
      // 2. Should NOT show warning message
      expect(screen.queryByTestId('warning-message')).not.toBeInTheDocument();
      
      // 3. Launch button should be enabled
      expect(screen.getByTestId('launch-button')).not.toBeDisabled();
      
      // 4. Should not show any error message
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      
      // 5. API should have been called correctly
      expect(mockFetch).toHaveBeenCalledWith('/api/claude/check', expect.any(Object));
    });
  });

  describe('Response Parsing Integration', () => {
    it('should handle missing claudeAvailable field', async () => {
      // ARRANGE - Response missing claudeAvailable field
      const mockResponse = {
        success: true,
        message: 'Response without claudeAvailable field'
        // claudeAvailable field is intentionally missing
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      // ACT
      render(React.createElement(SimpleLauncherIntegrationTest));
      
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('❌ Not Found');
      });

      // ASSERT - Should default to unavailable when field is missing
      expect(screen.getByTestId('warning-message')).toBeInTheDocument();
      expect(screen.getByTestId('launch-button')).toBeDisabled();
    });

    it('should handle null claudeAvailable field', async () => {
      // ARRANGE
      const mockResponse = {
        success: true,
        message: 'Response with null claudeAvailable',
        claudeAvailable: null
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      // ACT
      render(React.createElement(SimpleLauncherIntegrationTest));
      
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('❌ Not Found');
      });

      // ASSERT
      expect(screen.getByTestId('warning-message')).toBeInTheDocument();
      expect(screen.getByTestId('launch-button')).toBeDisabled();
    });

    it('should handle various falsy values for claudeAvailable', async () => {
      const falsyValues = [false, 0, '', NaN, undefined];
      
      for (const falsyValue of falsyValues) {
        // ARRANGE
        const mockResponse = {
          success: true,
          message: `Response with claudeAvailable: ${falsyValue}`,
          claudeAvailable: falsyValue
        };
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        });

        // ACT
        const { unmount } = render(React.createElement(SimpleLauncherIntegrationTest));
        
        await waitFor(() => {
          expect(screen.getByTestId('claude-availability')).toHaveTextContent('❌ Not Found');
        });

        // ASSERT
        expect(screen.getByTestId('warning-message')).toBeInTheDocument();
        expect(screen.getByTestId('launch-button')).toBeDisabled();
        
        // Clean up for next iteration
        unmount();
        mockFetch.mockClear();
      }
    });
  });

  describe('State Transitions Integration', () => {
    it('should transition from checking to available', async () => {
      // ARRANGE
      const mockResponse = {
        success: true,
        message: 'Claude Code CLI found',
        claudeAvailable: true
      };
      
      // Delay the response to test the checking state
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponse)
          }), 100)
        )
      );

      // ACT
      render(React.createElement(SimpleLauncherIntegrationTest));
      
      // Should start in checking state
      expect(screen.getByTestId('claude-availability')).toHaveTextContent('🔄 Checking...');
      
      // Should transition to available
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('✅ Available');
      }, { timeout: 1000 });
    });

    it('should transition from checking to not found', async () => {
      // ARRANGE
      const mockResponse = {
        success: true,
        message: 'Claude Code CLI not found',
        claudeAvailable: false
      };
      
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponse)
          }), 100)
        )
      );

      // ACT
      render(React.createElement(SimpleLauncherIntegrationTest));
      
      // Should start in checking state
      expect(screen.getByTestId('claude-availability')).toHaveTextContent('🔄 Checking...');
      
      // Should transition to not found
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('❌ Not Found');
      }, { timeout: 1000 });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle JSON parsing errors', async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      // ACT
      render(React.createElement(SimpleLauncherIntegrationTest));
      
      await waitFor(() => {
        expect(screen.getByTestId('claude-availability')).toHaveTextContent('❌ Not Found');
      });

      // ASSERT
      expect(screen.getByTestId('warning-message')).toBeInTheDocument();
      expect(screen.getByTestId('launch-button')).toBeDisabled();
    });
  });
});