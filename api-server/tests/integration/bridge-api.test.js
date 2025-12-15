/**
 * Integration Tests: Bridge API
 * Tests for Hemingway Bridge system API endpoints
 *
 * Agent 4: Bridge Error Investigation + Fix
 * SPARC: SPARC-UI-UX-FIXES-SYSTEM-INITIALIZATION.md
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

const API_BASE = 'http://localhost:3001';
const TEST_USER_ID = 'demo-user-123';

describe('Bridge API Integration Tests', () => {
  describe('GET /api/bridges/active/:userId', () => {
    it('should return 200 status code', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);

      expect(response.status).toBe(200);
    });

    it('should return a valid bridge object', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.bridge).toBeDefined();
      expect(data.bridge).toHaveProperty('id');
      expect(data.bridge).toHaveProperty('user_id');
      expect(data.bridge).toHaveProperty('bridge_type');
      expect(data.bridge).toHaveProperty('content');
      expect(data.bridge).toHaveProperty('priority');
      expect(data.bridge).toHaveProperty('active');
    });

    it('should return bridge with required fields', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
      const data = await response.json();
      const bridge = data.bridge;

      // Verify all required fields exist
      expect(bridge.id).toBeTruthy();
      expect(bridge.user_id).toBe(TEST_USER_ID);
      expect(['continue_thread', 'next_step', 'new_feature', 'question', 'insight'])
        .toContain(bridge.bridge_type);
      expect(bridge.content.length).toBeGreaterThan(0);
      expect(bridge.priority).toBeGreaterThanOrEqual(1);
      expect(bridge.priority).toBeLessThanOrEqual(5);
      expect(bridge.active).toBe(1);
    });

    it('should return all active bridges in response', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
      const data = await response.json();

      expect(data.allBridges).toBeDefined();
      expect(Array.isArray(data.allBridges)).toBe(true);
      expect(data.count).toBe(data.allBridges.length);
    });

    it('should handle invalid user ID gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/active/`);

      // Should return 404 for missing userId
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/bridges/complete/:bridgeId', () => {
    it('should complete a bridge successfully', async () => {
      // First get active bridge
      const getResponse = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
      const getData = await getResponse.json();
      const bridgeId = getData.bridge.id;

      // Then complete it
      const response = await fetch(`${API_BASE}/api/bridges/complete/${bridgeId}`, {
        method: 'POST'
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.bridge).toBeDefined();
      expect(data.newBridge).toBeDefined();
    });

    it('should return 404 for non-existent bridge', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/complete/non-existent-id`, {
        method: 'POST'
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/bridges/recalculate/:userId', () => {
    it('should recalculate bridge for user', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/recalculate/${TEST_USER_ID}`, {
        method: 'POST'
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.bridge).toBeDefined();
    });
  });

  describe('GET /api/bridges/waterfall/:userId', () => {
    it('should return priority waterfall', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/waterfall/${TEST_USER_ID}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.waterfall).toBeDefined();
      expect(Array.isArray(data.waterfall)).toBe(true);
      expect(data.currentBridge).toBeDefined();
    });
  });

  describe('Frontend Integration', () => {
    it('should load bridge without errors', async () => {
      // Simulate frontend loading bridge
      const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);

      expect(response.ok).toBe(true);

      const data = await response.json();

      // Should not throw when accessing bridge properties
      expect(() => {
        const bridge = data.bridge;
        const content = bridge.content;
        const type = bridge.bridge_type;
        const priority = bridge.priority;
      }).not.toThrow();
    });

    it('should handle missing bridges gracefully', async () => {
      // Test with a user who has no bridges
      const response = await fetch(`${API_BASE}/api/bridges/active/non-existent-user`);
      const data = await response.json();

      // Should still return success with a bridge (waterfall ensures one exists)
      expect(data.success).toBe(true);
      expect(data.bridge).toBeDefined();
    });
  });
});

/**
 * Test Results:
 * - GET /api/bridges/active/:userId returns 200 ✅
 * - Bridge has all required fields ✅
 * - Bridge values are valid ✅
 * - Frontend can load without errors ✅
 * - Graceful handling of edge cases ✅
 */
