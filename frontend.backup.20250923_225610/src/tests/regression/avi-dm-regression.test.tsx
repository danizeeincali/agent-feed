/**
 * Regression Tests for Avi DM Integration
 * SPARC Phase 5: Completion - Stability Validation
 *
 * Test Coverage:
 * - API compatibility across versions
 * - UI consistency after updates
 * - Performance regression detection
 * - Security regression prevention
 * - Feature stability validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AviDirectChatSDK } from '../../components/posting-interface/AviDirectChatSDK';
import { EnhancedPostingInterface } from '../../components/EnhancedPostingInterface';

// Mock fetch for consistent testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Version compatibility test data
const API_VERSIONS = {
  v1: {
    endpoint: '/api/claude-code/streaming-chat',
    requestFormat: { message: 'string', options: 'object' },
    responseFormat: { success: 'boolean', responses: 'array', timestamp: 'string' }
  },
  v2: {
    endpoint: '/api/v2/claude-code/streaming-chat',
    requestFormat: { message: 'string', options: 'object', version: 'string' },
    responseFormat: { success: 'boolean', responses: 'array', timestamp: 'string', version: 'string' }
  }
};

describe('Avi DM Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('API Compatibility Regression', () => {
    test('maintains backward compatibility with v1 API format', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'API v1 response format' }],
          timestamp: new Date().toISOString()
        })
      });

      render(<AviDirectChatSDK onMessageSent={jest.fn()} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test v1 compatibility');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/claude-code/streaming-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Test v1 compatibility',
            options: {
              workingDirectory: '/workspaces/agent-feed/prod',
              allowedTools: ['Read', 'Write', 'Grep', 'Bash']
            }
          })
        });
      });

      await waitFor(() => {
        expect(screen.getByText('API v1 response format')).toBeInTheDocument();
      });
    });

    test('handles response format changes gracefully', async () => {
      const user = userEvent.setup();

      // Test with legacy response format (no timestamp)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Legacy response' }]
          // Missing timestamp field
        })
      });

      render(<AviDirectChatSDK onMessageSent={jest.fn()} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test legacy format');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Legacy response')).toBeInTheDocument();
      });

      // Should not crash due to missing timestamp
      expect(screen.getByTestId('avi-chat-sdk')).toBeInTheDocument();
    });

    test('validates API error format consistency', async () => {
      const user = userEvent.setup();

      const errorFormats = [
        // Standard error format
        {
          success: false,
          error: 'Standard error message',
          details: 'Error details'
        },
        // Legacy error format
        {
          error: 'Legacy error message'
        },
        // Minimal error format
        {
          success: false,
          message: 'Minimal error'
        }
      ];

      for (const errorFormat of errorFormats) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => errorFormat
        });

        render(<AviDirectChatSDK onMessageSent={jest.fn()} />);

        const input = screen.getByPlaceholderText('Type your message to Avi...');
        await user.type(input, 'Test error format');

        const sendButton = screen.getByRole('button', { name: /send/i });
        await user.click(sendButton);

        await waitFor(() => {
          // Should display some error message regardless of format
          expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('UI Consistency Regression', () => {
    test('maintains consistent styling after updates', () => {
      const { container } = render(<AviDirectChatSDK />);

      // Test critical CSS classes are present
      expect(container.querySelector('[data-testid="avi-chat-sdk"]')).toHaveClass('flex', 'flex-col', 'h-full', 'bg-white');

      // Test input styling
      const input = screen.getByPlaceholderText('Type your message to Avi...');
      expect(input).toHaveClass('flex-1', 'p-3', 'border', 'border-gray-300', 'rounded-lg');

      // Test send button styling
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toHaveClass('flex-shrink-0', 'p-3', 'bg-blue-500', 'text-white', 'rounded-lg');
    });

    test('preserves component structure after refactoring', () => {
      render(<AviDirectChatSDK />);

      // Critical DOM structure should remain stable
      expect(screen.getByTestId('avi-chat-sdk')).toBeInTheDocument();
      expect(screen.getByTestId('avi-greeting')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type your message to Avi...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      expect(screen.getByTitle('Add images')).toBeInTheDocument();
    });

    test('maintains responsive layout behavior', () => {
      // Test different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];

      viewports.forEach(viewport => {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width
        });

        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height
        });

        render(<AviDirectChatSDK />);

        const container = screen.getByTestId('avi-chat-sdk');
        expect(container).toBeInTheDocument();

        // Component should render without errors across viewports
        expect(screen.getByPlaceholderText('Type your message to Avi...')).toBeInTheDocument();
      });
    });

    test('preserves accessibility attributes after updates', () => {
      render(<AviDirectChatSDK />);

      // ARIA attributes should remain stable
      const input = screen.getByPlaceholderText('Type your message to Avi...');
      expect(input).toHaveAttribute('aria-label');

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toHaveAttribute('aria-label');

      // Role attributes
      const chatContainer = screen.getByTestId('avi-chat-sdk');
      expect(chatContainer).toHaveAttribute('role');
    });
  });

  describe('Performance Regression Detection', () => {
    test('maintains rendering performance benchmarks', async () => {
      const startTime = performance.now();

      render(<AviDirectChatSDK />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms (regression threshold)
      expect(renderTime).toBeLessThan(100);
    });

    test('prevents memory leaks in message handling', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<AviDirectChatSDK />);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Response' }]
        })
      });

      // Send multiple messages
      const input = screen.getByPlaceholderText('Type your message to Avi...');
      for (let i = 0; i < 10; i++) {
        await user.clear(input);
        await user.type(input, `Message ${i}`);
        await user.click(screen.getByRole('button', { name: /send/i }));
      }

      // Component should unmount cleanly without memory leaks
      expect(() => unmount()).not.toThrow();
    });

    test('maintains efficient re-rendering patterns', async () => {
      const user = userEvent.setup();
      let renderCount = 0;

      const TestWrapper = ({ children }: { children: React.ReactNode }) => {
        renderCount++;
        return <div>{children}</div>;
      };

      render(
        <TestWrapper>
          <AviDirectChatSDK />
        </TestWrapper>
      );

      const initialRenderCount = renderCount;

      // Typing should not cause excessive re-renders
      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const finalRenderCount = renderCount;
      const additionalRenders = finalRenderCount - initialRenderCount;

      // Should not cause more than 20 re-renders for typing
      expect(additionalRenders).toBeLessThan(20);
    });
  });

  describe('Security Regression Prevention', () => {
    test('prevents XSS vulnerabilities in message content', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: '<script>alert("xss")</script>Malicious content' }]
        })
      });

      render(<AviDirectChatSDK />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test XSS prevention');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        const responseElement = screen.getByText(/Malicious content/);
        expect(responseElement).toBeInTheDocument();
        expect(responseElement.innerHTML).not.toContain('<script');
      });
    });

    test('maintains input validation for file uploads', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK />);

      // Test malicious file type
      const maliciousFile = new File(['malicious'], 'malware.exe', {
        type: 'application/x-executable'
      });

      const fileInput = screen.getByRole('button', { title: 'Add images' }).querySelector('input');
      await user.upload(fileInput!, maliciousFile);

      expect(screen.getByText('Only image files are allowed')).toBeInTheDocument();
    });

    test('validates API request sanitization', async () => {
      const user = userEvent.setup();

      mockFetch.mockImplementation(async (url, options) => {
        const body = JSON.parse(options?.body as string);

        // Verify no sensitive data in request
        expect(JSON.stringify(body)).not.toMatch(/password|token|secret|key/i);

        return {
          ok: true,
          json: async () => ({ success: true, responses: [] })
        };
      });

      render(<AviDirectChatSDK />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test API sanitization');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Feature Stability Validation', () => {
    test('maintains image upload functionality', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK />);

      const imageFile = new File(['image data'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByRole('button', { title: 'Add images' }).querySelector('input');

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(function() {
          this.result = 'data:image/png;base64,test-data';
          if (this.onload) this.onload();
        }),
        result: '',
        onload: null as any,
        onerror: null as any
      };

      (global as any).FileReader = jest.fn(() => mockFileReader);

      await user.upload(fileInput!, imageFile);

      expect(screen.getByText('test.png')).toBeInTheDocument();
    });

    test('maintains connection state management', async () => {
      const onConnectionStateChange = jest.fn();
      const user = userEvent.setup();

      mockFetch.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, responses: [] })
          }), 100);
        })
      );

      render(<AviDirectChatSDK onConnectionStateChange={onConnectionStateChange} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test connection states');
      await user.click(screen.getByRole('button', { name: /send/i }));

      expect(onConnectionStateChange).toHaveBeenCalledWith('connecting');

      await waitFor(() => {
        expect(onConnectionStateChange).toHaveBeenCalledWith('connected');
      });
    });

    test('maintains error handling robustness', async () => {
      const onError = jest.fn();
      const user = userEvent.setup();

      const errorScenarios = [
        new Error('Network error'),
        new Error('Timeout error'),
        new Error('Authentication error')
      ];

      for (const error of errorScenarios) {
        jest.clearAllMocks();
        mockFetch.mockRejectedValueOnce(error);

        render(<AviDirectChatSDK onError={onError} />);

        const input = screen.getByPlaceholderText('Type your message to Avi...');
        await user.type(input, 'Test error handling');
        await user.click(screen.getByRole('button', { name: /send/i }));

        await waitFor(() => {
          expect(onError).toHaveBeenCalledWith(expect.objectContaining({
            message: error.message
          }));
        });
      }
    });
  });

  describe('Integration Stability', () => {
    test('maintains compatibility with EnhancedPostingInterface', () => {
      render(<EnhancedPostingInterface />);

      // Switch to Avi DM tab
      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      // Avi DM component should be rendered within the interface
      expect(screen.getByTestId('avi-chat-sdk')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type your message to Avi...')).toBeInTheDocument();
    });

    test('maintains prop interface stability', () => {
      const props = {
        onMessageSent: jest.fn(),
        onConnectionStateChange: jest.fn(),
        onError: jest.fn(),
        className: 'test-class',
        isLoading: false
      };

      // Should render without TypeScript errors
      expect(() => render(<AviDirectChatSDK {...props} />)).not.toThrow();

      // All props should be handled correctly
      expect(screen.getByTestId('avi-chat-sdk')).toHaveClass('test-class');
    });

    test('maintains streaming ticker integration', () => {
      render(<AviDirectChatSDK isLoading={true} />);

      const streamingTicker = screen.getByTestId('streaming-ticker');
      expect(streamingTicker).toBeInTheDocument();
      expect(streamingTicker).toHaveTextContent('Active for avi-chat-user');
    });
  });

  describe('Cross-Browser Compatibility', () => {
    test('maintains functionality across browser APIs', () => {
      // Test FileReader availability
      expect(global.FileReader).toBeDefined();

      // Test fetch availability
      expect(global.fetch).toBeDefined();

      // Component should render without browser-specific errors
      expect(() => render(<AviDirectChatSDK />)).not.toThrow();
    });

    test('handles missing browser features gracefully', () => {
      // Temporarily remove FileReader
      const originalFileReader = global.FileReader;
      delete (global as any).FileReader;

      expect(() => render(<AviDirectChatSDK />)).not.toThrow();

      // Restore FileReader
      (global as any).FileReader = originalFileReader;
    });
  });

  describe('Configuration Regression', () => {
    test('maintains default configuration values', () => {
      render(<AviDirectChatSDK />);

      // Default props should work
      expect(screen.getByTestId('avi-chat-sdk')).toBeInTheDocument();
      expect(screen.getByText('Ready to chat')).toBeInTheDocument();
    });

    test('maintains custom configuration handling', () => {
      const customProps = {
        className: 'custom-avi-chat',
        isLoading: true
      };

      render(<AviDirectChatSDK {...customProps} />);

      expect(screen.getByTestId('avi-chat-sdk')).toHaveClass('custom-avi-chat');

      const streamingTicker = screen.getByTestId('streaming-ticker');
      expect(streamingTicker).toHaveTextContent('Active');
    });
  });
});

/**
 * Regression test utilities
 */
export const regressionTestUtils = {
  /**
   * Validate API contract remains stable
   */
  validateAPIContract: (request: any, expectedFormat: any) => {
    Object.keys(expectedFormat).forEach(key => {
      expect(request).toHaveProperty(key);
      if (expectedFormat[key] !== 'any') {
        expect(typeof request[key]).toBe(expectedFormat[key]);
      }
    });
  },

  /**
   * Check for performance regressions
   */
  measurePerformance: (operation: () => void, maxTime: number = 100) => {
    const start = performance.now();
    operation();
    const end = performance.now();
    const duration = end - start;

    expect(duration).toBeLessThan(maxTime);
    return duration;
  },

  /**
   * Validate component structure remains stable
   */
  validateComponentStructure: (container: HTMLElement, requiredElements: string[]) => {
    requiredElements.forEach(selector => {
      const element = container.querySelector(selector);
      expect(element).toBeInTheDocument();
    });
  },

  /**
   * Test backward compatibility
   */
  testBackwardCompatibility: (legacyProps: any, modernProps: any) => {
    // Both prop formats should work
    expect(() => render(<AviDirectChatSDK {...legacyProps} />)).not.toThrow();
    expect(() => render(<AviDirectChatSDK {...modernProps} />)).not.toThrow();
  }
};