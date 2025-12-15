/**
 * Integration Tests: Complete System Initialization Flow
 * AGENT 1: Infrastructure & Database
 * Tests end-to-end initialization process
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createFirstTimeSetupService } from '../../services/system-initialization/first-time-setup-service.js';
import { createSystemStateService } from '../../services/system-initialization/system-state-service.js';
import { createInitDatabaseService } from '../../services/database/init-database.service.js';
import { createResetDatabaseService } from '../../services/database/reset-database.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;
let setupService;
let stateService;
let initService;
let resetService;
const TEST_DB_PATH = path.join(__dirname, 'test-data', 'initialization-flow.db');

beforeAll(() => {
  const testDataDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  db = new Database(TEST_DB_PATH);

  // Create complete schema
  db.exec(`
    CREATE TABLE user_settings (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      onboarding_completed INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    ) STRICT;

    CREATE TABLE onboarding_state (
      user_id TEXT PRIMARY KEY,
      phase INTEGER DEFAULT 1,
      step TEXT,
      phase1_completed INTEGER DEFAULT 0,
      phase2_completed INTEGER DEFAULT 0
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

  // Create all service instances
  setupService = createFirstTimeSetupService(db);
  stateService = createSystemStateService(db);
  initService = createInitDatabaseService(db);
  resetService = createResetDatabaseService(db);
});

afterAll(() => {
  if (db) {
    db.close();
  }
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('System Initialization Flow - Integration Tests', () => {
  describe('Complete First-Time Setup Flow', () => {
    it('should detect system is not initialized', () => {
      const initStatus = setupService.isSystemInitialized();

      expect(initStatus.initialized).toBe(false);
      expect(initStatus.needsInitialization).toBe(true);
    });

    it('should initialize system successfully', () => {
      const result = setupService.initializeSystem('demo-user-123', 'Demo User');

      expect(result.success).toBe(true);
      expect(result.details.userCreated).toBe(true);
      expect(result.details.onboardingStateCreated).toBe(true);
      expect(result.details.initialBridgeCreated).toBe(true);
    });

    it('should verify initialization through state service', () => {
      const state = stateService.getSystemState();

      expect(state.database.tableCounts.user_settings).toBe(1);
      expect(state.database.tableCounts.onboarding_state).toBe(1);
      expect(state.database.tableCounts.hemingway_bridges).toBe(1);
    });

    it('should show system is ready', () => {
      const readiness = stateService.isSystemReady();

      expect(readiness.ready).toBe(true);
      expect(readiness.reason).toContain('ready');
    });

    it('should detect system is now initialized', () => {
      const initStatus = setupService.isSystemInitialized();

      expect(initStatus.initialized).toBe(true);
      expect(initStatus.needsInitialization).toBe(false);
      expect(initStatus.userCount).toBe(1);
    });
  });

  describe('Reset and Re-initialize Flow', () => {
    it('should reset database successfully', () => {
      const result = resetService.resetDatabase({ confirmReset: true });

      expect(result.success).toBe(true);
    });

    it('should verify database is empty', () => {
      const verification = resetService.verifyEmpty();

      expect(verification.isEmpty).toBe(true);
      expect(verification.totalRows).toBe(0);
    });

    it('should detect system needs initialization again', () => {
      const initStatus = setupService.isSystemInitialized();

      expect(initStatus.initialized).toBe(false);
      expect(initStatus.needsInitialization).toBe(true);
    });

    it('should re-initialize successfully', () => {
      const result = initService.initializeDatabase();

      expect(result.success).toBe(true);
      expect(result.verification.valid).toBe(true);
    });

    it('should verify system is ready again', () => {
      const readiness = stateService.isSystemReady();

      expect(readiness.ready).toBe(true);
    });
  });
});

describe('AC-9: Reset and Init Scripts Work Correctly', () => {
  it('AC-9 Test 1: Run reset -> assert tables cleared', () => {
    // Setup: Add some data
    db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('test-user', 'Test');

    // Reset
    const result = resetService.resetDatabase({ confirmReset: true });

    // Assert
    expect(result.success).toBe(true);

    const verification = resetService.verifyEmpty();
    expect(verification.isEmpty).toBe(true);
  });

  it('AC-9 Test 2: Run init -> assert default user created', () => {
    // Init
    const result = initService.initializeDatabase();

    // Assert
    expect(result.success).toBe(true);

    const user = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get('demo-user-123');
    expect(user).toBeDefined();
    expect(user.display_name).toBe('User');
  });

  it('AC-9 Test 3: Run init -> assert migrations applied (tables exist)', () => {
    const isInit = initService.isInitialized();

    expect(isInit.initialized).toBe(true);
    expect(isInit.missingTables).toEqual([]);
    expect(isInit.existingTables).toBe(4);
  });
});
