/**
 * PostgreSQL Workspace Repository
 * Handles agent pages/files stored in agent_workspaces table
 * Maps to Phase 2 PostgreSQL schema
 */

import postgresManager from '../../config/postgres.js';

class WorkspaceRepository {
  /**
   * Get all pages for an agent
   * @param {string} agentName - Agent name
   * @param {string} userId - User ID (default: 'anonymous')
   * @returns {Promise<Array>} List of pages
   */
  async getPagesByAgent(agentName, userId = 'anonymous') {
    const query = `
      SELECT
        id,
        agent_name,
        file_path,
        content,
        metadata,
        created_at,
        updated_at
      FROM agent_workspaces
      WHERE user_id = $1 AND agent_name = $2
      ORDER BY updated_at DESC
    `;

    const result = await postgresManager.query(query, [userId, agentName]);

    return result.rows.map(row => ({
      id: row.metadata.original_id || row.id,
      agent_id: row.agent_name,
      title: row.metadata.title || this.extractTitleFromPath(row.file_path),
      content_type: row.metadata.content_type || 'text',
      content_value: row.content.toString('utf-8'),
      status: row.metadata.status || 'published',
      tags: row.metadata.tags || [],
      file_path: row.file_path,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }

  /**
   * Get a single page by ID
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Page or null
   */
  async getPageById(pageId, userId = 'anonymous') {
    const query = `
      SELECT
        id,
        agent_name,
        file_path,
        content,
        metadata,
        created_at,
        updated_at
      FROM agent_workspaces
      WHERE user_id = $1 AND (id::text = $2 OR metadata->>'original_id' = $2)
      LIMIT 1
    `;

    const result = await postgresManager.query(query, [userId, pageId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.metadata.original_id || row.id,
      agent_id: row.agent_name,
      title: row.metadata.title || this.extractTitleFromPath(row.file_path),
      content_type: row.metadata.content_type || 'text',
      content_value: row.content.toString('utf-8'),
      status: row.metadata.status || 'published',
      tags: row.metadata.tags || [],
      file_path: row.file_path,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Create or update a page
   * @param {string} userId - User ID
   * @param {object} pageData - Page data
   * @returns {Promise<object>} Created/updated page
   */
  async upsertPage(userId, pageData) {
    const filePath = pageData.file_path || this.generateFilePath(pageData.title, pageData.content_type);
    const content = Buffer.from(pageData.content_value, 'utf-8');

    const query = `
      INSERT INTO agent_workspaces
        (user_id, agent_name, file_path, content, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (user_id, agent_name, file_path)
      DO UPDATE SET
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `;

    const metadata = {
      content_type: pageData.content_type || 'text',
      status: pageData.status || 'published',
      tags: pageData.tags || [],
      title: pageData.title,
      original_id: pageData.id
    };

    const result = await postgresManager.query(query, [
      userId,
      pageData.agent_id || pageData.agent_name,
      filePath,
      content,
      JSON.stringify(metadata)
    ]);

    const row = result.rows[0];
    return {
      id: row.metadata.original_id || row.id,
      agent_id: row.agent_name,
      title: row.metadata.title,
      content_type: row.metadata.content_type,
      content_value: row.content.toString('utf-8'),
      status: row.metadata.status,
      tags: row.metadata.tags,
      file_path: row.file_path,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Delete a page
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deletePage(pageId, userId = 'anonymous') {
    const query = `
      DELETE FROM agent_workspaces
      WHERE user_id = $1 AND (id::text = $2 OR metadata->>'original_id' = $2)
    `;

    const result = await postgresManager.query(query, [userId, pageId]);
    return result.rowCount > 0;
  }

  /**
   * Search pages by content or title
   * @param {string} searchTerm - Search term
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of matching pages
   */
  async searchPages(searchTerm, userId = 'anonymous') {
    const query = `
      SELECT
        id,
        agent_name,
        file_path,
        content,
        metadata,
        created_at,
        updated_at
      FROM agent_workspaces
      WHERE user_id = $1
        AND (
          metadata->>'title' ILIKE $2
          OR convert_from(content, 'UTF8') ILIKE $2
        )
      ORDER BY updated_at DESC
      LIMIT 50
    `;

    const result = await postgresManager.query(query, [userId, `%${searchTerm}%`]);

    return result.rows.map(row => ({
      id: row.metadata.original_id || row.id,
      agent_id: row.agent_name,
      title: row.metadata.title || this.extractTitleFromPath(row.file_path),
      content_type: row.metadata.content_type || 'text',
      content_value: row.content.toString('utf-8'),
      status: row.metadata.status || 'published',
      tags: row.metadata.tags || [],
      file_path: row.file_path,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }

  /**
   * Get all pages (with pagination)
   * @param {string} userId - User ID
   * @param {object} options - Query options
   * @returns {Promise<Array>} List of pages
   */
  async getAllPages(userId = 'anonymous', options = {}) {
    const { limit = 100, offset = 0, status = 'published' } = options;

    const query = `
      SELECT
        id,
        agent_name,
        file_path,
        content,
        metadata,
        created_at,
        updated_at
      FROM agent_workspaces
      WHERE user_id = $1 AND metadata->>'status' = $2
      ORDER BY updated_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await postgresManager.query(query, [userId, status, limit, offset]);

    return result.rows.map(row => ({
      id: row.metadata.original_id || row.id,
      agent_id: row.agent_name,
      title: row.metadata.title || this.extractTitleFromPath(row.file_path),
      content_type: row.metadata.content_type || 'text',
      content_value: row.content.toString('utf-8'),
      status: row.metadata.status || 'published',
      tags: row.metadata.tags || [],
      file_path: row.file_path,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }

  /**
   * Generate file path from title and content type
   * @param {string} title - Page title
   * @param {string} contentType - Content type
   * @returns {string} File path
   */
  generateFilePath(title, contentType) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const extension = this.getFileExtension(contentType);
    return `/pages/${slug}.${extension}`;
  }

  /**
   * Get file extension for content type
   * @param {string} contentType - Content type
   * @returns {string} File extension
   */
  getFileExtension(contentType) {
    const map = {
      'text': 'txt',
      'markdown': 'md',
      'json': 'json',
      'component': 'jsx'
    };
    return map[contentType] || 'txt';
  }

  /**
   * Extract title from file path
   * @param {string} filePath - File path
   * @returns {string} Title
   */
  extractTitleFromPath(filePath) {
    const filename = filePath.split('/').pop().split('.')[0];
    return filename.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

export default new WorkspaceRepository();
