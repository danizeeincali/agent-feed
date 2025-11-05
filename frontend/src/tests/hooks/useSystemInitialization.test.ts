import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSystemInitialization } from '../../hooks/useSystemInitialization';

describe('useSystemInitialization', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should detect new user and trigger initialization', async () => {
    // Mock: No welcome posts found
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          state: { hasWelcomePosts: false, welcomePostsCount: 0 }
        })
      })
      // Mock: Successful initialization
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, postsCreated: 3 })
      });

    const { result } = renderHook(() => useSystemInitialization('test-user'));

    // Initial state
    expect(result.current.isInitializing).toBe(false);
    expect(result.current.isInitialized).toBe(false);

    // Wait for initialization to complete
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(result.current.isInitializing).toBe(false);
    expect(result.current.error).toBeNull();

    // Verify API calls
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/system/state?userId=test-user');
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/system/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user' })
    });
  });

  it('should not re-initialize existing user', async () => {
    // Mock: User has welcome posts
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        state: { hasWelcomePosts: true, welcomePostsCount: 3 }
      })
    });

    const { result } = renderHook(() => useSystemInitialization('existing-user'));

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    // Should only check state, not call initialize
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/system/state?userId=existing-user');
  });

  it('should handle API errors gracefully', async () => {
    // Mock: API error
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSystemInitialization('error-user'));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Should still mark as initialized to not block app
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.isInitializing).toBe(false);
  });

  it('should handle initialization failure', async () => {
    // Mock: No welcome posts
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          state: { hasWelcomePosts: false, welcomePostsCount: 0 }
        })
      })
      // Mock: Failed initialization
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Initialization failed' })
      });

    const { result } = renderHook(() => useSystemInitialization('fail-user'));

    await waitFor(() => {
      expect(result.current.error).toBe('Initialization failed');
    });

    expect(result.current.isInitializing).toBe(false);
  });

  it('should use default userId if not provided', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        state: { hasWelcomePosts: true, welcomePostsCount: 3 }
      })
    });

    renderHook(() => useSystemInitialization());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/system/state?userId=demo-user-123');
    });
  });

  describe('Advanced error scenarios', () => {
    it('should handle HTTP error response during state check', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useSystemInitialization('http-error-user'));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.error).toContain('Failed to check system state');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle HTTP error during initialization', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            state: { hasWelcomePosts: false, welcomePostsCount: 0 }
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Service Unavailable'
        });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useSystemInitialization('init-http-error-user'));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.error).toContain('Failed to initialize');
      consoleSpy.mockRestore();
    });

    it('should handle empty response body gracefully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}) // No state field
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, postsCreated: 3 })
        });

      const { result } = renderHook(() => useSystemInitialization('empty-response-user'));

      await waitFor(() => {
        // Should recognize no welcome posts and attempt to initialize
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Loading state transitions', () => {
    it('should properly transition through loading states', async () => {
      const states: any[] = [];

      (global.fetch as any)
        .mockImplementation((url: string) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              if (url.includes('system/state')) {
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    state: { hasWelcomePosts: false, welcomePostsCount: 0 }
                  })
                });
              } else {
                resolve({
                  ok: true,
                  json: async () => ({ success: true, postsCreated: 3 })
                });
              }
            }, 50);
          });
        });

      const { result } = renderHook(() => useSystemInitialization('loading-state-user'));

      // Capture initial state
      states.push({ ...result.current });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 3000 });

      // Capture final state
      states.push({ ...result.current });

      // Verify progression
      expect(states[0].isInitializing).toBe(false);
      expect(states[0].isInitialized).toBe(false);
      expect(states[states.length - 1].isInitializing).toBe(false);
      expect(states[states.length - 1].isInitialized).toBe(true);
    });
  });

  describe('Logging behavior', () => {
    it('should log successful initialization with post count', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            state: { hasWelcomePosts: false, welcomePostsCount: 0 }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, postsCreated: 3 })
        });

      renderHook(() => useSystemInitialization('log-success-user'));

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '✅ System initialized:',
          3,
          'welcome posts created'
        );
      });

      consoleLogSpy.mockRestore();
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (global.fetch as any).mockRejectedValueOnce(new Error('Test error'));

      renderHook(() => useSystemInitialization('log-error-user'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '❌ Initialization error:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Idempotency', () => {
    it('should not re-run on component re-render', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          state: { hasWelcomePosts: true, welcomePostsCount: 3 }
        })
      });

      const { result, rerender } = renderHook(() => useSystemInitialization('stable-user'));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const callCount = (global.fetch as any).mock.calls.length;

      // Re-render should not trigger new API calls
      rerender();

      expect((global.fetch as any).mock.calls.length).toBe(callCount);
    });

    it('should re-run when userId changes', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            state: { hasWelcomePosts: true, welcomePostsCount: 3 }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            state: { hasWelcomePosts: false, welcomePostsCount: 0 }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, postsCreated: 3 })
        });

      const { result, rerender } = renderHook(
        ({ userId }) => useSystemInitialization(userId),
        { initialProps: { userId: 'user-1' } }
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Change userId should trigger new check
      rerender({ userId: 'user-2' });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Response format compatibility', () => {
    it('should handle state response format correctly', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          state: { hasWelcomePosts: true, welcomePostsCount: 3 }
        })
      });

      const { result } = renderHook(() => useSystemInitialization('state-format-user'));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Should only check state, not initialize
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBeNull();
    });

    it('should handle missing postsCreated in success response', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            state: { hasWelcomePosts: false, welcomePostsCount: 0 }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }) // Missing postsCreated
        });

      renderHook(() => useSystemInitialization('missing-count-user'));

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '✅ System initialized:',
          0, // Defaults to 0
          'welcome posts created'
        );
      });

      consoleLogSpy.mockRestore();
    });
  });

  it('should initialize even when old posts exist', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          state: { hasWelcomePosts: false, welcomePostsCount: 0 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, postsCreated: 3 })
      });

    const { result } = renderHook(() => useSystemInitialization('demo-user-123'));

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/system/state'));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/system/initialize',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
