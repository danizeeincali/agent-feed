/**
 * Page Service (SQLite)
 * Business logic layer for agent pages using SQLite
 * Handles validation, error handling, and transaction management
 */

import PageRepository from '../repositories/page.repository.js';
import { randomUUID } from 'crypto';

class PageService {
  constructor(db) {
    this.repository = new PageRepository(db);
    this.db = db;
  }

  /**
   * Create a new page
   * @param {Object} pageData - Page data
   * @returns {Object} Created page
   * @throws {Error} Validation or database errors
   */
  createPage(pageData) {
    try {
      // Validate input
      this.validatePageData(pageData);

      // Generate ID if not provided
      const id = pageData.id || randomUUID();

      // Prepare page object
      const page = {
        id,
        agent_id: pageData.agent_id,
        title: pageData.title,
        content_type: pageData.content_type || 'text',
        content_value: pageData.content_value,
        content_metadata: pageData.content_metadata ? JSON.stringify(pageData.content_metadata) : null,
        status: pageData.status || 'draft',
        tags: pageData.tags ? JSON.stringify(pageData.tags) : null,
        version: 1
      };

      // Check if page already exists
      if (this.repository.exists(id)) {
        throw new Error(`Page with ID ${id} already exists`);
      }

      // Create page in transaction
      return this.db.transaction(() => {
        return this.repository.create(page);
      })();
    } catch (error) {
      throw new Error(`Failed to create page: ${error.message}`);
    }
  }

  /**
   * Get page by ID
   * @param {string} id - Page ID
   * @returns {Object|null} Page object or null
   */
  getPageById(id) {
    try {
      if (!id) {
        throw new Error('Page ID is required');
      }

      const page = this.repository.findById(id);

      if (!page) {
        return null;
      }

      // Parse JSON fields
      return this.parsePage(page);
    } catch (error) {
      throw new Error(`Failed to get page: ${error.message}`);
    }
  }

  /**
   * Get all pages with filters
   * @param {Object} filters - Query filters
   * @param {string} [filters.agent_id] - Filter by agent
   * @param {string} [filters.status] - Filter by status
   * @param {number} [filters.page=1] - Page number (1-indexed)
   * @param {number} [filters.limit=10] - Results per page
   * @returns {Object} Paginated results
   */
  getAllPages(filters = {}) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      // Get pages
      const pages = this.repository.findAll({
        agent_id: filters.agent_id,
        status: filters.status,
        limit,
        offset
      });

      // Get total count
      const total = filters.agent_id
        ? this.repository.countByAgent(filters.agent_id)
        : this.repository.count();

      // Parse JSON fields
      const parsedPages = pages.map(p => this.parsePage(p));

      return {
        data: parsedPages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get pages: ${error.message}`);
    }
  }

  /**
   * Update page
   * @param {string} id - Page ID
   * @param {Object} updateData - Update data
   * @returns {Object|null} Updated page or null if not found
   */
  updatePage(id, updateData) {
    try {
      if (!id) {
        throw new Error('Page ID is required');
      }

      // Validate update data
      if (updateData.content_type) {
        this.validateContentType(updateData.content_type);
      }

      if (updateData.status) {
        this.validateStatus(updateData.status);
      }

      // Prepare update object
      const update = { ...updateData };

      // Stringify JSON fields
      if (update.content_metadata !== undefined && typeof update.content_metadata === 'object') {
        update.content_metadata = JSON.stringify(update.content_metadata);
      }

      if (update.tags !== undefined && Array.isArray(update.tags)) {
        update.tags = JSON.stringify(update.tags);
      }

      // Update in transaction
      const updated = this.db.transaction(() => {
        return this.repository.update(id, update);
      })();

      if (!updated) {
        return null;
      }

      return this.parsePage(updated);
    } catch (error) {
      throw new Error(`Failed to update page: ${error.message}`);
    }
  }

  /**
   * Delete page
   * @param {string} id - Page ID
   * @returns {boolean} True if deleted, false if not found
   */
  deletePage(id) {
    try {
      if (!id) {
        throw new Error('Page ID is required');
      }

      return this.db.transaction(() => {
        return this.repository.delete(id);
      })();
    } catch (error) {
      throw new Error(`Failed to delete page: ${error.message}`);
    }
  }

  /**
   * Search pages by title
   * @param {string} query - Search query
   * @returns {Array} Matching pages
   */
  searchPages(query) {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      const pages = this.repository.searchByTitle(query.trim());
      return pages.map(p => this.parsePage(p));
    } catch (error) {
      throw new Error(`Failed to search pages: ${error.message}`);
    }
  }

  /**
   * Get pages by agent
   * @param {string} agent_id - Agent ID
   * @returns {Array} Agent's pages
   */
  getPagesByAgent(agent_id) {
    try {
      if (!agent_id) {
        throw new Error('Agent ID is required');
      }

      const pages = this.repository.findByAgentId(agent_id);
      return pages.map(p => this.parsePage(p));
    } catch (error) {
      throw new Error(`Failed to get agent pages: ${error.message}`);
    }
  }

  /**
   * Validate page data
   * @param {Object} data - Page data
   * @throws {Error} Validation error
   */
  validatePageData(data) {
    if (!data.agent_id) {
      throw new Error('agent_id is required');
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new Error('title is required and cannot be empty');
    }

    if (!data.content_value || data.content_value.trim().length === 0) {
      throw new Error('content_value is required and cannot be empty');
    }

    if (data.content_type) {
      this.validateContentType(data.content_type);
    }

    if (data.status) {
      this.validateStatus(data.status);
    }

    // Validate title length
    if (data.title.length > 255) {
      throw new Error('title must be 255 characters or less');
    }
  }

  /**
   * Validate content type
   * @param {string} content_type - Content type
   * @throws {Error} Validation error
   */
  validateContentType(content_type) {
    const validTypes = ['text', 'markdown', 'json', 'component'];
    if (!validTypes.includes(content_type)) {
      throw new Error(`Invalid content_type: ${content_type}. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Validate status
   * @param {string} status - Status
   * @throws {Error} Validation error
   */
  validateStatus(status) {
    const validStatuses = ['draft', 'published'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  /**
   * Parse JSON fields in page object
   * @param {Object} page - Raw page from database
   * @returns {Object} Parsed page
   */
  parsePage(page) {
    if (!page) return null;

    const parsed = { ...page };

    // Parse JSON fields
    try {
      if (parsed.content_metadata) {
        parsed.content_metadata = JSON.parse(parsed.content_metadata);
      }
    } catch (e) {
      console.error('Failed to parse content_metadata:', e);
      parsed.content_metadata = null;
    }

    try {
      if (parsed.tags) {
        parsed.tags = JSON.parse(parsed.tags);
      }
    } catch (e) {
      console.error('Failed to parse tags:', e);
      parsed.tags = null;
    }

    return parsed;
  }

  /**
   * Get statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    try {
      const total = this.repository.count();
      const published = this.repository.findByStatus('published').length;
      const draft = this.repository.findByStatus('draft').length;

      return {
        total,
        published,
        draft
      };
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }
}

export default PageService;