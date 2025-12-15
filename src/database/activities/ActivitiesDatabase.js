/**
 * Activities Database Operations
 * Real database operations with zero mock data
 * Implements activity logging and retrieval for agent feed
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';
import { getDatabasePath } from './config.js';
import path from 'path';
import fs from 'fs';

/**
 * Generate UUID v4 using crypto module (Node.js built-in)
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default class ActivitiesDatabase {
  constructor() {
    this.dbPath = getDatabasePath();
    this.db = null;
    this.init();
  }

  /**
   * Initialize database connection and schema
   */
  init() {
    try {
      // Ensure directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new Database(this.dbPath);

      // Create activities table if not exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS activities (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          metadata TEXT DEFAULT '{}',
          actor TEXT NOT NULL,
          target_type TEXT,
          target_id TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_activities_actor ON activities(actor);
        CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
      `);

    } catch (error) {
      console.error('Failed to initialize Activities database:', error);
      throw error;
    }
  }

  /**
   * Create new activity in database
   * @param {Object} activityData - Activity data
   * @returns {string} Activity ID
   */
  async createActivity(activityData) {
    const {
      type,
      title,
      description = '',
      actor,
      target_type = null,
      target_id = null,
      metadata = '{}'
    } = activityData;

    if (!type || !title || !actor) {
      throw new Error('Missing required fields: type, title, actor');
    }

    const activityId = generateUUID();
    const timestamp = new Date().toISOString();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO activities (
          id, type, title, description, actor,
          target_type, target_id, metadata, timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        activityId,
        type,
        title,
        description,
        actor,
        target_type,
        target_id,
        typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
        timestamp,
        timestamp
      );

      return activityId;
    } catch (error) {
      console.error('Failed to create activity:', error);
      throw error;
    }
  }

  /**
   * Get activities with pagination
   * @param {Object} options - Query options
   * @returns {Object} Activities with pagination
   */
  async getActivities(options = {}) {
    const {
      page = 1,
      limit = 20,
      type = null,
      actor = null
    } = options;

    const offset = (page - 1) * limit;

    try {
      // Build query conditions
      let whereClause = '';
      const params = [];

      if (type) {
        whereClause += 'WHERE type = ?';
        params.push(type);
      }

      if (actor) {
        whereClause += whereClause ? ' AND actor = ?' : 'WHERE actor = ?';
        params.push(actor);
      }

      // Get total count
      const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM activities ${whereClause}`);
      const { total } = countStmt.get(...params);

      // Return empty result if no activities
      if (total === 0) {
        return {
          activities: [],
          pagination: {
            total: 0,
            page: page,
            limit: limit,
            pages: 0
          }
        };
      }

      // Get paginated activities
      const stmt = this.db.prepare(`
        SELECT * FROM activities
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `);

      const activities = stmt.all(...params, limit, offset);

      // Parse metadata for each activity
      const processedActivities = activities.map(activity => ({
        ...activity,
        metadata: this.parseMetadata(activity.metadata)
      }));

      return {
        activities: processedActivities,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Failed to get activities:', error);
      throw error;
    }
  }

  /**
   * Get activities by type
   * @param {string} type - Activity type
   * @returns {Array} Activities
   */
  async getActivitiesByType(type) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM activities
        WHERE type = ?
        ORDER BY timestamp DESC
      `);

      const activities = stmt.all(type);

      return activities.map(activity => ({
        ...activity,
        metadata: this.parseMetadata(activity.metadata)
      }));
    } catch (error) {
      console.error('Failed to get activities by type:', error);
      throw error;
    }
  }

  /**
   * Get activities by actor
   * @param {string} actor - Activity actor
   * @returns {Array} Activities
   */
  async getActivitiesByActor(actor) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM activities
        WHERE actor = ?
        ORDER BY timestamp DESC
      `);

      const activities = stmt.all(actor);

      return activities.map(activity => ({
        ...activity,
        metadata: this.parseMetadata(activity.metadata)
      }));
    } catch (error) {
      console.error('Failed to get activities by actor:', error);
      throw error;
    }
  }

  /**
   * Get activity formatted for WebSocket broadcasting
   * @param {string} activityId - Activity ID
   * @returns {Object} Activity data for broadcasting
   */
  async getActivityForBroadcast(activityId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM activities WHERE id = ?
      `);

      const activity = stmt.get(activityId);

      if (!activity) {
        throw new Error(`Activity not found: ${activityId}`);
      }

      return {
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        actor: activity.actor,
        target_type: activity.target_type,
        target_id: activity.target_id,
        metadata: this.parseMetadata(activity.metadata),
        timestamp: activity.timestamp,
        created_at: activity.created_at
      };
    } catch (error) {
      console.error('Failed to get activity for broadcast:', error);
      throw error;
    }
  }

  /**
   * Parse metadata JSON string safely
   * @param {string} metadataStr - JSON string
   * @returns {Object} Parsed metadata
   */
  parseMetadata(metadataStr) {
    try {
      return JSON.parse(metadataStr || '{}');
    } catch (error) {
      console.warn('Failed to parse activity metadata:', error);
      return {};
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}