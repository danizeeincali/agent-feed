/**
 * RateLimiter Test Suite
 * Comprehensive rate limiting tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, TieredRateLimiter } from '../../../worker/security/RateLimiter.js';

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      maxOperations: 10,
      windowMs: 60000 // 1 minute
    });
  });

  afterEach(() => {
    limiter.destroy();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow operations under limit', () => {
      const userId = 'user1';

      for (let i = 0; i < 10; i++) {
        const result = limiter.checkLimit(userId);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(10 - i - 1);
      }
    });

    it('should block operations over limit', () => {
      const userId = 'user1';

      // Use up the limit
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit(userId);
      }

      // Next attempt should be blocked
      const result = limiter.checkLimit(userId);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should provide retry after time', () => {
      const userId = 'user1';

      // Use up the limit
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit(userId);
      }

      const result = limiter.checkLimit(userId);

      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60); // Within window
    });
  });

  describe('Record Operation', () => {
    it('should record successful operation', () => {
      const userId = 'user1';

      const result = limiter.recordOperation(userId);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.limit).toBe(10);
    });

    it('should reject operation over limit', () => {
      const userId = 'user1';

      // Use up the limit
      for (let i = 0; i < 10; i++) {
        limiter.recordOperation(userId);
      }

      const result = limiter.recordOperation(userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('User Isolation', () => {
    it('should track limits per user independently', () => {
      const user1 = 'user1';
      const user2 = 'user2';

      // User 1 uses up their limit
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit(user1);
      }

      // User 2 should still have their full limit
      const result = limiter.checkLimit(user2);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should track multiple users independently', () => {
      const users = ['user1', 'user2', 'user3'];

      for (const user of users) {
        for (let i = 0; i < 5; i++) {
          const result = limiter.checkLimit(user);
          expect(result.allowed).toBe(true);
        }
      }

      // All users should still have operations remaining
      for (const user of users) {
        const result = limiter.checkLimit(user);
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe('Sliding Window', () => {
    it('should allow operations after window expires', async () => {
      const userId = 'user1';

      // Create limiter with short window for testing
      const shortLimiter = new RateLimiter({
        maxOperations: 3,
        windowMs: 100 // 100ms window
      });

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        shortLimiter.checkLimit(userId);
      }

      // Should be blocked
      let result = shortLimiter.checkLimit(userId);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      result = shortLimiter.checkLimit(userId);
      expect(result.allowed).toBe(true);

      shortLimiter.destroy();
    });

    it('should gradually allow operations as they expire', async () => {
      const userId = 'user1';

      const shortLimiter = new RateLimiter({
        maxOperations: 2,
        windowMs: 100
      });

      // First two operations
      shortLimiter.checkLimit(userId);
      shortLimiter.checkLimit(userId);

      // Third should be blocked
      expect(shortLimiter.checkLimit(userId).allowed).toBe(false);

      // Wait for first operation to expire
      await new Promise(resolve => setTimeout(resolve, 120));

      // Should allow one more
      expect(shortLimiter.checkLimit(userId).allowed).toBe(true);

      shortLimiter.destroy();
    });
  });

  describe('Status Retrieval', () => {
    it('should return current status', () => {
      const userId = 'user1';

      limiter.checkLimit(userId);
      limiter.checkLimit(userId);
      limiter.checkLimit(userId);

      const status = limiter.getStatus(userId);

      expect(status.count).toBe(3);
      expect(status.remaining).toBe(7);
      expect(status.limit).toBe(10);
      expect(status.resetAt).toBeInstanceOf(Date);
    });

    it('should return status for user with no operations', () => {
      const userId = 'newuser';

      const status = limiter.getStatus(userId);

      expect(status.count).toBe(0);
      expect(status.remaining).toBe(10);
      expect(status.limit).toBe(10);
    });
  });

  describe('Reset Operations', () => {
    it('should reset specific user', () => {
      const userId = 'user1';

      // Use up the limit
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit(userId);
      }

      // Should be blocked
      expect(limiter.checkLimit(userId).allowed).toBe(false);

      // Reset user
      limiter.resetUser(userId);

      // Should be allowed again
      expect(limiter.checkLimit(userId).allowed).toBe(true);
    });

    it('should reset all users', () => {
      const users = ['user1', 'user2', 'user3'];

      // Use up limits for all users
      for (const user of users) {
        for (let i = 0; i < 10; i++) {
          limiter.checkLimit(user);
        }
      }

      // Reset all
      limiter.resetAll();

      // All users should be allowed again
      for (const user of users) {
        expect(limiter.checkLimit(user).allowed).toBe(true);
      }
    });
  });

  describe('Statistics Tracking', () => {
    it('should track total requests', () => {
      limiter.checkLimit('user1');
      limiter.checkLimit('user1');
      limiter.checkLimit('user2');

      const stats = limiter.getStats();

      expect(stats.totalRequests).toBe(3);
    });

    it('should track allowed and blocked requests', () => {
      const userId = 'user1';

      // Use up the limit
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit(userId);
      }

      // Try one more (blocked)
      limiter.checkLimit(userId);

      const stats = limiter.getStats();

      expect(stats.allowedRequests).toBe(10);
      expect(stats.blockedRequests).toBe(1);
    });

    it('should track unique users', () => {
      limiter.checkLimit('user1');
      limiter.checkLimit('user2');
      limiter.checkLimit('user3');
      limiter.checkLimit('user1'); // Duplicate

      const stats = limiter.getStats();

      expect(stats.uniqueUsers).toBe(3);
    });

    it('should calculate block rate', () => {
      const userId = 'user1';

      // 10 allowed
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit(userId);
      }

      // 5 blocked
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit(userId);
      }

      const stats = limiter.getStats();

      expect(stats.blockRate).toBe('33.33%');
      expect(stats.allowRate).toBe('66.67%');
    });

    it('should reset statistics', () => {
      limiter.checkLimit('user1');

      limiter.resetStats();
      const stats = limiter.getStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.allowedRequests).toBe(0);
      expect(stats.blockedRequests).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired entries', async () => {
      const shortLimiter = new RateLimiter({
        maxOperations: 5,
        windowMs: 50,
        cleanupInterval: 100
      });

      shortLimiter.checkLimit('user1');
      shortLimiter.checkLimit('user2');

      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, 70));

      // Manually trigger cleanup
      shortLimiter.cleanup();

      const stats = shortLimiter.getStats();

      expect(stats.uniqueUsers).toBe(0);

      shortLimiter.destroy();
    });

    it('should not cleanup non-expired entries', () => {
      limiter.checkLimit('user1');
      limiter.checkLimit('user2');

      limiter.cleanup();

      const stats = limiter.getStats();

      expect(stats.uniqueUsers).toBe(2);
    });
  });

  describe('State Export/Import', () => {
    it('should export current state', () => {
      limiter.checkLimit('user1');
      limiter.checkLimit('user2');

      const state = limiter.exportState();

      expect(state.userOperations).toBeDefined();
      expect(state.userOperations.user1).toBeDefined();
      expect(state.userOperations.user2).toBeDefined();
      expect(state.stats).toBeDefined();
      expect(state.config).toBeDefined();
    });

    it('should import state', () => {
      const state = {
        userOperations: {
          user1: [Date.now()],
          user2: [Date.now(), Date.now()]
        },
        stats: {
          totalRequests: 10,
          allowedRequests: 8,
          blockedRequests: 2,
          uniqueUsers: 2
        }
      };

      limiter.importState(state);

      const status1 = limiter.getStatus('user1');
      const status2 = limiter.getStatus('user2');

      expect(status1.count).toBe(1);
      expect(status2.count).toBe(2);
    });
  });
});

describe('TieredRateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new TieredRateLimiter({
      tiers: {
        read: { maxOperations: 20, windowMs: 60000 },
        write: { maxOperations: 10, windowMs: 60000 },
        delete: { maxOperations: 5, windowMs: 60000 }
      }
    });
  });

  afterEach(() => {
    limiter.destroy();
  });

  describe('Tier-specific Limits', () => {
    it('should enforce different limits per tier', () => {
      const userId = 'user1';

      // Read tier - 20 allowed
      for (let i = 0; i < 20; i++) {
        const result = limiter.checkLimit(userId, 'read');
        expect(result.allowed).toBe(true);
      }
      expect(limiter.checkLimit(userId, 'read').allowed).toBe(false);

      // Write tier - still has 10 available
      for (let i = 0; i < 10; i++) {
        const result = limiter.checkLimit(userId, 'write');
        expect(result.allowed).toBe(true);
      }
      expect(limiter.checkLimit(userId, 'write').allowed).toBe(false);

      // Delete tier - still has 5 available
      for (let i = 0; i < 5; i++) {
        const result = limiter.checkLimit(userId, 'delete');
        expect(result.allowed).toBe(true);
      }
      expect(limiter.checkLimit(userId, 'delete').allowed).toBe(false);
    });

    it('should track tiers independently', () => {
      const userId = 'user1';

      // Use up write tier
      for (let i = 0; i < 10; i++) {
        limiter.recordOperation(userId, 'write');
      }

      // Write should be blocked
      expect(limiter.recordOperation(userId, 'write').success).toBe(false);

      // Read should still work
      expect(limiter.recordOperation(userId, 'read').success).toBe(true);
    });
  });

  describe('Multi-tier Status', () => {
    it('should return status for all tiers', () => {
      const userId = 'user1';

      limiter.recordOperation(userId, 'read');
      limiter.recordOperation(userId, 'write');
      limiter.recordOperation(userId, 'delete');

      const status = limiter.getStatus(userId);

      expect(status.read).toBeDefined();
      expect(status.write).toBeDefined();
      expect(status.delete).toBeDefined();
      expect(status.read.count).toBe(1);
      expect(status.write.count).toBe(1);
      expect(status.delete.count).toBe(1);
    });
  });

  describe('Multi-tier Statistics', () => {
    it('should return statistics for all tiers', () => {
      limiter.recordOperation('user1', 'read');
      limiter.recordOperation('user1', 'write');
      limiter.recordOperation('user2', 'delete');

      const stats = limiter.getStats();

      expect(stats.read).toBeDefined();
      expect(stats.write).toBeDefined();
      expect(stats.delete).toBeDefined();
    });
  });

  describe('Multi-tier Reset', () => {
    it('should reset user across all tiers', () => {
      const userId = 'user1';

      limiter.recordOperation(userId, 'read');
      limiter.recordOperation(userId, 'write');
      limiter.recordOperation(userId, 'delete');

      limiter.resetUser(userId);

      const status = limiter.getStatus(userId);

      expect(status.read.count).toBe(0);
      expect(status.write.count).toBe(0);
      expect(status.delete.count).toBe(0);
    });

    it('should reset all users across all tiers', () => {
      limiter.recordOperation('user1', 'read');
      limiter.recordOperation('user2', 'write');

      limiter.resetAll();

      const status1 = limiter.getStatus('user1');
      const status2 = limiter.getStatus('user2');

      expect(status1.read.count).toBe(0);
      expect(status2.write.count).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown tier', () => {
      expect(() => {
        limiter.checkLimit('user1', 'unknown');
      }).toThrow('Unknown tier');
    });
  });
});
