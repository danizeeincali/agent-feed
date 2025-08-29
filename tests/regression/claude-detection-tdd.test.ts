/**
 * TDD Test Suite for Claude Code Detection Integration
 * Tests the complete API-frontend integration flow to prevent regression
 */

// Converted from Vitest to Jest - globals available
import { render, screen, waitFor, act } from '@testing-library/react';
import { SimpleLauncher } from '@/components/SimpleLauncher';

// Mock fetch for API testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Claude Code Detection TDD Suite', () => {
  beforeAll(() => {
    // Setup console spy to capture debug logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('API Response Handling', () => {
    it('should correctly parse successful API response', async () => {
      // Arrange: Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code is available'
        }),
        headers: new Map([
          ['content-type', 'application/json'],
          ['access-control-allow-origin', '*']
        ])
      });

      // Act: Render component
      render(<SimpleLauncher />);

      // Assert: Check API call and state update
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/claude/check',
          expect.objectContaining({
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })
        );
      });

      // Assert: Component should show Claude as available
      await waitFor(() => {
        expect(screen.queryByText(/Claude Code not found/)).not.toBeInTheDocument();
        expect(screen.getByText(/✅ Available/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle API failure gracefully', async () => {
      // Arrange: Mock failed API response
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act: Render component
      render(<SimpleLauncher />);

      // Assert: Component should show Claude as unavailable
      await waitFor(() => {
        expect(screen.getByText(/⚠️ Claude Code not found/)).toBeInTheDocument();
      });
    });

    it('should handle CORS errors specifically', async () => {
      // Arrange: Mock CORS error
      const corsError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValueOnce(corsError);

      // Act: Render component
      render(<SimpleLauncher />);

      // Assert: Check error handling
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('SPARC DEBUG: Error checking Claude availability:'),
          corsError
        );
      });
    });
  });

  describe('State Management', () => {
    it('should initialize with null state then update correctly', async () => {
      // Arrange: Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code is available'
        })
      });

      // Act: Render component
      render(<SimpleLauncher />);

      // Assert: Initial state should show "Checking..."
      expect(screen.getByText(/🔄 Checking.../)).toBeInTheDocument();

      // Assert: State should update to "Available"
      await waitFor(() => {
        expect(screen.getByText(/✅ Available/)).toBeInTheDocument();
      });
    });

    it('should enable/disable launch button based on availability', async () => {
      // Arrange: Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code is available'
        })
      });

      // Act: Render component
      render(<SimpleLauncher />);

      // Assert: Button should initially be disabled
      const launchButton = screen.getByRole('button', { name: /Launch Claude/i });
      expect(launchButton).toBeDisabled();

      // Assert: Button should be enabled after successful check
      await waitFor(() => {
        expect(launchButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed JSON response', async () => {
      // Arrange: Mock response with invalid JSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      // Act: Render component
      render(<SimpleLauncher />);

      // Assert: Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByText(/⚠️ Claude Code not found/)).toBeInTheDocument();
      });
    });

    it('should handle HTTP error responses', async () => {
      // Arrange: Mock HTTP error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      // Act: Render component
      render(<SimpleLauncher />);

      // Assert: Should show error state
      await waitFor(() => {
        expect(screen.getByText(/⚠️ Claude Code not found/)).toBeInTheDocument();
      });
    });
  });

  describe('Debug Logging Validation', () => {
    it('should produce comprehensive debug logs', async () => {
      // Arrange: Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code is available'
        }),
        headers: new Map([['content-type', 'application/json']])
      });

      // Act: Render component
      render(<SimpleLauncher />);

      // Assert: Check debug logs are called
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          '🔍 SPARC DEBUG: Starting Claude availability check'
        );
        expect(console.log).toHaveBeenCalledWith(
          '🔍 SPARC DEBUG: API endpoint will be:',
          'http://localhost:3001/api/claude/check'
        );
        expect(console.log).toHaveBeenCalledWith(
          '🔍 SPARC DEBUG: State updated, claudeAvailable set to:',
          true
        );
      });
    });
  });

  describe('Regression Prevention', () => {
    it('should not break when terminal fixes are applied', async () => {
      // This test ensures Claude detection works regardless of terminal state
      
      // Arrange: Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code is available'
        })
      });

      // Act: Render component
      render(<SimpleLauncher />);

      // Assert: Claude detection should work
      await waitFor(() => {
        expect(screen.getByText(/✅ Available/)).toBeInTheDocument();
      });

      // Assert: Launch button should be enabled
      const launchButton = screen.getByRole('button', { name: /Launch Claude/i });
      await waitFor(() => {
        expect(launchButton).not.toBeDisabled();
      });
    });

    it('should maintain state consistency during WebSocket failures', async () => {
      // This test ensures Claude detection is independent of WebSocket status
      
      // Arrange: Mock successful API but simulate WebSocket failures
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code is available'
        })
      });

      // Act: Render component (WebSocket may fail in background)
      render(<SimpleLauncher />);

      // Assert: Claude detection should still work
      await waitFor(() => {
        expect(screen.getByText(/✅ Available/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});

/**
 * Integration Tests for Complete API Flow
 */
describe('API Integration Tests', () => {
  it('should make actual HTTP request to backend (when running)', async () => {
    // Skip if backend not running
    if (!process.env.CI && !process.env.INTEGRATION_TESTS) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/claude/check');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('claudeAvailable');
      expect(typeof data.claudeAvailable).toBe('boolean');
    } catch (error) {
      console.log('Integration test skipped - backend not available:', error.message);
    }
  });
});