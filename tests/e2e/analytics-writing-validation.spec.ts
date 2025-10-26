/**
 * Analytics Writing E2E Validation
 *
 * End-to-end tests to validate analytics are being written to database correctly
 */

import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import path from 'path';

test.describe('Analytics Writing E2E Validation', () => {
  const dbPath = path.join(process.cwd(), '..', 'database.db');

  test('Analytics health endpoint returns status', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/claude-code/analytics/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log('Health response:', data);

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('health');
    expect(data.health).toHaveProperty('status');
    expect(data.health).toHaveProperty('totalRecords');
    expect(data.health.totalRecords).toBeGreaterThan(350);
  });

  test('Analytics endpoint returns data', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/claude-code/analytics');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log('Analytics response:', JSON.stringify(data, null, 2));

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('analytics');
  });

  test('Cost tracking endpoint returns data', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/claude-code/analytics/cost-tracking');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log('Cost tracking:', data);

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('totalCost');
    expect(data).toHaveProperty('totalTokens');
  });

  test('Token usage endpoint returns data', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/claude-code/analytics/token-usage');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log('Token usage:', data);

    expect(data).toHaveProperty('success', true);
  });

  test('Database has recent records (< 10 minutes old)', async () => {
    const db = new Database(dbPath, { readonly: true });

    const recentRecords = db.prepare(`
      SELECT COUNT(*) as count
      FROM token_analytics
      WHERE timestamp > datetime('now', '-10 minutes')
    `).get();

    console.log('Recent records (last 10 min):', recentRecords.count);
    expect(recentRecords.count).toBeGreaterThan(0);

    db.close();
  });

  test('Last analytics record has valid structure', async () => {
    const db = new Database(dbPath, { readonly: true });

    const lastRecord = db.prepare(`
      SELECT * FROM token_analytics
      ORDER BY timestamp DESC
      LIMIT 1
    `).get();

    console.log('Last record:', lastRecord);

    expect(lastRecord).toHaveProperty('id');
    expect(lastRecord).toHaveProperty('timestamp');
    expect(lastRecord).toHaveProperty('sessionId');
    expect(lastRecord).toHaveProperty('model');
    expect(lastRecord).toHaveProperty('totalTokens');
    expect(lastRecord).toHaveProperty('estimatedCost');
    expect(lastRecord.totalTokens).toBeGreaterThan(0);
    expect(lastRecord.estimatedCost).toBeGreaterThan(0);

    db.close();
  });
});
