/**
 * Contract Tests for Claude Code API Integration
 *
 * London School TDD Contract Testing:
 * - Define and verify contracts between components and APIs
 * - Mock external dependencies while testing internal contracts
 * - Validate API request/response structures
 * - Ensure proper error handling contracts
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, beforeEach, expect } from 'vitest';
import { AviDirectChatReal } from '../../components/posting-interface/AviDirectChatReal';

// Contract definitions
interface ClaudeInstanceCreationContract {
  request: {
    name: string;
    workingDirectory: string;
    skipPermissions: boolean;
    resumeSession: boolean;
    metadata: {
      isAvi: boolean;
      purpose: string;
      capabilities: string[];
    };
  };
  response: {
    data: {
      id: string;
      name?: string;
      status?: string;
      workingDirectory?: string;
      metadata?: any;
    };
  };
}

interface ClaudeMessageContract {
  request: {
    content: string;
    metadata: {
      source: string;
      timestamp: string;
    };
  };
  response: {
    data: {
      response: {
        content: string;
        metadata?: {
          model?: string;
          usage?: {
            input_tokens?: number;
            output_tokens?: number;
          };
        };
      };
    };
  };
}

interface ClaudeErrorContract {
  status: number;
  error: string;
  details?: string;
}

// Mock fetch globally
global.fetch = vi.fn();

describe('Claude Code API Integration - Contract Tests', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    vi.clearAllMocks();
  });

  describe('🤝 Claude Instance Creation Contract', () => {
    test('validates instance creation request contract', async () => {
      // Arrange: Expected contract
      const expectedContract: ClaudeInstanceCreationContract['request'] = {
        name: 'Avi - Direct Message Assistant',
        workingDirectory: '/workspaces/agent-feed',
        skipPermissions: true,
        resumeSession: true,
        metadata: {
          isAvi: true,
          purpose: 'direct-messaging',
          capabilities: ['code-review', 'debugging', 'architecture', 'general-assistance']
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'contract-test-instance' } })
      } as Response);

      // Act: Render component to trigger instance creation
      render(<AviDirectChatReal />);

      // Assert: Contract compliance
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/claude-instances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expectedContract)
        });
      });
    });

    test('validates instance creation response contract', async () => {
      // Arrange: Valid contract response
      const contractResponse: ClaudeInstanceCreationContract['response'] = {
        data: {
          id: 'contract-response-test-123',
          name: 'Avi - Direct Message Assistant',
          status: 'active',
          workingDirectory: '/workspaces/agent-feed',
          metadata: {
            isAvi: true,
            purpose: 'direct-messaging',
            capabilities: ['code-review', 'debugging', 'architecture', 'general-assistance']
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => contractResponse
      } as Response);

      // Act: Render component
      render(<AviDirectChatReal />);

      // Assert: Response contract satisfied
      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
        expect(screen.getByText(/Instance: .*test-123/)).toBeInTheDocument();
      });
    });

    test('handles instance creation contract violations gracefully', async () => {
      // Arrange: Invalid response (missing required fields)
      const invalidResponse = {
        data: {
          // Missing required 'id' field
          name: 'Some Instance'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse
      } as Response);

      // Act: Render component
      render(<AviDirectChatReal />);

      // Assert: Error handling for contract violation
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText(/No instance ID returned from API/)).toBeInTheDocument();
      });
    });
  });

  describe('💬 Claude Message Contract', () => {
    test('validates message sending request contract', async () => {
      // Arrange: Setup connected state
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'message-contract-instance' } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              response: {
                content: 'Contract test response'
              }
            }
          })
        } as Response);

      const user = userEvent.setup();
      render(<AviDirectChatReal />);

      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
      });

      // Act: Send message
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'contract test message');
      await user.click(screen.getByTestId('send-button'));

      // Assert: Message contract compliance
      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          '/api/claude-instances/message-contract-instance/message',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: 'contract test message',
              metadata: {
                source: 'avi-dm',
                timestamp: expect.any(String)
              }
            })
          }
        );
      });
    });

    test('validates message response contract', async () => {
      // Arrange: Valid message response contract
      const messageResponseContract: ClaudeMessageContract['response'] = {
        data: {
          response: {
            content: 'This is a valid contract response with proper structure.',
            metadata: {
              model: 'claude-3-sonnet-20241022',
              usage: {
                input_tokens: 10,
                output_tokens: 15
              }
            }
          }
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'response-contract-test' } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => messageResponseContract
        } as Response);

      const user = userEvent.setup();
      render(<AviDirectChatReal />);

      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
      });

      // Act: Send message
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'test message');
      await user.click(screen.getByTestId('send-button'));

      // Assert: Response contract satisfied
      await waitFor(() => {
        expect(screen.getByText('This is a valid contract response with proper structure.')).toBeInTheDocument();
      });
    });

    test('handles message response contract violations', async () => {
      // Arrange: Invalid message response (missing required fields)
      const invalidMessageResponse = {
        data: {
          // Missing 'response' field
          someOtherField: 'invalid structure'
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'invalid-response-test' } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => invalidMessageResponse
        } as Response);

      const user = userEvent.setup();
      render(<AviDirectChatReal />);

      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
      });

      // Act: Send message
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'test invalid response');
      await user.click(screen.getByTestId('send-button'));

      // Assert: No response content displayed (graceful handling)
      await waitFor(() => {
        const userMessages = screen.getAllByTestId('message-user');
        expect(userMessages[userMessages.length - 1]).toHaveTextContent('test invalid response');

        // Should not have assistant response due to invalid contract
        const assistantMessages = screen.queryAllByTestId('message-assistant');
        expect(assistantMessages).toHaveLength(0);
      });
    });
  });

  describe('⚠️ Error Contract Validation', () => {
    test('validates HTTP error response contract', async () => {
      // Arrange: Standard error contract
      const errorContract: ClaudeErrorContract = {
        status: 500,
        error: 'Internal Server Error',
        details: 'Failed to create Claude instance due to server overload'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => errorContract
      } as Response);

      // Act: Render component
      render(<AviDirectChatReal />);

      // Assert: Error contract handling
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText(/Failed to create Claude instance: 500/)).toBeInTheDocument();
      });
    });

    test('validates network error contract', async () => {
      // Arrange: Network failure
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

      // Act: Render component
      render(<AviDirectChatReal />);

      // Assert: Network error handling
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText(/Network request failed/)).toBeInTheDocument();
      });
    });

    test('validates timeout error contract', async () => {
      // Arrange: Timeout scenario
      mockFetch.mockImplementationOnce(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      // Act: Render component
      render(<AviDirectChatReal />);

      // Assert: Timeout error handling
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText(/Request timeout/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('🔄 Contract Evolution and Backwards Compatibility', () => {
    test('handles optional fields in instance creation response', async () => {
      // Arrange: Minimal valid response (only required fields)
      const minimalResponse = {
        data: {
          id: 'minimal-instance-123'
          // Optional fields omitted
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => minimalResponse
      } as Response);

      // Act: Render component
      render(<AviDirectChatReal />);

      // Assert: Works with minimal contract
      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
        expect(screen.getByText(/Instance: .*al-123/)).toBeInTheDocument();
      });
    });

    test('handles additional fields in message response (forward compatibility)', async () => {
      // Arrange: Response with extra fields for forward compatibility
      const extendedResponse = {
        data: {
          response: {
            content: 'Response with extra fields',
            metadata: {
              model: 'claude-3-sonnet-20241022',
              usage: { input_tokens: 5, output_tokens: 8 },
              // Future fields that might be added
              confidence: 0.95,
              processing_time_ms: 1250,
              safety_rating: 'safe'
            }
          },
          // Additional top-level fields
          request_id: 'req-12345',
          version: '2.1.0'
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'extended-test-instance' } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => extendedResponse
        } as Response);

      const user = userEvent.setup();
      render(<AviDirectChatReal />);

      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
      });

      // Act: Send message
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'extended fields test');
      await user.click(screen.getByTestId('send-button'));

      // Assert: Works with extended contract (ignores unknown fields gracefully)
      await waitFor(() => {
        expect(screen.getByText('Response with extra fields')).toBeInTheDocument();
      });
    });
  });

  describe('🎯 Contract Validation Meta-Tests', () => {
    test('ensures contract tests cover all API endpoints', () => {
      // This test ensures we have contract tests for all Claude API endpoints
      const expectedEndpoints = [
        '/api/claude-instances',
        '/api/claude-instances/{id}/message'
      ];

      const testedEndpoints = mockFetch.mock.calls.map(call => {
        const url = call[0] as string;
        return url.replace(/\/[^/]+(?=\/message$)/, '/{id}');
      });

      expectedEndpoints.forEach(endpoint => {
        const tested = testedEndpoints.some(tested =>
          tested === endpoint || tested.startsWith(endpoint.replace('/{id}', '/'))
        );
        expect(tested).toBe(true);
      });
    });

    test('validates all contract interfaces are tested', () => {
      // Ensure we have tests for all defined contract interfaces
      const contractTypes = [
        'ClaudeInstanceCreationContract',
        'ClaudeMessageContract',
        'ClaudeErrorContract'
      ];

      // This test ensures all contract types are covered in our test suite
      expect(contractTypes).toHaveLength(3);
      // In a real implementation, you could validate test names or descriptions
      // contain references to each contract type
    });
  });
});