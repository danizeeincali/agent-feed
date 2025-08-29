/**
 * TDD London School: Output Deduplication by Content Hash Tests
 * Focus: Mock-driven testing of content hash generation and duplicate filtering
 */

describe('Content Hash Deduplication', () => {
  let mockHasher;
  let mockStorage;
  let mockSwarmDeduplicationCoordinator;
  let deduplicationManager;
  let mockContentNormalizer;

  beforeEach(() => {
    mockHasher = {
      hash: jest.fn().mockImplementation(content => `hash_${content.slice(0, 8)}`),
      compare: jest.fn().mockImplementation((hash1, hash2) => hash1 === hash2)
    };

    mockStorage = {
      has: jest.fn().mockReturnValue(false),
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      size: jest.fn().mockReturnValue(0)
    };

    mockSwarmDeduplicationCoordinator = {
      beforeDeduplication: jest.fn().mockResolvedValue(true),
      afterDeduplication: jest.fn(),
      shareHashWithSwarm: jest.fn()
    };

    mockContentNormalizer = {
      normalize: jest.fn().mockImplementation(content => content.trim().toLowerCase()),
      stripTimestamps: jest.fn().mockImplementation(content => 
        content.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, '[TIMESTAMP]')
      )
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Hash Generation and Comparison', () => {
    it('should generate consistent hash for identical content', () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      
      const content = 'Test output content';
      
      const hash1 = deduplicationManager.generateHash(content);
      const hash2 = deduplicationManager.generateHash(content);
      
      expect(mockHasher.hash).toHaveBeenCalledTimes(2);
      expect(mockHasher.hash).toHaveBeenCalledWith(content);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      
      mockHasher.hash
        .mockReturnValueOnce('hash_content1')
        .mockReturnValueOnce('hash_content2');
      
      const hash1 = deduplicationManager.generateHash('content1');
      const hash2 = deduplicationManager.generateHash('content2');
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).toBe('hash_content1');
      expect(hash2).toBe('hash_content2');
    });

    it('should normalize content before hashing', () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      deduplicationManager.setContentNormalizer(mockContentNormalizer);
      
      const rawContent = '  Test Content With Whitespace  ';
      
      deduplicationManager.generateHash(rawContent);
      
      expect(mockContentNormalizer.normalize).toHaveBeenCalledWith(rawContent);
      expect(mockHasher.hash).toHaveBeenCalledWith('test content with whitespace');
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate content by hash', async () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      
      const content = 'Duplicate test content';
      const hash = 'hash_duplicat';
      
      mockHasher.hash.mockReturnValue(hash);
      mockStorage.has.mockReturnValue(true);
      
      const isDuplicate = await deduplicationManager.isDuplicate(content);
      
      expect(mockStorage.has).toHaveBeenCalledWith(hash);
      expect(isDuplicate).toBe(true);
    });

    it('should not detect new content as duplicate', async () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      
      const content = 'New unique content';
      const hash = 'hash_new_uni';
      
      mockHasher.hash.mockReturnValue(hash);
      mockStorage.has.mockReturnValue(false);
      
      const isDuplicate = await deduplicationManager.isDuplicate(content);
      
      expect(mockStorage.has).toHaveBeenCalledWith(hash);
      expect(isDuplicate).toBe(false);
    });

    it('should store content hash after duplicate check', async () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      
      const content = 'Content to store';
      const hash = 'hash_content';
      
      mockHasher.hash.mockReturnValue(hash);
      mockStorage.has.mockReturnValue(false);
      
      await deduplicationManager.processContent(content);
      
      expect(mockStorage.set).toHaveBeenCalledWith(hash, {
        content,
        hash,
        timestamp: expect.any(Number),
        count: 1
      });
    });
  });

  describe('Deduplication Filtering', () => {
    it('should filter out duplicate messages from output stream', async () => {
      const OutputFilter = require('../../../../src/output/OutputFilter');
      const filter = new OutputFilter();
      filter.setDeduplicationManager(deduplicationManager);
      
      const messages = [
        'First unique message',
        'Second unique message',
        'First unique message', // Duplicate
        'Third unique message'
      ];
      
      deduplicationManager = {
        isDuplicate: jest.fn()
          .mockResolvedValueOnce(false) // First unique
          .mockResolvedValueOnce(false) // Second unique  
          .mockResolvedValueOnce(true)  // Duplicate
          .mockResolvedValueOnce(false), // Third unique
        processContent: jest.fn()
      };
      
      filter.setDeduplicationManager(deduplicationManager);
      
      const filtered = await filter.filterDuplicates(messages);
      
      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual([
        'First unique message',
        'Second unique message',
        'Third unique message'
      ]);
    });

    it('should maintain original order when filtering duplicates', async () => {
      const OutputFilter = require('../../../../src/output/OutputFilter');
      const filter = new OutputFilter();
      
      deduplicationManager = {
        isDuplicate: jest.fn()
          .mockResolvedValueOnce(false) // Message A
          .mockResolvedValueOnce(true)  // Message B (duplicate)
          .mockResolvedValueOnce(false) // Message C
          .mockResolvedValueOnce(true)  // Message D (duplicate)
          .mockResolvedValueOnce(false), // Message E
        processContent: jest.fn()
      };
      
      filter.setDeduplicationManager(deduplicationManager);
      
      const messages = ['A', 'B', 'C', 'D', 'E'];
      const filtered = await filter.filterDuplicates(messages);
      
      expect(filtered).toEqual(['A', 'C', 'E']);
      expect(filtered[0]).toBe('A');
      expect(filtered[1]).toBe('C');
      expect(filtered[2]).toBe('E');
    });

    it('should increment count for duplicate detections', async () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      
      const content = 'Repeated content';
      const hash = 'hash_repeated';
      const existingEntry = { content, hash, timestamp: 123456789, count: 1 };
      
      mockHasher.hash.mockReturnValue(hash);
      mockStorage.has.mockReturnValue(true);
      mockStorage.get.mockReturnValue(existingEntry);
      
      await deduplicationManager.processDuplicate(content);
      
      expect(mockStorage.set).toHaveBeenCalledWith(hash, {
        ...existingEntry,
        count: 2,
        lastSeen: expect.any(Number)
      });
    });
  });

  describe('Content Normalization for Deduplication', () => {
    it('should strip timestamps before hash generation', () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      deduplicationManager.setContentNormalizer(mockContentNormalizer);
      
      const contentWithTimestamp = 'Error at 2024-01-15T10:30:45: Connection failed';
      
      deduplicationManager.generateHash(contentWithTimestamp);
      
      expect(mockContentNormalizer.stripTimestamps).toHaveBeenCalledWith(contentWithTimestamp);
      expect(mockContentNormalizer.normalize).toHaveBeenCalledWith('Error at [TIMESTAMP]: Connection failed');
    });

    it('should normalize whitespace differences', () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      deduplicationManager.setContentNormalizer(mockContentNormalizer);
      
      const content1 = '  Multiple   spaces   between   words  ';
      const content2 = 'Multiple spaces between words';
      
      mockContentNormalizer.normalize
        .mockReturnValueOnce('multiple spaces between words')
        .mockReturnValueOnce('multiple spaces between words');
      
      const hash1 = deduplicationManager.generateHash(content1);
      const hash2 = deduplicationManager.generateHash(content2);
      
      expect(hash1).toBe(hash2);
    });

    it('should handle case-insensitive deduplication', () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      deduplicationManager.setContentNormalizer(mockContentNormalizer);
      
      const upperCase = 'ERROR MESSAGE';
      const lowerCase = 'error message';
      
      mockContentNormalizer.normalize
        .mockReturnValueOnce('error message')
        .mockReturnValueOnce('error message');
      
      const hash1 = deduplicationManager.generateHash(upperCase);
      const hash2 = deduplicationManager.generateHash(lowerCase);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('Swarm Coordination for Deduplication', () => {
    it('should coordinate with swarm before deduplication process', async () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      deduplicationManager.setSwarmCoordinator(mockSwarmDeduplicationCoordinator);
      
      const content = 'Swarm coordinated content';
      
      await deduplicationManager.processContent(content);
      
      expect(mockSwarmDeduplicationCoordinator.beforeDeduplication).toHaveBeenCalledWith({
        content,
        contentLength: content.length
      });
    });

    it('should share content hash with swarm agents', async () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      deduplicationManager.setSwarmCoordinator(mockSwarmDeduplicationCoordinator);
      
      const content = 'Shared hash content';
      const hash = 'hash_shared_';
      
      mockHasher.hash.mockReturnValue(hash);
      mockStorage.has.mockReturnValue(false);
      
      await deduplicationManager.processContent(content);
      
      expect(mockSwarmDeduplicationCoordinator.shareHashWithSwarm).toHaveBeenCalledWith({
        hash,
        content,
        timestamp: expect.any(Number)
      });
    });

    it('should not process if swarm coordination fails', async () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      deduplicationManager.setSwarmCoordinator(mockSwarmDeduplicationCoordinator);
      
      mockSwarmDeduplicationCoordinator.beforeDeduplication.mockResolvedValue(false);
      
      const content = 'Blocked content';
      const result = await deduplicationManager.processContent(content);
      
      expect(result).toBe(false);
      expect(mockStorage.set).not.toHaveBeenCalled();
    });

    it('should notify swarm after successful deduplication', async () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      deduplicationManager.setSwarmCoordinator(mockSwarmDeduplicationCoordinator);
      
      const content = 'Success notification content';
      
      await deduplicationManager.processContent(content);
      
      expect(mockSwarmDeduplicationCoordinator.afterDeduplication).toHaveBeenCalledWith({
        success: true,
        isDuplicate: false,
        hash: expect.any(String)
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should limit storage size to prevent memory bloat', async () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      
      const maxSize = 1000;
      mockStorage.size.mockReturnValue(maxSize + 1);
      
      await deduplicationManager.processContent('New content causing overflow');
      
      expect(mockStorage.delete).toHaveBeenCalled();
    });

    it('should use LRU eviction strategy when storage is full', async () => {
      const DeduplicationManager = require('../../../../src/output/DeduplicationManager');
      deduplicationManager = new DeduplicationManager(mockHasher, mockStorage);
      
      const lruTracker = {
        getOldest: jest.fn().mockReturnValue('oldest_hash'),
        updateAccess: jest.fn(),
        remove: jest.fn()
      };
      
      deduplicationManager.setLRUTracker(lruTracker);
      
      mockStorage.size.mockReturnValue(1001);
      
      await deduplicationManager.processContent('Content causing eviction');
      
      expect(lruTracker.getOldest).toHaveBeenCalled();
      expect(mockStorage.delete).toHaveBeenCalledWith('oldest_hash');
      expect(lruTracker.remove).toHaveBeenCalledWith('oldest_hash');
    });
  });
});