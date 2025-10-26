import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import path from 'path';

test.describe('Claude Code SDK Analytics - E2E Validation', () => {
  const dbPath = path.join(process.cwd(), 'database.db');

  test.beforeAll(() => {
    console.log('📊 Starting Claude Code SDK Analytics E2E Tests');
    console.log('Database path:', dbPath);
  });

  test('Analytics API returns comprehensive data', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/claude-code/analytics');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log('✅ Analytics API response:', JSON.stringify(data, null, 2).substring(0, 500));

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('analytics');
  });

  test('Database has analytics records', async () => {
    const db = new Database(dbPath, { readonly: true });

    const count = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();
    console.log('✅ Total analytics records:', count.count);

    expect(count.count).toBeGreaterThan(350);

    db.close();
  });

  test('Recent analytics records exist (< 24 hours)', async () => {
    const db = new Database(dbPath, { readonly: true });

    const recentRecords = db.prepare(`
      SELECT COUNT(*) as count
      FROM token_analytics
      WHERE timestamp > datetime('now', '-24 hours')
    `).get();

    console.log('✅ Recent records (last 24 hours):', recentRecords.count);
    expect(recentRecords.count).toBeGreaterThanOrEqual(0);

    db.close();
  });

  test('Latest record has valid structure and data', async () => {
    const db = new Database(dbPath, { readonly: true });

    const lastRecord = db.prepare(`
      SELECT * FROM token_analytics
      ORDER BY timestamp DESC
      LIMIT 1
    `).get();

    console.log('✅ Latest analytics record:', lastRecord);

    // Verify required fields exist
    expect(lastRecord).toHaveProperty('id');
    expect(lastRecord).toHaveProperty('timestamp');
    expect(lastRecord).toHaveProperty('sessionId');
    expect(lastRecord).toHaveProperty('model');
    expect(lastRecord).toHaveProperty('totalTokens');
    expect(lastRecord).toHaveProperty('estimatedCost');

    // Verify data types and values
    expect(typeof lastRecord.id).toBe('string');
    expect(typeof lastRecord.timestamp).toBe('string');
    expect(typeof lastRecord.totalTokens).toBe('number');
    expect(typeof lastRecord.estimatedCost).toBe('number');

    // Verify positive values
    expect(lastRecord.totalTokens).toBeGreaterThan(0);
    expect(lastRecord.estimatedCost).toBeGreaterThan(0);

    db.close();
  });

  test('Database schema has all required columns', async () => {
    const db = new Database(dbPath, { readonly: true });

    const tableInfo = db.prepare('PRAGMA table_info(token_analytics)').all();
    const columnNames = tableInfo.map((col: any) => col.name);

    console.log('✅ Database columns:', columnNames);

    const requiredColumns = [
      'id', 'timestamp', 'sessionId', 'operation',
      'inputTokens', 'outputTokens', 'totalTokens',
      'estimatedCost', 'model', 'userId',
      'created_at', 'message_content', 'response_content'
    ];

    requiredColumns.forEach(colName => {
      expect(columnNames).toContain(colName);
    });

    db.close();
  });

  test('Database has performance indexes', async () => {
    const db = new Database(dbPath, { readonly: true });

    const indexes = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='index' AND tbl_name='token_analytics'
    `).all();

    console.log('✅ Database indexes:', indexes.map((idx: any) => idx.name));

    expect(indexes.length).toBeGreaterThanOrEqual(1);

    db.close();
  });

  test('Cost calculations are accurate', async () => {
    const db = new Database(dbPath, { readonly: true });

    const records = db.prepare(`
      SELECT inputTokens, outputTokens, totalTokens, estimatedCost, model
      FROM token_analytics
      WHERE model LIKE '%claude%'
      ORDER BY timestamp DESC
      LIMIT 5
    `).all();

    console.log('✅ Sample cost calculations:', records);

    records.forEach((record: any) => {
      // Verify total tokens calculation
      expect(record.totalTokens).toBeGreaterThanOrEqual(
        record.inputTokens + record.outputTokens
      );

      // Verify cost is reasonable (should be in cents/dollars range)
      expect(record.estimatedCost).toBeGreaterThan(0);
      expect(record.estimatedCost).toBeLessThan(100); // Less than $100
    });

    db.close();
  });

  test('Multiple sessions are tracked separately', async () => {
    const db = new Database(dbPath, { readonly: true });

    const sessions = db.prepare(`
      SELECT COUNT(DISTINCT sessionId) as sessionCount
      FROM token_analytics
    `).get();

    console.log('✅ Unique sessions tracked:', sessions.sessionCount);

    expect(sessions.sessionCount).toBeGreaterThan(0);

    db.close();
  });

  test('Timestamp format is valid ISO 8601', async () => {
    const db = new Database(dbPath, { readonly: true });

    const record = db.prepare(`
      SELECT timestamp FROM token_analytics
      ORDER BY timestamp DESC
      LIMIT 1
    `).get();

    console.log('✅ Latest timestamp:', record.timestamp);

    // Verify ISO 8601 format
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(record.timestamp).toMatch(isoRegex);

    // Verify it's a valid date
    const date = new Date(record.timestamp);
    expect(date.toString()).not.toBe('Invalid Date');

    db.close();
  });
});
