const dbConnection = require('../config/database');
const { getRow, getAllRows, executeQuery, parseMetadata, serializeMetadata } = require('../utils/db-utils');

class PageRepository {
  constructor() {
    this.db = dbConnection.getDb();
  }

  /**
   * Create pages table
   */
  createTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_pages (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'json'
          CHECK (content_type IN ('text', 'markdown', 'json', 'component')),
        content_value TEXT NOT NULL,
        content_metadata TEXT,
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft', 'published')),
        tags TEXT,
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        access_count INTEGER DEFAULT 0,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_agent_pages_agent_id ON agent_pages(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_pages_status ON agent_pages(status);
      CREATE INDEX IF NOT EXISTS idx_agent_pages_created_at ON agent_pages(created_at);

      CREATE TRIGGER IF NOT EXISTS trigger_agent_pages_updated_at
        AFTER UPDATE ON agent_pages
        BEGIN
          UPDATE agent_pages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

      CREATE TRIGGER IF NOT EXISTS trigger_agent_pages_version_increment
        BEFORE UPDATE ON agent_pages
        WHEN OLD.content_value != NEW.content_value
        BEGIN
          UPDATE agent_pages SET version = version + 1 WHERE id = NEW.id;
        END;
    `);
  }

  /**
   * Create new page
   */
  create(page) {
    const stmt = this.db.prepare(`
      INSERT INTO agent_pages (
        id, agent_id, title, content_type, content_value,
        content_metadata, status, tags, file_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      page.id,
      page.agent_id,
      page.title,
      page.content_type,
      page.content_value,
      serializeMetadata(page.content_metadata),
      page.status,
      serializeMetadata(page.tags),
      page.file_path
    );
  }

  /**
   * Find page by ID
   */
  findById(pageId) {
    const row = getRow(this.db, 'SELECT * FROM agent_pages WHERE id = ?', [pageId]);
    return row ? this.parseRow(row) : null;
  }

  /**
   * Find pages by agent ID
   */
  findByAgentId(agentId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      status,
      content_type,
      search
    } = options;

    let query = 'SELECT * FROM agent_pages WHERE agent_id = ?';
    const params = [agentId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (content_type) {
      query += ' AND content_type = ?';
      params.push(content_type);
    }

    if (search) {
      query += ' AND (title LIKE ? OR content_value LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const pages = getAllRows(this.db, query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM agent_pages WHERE agent_id = ?';
    const countParams = [agentId];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const { total } = getRow(this.db, countQuery, countParams);

    return {
      pages: pages.map(row => this.parseRow(row)),
      total: total || 0
    };
  }

  /**
   * Update page
   */
  update(pageId, updates) {
    const fields = [];
    const params = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }

    if (updates.content_type !== undefined) {
      fields.push('content_type = ?');
      params.push(updates.content_type);
    }

    if (updates.content_value !== undefined) {
      fields.push('content_value = ?');
      params.push(updates.content_value);
    }

    if (updates.content_metadata !== undefined) {
      fields.push('content_metadata = ?');
      params.push(serializeMetadata(updates.content_metadata));
    }

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }

    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      params.push(serializeMetadata(updates.tags));
    }

    if (fields.length === 0) {
      return;
    }

    params.push(pageId);

    const query = `
      UPDATE agent_pages
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    executeQuery(this.db, query, params);
  }

  /**
   * Delete page
   */
  delete(pageId) {
    executeQuery(this.db, 'DELETE FROM agent_pages WHERE id = ?', [pageId]);
  }

  /**
   * Increment access count
   */
  incrementAccessCount(pageId) {
    executeQuery(
      this.db,
      'UPDATE agent_pages SET access_count = access_count + 1 WHERE id = ?',
      [pageId]
    );
  }

  /**
   * Parse database row
   */
  parseRow(row) {
    return {
      ...row,
      content_metadata: parseMetadata(row.content_metadata),
      tags: parseMetadata(row.tags)
    };
  }
}

module.exports = new PageRepository();