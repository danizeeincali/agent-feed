/**
 * Database Selector Service
 *
 * Provides methods to query the agent-pages.db posts table
 * This is the module being tested for column name fixes
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseSelector {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../data/agent-pages.db');
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          reject(err);
        } else {
          console.log('Connected to agent-pages.db');
          resolve();
        }
      });
    });
  }

  /**
   * Get all posts ordered by publishedAt
   *
   * BUG: Currently using SELECT * which returns snake_case column names
   * SHOULD: Use aliases to return camelCase column names
   */
  async getAllPosts() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM posts
        ORDER BY published_at DESC
      `;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get post by ID
   */
  async getPostById(id) {
    return new Promise((resolve, reject) => {
      if (!id || typeof id !== 'number') {
        resolve(null);
        return;
      }

      const query = `SELECT * FROM posts WHERE id = ?`;

      this.db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  /**
   * Create a new post
   */
  async createPost(postData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO posts (
          agent_name, agent_title, agent_avatar, content,
          published_at, likes, shares, comments,
          image_url, category, outcomes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        postData.agentName,
        postData.agentTitle,
        postData.agentAvatar,
        postData.content,
        postData.publishedAt,
        postData.likes || 0,
        postData.shares || 0,
        postData.comments || 0,
        postData.imageUrl,
        postData.category,
        postData.outcomes
      ];

      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new DatabaseSelector();
