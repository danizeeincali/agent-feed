/**
 * Unit Tests: Reset Database Service
 * AGENT 1: Infrastructure & Database
 * Tests for database reset operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createResetDatabaseService } from '../../../services/database/reset-database.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;
let service;
const TEST_DB_PATH = path.join(__dirname, 'test-data', 'reset-database.db');

beforeAll(() => {
  const testDataDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  db = new Database(TEST_DB_PATH);

  // Create required tables
  db.exec(`
    CREATE TABLE user_settings (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL
    ) STRICT;

    CREATE TABLE onboarding_state (
      user_id TEXT PRIMARY KEY,
      phase INTEGER DEFAULT 1
    ) STRICT;

    CREATE TABLE hemingway_bridges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL
    ) STRICT;

    CREATE TABLE agent_introductions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL
    ) STRICT;
  `);

  service = createResetDatabaseService(db);
});

afterAll(() => {
  if (db) {
    db.close();
  }
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

beforeEach(() => {
  // Clear and seed test data
  db.exec(`
    DELETE FROM user_settings;
    DELETE FROM onboarding_state;
    DELETE FROM hemingway_bridges;
    DELETE FROM agent_introductions;

    INSERT INTO user_settings (user_id, display_name) VALUES ('user1', 'User 1');
    INSERT INTO user_settings (user_id, display_name) VALUES ('user2', 'User 2');
    INSERT INTO onboarding_state (user_id) VALUES ('user1');
  `);
});

describe('Reset Database Service - Unit Tests', () => {
  describe('resetDatabase()', () => {
    it('should require confirmation to reset', () => {
      const result = service.resetDatabase({ confirmReset: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('confirmation');
    });

    it('should clear all tables when confirmed', () => {
      const result = service.resetDatabase({ confirmReset: true });

      expect(result.success).toBe(true);
      expect(result.message).toContain('reset successfully');

      // Verify tables are empty
      const userCount = db.prepare('SELECT COUNT(*) as count FROM user_settings').get();
      const onboardingCount = db.prepare('SELECT COUNT(*) as count FROM onboarding_state').get();

      expect(userCount.count).toBe(0);
      expect(onboardingCount.count).toBe(0);
    });

    it('should return counts of cleared rows', () => {
      const result = service.resetDatabase({ confirmReset: true });

      expect(result.tablesCleared).toBeDefined();
      expect(result.tablesCleared.user_settings).toBe(2); // 2 users inserted in beforeEach
      expect(result.tablesCleared.onboarding_state).toBe(1);
    });

    it('should preserve table schema after reset', () => {
      service.resetDatabase({ confirmReset: true });

      // Check that tables still exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all();

      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('user_settings');
      expect(tableNames).toContain('onboarding_state');
    });
  });

  describe('clearTable()', () => {
    it('should clear specific table', () => {
      const result = service.clearTable('user_settings');

      expect(result.success).toBe(true);
      expect(result.table).toBe('user_settings');
      expect(result.rowsDeleted).toBe(2);

      // Verify table is empty
      const count = db.prepare('SELECT COUNT(*) as count FROM user_settings').get();
      expect(count.count).toBe(0);
    });

    it('should reject invalid table names', () => {
      expect(() => {
        service.clearTable('malicious_table');
      }).toThrow('Invalid table name');
    });

    it('should not affect other tables', () => {
      service.clearTable('user_settings');

      // onboarding_state should still have data
      const count = db.prepare('SELECT COUNT(*) as count FROM onboarding_state').get();
      expect(count.count).toBe(1);
    });
  });

  describe('getDatabaseStats()', () => {
    it('should return table statistics', () => {
      const stats = service.getDatabaseStats();

      expect(stats.tables).toBeGreaterThan(0);
      expect(stats.tableStats).toBeDefined();
      expect(stats.tableStats.user_settings).toBe(2);
      expect(stats.totalRows).toBeGreaterThanOrEqual(2);
    });

    it('should update after data changes', () => {
      const before = service.getDatabaseStats();

      db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('user3', 'User 3');

      const after = service.getDatabaseStats();

      expect(after.totalRows).toBe(before.totalRows + 1);
    });
  });

  describe('verifyEmpty()', () => {
    it('should return isEmpty=false when data exists', () => {
      const result = service.verifyEmpty();

      expect(result.isEmpty).toBe(false);
      expect(result.totalRows).toBeGreaterThan(0);
    });

    it('should return isEmpty=true after reset', () => {
      service.resetDatabase({ confirmReset: true });

      const result = service.verifyEmpty();

      expect(result.isEmpty).toBe(true);
      expect(result.totalRows).toBe(0);
      expect(result.message).toContain('empty');
    });
  });

  describe('checkResetSafety()', () => {
    it('should return safety status', () => {
      const result = service.checkResetSafety();

      expect(result.safe).toBe(true);
      expect(result.totalRows).toBeDefined();
    });

    it('should warn about significant data', () => {
      // Add many rows
      for (let i = 3; i <= 110; i++) {
        db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run(`user${i}`, `User ${i}`);
      }

      const result = service.checkResetSafety();

      expect(result.hasSignificantData).toBe(true);
      expect(result.warning).toContain('significant data');
    });
  });
});
