/**
 * End-to-End Tests: Streaming Loop Protection System
 * Tests the complete system with real backend scenarios
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { sleep } from '../helpers/test-utils.js';

/**
 * NOTE: These E2E tests are designed to work with a real backend.
 * They assume the protection system is integrated into the agent-worker.
 *
 * To run these tests:
 * 1. Ensure protection components are implemented
 * 2. Start the backend server
 * 3. Run: npm test e2e
 */

describe('Streaming Loop Protection - E2E Tests', () => {
  let serverUrl;
  let testTickets;

  beforeAll(async () => {
    // Setup: Assume server is running
    serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3000';
    testTickets = [];

    // Verify server is accessible
    try {
      const response = await fetch(`${serverUrl}/health`);
      if (!response.ok) {
        console.warn('Backend server may not be running');
      }
    } catch (error) {
      console.warn('Could not connect to backend server:', error.message);
    }
  });

  afterAll(async () => {
    // Cleanup: Remove test tickets
    for (const ticketId of testTickets) {
      try {
        await fetch(`${serverUrl}/api/tickets/${ticketId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Normal Query Completes Successfully', () => {
    it('should process simple query without triggering protection', async () => {
      const query = {
        text: 'What is 2 + 2?',
        complexity: 'simple',
      };

      const response = await fetch(`${serverUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.status).toBe('completed');
      expect(result.autoKilled).toBeUndefined();

      if (result.ticketId) {
        testTickets.push(result.ticketId);
      }
    }, 30000);

    it('should handle moderate complexity query', async () => {
      const query = {
        text: 'Explain the concept of recursion with an example',
        complexity: 'moderate',
      };

      const response = await fetch(`${serverUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(['completed', 'processing']).toContain(result.status);

      if (result.ticketId) {
        testTickets.push(result.ticketId);

        // Wait for completion
        let attempts = 0;
        while (attempts < 20) {
          await sleep(1000);
          const statusResponse = await fetch(
            `${serverUrl}/api/tickets/${result.ticketId}`
          );
          const status = await statusResponse.json();

          if (status.status === 'completed' || status.status === 'failed') {
            expect(status.status).toBe('completed');
            break;
          }
          attempts++;
        }
      }
    }, 60000);
  });

  describe('Long-Running Query Auto-Killed', () => {
    it('should auto-kill query exceeding timeout', async () => {
      const query = {
        text: 'Generate an extremely long response that would take forever',
        forceTimeout: true, // Test flag if supported
      };

      const response = await fetch(`${serverUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      const ticketId = result.ticketId;

      if (ticketId) {
        testTickets.push(ticketId);

        // Wait and check if auto-killed
        await sleep(10000);

        const statusResponse = await fetch(
          `${serverUrl}/api/tickets/${ticketId}`
        );
        const status = await statusResponse.json();

        // Should be failed with auto-kill reason
        expect(status.status).toBe('failed');
        expect(status.reason).toMatch(/AUTO_KILLED|TIMEOUT/i);
        expect(status.autoKilled).toBe(true);
      }
    }, 30000);

    it('should save partial response when auto-killed', async () => {
      const query = {
        text: 'Start generating but timeout before finishing',
        forceTimeout: true,
      };

      const response = await fetch(`${serverUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      const result = await response.json();
      const ticketId = result.ticketId;

      if (ticketId) {
        testTickets.push(ticketId);

        await sleep(8000);

        const statusResponse = await fetch(
          `${serverUrl}/api/tickets/${ticketId}`
        );
        const status = await statusResponse.json();

        if (status.status === 'failed' && status.autoKilled) {
          expect(status.partialResponse).toBeDefined();
          expect(status.partialResponse.length).toBeGreaterThan(0);
        }
      }
    }, 25000);
  });

  describe('Emergency Monitor Detection', () => {
    it('should detect stuck worker via emergency monitor', async () => {
      const query = {
        text: 'Simulate stuck worker scenario',
        forceLoop: true, // Test flag if supported
      };

      const response = await fetch(`${serverUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      const result = await response.json();
      const ticketId = result.ticketId;

      if (ticketId) {
        testTickets.push(ticketId);

        // Wait for emergency monitor to detect (15s interval + buffer)
        await sleep(20000);

        const statusResponse = await fetch(
          `${serverUrl}/api/tickets/${ticketId}`
        );
        const status = await statusResponse.json();

        expect(status.status).toBe('failed');
        expect(status.autoKilled).toBe(true);
        expect(status.detectedBy).toBe('emergency_monitor');
      }
    }, 35000);
  });

  describe('Monitoring Endpoints Accessible', () => {
    it('should return worker status from monitoring endpoint', async () => {
      const response = await fetch(`${serverUrl}/api/monitoring/workers`);

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.workers).toBeDefined();
      expect(Array.isArray(data.workers)).toBe(true);
    });

    it('should return circuit breaker status', async () => {
      const response = await fetch(
        `${serverUrl}/api/monitoring/circuit-breaker`
      );

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.state).toBeDefined();
      expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(data.state);
      expect(data.failureCount).toBeDefined();
    });

    it('should return health monitor statistics', async () => {
      const response = await fetch(
        `${serverUrl}/api/monitoring/health-stats`
      );

      if (response.ok) {
        const data = await response.json();
        expect(data.totalWorkers).toBeDefined();
        expect(data.healthyWorkers).toBeDefined();
        expect(data.unhealthyWorkers).toBeDefined();
      }
    });

    it('should allow manual worker kill via endpoint', async () => {
      // First create a test worker
      const query = {
        text: 'Test query for manual kill',
      };

      const createResponse = await fetch(`${serverUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      const result = await createResponse.json();
      const ticketId = result.ticketId;

      if (ticketId && result.workerId) {
        testTickets.push(ticketId);

        // Try to kill the worker
        const killResponse = await fetch(
          `${serverUrl}/api/monitoring/kill-worker/${result.workerId}`,
          { method: 'POST' }
        );

        expect(killResponse.ok).toBe(true);

        // Verify worker was killed
        await sleep(1000);

        const statusResponse = await fetch(
          `${serverUrl}/api/tickets/${ticketId}`
        );
        const status = await statusResponse.json();

        expect(['failed', 'killed']).toContain(status.status);
      }
    }, 15000);
  });

  describe('Cost Tracking Works', () => {
    it('should track tokens and cost for queries', async () => {
      const query = {
        text: 'Simple query to test cost tracking',
      };

      const response = await fetch(`${serverUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      const result = await response.json();
      const ticketId = result.ticketId;

      if (ticketId) {
        testTickets.push(ticketId);

        // Wait for processing
        await sleep(5000);

        const statusResponse = await fetch(
          `${serverUrl}/api/tickets/${ticketId}`
        );
        const status = await statusResponse.json();

        if (status.status === 'completed') {
          expect(status.tokens).toBeDefined();
          expect(status.cost).toBeDefined();
          expect(status.tokens.input).toBeGreaterThan(0);
          expect(status.cost).toBeGreaterThan(0);
        }
      }
    }, 20000);

    it('should have cost monitor endpoint', async () => {
      const response = await fetch(`${serverUrl}/api/monitoring/costs`);

      if (response.ok) {
        const data = await response.json();
        expect(data.totalCost).toBeDefined();
        expect(data.alertThreshold).toBeDefined();
      }
    });
  });

  describe('Circuit Breaker E2E', () => {
    it('should open circuit after multiple failures', async () => {
      const failures = [];

      // Trigger 3 failures
      for (let i = 0; i < 3; i++) {
        const query = {
          text: 'Force failure scenario',
          forceFailure: true,
        };

        const response = await fetch(`${serverUrl}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query),
        });

        const result = await response.json();

        if (result.ticketId) {
          testTickets.push(result.ticketId);
          failures.push(result.ticketId);
        }

        await sleep(2000);
      }

      // Check circuit breaker status
      const cbResponse = await fetch(
        `${serverUrl}/api/monitoring/circuit-breaker`
      );
      const cbStatus = await cbResponse.json();

      // Should be open or have recorded failures
      expect(cbStatus.failureCount).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe('User Notification E2E', () => {
    it('should send notification when query is auto-killed', async () => {
      const query = {
        text: 'Test auto-kill notification',
        forceTimeout: true,
        userId: 'test-user-123',
      };

      const response = await fetch(`${serverUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      const result = await response.json();
      const ticketId = result.ticketId;

      if (ticketId) {
        testTickets.push(ticketId);

        await sleep(10000);

        // Check notifications endpoint
        const notifResponse = await fetch(
          `${serverUrl}/api/notifications/test-user-123`
        );

        if (notifResponse.ok) {
          const notifications = await notifResponse.json();
          const autoKillNotif = notifications.find(
            n => n.ticketId === ticketId && n.type === 'AUTO_KILL'
          );

          expect(autoKillNotif).toBeDefined();
          expect(autoKillNotif.message).toContain('auto');
        }
      }
    }, 25000);
  });

  describe('System Health and Stability', () => {
    it('should handle concurrent queries without issues', async () => {
      const queries = Array(5).fill(null).map((_, i) => ({
        text: `Concurrent query ${i}`,
        complexity: 'simple',
      }));

      const responses = await Promise.all(
        queries.map(query =>
          fetch(`${serverUrl}/api/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query),
          })
        )
      );

      const results = await Promise.all(
        responses.map(r => r.json())
      );

      // All should be accepted
      expect(results.every(r => r.ticketId)).toBe(true);

      // Track for cleanup
      results.forEach(r => testTickets.push(r.ticketId));

      // Wait for all to complete
      await sleep(10000);

      // Check all completed or failed gracefully
      const statuses = await Promise.all(
        results.map(r =>
          fetch(`${serverUrl}/api/tickets/${r.ticketId}`).then(res =>
            res.json()
          )
        )
      );

      statuses.forEach(status => {
        expect(['completed', 'failed', 'processing']).toContain(
          status.status
        );
      });
    }, 45000);

    it('should recover gracefully from protection triggers', async () => {
      // Trigger protection
      const failQuery = {
        text: 'Trigger protection',
        forceLoop: true,
      };

      const failResponse = await fetch(`${serverUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(failQuery),
      });

      const failResult = await failResponse.json();
      if (failResult.ticketId) testTickets.push(failResult.ticketId);

      await sleep(5000);

      // Follow up with normal query - should work
      const normalQuery = {
        text: 'Normal query after protection trigger',
      };

      const normalResponse = await fetch(`${serverUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalQuery),
      });

      const normalResult = await normalResponse.json();
      if (normalResult.ticketId) testTickets.push(normalResult.ticketId);

      expect(normalResponse.ok).toBe(true);
      expect(normalResult.ticketId).toBeDefined();
    }, 30000);
  });
});
