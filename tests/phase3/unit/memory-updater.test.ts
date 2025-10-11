/**
 * MemoryUpdater Unit Tests
 * Phase 3C: Memory Management Implementation
 *
 * Tests memory extraction and storage from agent interactions
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MemoryUpdater } from '../../../src/worker/memory-updater';
import type { DatabaseManager } from '../../../src/types/database-manager';
import type { FeedItem } from '../../../src/types/feed';

describe('MemoryUpdater', () => {
  let updater: MemoryUpdater;
  let mockDb: DatabaseManager;

  const mockFeedItem: FeedItem = {
    id: 'item-123',
    feedId: 'feed-456',
    itemGuid: 'guid-789',
    title: 'Understanding TypeScript Decorators',
    content: 'TypeScript decorators provide a way to add metadata and modify classes...',
    link: 'https://example.com/ts-decorators',
    publishedAt: new Date('2025-01-10'),
    discoveredAt: new Date('2025-01-10'),
    processed: true,
    processingStatus: 'completed',
    createdAt: new Date('2025-01-10'),
  };

  const mockResponse = {
    id: 'response-123',
    content: 'Great article on TypeScript decorators! I particularly appreciate the practical examples showing how to use decorators for validation.',
    tokensUsed: 150,
    agentName: 'tech-guru',
    userId: 'user-123',
  };

  beforeEach(() => {
    // Mock database
    mockDb = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    } as unknown as DatabaseManager;

    updater = new MemoryUpdater(mockDb);
  });

  describe('extractMemory()', () => {
    it('should extract key topics from feed item and response', async () => {
      const memory = await updater.extractMemory(
        mockFeedItem,
        mockResponse.content,
        mockResponse.agentName,
        mockResponse.userId
      );

      expect(memory).toBeDefined();
      expect(memory.content).toContain('TypeScript');
      expect(memory.importance).toBeGreaterThan(0);
      expect(memory.importance).toBeLessThanOrEqual(1);
      expect(memory.tags).toBeDefined();
      expect(memory.tags.length).toBeGreaterThan(0);
    });

    it('should assign higher importance to technical topics', async () => {
      const technicalItem: FeedItem = {
        ...mockFeedItem,
        title: 'Advanced Rust Memory Management',
        content: 'Deep dive into ownership, borrowing, and lifetimes in Rust...',
      };

      const memory = await updater.extractMemory(
        technicalItem,
        'Excellent breakdown of Rust\'s memory model',
        'tech-guru',
        'user-123'
      );

      expect(memory.importance).toBeGreaterThanOrEqual(0.7);
    });

    it('should extract multiple tags from content', async () => {
      const memory = await updater.extractMemory(
        mockFeedItem,
        mockResponse.content,
        mockResponse.agentName,
        mockResponse.userId
      );

      expect(Array.isArray(memory.tags)).toBe(true);
      expect(memory.tags.length).toBeGreaterThan(0);
      expect(memory.tags.some(tag => tag.toLowerCase().includes('typescript'))).toBe(true);
    });

    it('should include metadata about source', async () => {
      const memory = await updater.extractMemory(
        mockFeedItem,
        mockResponse.content,
        mockResponse.agentName,
        mockResponse.userId
      );

      expect(memory.metadata).toBeDefined();
      expect(memory.metadata.feedItemId).toBe(mockFeedItem.id);
      expect(memory.metadata.feedItemTitle).toBe(mockFeedItem.title);
    });
  });

  describe('storeMemory()', () => {
    it('should store memory in database', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'memory-123' }],
      });

      const memoryData = {
        content: 'User is interested in TypeScript decorators',
        importance: 0.8,
        tags: ['typescript', 'decorators', 'programming'],
        metadata: {
          feedItemId: mockFeedItem.id,
          feedItemTitle: mockFeedItem.title,
        },
      };

      const memoryId = await updater.storeMemory(
        mockResponse.agentName,
        mockResponse.userId,
        memoryData
      );

      expect(memoryId).toBe('memory-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agent_memories'),
        expect.arrayContaining([
          mockResponse.agentName,
          mockResponse.userId,
          memoryData.content,
        ])
      );
    });

    it('should store importance score', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'memory-456' }],
      });

      const memoryData = {
        content: 'Test memory',
        importance: 0.95,
        tags: ['test'],
        metadata: {},
      };

      await updater.storeMemory('tech-guru', 'user-123', memoryData);

      const call = (mockDb.query as jest.Mock).mock.calls[0];
      expect(call[1]).toContain(0.95);
    });

    it('should store tags as JSON array', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'memory-789' }],
      });

      const memoryData = {
        content: 'Test memory',
        importance: 0.5,
        tags: ['tag1', 'tag2', 'tag3'],
        metadata: {},
      };

      await updater.storeMemory('tech-guru', 'user-123', memoryData);

      const call = (mockDb.query as jest.Mock).mock.calls[0];
      const tagsParam = call[1].find((param: any) =>
        typeof param === 'string' && param.includes('tag1')
      );
      expect(tagsParam).toBeDefined();
    });
  });

  describe('updateMemory()', () => {
    it('should extract and store memory from interaction', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'memory-999' }],
      });

      const memoryId = await updater.updateMemory(
        mockFeedItem,
        mockResponse.content,
        mockResponse.agentName,
        mockResponse.userId
      );

      expect(memoryId).toBe('memory-999');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agent_memories'),
        expect.any(Array)
      );
    });

    it('should handle errors gracefully', async () => {
      (mockDb.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        updater.updateMemory(
          mockFeedItem,
          mockResponse.content,
          mockResponse.agentName,
          mockResponse.userId
        )
      ).rejects.toThrow(/Database error/);
    });
  });

  describe('getRecentMemories()', () => {
    it('should retrieve recent memories for agent', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'mem-1',
            content: 'Memory 1',
            importance: 0.9,
            tags: JSON.stringify(['tag1']),
            created_at: new Date(),
          },
          {
            id: 'mem-2',
            content: 'Memory 2',
            importance: 0.7,
            tags: JSON.stringify(['tag2']),
            created_at: new Date(),
          },
        ],
      });

      const memories = await updater.getRecentMemories('tech-guru', 'user-123', 10);

      expect(memories.length).toBe(2);
      expect(memories[0].content).toBe('Memory 1');
      expect(memories[0].importance).toBe(0.9);
      expect(Array.isArray(memories[0].tags)).toBe(true);
    });

    it('should limit number of memories returned', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: Array(20).fill({
          id: 'mem-1',
          content: 'Memory',
          importance: 0.5,
          tags: JSON.stringify([]),
          created_at: new Date(),
        }),
      });

      const memories = await updater.getRecentMemories('tech-guru', 'user-123', 5);

      expect(memories.length).toBeLessThanOrEqual(5);
    });

    it('should order by importance and recency', async () => {
      const mockMemories = [
        {
          id: 'mem-1',
          content: 'Old important',
          importance: 0.9,
          tags: JSON.stringify([]),
          created_at: new Date('2025-01-01'),
        },
        {
          id: 'mem-2',
          content: 'Recent important',
          importance: 0.95,
          tags: JSON.stringify([]),
          created_at: new Date('2025-01-10'),
        },
      ];

      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: mockMemories,
      });

      await updater.getRecentMemories('tech-guru', 'user-123', 10);

      // Verify query includes ORDER BY
      const call = (mockDb.query as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('ORDER BY');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response content', async () => {
      const memory = await updater.extractMemory(
        mockFeedItem,
        '',
        'tech-guru',
        'user-123'
      );

      expect(memory).toBeDefined();
      expect(memory.importance).toBeLessThan(0.5); // Low importance for empty
    });

    it('should handle very long content', async () => {
      const longContent = 'a'.repeat(10000);
      const longItem = { ...mockFeedItem, content: longContent };

      const memory = await updater.extractMemory(
        longItem,
        'Response to long content',
        'tech-guru',
        'user-123'
      );

      expect(memory.content.length).toBeLessThan(5000); // Should truncate
    });

    it('should handle special characters in content', async () => {
      const specialItem = {
        ...mockFeedItem,
        title: 'Test with "quotes" and \'apostrophes\'',
        content: 'Content with <html> and & symbols',
      };

      const memory = await updater.extractMemory(
        specialItem,
        'Response with special chars: <>&"\'',
        'tech-guru',
        'user-123'
      );

      expect(memory).toBeDefined();
      expect(memory.content).toBeTruthy();
    });
  });
});
