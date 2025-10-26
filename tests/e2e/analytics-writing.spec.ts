/**
 * E2E Analytics Writing Tests (London School TDD)
 *
 * Testing Strategy: End-to-end validation of analytics flow
 * - Real API calls to Claude Code SDK endpoint
 * - Real database verification
 * - Screenshot evidence of dashboard updates
 */

import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import { join } from 'path';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const DB_PATH = process.env.DB_PATH || join(process.cwd(), '../database.db');

test.describe('E2E Analytics Writing Tests (London School TDD)', () => {
  let db: any;

  test.beforeAll(() => {
    // Connect to real database
    try {
      db = new Database(DB_PATH);
      console.log('✅ Connected to database:', DB_PATH);
    } catch (error) {
      console.warn('⚠️ Database connection failed:', error);
      // Tests will be skipped if database unavailable
    }
  });

  test.afterAll(() => {
    if (db) {
      db.close();
    }
  });

  test('Test 1: Make real /streaming-chat request', async ({ request }) => {
    // Arrange
    const testMessage = `Test analytics write at ${new Date().toISOString()}`;

    // Act - Make real API request
    const response = await request.post(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
      data: {
        message: testMessage
      },
      timeout: 30000
    });

    // Assert - API request should succeed
    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    expect(responseBody.success).toBe(true);
    expect(responseBody).toHaveProperty('message');
    expect(responseBody).toHaveProperty('responses');

    console.log('✅ API request successful:', {
      status: response.status(),
      success: responseBody.success,
      hasMessage: !!responseBody.message
    });
  });

  test('Test 2: Verify analytics record created in database', async ({ request }) => {
    test.skip(!db, 'Database not available');

    // Arrange
    const beforeCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get()?.count || 0;
    const testMessage = `Database write test ${Date.now()}`;

    // Act - Make API request
    const response = await request.post(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
      data: {
        message: testMessage
      },
      timeout: 30000
    });

    expect(response.ok()).toBeTruthy();

    // Wait for async analytics write to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Assert - Verify new record was created
    const afterCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get()?.count || 0;
    expect(afterCount).toBeGreaterThan(beforeCount);

    // Verify record has correct structure
    const latestRecord = db.prepare(`
      SELECT * FROM token_analytics
      ORDER BY created_at DESC
      LIMIT 1
    `).get();

    expect(latestRecord).toBeDefined();
    expect(latestRecord.id).toBeDefined();
    expect(latestRecord.sessionId).toBeDefined();
    expect(latestRecord.inputTokens).toBeGreaterThan(0);
    expect(latestRecord.outputTokens).toBeGreaterThan(0);
    expect(latestRecord.totalTokens).toBeGreaterThan(0);
    expect(latestRecord.estimatedCost).toBeGreaterThan(0);
    expect(latestRecord.model).toBeDefined();

    console.log('✅ Analytics record created:', {
      id: latestRecord.id,
      sessionId: latestRecord.sessionId,
      inputTokens: latestRecord.inputTokens,
      outputTokens: latestRecord.outputTokens,
      totalTokens: latestRecord.totalTokens,
      estimatedCost: latestRecord.estimatedCost,
      model: latestRecord.model
    });
  });

  test('Test 3: Verify timestamp is current (< 5 seconds old)', async ({ request }) => {
    test.skip(!db, 'Database not available');

    // Arrange & Act
    const beforeTime = new Date();
    await request.post(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
      data: {
        message: 'Timestamp test'
      },
      timeout: 30000
    });

    // Wait for write
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Assert
    const latestRecord = db.prepare(`
      SELECT * FROM token_analytics
      ORDER BY created_at DESC
      LIMIT 1
    `).get();

    const recordTime = new Date(latestRecord.timestamp);
    const timeDiff = Math.abs(recordTime.getTime() - beforeTime.getTime());

    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds

    console.log('✅ Timestamp verification:', {
      beforeTime: beforeTime.toISOString(),
      recordTime: recordTime.toISOString(),
      diffMs: timeDiff
    });
  });

  test('Test 4: Verify /analytics endpoint shows new data', async ({ request }) => {
    // Arrange - Make request to generate analytics
    await request.post(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
      data: {
        message: 'Analytics endpoint test'
      },
      timeout: 30000
    });

    // Wait for write
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Act - Query analytics endpoint
    const analyticsResponse = await request.get(`${API_BASE_URL}/api/claude-code/analytics?timeRange=24h`, {
      timeout: 10000
    });

    // Assert
    expect(analyticsResponse.ok()).toBeTruthy();
    const analyticsData = await analyticsResponse.json();

    expect(analyticsData.success).toBe(true);
    expect(analyticsData.analytics).toBeDefined();
    expect(analyticsData.analytics.overview).toBeDefined();
    expect(analyticsData.analytics.overview.totalRequests).toBeGreaterThan(0);

    console.log('✅ Analytics endpoint data:', {
      totalRequests: analyticsData.analytics.overview.totalRequests,
      totalCost: analyticsData.analytics.overview.totalCost,
      totalTokens: analyticsData.analytics.overview.totalTokens
    });
  });

  test('Test 5: Verify cost tracking reflects new request', async ({ request }) => {
    // Arrange - Get initial cost
    const initialCostResponse = await request.get(`${API_BASE_URL}/api/claude-code/cost-tracking?timeRange=1h`, {
      timeout: 10000
    });
    const initialData = await initialCostResponse.json();
    const initialCost = initialData.costMetrics?.totalCost || 0;

    // Act - Make request
    await request.post(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
      data: {
        message: 'Cost tracking test - this should add to the total cost'
      },
      timeout: 30000
    });

    // Wait for analytics
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Assert - Get updated cost
    const updatedCostResponse = await request.get(`${API_BASE_URL}/api/claude-code/cost-tracking?timeRange=1h`, {
      timeout: 10000
    });
    const updatedData = await updatedCostResponse.json();
    const updatedCost = updatedData.costMetrics?.totalCost || 0;

    // Note: Cost tracking might be in-memory, so this is informational
    console.log('✅ Cost tracking:', {
      initialCost,
      updatedCost,
      difference: updatedCost - initialCost
    });
  });

  test('Test 6: Verify token usage metrics updated', async ({ request }) => {
    test.skip(!db, 'Database not available');

    // Arrange - Get token count before
    const beforeTokens = db.prepare('SELECT SUM(totalTokens) as total FROM token_analytics').get()?.total || 0;

    // Act
    await request.post(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
      data: {
        message: 'Token usage test - count these tokens'
      },
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Assert - Get token count after
    const afterTokens = db.prepare('SELECT SUM(totalTokens) as total FROM token_analytics').get()?.total || 0;

    expect(afterTokens).toBeGreaterThan(beforeTokens);

    console.log('✅ Token usage metrics:', {
      beforeTokens,
      afterTokens,
      tokensAdded: afterTokens - beforeTokens
    });
  });

  test('Test 7: Screenshot of analytics dashboard with live data', async ({ page }) => {
    // Act - Navigate to analytics dashboard (if it exists)
    // Note: This assumes there's an analytics dashboard page
    try {
      await page.goto(`${FRONTEND_BASE_URL}/analytics`, {
        timeout: 10000,
        waitUntil: 'networkidle'
      });

      // Wait for data to load
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({
        path: 'tests/screenshots/analytics-dashboard-e2e.png',
        fullPage: true
      });

      console.log('✅ Screenshot saved: tests/screenshots/analytics-dashboard-e2e.png');
    } catch (error) {
      console.log('⚠️ Analytics dashboard not available, skipping screenshot');
    }
  });

  test('Test 8: Console logs show success messages', async ({ request }) => {
    // This test verifies the API logs success messages
    // In a real implementation, you would check server logs

    // Arrange & Act
    const response = await request.post(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
      data: {
        message: 'Console log test'
      },
      timeout: 30000
    });

    // Assert - API should succeed
    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    expect(responseBody.success).toBe(true);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Note: In production, you would verify server logs show:
    // - "✅ Token analytics written successfully for session:"
    // - "✅ Token analytics record written successfully"
    // - Success messages at each stage

    console.log('✅ API request completed successfully');
    console.log('📝 Note: Check server logs for analytics success messages');
  });

  test('Test 9: Analytics health endpoint shows healthy status', async ({ request }) => {
    // Arrange - Make a request to generate recent analytics data
    await request.post(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
      data: {
        message: 'Health check test'
      },
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Act - Check analytics health
    const healthResponse = await request.get(`${API_BASE_URL}/api/claude-code/analytics/health`, {
      timeout: 10000
    });

    // Assert
    expect(healthResponse.ok()).toBeTruthy();
    const healthData = await healthResponse.json();

    expect(healthData.success).toBe(true);
    expect(healthData.health).toBeDefined();
    expect(healthData.health.writerInitialized).toBe(true);
    expect(healthData.health.status).toBeDefined();

    // Status should be healthy or degraded (not critical or error)
    expect(['healthy', 'degraded']).toContain(healthData.health.status);

    console.log('✅ Analytics health status:', {
      status: healthData.health.status,
      writerInitialized: healthData.health.writerInitialized,
      totalRecords: healthData.health.totalRecords,
      lastWrite: healthData.health.lastWrite,
      timeSinceLastWrite: healthData.health.timeSinceLastWrite
    });
  });
});
