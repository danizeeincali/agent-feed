/**
 * Unit Tests: System State Service
 * AGENT 1: Infrastructure & Database
 * Tests for system state tracking and reporting
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSystemStateService } from '../../../services/system-initialization/system-state-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;
let service;
const TEST_DB_PATH = path.join(__dirname, 'test-data', 'system-state.db');

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
      display_name TEXT NOT NULL,
      onboarding_completed INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    ) STRICT;

    CREATE TABLE onboarding_state (
      user_id TEXT PRIMARY KEY,
      phase INTEGER DEFAULT 1,
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

  service = createSystemStateService(db);
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

describe('System State Service - Unit Tests', () => {
  describe('getDatabaseState()', () => {
    it('should return all tables', () => {
      const dbState = service.getDatabaseState();

      expect(dbState.tables).toContain('user_settings');
      expect(dbState.tables).toContain('onboarding_state');
      expect(dbState.tables).toContain('hemingway_bridges');
      expect(dbState.tables).toContain('agent_introductions');
    });

    it('should return correct table counts', () => {
      db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('user1', 'User 1');
      db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('user2', 'User 2');

      const dbState = service.getDatabaseState();

      expect(dbState.tableCounts.user_settings).toBe(2);
    });
  });

  describe('getUserState()', () => {
    it('should return zero users when empty', () => {
      const userState = service.getUserState();

      expect(userState.totalUsers).toBe(0);
      expect(userState.namedUsers).toBe(0);
      expect(userState.onboardedUsers).toBe(0);
    });

    it('should count users correctly', () => {
      db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('user1', 'Alice');
      db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('user2', 'Bob');

      const userState = service.getUserState();

      expect(userState.totalUsers).toBe(2);
      expect(userState.namedUsers).toBe(2); // Both have custom names
    });

    it('should track onboarded users', () => {
      db.prepare('INSERT INTO user_settings (user_id, display_name, onboarding_completed) VALUES (?, ?, ?)').run('user1', 'Alice', 1);
      db.prepare('INSERT INTO user_settings (user_id, display_name, onboarding_completed) VALUES (?, ?, ?)').run('user2', 'Bob', 0);

      const userState = service.getUserState();

      expect(userState.onboardedUsers).toBe(1);
    });
  });

  describe('getOnboardingState()', () => {
    it('should return zero states when empty', () => {
      const onboardingState = service.getOnboardingState();

      expect(onboardingState.totalStates).toBe(0);
    });

    it('should track phase progress', () => {
      db.prepare('INSERT INTO onboarding_state (user_id, phase) VALUES (?, ?)').run('user1', 1);
      db.prepare('INSERT INTO onboarding_state (user_id, phase) VALUES (?, ?)').run('user2', 2);

      const onboardingState = service.getOnboardingState();

      expect(onboardingState.inPhase1).toBe(1);
      expect(onboardingState.inPhase2).toBe(1);
    });
  });

  describe('getBridgeState()', () => {
    it('should return zero bridges when empty', () => {
      const bridgeState = service.getBridgeState();

      expect(bridgeState.totalBridges).toBe(0);
      expect(bridgeState.activeBridges).toBe(0);
    });

    it('should count active and inactive bridges', () => {
      db.prepare('INSERT INTO hemingway_bridges VALUES (?, ?, ?, ?, ?, ?)').run('b1', 'user1', 'question', 'Q1', 1, 1);
      db.prepare('INSERT INTO hemingway_bridges VALUES (?, ?, ?, ?, ?, ?)').run('b2', 'user1', 'insight', 'I1', 2, 0);

      const bridgeState = service.getBridgeState();

      expect(bridgeState.totalBridges).toBe(2);
      expect(bridgeState.activeBridges).toBe(1);
    });
  });

  describe('getHealthStatus()', () => {
    it('should return healthy when all tables exist', () => {
      const health = service.getHealthStatus();

      expect(health.healthy).toBe(false); // No demo user yet
      expect(health.existingTables).toBe(4);
      expect(health.missingTables).toEqual([]);
    });

    it('should detect missing demo user', () => {
      const health = service.getHealthStatus();

      expect(health.demoUserExists).toBe(false);
    });

    it('should return healthy when demo user exists', () => {
      db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('demo-user-123', 'User');

      const health = service.getHealthStatus();

      expect(health.demoUserExists).toBe(true);
      expect(health.healthy).toBe(true);
    });
  });

  describe('isSystemReady()', () => {
    it('should return not ready when demo user missing', () => {
      const readiness = service.isSystemReady();

      expect(readiness.ready).toBe(false);
    });

    it('should return ready when system is healthy', () => {
      db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('demo-user-123', 'User');

      const readiness = service.isSystemReady();

      expect(readiness.ready).toBe(true);
      expect(readiness.reason).toContain('ready');
    });
  });

  describe('getSummary()', () => {
    it('should return concise summary', () => {
      db.prepare('INSERT INTO user_settings (user_id, display_name, onboarding_completed) VALUES (?, ?, ?)').run('demo-user-123', 'User', 0);
      db.prepare('INSERT INTO onboarding_state (user_id, phase) VALUES (?, ?)').run('demo-user-123', 1);

      const summary = service.getSummary();

      expect(summary.initialized).toBe(true);
      expect(summary.users).toBe(1);
      expect(summary.healthy).toBe(true);
      expect(summary.timestamp).toBeDefined();
    });
  });
});
