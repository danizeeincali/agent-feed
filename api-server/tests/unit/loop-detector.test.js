import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamingLoopDetector } from '../../worker/loop-detector.js';

describe('StreamingLoopDetector', () => {
  let detector;
  const workerId = 'test-worker-123';

  beforeEach(() => {
    detector = new StreamingLoopDetector(workerId);
    vi.useFakeTimers();
  });

  describe('constructor', () => {
    it('should initialize with workerId', () => {
      expect(detector.workerId).toBe(workerId);
      expect(detector.timestamps).toEqual([]);
    });

    it('should initialize with default configuration', () => {
      expect(detector.config).toBeDefined();
      expect(detector.config.loopThreshold).toBe(10);
      expect(detector.config.stagnantThreshold).toBe(30000);
      expect(detector.config.windowSize).toBe(10000);
    });
  });

  describe('detectLoop - repetitive chunks', () => {
    it('should not detect loop with normal streaming pattern', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Simulate 5 chunks over 10 seconds
      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(now + i * 2000);
        const result = detector.detectLoop({ type: 'assistant', content: `chunk ${i}` });
        expect(result.detected).toBe(false);
      }
    });

    it('should detect loop when more than 10 chunks in 10 seconds', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Simulate 11 chunks in 10 seconds
      for (let i = 0; i < 11; i++) {
        vi.setSystemTime(now + i * 900);
        detector.detectLoop({ type: 'assistant', content: `chunk ${i}` });
      }

      // Last check should detect the loop
      const result = detector.detectLoop({ type: 'assistant', content: 'chunk 11' });
      expect(result.detected).toBe(true);
      expect(result.reason).toBe('REPETITIVE_CHUNKS');
      expect(result.details).toContain('10 seconds');
    });

    it('should not count old chunks outside the window', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Add 10 chunks in first 10 seconds
      for (let i = 0; i < 10; i++) {
        vi.setSystemTime(now + i * 1000);
        detector.detectLoop({ type: 'assistant', content: `chunk ${i}` });
      }

      // Advance time by 11 seconds (old chunks fall out of window)
      vi.setSystemTime(now + 21000);

      // Add 5 more chunks - should not trigger
      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(now + 21000 + i * 1000);
        const result = detector.detectLoop({ type: 'assistant', content: `new chunk ${i}` });
        expect(result.detected).toBe(false);
      }
    });
  });

  describe('detectStagnation', () => {
    it('should detect stagnation after 30 seconds without progress', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // First chunk
      detector.detectLoop({ type: 'assistant', content: 'chunk 1' });

      // Advance time by 31 seconds without new meaningful content
      vi.setSystemTime(now + 31000);

      const result = detector.detectStagnation();
      expect(result.detected).toBe(true);
      expect(result.reason).toBe('STAGNANT_STREAM');
      expect(result.details).toContain('30 seconds');
    });

    it('should not detect stagnation with regular progress', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Chunks every 10 seconds
      for (let i = 0; i < 3; i++) {
        vi.setSystemTime(now + i * 10000);
        detector.detectLoop({ type: 'assistant', content: `chunk ${i}` });
      }

      const result = detector.detectStagnation();
      expect(result.detected).toBe(false);
    });

    it('should reset stagnation timer on new content', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      detector.detectLoop({ type: 'assistant', content: 'chunk 1' });

      // Advance 20 seconds
      vi.setSystemTime(now + 20000);
      detector.detectLoop({ type: 'assistant', content: 'chunk 2' });

      // Advance another 20 seconds (40s total, but only 20s since last chunk)
      vi.setSystemTime(now + 40000);

      const result = detector.detectStagnation();
      expect(result.detected).toBe(false);
    });
  });

  describe('check - combined detection', () => {
    it('should check both loop and stagnation', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const result = detector.check({ type: 'assistant', content: 'chunk 1' });
      expect(result.detected).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('should return loop detection if triggered', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Trigger loop with 11 chunks in 10 seconds
      for (let i = 0; i < 12; i++) {
        vi.setSystemTime(now + i * 900);
        detector.check({ type: 'assistant', content: `chunk ${i}` });
      }

      const result = detector.check({ type: 'assistant', content: 'chunk 12' });
      expect(result.detected).toBe(true);
      expect(result.reason).toBe('REPETITIVE_CHUNKS');
    });

    it('should return stagnation if triggered', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      detector.check({ type: 'assistant', content: 'chunk 1' });

      vi.setSystemTime(now + 31000);

      const result = detector.check({ type: 'assistant', content: 'chunk 2' });
      expect(result.detected).toBe(true);
      expect(result.reason).toBe('STAGNANT_STREAM');
    });
  });

  describe('reset', () => {
    it('should clear all timestamps', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      for (let i = 0; i < 5; i++) {
        detector.check({ type: 'assistant', content: `chunk ${i}` });
      }

      expect(detector.timestamps.length).toBeGreaterThan(0);

      detector.reset();

      expect(detector.timestamps.length).toBe(0);
    });

    it('should allow fresh detection after reset', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Trigger loop
      for (let i = 0; i < 12; i++) {
        vi.setSystemTime(now + i * 900);
        detector.check({ type: 'assistant', content: `chunk ${i}` });
      }

      // Reset
      detector.reset();

      // Should not detect loop anymore
      vi.setSystemTime(now + 15000);
      const result = detector.check({ type: 'assistant', content: 'new chunk' });
      expect(result.detected).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(now + i * 2000);
        detector.check({ type: 'assistant', content: `chunk ${i}` });
      }

      vi.setSystemTime(now + 10000);

      const stats = detector.getStats();
      expect(stats.workerId).toBe(workerId);
      expect(stats.totalChunks).toBe(5);
      expect(stats.recentChunks).toBeLessThanOrEqual(5);
      expect(stats.timeSinceLastChunk).toBeLessThanOrEqual(10000);
      expect(stats.isHealthy).toBe(true);
    });

    it('should mark as unhealthy if loop detected', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Trigger loop
      for (let i = 0; i < 12; i++) {
        vi.setSystemTime(now + i * 900);
        detector.check({ type: 'assistant', content: `chunk ${i}` });
      }

      const stats = detector.getStats();
      expect(stats.isHealthy).toBe(false);
      expect(stats.loopDetected).toBe(true);
    });

    it('should mark as unhealthy if stagnant', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      detector.check({ type: 'assistant', content: 'chunk 1' });

      vi.setSystemTime(now + 31000);

      const stats = detector.getStats();
      expect(stats.isHealthy).toBe(false);
      expect(stats.stagnant).toBe(true);
    });
  });
});
