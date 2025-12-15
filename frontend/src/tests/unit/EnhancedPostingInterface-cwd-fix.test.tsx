/**
 * Unit Test Suite: EnhancedPostingInterface - CWD Path Fix
 *
 * TDD London School: Unit Testing with Interaction Verification
 * Phase: RED (all tests should fail initially)
 *
 * Purpose: Verify EnhancedPostingInterface component sends correct cwd path
 * Approach: Test component behavior, verify interactions with fetch API
 *
 * CRITICAL: These are behavior tests, NOT state tests
 * Focus: How component collaborates with external APIs
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedPostingInterface } from '../../components/EnhancedPostingInterface';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Expected values
const CORRECT_CWD = '/workspaces/agent-feed/prod';
const API_ENDPOINT = '/api/claude-code/streaming-chat';

describe('EnhancedPostingInterface - CWD Path Verification', () => {

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Test response from Claude'
      })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {

    test('should render Avi DM tab', () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      expect(aviTab).toBeInTheDocument();
    });

    test('should show Avi chat interface when tab is clicked', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message to λvi/i)).toBeInTheDocument();
      });
    });

    test('should render send button', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send/i });
        expect(sendButton).toBeInTheDocument();
      });
    });
  });

  describe('Message Sending - Correct CWD Path', () => {

    test('should send request with correct cwd path to /workspaces/agent-feed/prod', async () => {
      render(<EnhancedPostingInterface />);

      // Navigate to Avi DM
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      // Wait for chat interface
      const input = await screen.findByPlaceholderText(/type your message to λvi/i);

      // Type message
      fireEvent.change(input, { target: { value: 'Test message' } });

      // Click send
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Verify fetch was called with correct parameters
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Get the fetch call arguments
      const fetchCall = mockFetch.mock.calls[0];
      const [url, options] = fetchCall;

      // Verify URL
      expect(url).toContain('/api/claude-code/streaming-chat');

      // Verify request body includes correct cwd
      const requestBody = JSON.parse(options.body);
      expect(requestBody.options).toBeDefined();
      expect(requestBody.options.cwd).toBe(CORRECT_CWD);
    });

    test('should NOT use relative URL that depends on proxy', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const [url] = mockFetch.mock.calls[0];

      // URL should include base URL or be absolute
      // This test will FAIL initially because component uses relative URL
      expect(url).toMatch(/^http|localhost/);
    });

    test('should include system prompt in request', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test message' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const [, options] = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(options.body);

      // Verify system prompt is included
      expect(requestBody.message).toContain('Λvi');
      expect(requestBody.message).toContain('/workspaces/agent-feed/prod/CLAUDE.md');
    });

    test('should send message content in request body', async () => {
      const testMessage = 'What is 2 + 2?';

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: testMessage } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const [, options] = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(options.body);

      expect(requestBody.message).toContain(testMessage);
    });
  });

  describe('Response Handling', () => {

    test('should display response in chat interface', async () => {
      const mockResponse = 'Hello from Λvi!';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: mockResponse
        })
      });

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Wait for response to appear
      await waitFor(() => {
        expect(screen.getByText(mockResponse)).toBeInTheDocument();
      });
    });

    test('should handle different response formats', async () => {
      const scenarios = [
        { message: 'Response in message field' },
        { content: 'Response in content field' },
        {
          content: [
            { type: 'text', text: 'Response in content array' }
          ]
        },
        {
          responses: [
            { content: 'Response in responses array' }
          ]
        }
      ];

      for (const responseFormat of scenarios) {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => responseFormat
        });

        const { unmount } = render(<EnhancedPostingInterface />);

        const aviTab = screen.getByRole('button', { name: /avi dm/i });
        fireEvent.click(aviTab);

        const input = await screen.findByPlaceholderText(/type your message to λvi/i);
        fireEvent.change(input, { target: { value: 'Test' } });

        const sendButton = screen.getByRole('button', { name: /send/i });
        fireEvent.click(sendButton);

        // Should handle response without crashing
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });

        unmount();
        mockFetch.mockClear();
      }
    });

    test('should clear input after sending', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test message' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('Error Handling - 403 Prevention', () => {

    test('should handle 403 Forbidden error gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          success: false,
          error: 'Forbidden',
          message: 'Path not allowed'
        })
      });

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Should display error message in chat
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should handle timeout errors (90 seconds)', async () => {
      vi.useFakeTimers();

      mockFetch.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Late response' })
        }), 95000); // 95 seconds (exceeds 90s timeout)
      }));

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Advance time to trigger timeout
      vi.advanceTimersByTime(91000);

      await waitFor(() => {
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    test('should NOT crash on malformed JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('UI State Management', () => {

    test('should disable send button while submitting', async () => {
      mockFetch.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Response' })
        }), 1000);
      }));

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Send button should be disabled during submission
      expect(sendButton).toBeDisabled();
    });

    test('should show typing indicator while waiting for response', async () => {
      mockFetch.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Response' })
        }), 1000);
      }));

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Typing indicator should appear
      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument();
      });
    });

    test('should not submit empty messages', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const sendButton = await screen.findByRole('button', { name: /send/i });

      // Send button should be disabled
      expect(sendButton).toBeDisabled();

      // Try to click anyway
      fireEvent.click(sendButton);

      // Fetch should not be called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Interaction Contracts (London School Focus)', () => {

    test('should call fetch exactly once per message', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    test('should use POST method for API call', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
    });

    test('should include Content-Type header', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    test('should verify collaboration sequence: input -> send -> fetch -> display', async () => {
      const callSequence: string[] = [];

      mockFetch.mockImplementation((...args) => {
        callSequence.push('fetch');
        return Promise.resolve({
          ok: true,
          json: async () => {
            callSequence.push('response');
            return { message: 'Response' };
          }
        });
      });

      render(<EnhancedPostingInterface />);

      callSequence.push('render');

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      fireEvent.click(aviTab);
      callSequence.push('tab-click');

      const input = await screen.findByPlaceholderText(/type your message to λvi/i);
      fireEvent.change(input, { target: { value: 'Test' } });
      callSequence.push('input');

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);
      callSequence.push('send');

      await waitFor(() => {
        expect(screen.getByText('Response')).toBeInTheDocument();
      });
      callSequence.push('display');

      // Verify correct sequence
      expect(callSequence).toEqual([
        'render',
        'tab-click',
        'input',
        'send',
        'fetch',
        'response',
        'display'
      ]);
    });
  });
});
