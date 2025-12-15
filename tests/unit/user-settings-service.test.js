/**
 * Unit Tests for UserSettingsService
 * Tests the user settings service with real better-sqlite3 database
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { createUserSettingsService } from '../../api-server/services/user-settings-service.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('UserSettingsService', () => {
  let db;
  let service;
  const TEST_USER_ID = 'test-user-123';

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Run migration
    const migrationPath = join(__dirname, '../../api-server/db/migrations/010-user-settings.sql');
    const migration = readFileSync(migrationPath, 'utf-8');
    db.exec(migration);

    // Create service instance
    service = createUserSettingsService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('getUserSettings', () => {
    it('should return null for non-existent user', () => {
      const settings = service.getUserSettings('non-existent-user');
      expect(settings).toBeNull();
    });

    it('should return default settings for demo user', () => {
      const settings = service.getUserSettings('demo-user-123');
      expect(settings).not.toBeNull();
      expect(settings.user_id).toBe('demo-user-123');
      expect(settings.display_name).toBeNull();
      expect(settings.profile_data).toEqual({});
      expect(settings.preferences).toEqual({});
    });
  });

  describe('updateUserSettings', () => {
    it('should update display_name', () => {
      const result = service.updateUserSettings(TEST_USER_ID, {
        display_name: 'John Doe'
      });

      expect(result.display_name).toBe('John Doe');
      expect(result.user_id).toBe(TEST_USER_ID);
    });

    it('should update username', () => {
      const result = service.updateUserSettings(TEST_USER_ID, {
        username: 'johndoe'
      });

      expect(result.username).toBe('johndoe');
    });

    it('should update profile_data', () => {
      const profileData = {
        preferred_name: 'John',
        personal_context: {
          primary_focus: 'business'
        }
      };

      const result = service.updateUserSettings(TEST_USER_ID, {
        profile_data: profileData
      });

      expect(result.profile_data).toEqual(profileData);
    });

    it('should update preferences', () => {
      const preferences = {
        theme: 'dark',
        notifications: true
      };

      const result = service.updateUserSettings(TEST_USER_ID, {
        preferences
      });

      expect(result.preferences).toEqual(preferences);
    });

    it('should create new user if not exists', () => {
      const newUserId = 'new-user-456';
      const result = service.updateUserSettings(newUserId, {
        display_name: 'New User'
      });

      expect(result.user_id).toBe(newUserId);
      expect(result.display_name).toBe('New User');
    });
  });

  describe('getDisplayName', () => {
    it('should return null for user without display_name', () => {
      const displayName = service.getDisplayName('demo-user-123');
      expect(displayName).toBeNull();
    });

    it('should return display_name after setting', () => {
      service.updateUserSettings(TEST_USER_ID, {
        display_name: 'Test User'
      });

      const displayName = service.getDisplayName(TEST_USER_ID);
      expect(displayName).toBe('Test User');
    });
  });

  describe('setDisplayName', () => {
    it('should set display_name', () => {
      const result = service.setDisplayName(TEST_USER_ID, 'Jane Smith');
      expect(result.display_name).toBe('Jane Smith');
    });
  });

  describe('updateProfile', () => {
    it('should extract display_name from profile', () => {
      const profileData = {
        display_name: 'Profile Name',
        preferred_name: 'Preferred',
        personal_context: {
          primary_focus: 'creative'
        }
      };

      const result = service.updateProfile(TEST_USER_ID, profileData);
      expect(result.display_name).toBe('Profile Name');
      expect(result.profile_data).toEqual(profileData);
    });

    it('should use preferred_name if display_name not present', () => {
      const profileData = {
        preferred_name: 'Preferred',
        personal_context: {
          primary_focus: 'personal'
        }
      };

      const result = service.updateProfile(TEST_USER_ID, profileData);
      expect(result.display_name).toBe('Preferred');
    });

    it('should use name if neither display_name nor preferred_name present', () => {
      const profileData = {
        name: 'User Name',
        personal_context: {
          primary_focus: 'mixed'
        }
      };

      const result = service.updateProfile(TEST_USER_ID, profileData);
      expect(result.display_name).toBe('User Name');
    });
  });

  describe('clearUserSettings', () => {
    it('should delete user settings', () => {
      service.updateUserSettings(TEST_USER_ID, {
        display_name: 'To Be Deleted'
      });

      service.clearUserSettings(TEST_USER_ID);

      const settings = service.getUserSettings(TEST_USER_ID);
      expect(settings).toBeNull();
    });
  });

  describe('Database Integration', () => {
    it('should persist settings across service instances', () => {
      // First service instance
      service.updateUserSettings(TEST_USER_ID, {
        display_name: 'Persistent User',
        username: 'persistent123'
      });

      // Create new service instance
      const newService = createUserSettingsService(db);
      const settings = newService.getUserSettings(TEST_USER_ID);

      expect(settings.display_name).toBe('Persistent User');
      expect(settings.username).toBe('persistent123');
    });

    it('should handle concurrent updates', () => {
      service.updateUserSettings(TEST_USER_ID, { display_name: 'Update 1' });
      service.updateUserSettings(TEST_USER_ID, { username: 'update2' });
      service.updateUserSettings(TEST_USER_ID, { display_name: 'Final Update' });

      const settings = service.getUserSettings(TEST_USER_ID);
      expect(settings.display_name).toBe('Final Update');
      expect(settings.username).toBe('update2');
    });
  });
});
