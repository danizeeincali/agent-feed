/**
 * ResponseGenerator Unit Tests
 * Phase 3B: TDD Implementation
 *
 * Tests Claude API integration for response generation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ResponseGenerator } from '../../../src/worker/response-generator';
import type { AgentContext, GenerationOptions } from '../../../src/types/worker';
import type { FeedItem } from '../../../src/types/feed';

describe('ResponseGenerator', () => {
  let generator: ResponseGenerator;
  let mockAnthropicClient: any;

  const mockContext: AgentContext = {
    userId: 'test-user',
    agentName: 'tech-guru',
    personality: 'You are a helpful tech expert',
    postingRules: {
      maxLength: 500,
      minLength: 50,
    },
    responseStyle: {
      temperature: 0.7,
      tone: 'friendly',
    },
    memories: [
      {
        content: 'Previous interaction about TypeScript',
        importance: 0.8,
        createdAt: new Date('2025-01-01'),
      },
    ],
    model: 'claude-sonnet-4-5-20250929',
  };

  const mockFeedItem: FeedItem = {
    id: 'item-123',
    feedId: 'feed-456',
    itemGuid: 'guid-789',
    title: 'New TypeScript 5.0 Features',
    content: 'TypeScript 5.0 introduces decorators and other features...',
    link: 'https://example.com/ts5',
    publishedAt: new Date('2025-01-10'),
    discoveredAt: new Date('2025-01-10'),
    processed: false,
    processingStatus: 'pending',
    createdAt: new Date('2025-01-10'),
  };

  beforeEach(() => {
    // Mock Anthropic client
    mockAnthropicClient = {
      messages: {
        create: jest.fn(),
      },
    };

    generator = new ResponseGenerator(mockAnthropicClient);
  });

  describe('generate()', () => {
    it('should generate response using Claude API', async () => {
      // Mock Claude API response
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-5-20250929',
        content: [{ type: 'text', text: 'Great article about TypeScript 5.0! The decorator feature is really useful.' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 150,
          output_tokens: 50,
        },
      });

      const result = await generator.generate(mockContext, mockFeedItem, { maxLength: 500 });

      expect(result.content).toBe('Great article about TypeScript 5.0! The decorator feature is really useful.');
      expect(result.tokensUsed).toBe(200); // 150 + 50
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.model).toBe('claude-sonnet-4-5-20250929');
      expect(result.metadata.stopReason).toBe('end_turn');
    });

    it('should build correct system prompt from context', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Test response' }],
        usage: { input_tokens: 100, output_tokens: 20 },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      });

      await generator.generate(mockContext, mockFeedItem);

      const call = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(call.system).toContain(mockContext.personality);
      expect(call.system).toContain('Max length: 500');
    });

    it('should include feed item details in user prompt', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Test response' }],
        usage: { input_tokens: 100, output_tokens: 20 },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      });

      await generator.generate(mockContext, mockFeedItem);

      const call = mockAnthropicClient.messages.create.mock.calls[0][0];
      const userMessage = call.messages[0].content;

      expect(userMessage).toContain(mockFeedItem.title);
      expect(userMessage).toContain(mockFeedItem.content);
    });

    it('should use provided generation options', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Test response' }],
        usage: { input_tokens: 100, output_tokens: 20 },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      });

      const options: GenerationOptions = {
        maxLength: 300,
        temperature: 0.9,
      };

      await generator.generate(mockContext, mockFeedItem, options);

      const call = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(call.max_tokens).toBe(300);
      expect(call.temperature).toBe(0.9);
    });

    it('should trim whitespace from response', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '  Test response with spaces  \n' }],
        usage: { input_tokens: 100, output_tokens: 20 },
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5-20250929',
      });

      const result = await generator.generate(mockContext, mockFeedItem);

      expect(result.content).toBe('Test response with spaces');
    });

    it('should handle rate limit errors', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue({
        type: 'rate_limit_error',
        message: 'Rate limit exceeded',
      });

      await expect(generator.generate(mockContext, mockFeedItem))
        .rejects
        .toThrow(/rate limit/i);
    });

    it('should handle API errors gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue({
        type: 'api_error',
        message: 'API error occurred',
      });

      await expect(generator.generate(mockContext, mockFeedItem))
        .rejects
        .toThrow(/API error/i);
    });
  });

  describe('validateResponse()', () => {
    it('should validate response length', () => {
      const shortResponse = 'Too short';
      const validation = generator.validateResponse(shortResponse, mockContext, mockFeedItem);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.toLowerCase().includes('too short'))).toBe(true);
    });

    it('should accept valid response length', () => {
      const validResponse = 'This is a valid response that meets the minimum length requirement of 50 characters.';
      const validation = generator.validateResponse(validResponse, mockContext, mockFeedItem);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject response exceeding max length', () => {
      const longResponse = 'x'.repeat(501);
      const validation = generator.validateResponse(longResponse, mockContext, mockFeedItem);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.toLowerCase().includes('too long'))).toBe(true);
    });

    it('should detect blocked words if configured', () => {
      const contextWithBlockedWords: AgentContext = {
        ...mockContext,
        postingRules: {
          ...mockContext.postingRules,
          blockedWords: ['spam', 'scam'],
        },
      };

      const responseWithBlockedWord = 'This is a spam message that should be blocked for quality reasons.';
      const validation = generator.validateResponse(responseWithBlockedWord, contextWithBlockedWords, mockFeedItem);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.toLowerCase().includes('blocked word'))).toBe(true);
    });
  });
});
