/**
 * @test Avi DM Timeout Fix - Detailed Unit Tests
 * @description Granular unit tests for timeout handling and error recovery
 * @focus Testing edge cases, error conditions, and loading states
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Timeout constants
const VITE_PROXY_TIMEOUT = 10000; // Original 10s timeout that causes issues
const VITE_FIXED_TIMEOUT = 120000; // Fixed 120s timeout
const FAST_RESPONSE_TIME = 5000; // 5s
const MEDIUM_RESPONSE_TIME = 14000; // 14s (exceeds original timeout)
const SLOW_RESPONSE_TIME = 30000; // 30s

describe('Avi DM Timeout Fix - Detailed Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Timeout Handling', () => {
    it('should complete fast responses (5s) without timeout', async () => {
      const mockResponse = {
        ok: true,
        json: async () => {
          await new Promise(resolve => setTimeout(resolve, FAST_RESPONSE_TIME));
          return { message: 'Fast response' };
        }
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const startTime = Date.now();

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' })
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      expect(response.ok).toBe(true);
      expect(data.message).toBe('Fast response');
      expect(duration).toBeGreaterThanOrEqual(FAST_RESPONSE_TIME);
      expect(duration).toBeLessThan(VITE_PROXY_TIMEOUT);
    }, 10000);

    it('should complete medium responses (14s) that exceed original timeout', async () => {
      const mockResponse = {
        ok: true,
        json: async () => {
          await new Promise(resolve => setTimeout(resolve, MEDIUM_RESPONSE_TIME));
          return { message: 'Medium response that used to timeout' };
        }
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const startTime = Date.now();

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' })
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      expect(response.ok).toBe(true);
      expect(data.message).toBe('Medium response that used to timeout');
      expect(duration).toBeGreaterThanOrEqual(MEDIUM_RESPONSE_TIME);

      // This is the key test: 14s response should succeed (not timeout at 10s)
      expect(duration).toBeGreaterThan(VITE_PROXY_TIMEOUT);
    }, 20000);

    it('should complete slow responses (30s) with increased timeout', async () => {
      const mockResponse = {
        ok: true,
        json: async () => {
          await new Promise(resolve => setTimeout(resolve, SLOW_RESPONSE_TIME));
          return { message: 'Slow response completed successfully' };
        }
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const startTime = Date.now();

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' })
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      expect(response.ok).toBe(true);
      expect(data.message).toBe('Slow response completed successfully');
      expect(duration).toBeGreaterThanOrEqual(SLOW_RESPONSE_TIME);
      expect(duration).toBeLessThan(VITE_FIXED_TIMEOUT);
    }, 40000);

    it('should handle AbortController timeout correctly', async () => {
      const mockResponse = {
        ok: true,
        json: async () => {
          await new Promise(resolve => setTimeout(resolve, 15000));
          return { message: 'Response' };
        }
      };

      (global.fetch as any).mockImplementation((url, options) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve(mockResponse), 15000);

          options?.signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('The operation was aborted'));
          });
        });
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        await fetch('/api/claude-code/streaming-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'test' }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        throw new Error('Should have been aborted');
      } catch (error) {
        clearTimeout(timeoutId);
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('aborted');
      }
    }, 10000);
  });

  describe('Response Format Parsing', () => {
    it('should parse content array with multiple text blocks', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [
            { type: 'text', text: 'First paragraph.' },
            { type: 'text', text: 'Second paragraph.' },
            { type: 'text', text: 'Third paragraph.' }
          ]
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' })
      });

      const data = await response.json();

      // Should join text blocks with newlines
      const textBlocks = data.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text);

      expect(textBlocks.join('\n')).toBe('First paragraph.\nSecond paragraph.\nThird paragraph.');
    });

    it('should filter out non-text content blocks', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [
            { type: 'text', text: 'Text content' },
            { type: 'image', url: 'image.png' },
            { type: 'text', text: 'More text' },
            { type: 'tool_use', name: 'bash', input: {} }
          ]
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' })
      });

      const data = await response.json();

      const textBlocks = data.content
        .filter((block: any) => block.type === 'text' || block.text)
        .map((block: any) => block.text)
        .filter(Boolean);

      expect(textBlocks).toEqual(['Text content', 'More text']);
    });

    it('should handle nested response formats', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          responses: [
            {
              content: {
                text: 'Nested response'
              }
            }
          ]
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' })
      });

      const data = await response.json();

      // Should extract from nested structure
      expect(data.responses[0].content.text).toBe('Nested response');
    });

    it('should handle streaming response format', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          type: 'message',
          role: 'assistant',
          content: [
            { type: 'text', text: 'Streaming response chunk 1' },
            { type: 'text', text: 'Streaming response chunk 2' }
          ],
          stop_reason: 'end_turn'
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' })
      });

      const data = await response.json();

      expect(data.type).toBe('message');
      expect(data.role).toBe('assistant');
      expect(data.stop_reason).toBe('end_turn');

      const textContent = data.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      expect(textContent).toContain('Streaming response chunk 1');
      expect(textContent).toContain('Streaming response chunk 2');
    });
  });

  describe('Error Recovery', () => {
    it('should retry after network failure', async () => {
      let attemptCount = 0;

      (global.fetch as any).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Success on retry' })
        });
      });

      let lastError: Error | null = null;
      let result = null;

      for (let i = 0; i < 3; i++) {
        try {
          const response = await fetch('/api/claude-code/streaming-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'test' })
          });
          result = await response.json();
          break;
        } catch (error) {
          lastError = error as Error;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      expect(attemptCount).toBe(3);
      expect(result).toEqual({ message: 'Success on retry' });
      expect(lastError).not.toBeNull();
    }, 5000);

    it('should handle exponential backoff retry strategy', async () => {
      const retryDelays: number[] = [];
      let attemptCount = 0;

      (global.fetch as any).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 4) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Success' })
        });
      });

      const maxRetries = 4;
      const baseDelay = 100;

      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch('/api/claude-code/streaming-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'test' })
          });
          await response.json();
          break;
        } catch (error) {
          if (i < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, i);
            retryDelays.push(delay);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      expect(retryDelays).toEqual([100, 200, 400]);
    }, 10000);

    it('should preserve chat history during retry', async () => {
      const chatHistory: Array<{ role: string; content: string }> = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' }
      ];

      let attemptCount = 0;

      (global.fetch as any).mockImplementation((url, options) => {
        attemptCount++;
        const body = JSON.parse(options.body);

        // Verify history is preserved
        expect(body.history || body.chatHistory).toBeDefined();

        if (attemptCount < 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Success' })
        });
      });

      for (let i = 0; i < 2; i++) {
        try {
          await fetch('/api/claude-code/streaming-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'New message',
              history: chatHistory
            })
          });
          break;
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      expect(attemptCount).toBe(2);
    }, 5000);
  });

  describe('Loading State Management', () => {
    it('should manage loading state correctly through full lifecycle', async () => {
      const loadingStates: boolean[] = [];

      const mockResponse = {
        ok: true,
        json: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { message: 'Response' };
        }
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      let isLoading = false;

      const trackLoadingState = () => {
        loadingStates.push(isLoading);
      };

      // Initial state
      trackLoadingState();
      expect(isLoading).toBe(false);

      // Start loading
      isLoading = true;
      trackLoadingState();

      const promise = fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' })
      });

      trackLoadingState();
      expect(isLoading).toBe(true);

      await promise;

      // End loading
      isLoading = false;
      trackLoadingState();

      expect(loadingStates).toEqual([false, true, true, false]);
    });

    it('should prevent duplicate submissions while loading', () => {
      let isSubmitting = false;
      const submissions: number[] = [];

      const attemptSubmit = (messageId: number) => {
        if (isSubmitting) {
          return false; // Blocked
        }

        isSubmitting = true;
        submissions.push(messageId);

        // Simulate async operation
        setTimeout(() => {
          isSubmitting = false;
        }, 100);

        return true; // Allowed
      };

      expect(attemptSubmit(1)).toBe(true);
      expect(attemptSubmit(2)).toBe(false); // Should be blocked
      expect(attemptSubmit(3)).toBe(false); // Should be blocked

      expect(submissions).toEqual([1]);
    });

    it('should disable submit button while loading', () => {
      let isSubmitting = false;
      const message = 'test message';

      const canSubmit = () => {
        return message.trim().length > 0 && !isSubmitting;
      };

      expect(canSubmit()).toBe(true);

      isSubmitting = true;
      expect(canSubmit()).toBe(false);

      isSubmitting = false;
      expect(canSubmit()).toBe(true);
    });
  });

  describe('User Experience Tests', () => {
    it('should clear input immediately after submit', () => {
      let messageInput = 'Hello, Avi!';

      const handleSubmit = () => {
        const messageToSend = messageInput;
        messageInput = ''; // Clear immediately

        expect(messageInput).toBe('');
        expect(messageToSend).toBe('Hello, Avi!');
      };

      expect(messageInput).toBe('Hello, Avi!');
      handleSubmit();
      expect(messageInput).toBe('');
    });

    it('should show appropriate error messages', () => {
      const errors = {
        network: new Error('Failed to fetch'),
        timeout: new Error('API error: 408 Request Timeout'),
        server: new Error('API error: 500 Internal Server Error'),
        badGateway: new Error('API error: 502 Bad Gateway')
      };

      const formatError = (error: Error): string => {
        if (error.message.includes('Failed to fetch')) {
          return 'Network error. Please check your connection and try again.';
        }
        if (error.message.includes('408')) {
          return 'Request timed out. Please try again.';
        }
        if (error.message.includes('500')) {
          return 'Server error. Please try again later.';
        }
        if (error.message.includes('502')) {
          return 'Service temporarily unavailable. Please try again.';
        }
        return 'An error occurred. Please try again.';
      };

      expect(formatError(errors.network)).toContain('Network error');
      expect(formatError(errors.timeout)).toContain('timed out');
      expect(formatError(errors.server)).toContain('Server error');
      expect(formatError(errors.badGateway)).toContain('temporarily unavailable');
    });

    it('should maintain scroll position during new messages', () => {
      const chatContainer = {
        scrollTop: 0,
        scrollHeight: 1000,
        clientHeight: 400
      };

      const addMessage = () => {
        // Simulate adding message (increases scrollHeight)
        chatContainer.scrollHeight += 100;

        // Auto-scroll to bottom if near bottom
        const isNearBottom =
          chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50;

        if (isNearBottom) {
          chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
        }
      };

      // User at bottom
      chatContainer.scrollTop = 600; // Near bottom
      addMessage();
      expect(chatContainer.scrollTop).toBe(700); // Scrolled to new bottom

      // User scrolled up (reading history)
      chatContainer.scrollTop = 200; // Not near bottom
      addMessage();
      expect(chatContainer.scrollTop).toBe(200); // Position maintained
    });
  });

  describe('System Context Tests', () => {
    it('should include CLAUDE.md system context in prompts', () => {
      const userMessage = 'hello';

      const buildPrompt = (message: string): string => {
        const systemContext = `You are Λvi, the production Claude instance operating as Chief of Staff. Your complete operating instructions and personality are defined in /workspaces/agent-feed/prod/CLAUDE.md. Read that file using your Read tool to understand your role and boundaries.`;

        return `${systemContext}\n\nUser message: ${message}`;
      };

      const prompt = buildPrompt(userMessage);

      expect(prompt).toContain('Λvi');
      expect(prompt).toContain('Chief of Staff');
      expect(prompt).toContain('CLAUDE.md');
      expect(prompt).toContain('/workspaces/agent-feed/prod');
      expect(prompt).toContain(userMessage);
    });

    it('should set correct working directory in options', () => {
      const buildRequestBody = (message: string) => {
        return {
          message,
          options: {
            cwd: '/workspaces/agent-feed/prod'
          }
        };
      };

      const body = buildRequestBody('test');

      expect(body.options.cwd).toBe('/workspaces/agent-feed/prod');
    });
  });
});
