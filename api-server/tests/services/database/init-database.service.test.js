/**
 * Unit Tests: Initialize Database Service
 * AGENT 1: Infrastructure & Database
 * Tests for database initialization operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInitDatabaseService } from '../../../services/database/init-database.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;
let service;
const TEST_DB_PATH = path.join(__dirname, 'test-data', 'init-database.db');

beforeAll(() => {
  const testDataDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  db = new Database(TEST_DB_PATH);

  // Create required tables (simulating migrations already run)
  db.exec(`
    CREATE TABLE user_settings (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL
    ) STRICT;

    CREATE TABLE onboarding_state (
      user_id TEXT PRIMARY KEY,
      phase INTEGER DEFAULT 1,
      step TEXT
    ) STRICT;

    CREATE TABLE hemingway_bridges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bridge_type TEXT NOT NULL,
      content TEXT NOT NULL,
      priority INTEGER NOT NULL,
      active INTEGER DEFAULT 1
    ) STRICT;

    CREATE TABLE agent_introductions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL
    ) STRICT;
  `);

  service = createInitDatabaseService(db);
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
  db.exec(`
    DELETE FROM user_settings;
    DELETE FROM onboarding_state;
    DELETE FROM hemingway_bridges;
    DELETE FROM agent_introductions;
  `);
});

describe('Initialize Database Service - Unit Tests', () => {
  describe('createDefaultUser()', () => {
    it('should create user with default values', () => {
      const result = service.createDefaultUser();

      expect(result.success).toBe(true);
      expect(result.userId).toBe('demo-user-123');
      expect(result.displayName).toBe('User');

      // Verify in database
      const user = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get('demo-user-123');
      expect(user).toBeDefined();
      expect(user.display_name).toBe('User');
    });

    it('should create user with custom values', () => {
      const result = service.createDefaultUser('custom-user', 'Custom Name');

      expect(result.userId).toBe('custom-user');
      expect(result.displayName).toBe('Custom Name');
    });

    it('should create onboarding state', () => {
      service.createDefaultUser('demo-user-123');

      const onboarding = db.prepare('SELECT * FROM onboarding_state WHERE user_id = ?').get('demo-user-123');
      expect(onboarding).toBeDefined();
      expect(onboarding.phase).toBe(1);
      expect(onboarding.step).toBe('name');
    });

    it('should create initial Hemingway bridge', () => {
      service.createDefaultUser('demo-user-123');

      const bridge = db.prepare('SELECT * FROM hemingway_bridges WHERE user_id = ?').get('demo-user-123');
      expect(bridge).toBeDefined();
      expect(bridge.bridge_type).toBe('question');
      expect(bridge.active).toBe(1);
      expect(bridge.content).toContain('Welcome');
    });

    it('should be idempotent', () => {
      service.createDefaultUser('demo-user-123');
      const result = service.createDefaultUser('demo-user-123'); // Run again

      // Should not fail, and only one user should exist
      const count = db.prepare('SELECT COUNT(*) as count FROM user_settings WHERE user_id = ?').get('demo-user-123');
      expect(count.count).toBe(1);
    });
  });

  describe('verifyInitialization()', () => {
    it('should return invalid when user not initialized', () => {
      const result = service.verifyInitialization('nonexistent-user');

      expect(result.valid).toBe(false);
    });

    it('should return valid when fully initialized', () => {
      service.createDefaultUser('demo-user-123');

      const result = service.verifyInitialization('demo-user-123');

      expect(result.valid).toBe(true);
      expect(result.checks.userSettingsExists).toBe(true);
      expect(result.checks.onboardingStateExists).toBe(true);
      expect(result.checks.initialBridgeExists).toBe(true);
      expect(result.message).toContain('verified successfully');
    });

    it('should detect missing components', () => {
      // Create user but not other components
      db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('incomplete-user', 'User');

      const result = service.verifyInitialization('incomplete-user');

      expect(result.valid).toBe(false);
      expect(result.checks.onboardingStateExists).toBe(false);
      expect(result.checks.initialBridgeExists).toBe(false);
    });
  });

  describe('isInitialized()', () => {
    it('should return false when tables are missing', () => {
      // Drop a table
      db.exec('DROP TABLE agent_introductions');

      const result = service.isInitialized();

      expect(result.initialized).toBe(false);
      expect(result.missingTables).toContain('agent_introductions');
    });

    it('should return true when all tables exist', () => {
      const result = service.isInitialized();

      expect(result.initialized).toBe(true);
      expect(result.missingTables).toEqual([]);
      expect(result.existingTables).toBe(4);
    });
  });

  describe('getSchemaInfo()', () => {
    it('should return schema information', () => {
      const schema = service.getSchemaInfo();

      expect(schema.tables).toBeDefined();
      expect(schema.totalTables).toBeGreaterThan(0);
      expect(schema.totalIndexes).toBeGreaterThanOrEqual(0);
    });

    it('should include table schemas', () => {
      const schema = service.getSchemaInfo();

      const userSettings = schema.tables.find(t => t.name === 'user_settings');
      expect(userSettings).toBeDefined();
      expect(userSettings.schema).toContain('CREATE TABLE');
    });
  });

  describe('initializeDatabase()', () => {
    it('should initialize complete database', () => {
      const result = service.initializeDatabase();

      expect(result.success).toBe(true);
      expect(result.userResult).toBeDefined();
      expect(result.verification).toBeDefined();
      expect(result.verification.valid).toBe(true);
    });

    it('should accept custom options', () => {
      const result = service.initializeDatabase({
        userId: 'custom-user',
        displayName: 'Custom User'
      });

      expect(result.success).toBe(true);
      expect(result.userResult.userId).toBe('custom-user');

      // Verify in database
      const user = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get('custom-user');
      expect(user.display_name).toBe('Custom User');
    });
  });
});
