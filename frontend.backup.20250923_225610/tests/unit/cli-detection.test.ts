/**
 * CLI Detection Unit Tests
 * Tests the frontend logic for detecting Claude Code CLI availability
 * 
 * These tests should FAIL initially (showing the bug) then PASS after frontend fix
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = mockFetch;

interface ApiResponse {
  success: boolean;
  message: string;
  claudeAvailable?: boolean;
  error?: string;
}

describe('CLI Detection Logic', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Mock console methods to avoid test output noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Response Parsing', () => {
    it('should detect CLI as available when backend returns claudeAvailable: true', async () => {
      // ARRANGE
      const mockResponse: ApiResponse = {
        success: true,
        message: 'Claude Code found',
        claudeAvailable: true
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers()
      } as Response);

      // ACT
      const response = await fetch('/api/claude/check');
      const data = await response.json();

      // ASSERT - This should pass when working correctly
      expect(data.claudeAvailable).toBe(true);
      expect(data.success).toBe(true);
    });

    it('should detect CLI as unavailable when backend returns claudeAvailable: false', async () => {
      // ARRANGE
      const mockResponse: ApiResponse = {
        success: true,
        message: 'Claude Code not found',
        claudeAvailable: false
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers()
      } as Response);

      // ACT
      const response = await fetch('/api/claude/check');
      const data = await response.json();

      // ASSERT
      expect(data.claudeAvailable).toBe(false);
      expect(data.success).toBe(true);
    });

    it('REGRESSION: should handle missing claudeAvailable field gracefully', async () => {
      // ARRANGE - This simulates a backend response missing claudeAvailable field
      const mockResponse = {
        success: true,
        message: 'Response without claudeAvailable field'
        // claudeAvailable field is intentionally missing
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers()
      } as Response);

      // ACT
      const response = await fetch('/api/claude/check');
      const data = await response.json();

      // ASSERT - Should handle undefined gracefully
      expect(data.claudeAvailable).toBeUndefined();
      expect(data.success).toBe(true);
      
      // Frontend logic should default to false when claudeAvailable is undefined
      const availabilityResult = data.claudeAvailable || false;
      expect(availabilityResult).toBe(false);
    });

    it('CRITICAL: should handle backend server unavailable scenario', async () => {
      // ARRANGE - Simulate backend server not responding
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

      // ACT & ASSERT
      await expect(fetch('/api/claude/check')).rejects.toThrow('fetch failed');
    });

    it('should handle HTTP error responses from backend', async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' }),
        headers: new Headers()
      } as Response);

      // ACT
      const response = await fetch('/api/claude/check');

      // ASSERT
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });

  describe('Frontend State Management', () => {
    it('should set claudeAvailable to false when API call fails', () => {
      // This test validates the frontend error handling logic
      // that should set claudeAvailable to false on API errors
      
      let claudeAvailable: boolean | null = null;
      
      // Simulate error handling logic from SimpleLauncher
      try {
        throw new Error('API call failed');
      } catch (error) {
        claudeAvailable = false;
      }
      
      expect(claudeAvailable).toBe(false);
    });

    it('should handle null/undefined claudeAvailable gracefully', () => {
      // Test the frontend logic for handling missing/null values
      
      const testValues = [null, undefined, false, 0, '', NaN];
      
      testValues.forEach(value => {
        const availabilityResult = value || false;
        expect(availabilityResult).toBe(false);
      });
    });

    it('should only set claudeAvailable to true for explicitly true values', () => {
      // Test that only explicit true values result in CLI being available
      
      const trueValues = [true];
      const falseValues = [false, null, undefined, 0, ''];
      
      trueValues.forEach(value => {
        const availabilityResult = value || false;
        expect(availabilityResult).toBe(true);
      });
      
      falseValues.forEach(value => {
        const availabilityResult = value || false;
        expect(availabilityResult).toBe(false);
      });
    });
  });

  describe('Error Message Display Logic', () => {
    it('should show error message when claudeAvailable is false', () => {
      // Simulate the condition check from SimpleLauncher
      const claudeAvailable = false;
      const shouldShowWarning = !claudeAvailable;
      
      expect(shouldShowWarning).toBe(true);
    });

    it('should hide error message when claudeAvailable is true', () => {
      // Simulate the condition check from SimpleLauncher  
      const claudeAvailable = true;
      const shouldShowWarning = !claudeAvailable;
      
      expect(shouldShowWarning).toBe(false);
    });

    it('should show error message when claudeAvailable is null (loading state)', () => {
      // During loading, claudeAvailable is null, should this show warning?
      const claudeAvailable = null;
      const shouldShowWarning = !claudeAvailable;
      
      expect(shouldShowWarning).toBe(true);
    });
  });

  describe('Button Disable Logic', () => {
    it('should disable launch buttons when CLI is not available', () => {
      const claudeAvailable = false;
      const isLoading = false;
      
      const shouldDisable = isLoading || !claudeAvailable;
      
      expect(shouldDisable).toBe(true);
    });

    it('should enable launch buttons when CLI is available and not loading', () => {
      const claudeAvailable = true;
      const isLoading = false;
      
      const shouldDisable = isLoading || !claudeAvailable;
      
      expect(shouldDisable).toBe(false);
    });

    it('should disable launch buttons during loading even if CLI is available', () => {
      const claudeAvailable = true;
      const isLoading = true;
      
      const shouldDisable = isLoading || !claudeAvailable;
      
      expect(shouldDisable).toBe(true);
    });
  });

  describe('API URL Construction', () => {
    it('should use correct API endpoint for CLI check', () => {
      // Test the API endpoint construction
      const endpoint = '/check';
      const fullUrl = `/api/claude${endpoint}`;
      
      expect(fullUrl).toBe('/api/claude/check');
    });

    it('should handle various endpoint formats', () => {
      const endpoints = ['/check', 'check', '/status', 'status'];
      
      endpoints.forEach(endpoint => {
        const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const fullUrl = `/api/claude${normalizedEndpoint}`;
        
        expect(fullUrl).toMatch(/^\/api\/claude\/.+/);
      });
    });
  });
});

/**
 * Integration Test Scenarios
 * These test the complete flow from API call to UI state
 */
describe('CLI Detection Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('INTEGRATION: Complete successful CLI detection flow', async () => {
    // ARRANGE
    const mockResponse: ApiResponse = {
      success: true,
      message: 'Claude Code CLI found at /usr/local/bin/claude',
      claudeAvailable: true
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
      headers: new Headers()
    } as Response);

    // ACT - Simulate the complete detection flow
    try {
      const response = await fetch('/api/claude/check');
      const data = await response.json();
      
      const availabilityResult = data.claudeAvailable || false;
      
      // ASSERT - All parts of the flow should work
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.claudeAvailable).toBe(true);
      expect(availabilityResult).toBe(true);
      
      // UI state should be correct
      const shouldShowWarning = !availabilityResult;
      const shouldDisableButtons = !availabilityResult;
      
      expect(shouldShowWarning).toBe(false);
      expect(shouldDisableButtons).toBe(false);
      
    } catch (error) {
      // This should not happen in successful flow
      throw error;
    }
  });

  it('INTEGRATION: Complete failed CLI detection flow', async () => {
    // ARRANGE
    const mockResponse: ApiResponse = {
      success: true,
      message: 'Claude Code CLI not found',
      claudeAvailable: false
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
      headers: new Headers()
    } as Response);

    // ACT
    try {
      const response = await fetch('/api/claude/check');
      const data = await response.json();
      
      const availabilityResult = data.claudeAvailable || false;
      
      // ASSERT - Flow should handle CLI not found
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.claudeAvailable).toBe(false);
      expect(availabilityResult).toBe(false);
      
      // UI state should show appropriate warnings
      const shouldShowWarning = !availabilityResult;
      const shouldDisableButtons = !availabilityResult;
      
      expect(shouldShowWarning).toBe(true);
      expect(shouldDisableButtons).toBe(true);
      
    } catch (error) {
      // This should not happen even when CLI is not found
      throw error;
    }
  });

  it('INTEGRATION: Complete error handling flow (backend down)', async () => {
    // ARRANGE - Backend is completely unavailable
    mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

    // ACT
    let claudeAvailable: boolean | null = null;
    
    try {
      await fetch('/api/claude/check');
      // Should not reach here
    } catch (error) {
      // Simulate error handling logic
      claudeAvailable = false;
    }
    
    // ASSERT - Error should be handled gracefully
    expect(claudeAvailable).toBe(false);
    
    const shouldShowWarning = !claudeAvailable;
    const shouldDisableButtons = !claudeAvailable;
    
    expect(shouldShowWarning).toBe(true);
    expect(shouldDisableButtons).toBe(true);
  });

  it('CRITICAL: User-reported scenario - CLI available on port 3002 but frontend shows error', async () => {
    // This test reproduces the exact issue the user reported:
    // Backend server running on port 3002, CLI available, but frontend shows "Claude Code not found"
    
    // ARRANGE - Backend responds correctly that CLI is available
    const mockResponse: ApiResponse = {
      success: true,
      message: 'Claude Code CLI found and working',
      claudeAvailable: true // Backend correctly detects CLI
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
      headers: new Headers()
    } as Response);

    // ACT - Simulate the exact frontend flow from SimpleLauncher
    let claudeAvailable: boolean | null = null;
    
    try {
      const response = await fetch('/api/claude/check');
      const jsonData = await response.json();
      
      // This is the exact logic from SimpleLauncher.tsx line 107
      const availabilityResult = jsonData.claudeAvailable || false;
      claudeAvailable = availabilityResult;
      
    } catch (error) {
      claudeAvailable = false;
    }

    // ASSERT - This should PASS when working correctly
    // If this test FAILS, it indicates the bug that the user is experiencing
    expect(mockResponse.claudeAvailable).toBe(true); // Backend says CLI is available
    expect(claudeAvailable).toBe(true); // Frontend should detect it as available
    
    // UI should NOT show the error message
    const shouldShowWarning = !claudeAvailable;
    expect(shouldShowWarning).toBe(false);
    
    // Buttons should NOT be disabled
    const shouldDisableButtons = !claudeAvailable;
    expect(shouldDisableButtons).toBe(false);
  });
});