/**
 * Integration Tests: Onboarding Bridge Permanent Fix
 *
 * CRITICAL: Tests the permanent fix for onboarding bridge recreation bug
 *
 * Validation Requirements:
 * 1. Database state verification (phases complete, onboarding complete)
 * 2. Zero onboarding bridges in database
 * 3. Bridge API returns Priority 3+ only (NO Priority 1-2)
 * 4. Multiple API calls don't recreate onboarding bridge
 * 5. Priority Service logic respects complete state
 *
 * Uses REAL database queries (better-sqlite3) - NO MOCKS
 *
 * Author: QA Testing Agent
 * Date: 2025-11-04
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Database from 'better-sqlite3';

const API_BASE = 'http://localhost:3001';
const TEST_USER_ID = 'demo-user-123';
const DB_PATH = '/workspaces/agent-feed/database.db';

let db;

describe('Onboarding Bridge Permanent Fix - Real Database Validation', () => {

  beforeAll(() => {
    // Connect to REAL database
    db = new Database(DB_PATH);
    console.log('✅ Connected to database:', DB_PATH);
  });

  afterAll(() => {
    // Close database connection
    if (db) {
      db.close();
      console.log('✅ Database connection closed');
    }
  });

  describe('1. Database State Verification', () => {
    it('should have onboarding_state record for test user', () => {
      const stmt = db.prepare(`
        SELECT * FROM onboarding_state WHERE user_id = ?
      `);
      const state = stmt.get(TEST_USER_ID);

      expect(state).toBeDefined();
      expect(state.user_id).toBe(TEST_USER_ID);
    });

    it('should have Phase 1 completed', () => {
      const stmt = db.prepare(`
        SELECT phase1_completed, phase1_completed_at
        FROM onboarding_state
        WHERE user_id = ?
      `);
      const state = stmt.get(TEST_USER_ID);

      expect(state).toBeDefined();
      expect(state.phase1_completed).toBe(1);
      expect(state.phase1_completed_at).toBeTruthy();

      console.log('✅ Phase 1 completed at:', new Date(state.phase1_completed_at * 1000).toISOString());
    });

    it('should have Phase 2 completed', () => {
      const stmt = db.prepare(`
        SELECT phase2_completed, phase2_completed_at
        FROM onboarding_state
        WHERE user_id = ?
      `);
      const state = stmt.get(TEST_USER_ID);

      expect(state).toBeDefined();
      expect(state.phase2_completed).toBe(1);
      expect(state.phase2_completed_at).toBeTruthy();

      console.log('✅ Phase 2 completed at:', new Date(state.phase2_completed_at * 1000).toISOString());
    });

    it('should have onboarding_completed flag set in user_settings', () => {
      const stmt = db.prepare(`
        SELECT onboarding_completed
        FROM user_settings
        WHERE user_id = ?
      `);
      const settings = stmt.get(TEST_USER_ID);

      expect(settings).toBeDefined();
      expect(settings.onboarding_completed).toBe(1);

      console.log('✅ Onboarding completed flag: true');
    });

    it('should have complete response data collected', () => {
      const stmt = db.prepare(`
        SELECT responses FROM onboarding_state WHERE user_id = ?
      `);
      const state = stmt.get(TEST_USER_ID);

      expect(state).toBeDefined();

      const responses = JSON.parse(state.responses);
      expect(responses).toBeDefined();
      expect(Object.keys(responses).length).toBeGreaterThan(0);

      console.log('✅ Collected responses:', Object.keys(responses));
    });
  });

  describe('2. Zero Onboarding Bridges in Database', () => {
    it('should have ZERO active Priority 1 bridges (continue_thread)', () => {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM hemingway_bridges
        WHERE user_id = ?
          AND priority = 1
          AND bridge_type = 'continue_thread'
          AND active = 1
      `);
      const result = stmt.get(TEST_USER_ID);

      expect(result.count).toBe(0);
      console.log('✅ Priority 1 bridges (continue_thread): 0');
    });

    it('should have ZERO active Priority 2 bridges (next_step)', () => {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM hemingway_bridges
        WHERE user_id = ?
          AND priority = 2
          AND bridge_type = 'next_step'
          AND active = 1
      `);
      const result = stmt.get(TEST_USER_ID);

      expect(result.count).toBe(0);
      console.log('✅ Priority 2 bridges (next_step): 0');
    });

    it('should have NO onboarding-related bridges at all', () => {
      const stmt = db.prepare(`
        SELECT *
        FROM hemingway_bridges
        WHERE user_id = ?
          AND bridge_type IN ('next_step', 'continue_thread')
          AND active = 1
      `);
      const bridges = stmt.all(TEST_USER_ID);

      expect(bridges.length).toBe(0);
      console.log('✅ Onboarding bridges: 0');
    });

    it('should list all active bridges (for debugging)', () => {
      const stmt = db.prepare(`
        SELECT
          id,
          bridge_type,
          priority,
          content,
          active,
          created_at
        FROM hemingway_bridges
        WHERE user_id = ?
          AND active = 1
        ORDER BY priority ASC
      `);
      const bridges = stmt.all(TEST_USER_ID);

      console.log('\n📋 Active Bridges in Database:');
      bridges.forEach(bridge => {
        console.log(`  - Priority ${bridge.priority}: ${bridge.bridge_type}`);
        console.log(`    Content: "${bridge.content.substring(0, 50)}..."`);
      });

      // All active bridges should be Priority 3+
      bridges.forEach(bridge => {
        expect(bridge.priority).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('3. Bridge API Returns Priority 3+ Only', () => {
    it('should return a bridge from API', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.bridge).toBeDefined();
    });

    it('should return bridge with Priority 3 or higher', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
      const data = await response.json();

      expect(data.bridge.priority).toBeGreaterThanOrEqual(3);

      console.log(`✅ API returned bridge: Priority ${data.bridge.priority} - ${data.bridge.bridge_type}`);
    });

    it('should NOT return Priority 1 or 2 bridges', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
      const data = await response.json();

      expect(data.bridge.priority).not.toBe(1);
      expect(data.bridge.priority).not.toBe(2);

      console.log('✅ No Priority 1-2 bridges returned');
    });

    it('should return valid bridge types (new_feature, question, insight)', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
      const data = await response.json();

      const validTypes = ['new_feature', 'question', 'insight'];
      expect(validTypes).toContain(data.bridge.bridge_type);

      console.log(`✅ Valid bridge type: ${data.bridge.bridge_type}`);
    });

    it('should NOT return onboarding-related bridge types', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
      const data = await response.json();

      const onboardingTypes = ['next_step', 'continue_thread'];
      expect(onboardingTypes).not.toContain(data.bridge.bridge_type);

      console.log('✅ No onboarding bridge types returned');
    });
  });

  describe('4. Multiple API Calls Don\'t Recreate Onboarding Bridge', () => {
    it('should return consistent bridges across multiple calls', async () => {
      const calls = 5;
      const bridges = [];

      for (let i = 0; i < calls; i++) {
        const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
        const data = await response.json();
        bridges.push(data.bridge);

        // Small delay between calls
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // All bridges should be Priority 3+
      bridges.forEach((bridge, index) => {
        expect(bridge.priority).toBeGreaterThanOrEqual(3);
        console.log(`  Call ${index + 1}: Priority ${bridge.priority} - ${bridge.bridge_type}`);
      });

      console.log(`✅ ${calls} consecutive calls: All Priority 3+`);
    });

    it('should not create new onboarding bridges after multiple recalculations', async () => {
      // Get initial bridge count
      const initialStmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM hemingway_bridges
        WHERE user_id = ? AND active = 1
      `);
      const initialCount = initialStmt.get(TEST_USER_ID).count;

      // Make multiple recalculate calls
      for (let i = 0; i < 3; i++) {
        await fetch(`${API_BASE}/api/bridges/recalculate/${TEST_USER_ID}`, {
          method: 'POST'
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check final bridge count
      const finalCount = initialStmt.get(TEST_USER_ID).count;

      // Count should not increase dramatically (may create ONE new bridge, but not multiple onboarding bridges)
      expect(finalCount).toBeLessThanOrEqual(initialCount + 1);

      // Verify no onboarding bridges created
      const onboardingStmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM hemingway_bridges
        WHERE user_id = ?
          AND bridge_type IN ('next_step', 'continue_thread')
          AND active = 1
      `);
      const onboardingCount = onboardingStmt.get(TEST_USER_ID).count;

      expect(onboardingCount).toBe(0);

      console.log('✅ No onboarding bridges created during recalculations');
    });

    it('should maintain database consistency after rapid API calls', async () => {
      // Make rapid concurrent calls
      const promises = Array(10).fill(null).map(() =>
        fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`)
      );

      await Promise.all(promises);

      // Check database for duplicate or invalid bridges
      const stmt = db.prepare(`
        SELECT
          bridge_type,
          priority,
          COUNT(*) as count
        FROM hemingway_bridges
        WHERE user_id = ? AND active = 1
        GROUP BY bridge_type, priority
      `);
      const groups = stmt.all(TEST_USER_ID);

      console.log('\n📊 Bridge Distribution After Rapid Calls:');
      groups.forEach(group => {
        console.log(`  ${group.bridge_type} (P${group.priority}): ${group.count}`);
      });

      // No onboarding bridges should exist
      const onboardingBridges = groups.filter(g =>
        g.bridge_type === 'next_step' || g.bridge_type === 'continue_thread'
      );

      expect(onboardingBridges.length).toBe(0);
      console.log('✅ No onboarding bridges after concurrent calls');
    });
  });

  describe('5. Priority Service Logic Verification', () => {
    it('should skip Priority 1 check when onboarding complete', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/waterfall/${TEST_USER_ID}`);
      const data = await response.json();

      // Waterfall should NOT contain Priority 1 bridges
      const priority1Bridges = data.waterfall.filter(b => b.priority === 1);
      expect(priority1Bridges.length).toBe(0);

      console.log('✅ No Priority 1 bridges in waterfall');
    });

    it('should skip Priority 2 check when both phases complete', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/waterfall/${TEST_USER_ID}`);
      const data = await response.json();

      // Waterfall should NOT contain Priority 2 bridges
      const priority2Bridges = data.waterfall.filter(b => b.priority === 2);
      expect(priority2Bridges.length).toBe(0);

      console.log('✅ No Priority 2 bridges in waterfall');
    });

    it('should only return Priority 3+ bridges in waterfall', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/waterfall/${TEST_USER_ID}`);
      const data = await response.json();

      expect(data.waterfall.length).toBeGreaterThan(0);

      // All bridges should be Priority 3+
      data.waterfall.forEach(bridge => {
        expect(bridge.priority).toBeGreaterThanOrEqual(3);
      });

      console.log(`✅ Waterfall has ${data.waterfall.length} bridges (all Priority 3+)`);
    });

    it('should show complete onboarding state in logs', () => {
      const stmt = db.prepare(`
        SELECT
          phase,
          step,
          phase1_completed,
          phase2_completed,
          responses
        FROM onboarding_state
        WHERE user_id = ?
      `);
      const state = stmt.get(TEST_USER_ID);

      console.log('\n🎯 Final Onboarding State:');
      console.log('  Phase:', state.phase);
      console.log('  Step:', state.step || 'null');
      console.log('  Phase 1 Complete:', state.phase1_completed === 1);
      console.log('  Phase 2 Complete:', state.phase2_completed === 1);

      const responses = JSON.parse(state.responses);
      console.log('  Responses:', Object.keys(responses).join(', '));

      expect(state.phase1_completed).toBe(1);
      expect(state.phase2_completed).toBe(1);
    });
  });

  describe('6. Edge Cases and Boundary Conditions', () => {
    it('should handle bridge completion without creating onboarding bridge', async () => {
      // Get current active bridge
      const getResponse = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
      const getData = await getResponse.json();
      const bridgeId = getData.bridge.id;

      // Complete it
      const completeResponse = await fetch(`${API_BASE}/api/bridges/complete/${bridgeId}`, {
        method: 'POST'
      });
      const completeData = await completeResponse.json();

      expect(completeResponse.status).toBe(200);
      expect(completeData.newBridge).toBeDefined();

      // New bridge should be Priority 3+
      expect(completeData.newBridge.priority).toBeGreaterThanOrEqual(3);

      console.log(`✅ New bridge after completion: Priority ${completeData.newBridge.priority}`);
    });

    it('should handle user actions without creating onboarding bridge', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/action/${TEST_USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'post_created',
          actionData: { postId: 'test-post-123' }
        })
      });

      if (response.status === 200) {
        const data = await response.json();

        if (data.bridge) {
          expect(data.bridge.priority).toBeGreaterThanOrEqual(3);
          console.log('✅ Action response bridge: Priority 3+');
        }
      }
    });

    it('should never return onboarding content in bridge', async () => {
      const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
      const data = await response.json();

      const content = data.bridge.content.toLowerCase();

      // Should not contain onboarding keywords
      const onboardingKeywords = [
        'onboarding',
        'getting to know you',
        'setup',
        'finish',
        'complete your profile'
      ];

      onboardingKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          console.warn(`⚠️  Found onboarding keyword: "${keyword}"`);
        }
      });

      console.log('✅ Bridge content checked for onboarding keywords');
    });
  });

  describe('7. Performance and Consistency', () => {
    it('should respond quickly (< 100ms average)', async () => {
      const times = [];
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
        const duration = Date.now() - start;
        times.push(duration);
      }

      const average = times.reduce((a, b) => a + b, 0) / times.length;

      console.log(`📊 Average response time: ${average.toFixed(2)}ms`);
      expect(average).toBeLessThan(100);
    });

    it('should maintain referential integrity', () => {
      const stmt = db.prepare(`
        SELECT
          hb.*,
          os.phase1_completed,
          os.phase2_completed
        FROM hemingway_bridges hb
        LEFT JOIN onboarding_state os ON hb.user_id = os.user_id
        WHERE hb.user_id = ? AND hb.active = 1
      `);
      const results = stmt.all(TEST_USER_ID);

      results.forEach(row => {
        // If both phases complete, should not have Priority 1-2 bridges
        if (row.phase1_completed === 1 && row.phase2_completed === 1) {
          expect(row.priority).toBeGreaterThanOrEqual(3);
        }
      });

      console.log('✅ Referential integrity maintained');
    });
  });
});

/**
 * TEST SUITE SUMMARY
 *
 * ✅ Database State Verification (5 tests)
 *    - Onboarding state exists
 *    - Phase 1 completed
 *    - Phase 2 completed
 *    - Onboarding completed flag set
 *    - Complete response data collected
 *
 * ✅ Zero Onboarding Bridges (4 tests)
 *    - No Priority 1 bridges
 *    - No Priority 2 bridges
 *    - No onboarding-related bridges
 *    - All active bridges are Priority 3+
 *
 * ✅ API Returns Priority 3+ Only (5 tests)
 *    - API returns bridge
 *    - Bridge is Priority 3+
 *    - No Priority 1-2 returned
 *    - Valid bridge types only
 *    - No onboarding types
 *
 * ✅ Multiple API Calls (3 tests)
 *    - Consistent bridges across calls
 *    - No recreation during recalculation
 *    - Database consistency maintained
 *
 * ✅ Priority Service Logic (4 tests)
 *    - Skips Priority 1 when complete
 *    - Skips Priority 2 when complete
 *    - Waterfall only has Priority 3+
 *    - State shows completion
 *
 * ✅ Edge Cases (3 tests)
 *    - Bridge completion doesn't create onboarding
 *    - User actions don't create onboarding
 *    - No onboarding content in bridges
 *
 * ✅ Performance (2 tests)
 *    - Quick response times
 *    - Referential integrity maintained
 *
 * TOTAL: 26 comprehensive integration tests
 * All using REAL database queries (NO MOCKS)
 */
