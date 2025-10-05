/**
 * Agent Pages API Routes
 * Database-backed routes for managing agent pages
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

let db = null;

/**
 * Initialize routes with database connection
 * @param {Database} database - Better-sqlite3 database instance
 */
export function initializeAgentPagesRoutes(database) {
  db = database;
  console.log('✅ Agent Pages routes initialized with database');
  return router;
}

/**
 * Transform page data for frontend consumption
 *
 * Handles both new database format (content_value) and legacy format (specification)
 * Extracts layout and components from JSON content
 *
 * @param {Object} page - Raw page object from database
 * @returns {Object} Transformed page object with layout/components at top level
 */
function transformPageForFrontend(page) {
  if (!page) {
    return page;
  }

  // Clone page to avoid mutation
  const transformedPage = { ...page };

  // Only process JSON content types
  if (page.content_type !== 'json' && page.content_type !== 'component') {
    return transformedPage;
  }

  // Try to parse content_value (new format)
  if (page.content_value) {
    try {
      const parsedContent = JSON.parse(page.content_value);

      // Extract layout and components if they exist
      if (parsedContent.layout !== undefined) {
        transformedPage.layout = parsedContent.layout;
      }

      if (parsedContent.responsive !== undefined) {
        transformedPage.responsive = parsedContent.responsive;
      }

      if (parsedContent.components !== undefined) {
        transformedPage.components = parsedContent.components;
      }

      // Merge any other top-level properties from parsed content
      // This maintains backward compatibility with pages that store additional metadata
      Object.keys(parsedContent).forEach(key => {
        if (!['layout', 'components', 'responsive'].includes(key)) {
          // Only add if not already present (page fields take precedence)
          if (transformedPage[key] === undefined) {
            transformedPage[key] = parsedContent[key];
          }
        }
      });

    } catch (error) {
      // If JSON parsing fails, leave content_value as-is
      // This handles invalid JSON gracefully
      console.warn(`⚠️ Failed to parse content_value for page ${page.id}: ${error.message}`);
    }
  }

  return transformedPage;
}

/**
 * Helper function to ensure agent exists (auto-create if needed)
 * @param {string} agentId - Agent ID
 * @returns {boolean} True if agent exists or was created
 */
function ensureAgentExists(agentId) {
  try {
    // Check if agent exists
    const existingAgent = db.prepare(
      'SELECT id FROM agents WHERE id = ?'
    ).get(agentId);

    if (existingAgent) {
      return true;
    }

    // Auto-create agent if it doesn't exist
    const agentName = agentId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    db.prepare(`
      INSERT INTO agents (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      agentId,
      agentName,
      `Auto-created agent for ${agentId}`,
      new Date().toISOString(),
      new Date().toISOString()
    );

    console.log(`✅ Auto-created agent: ${agentId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error ensuring agent exists: ${error.message}`);
    return false;
  }
}

/**
 * GET /api/agent-pages/agents/:agentId/pages
 * List all pages for an agent with pagination
 */
router.get('/agents/:agentId/pages', (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized',
        message: 'Agent pages database connection is not available'
      });
    }

    const { agentId } = req.params;
    const { limit = 20, offset = 0, status, content_type } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);

    // Build query with optional filters
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

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parsedLimit, parsedOffset);

    // Get pages
    const pages = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM agent_pages WHERE agent_id = ?';
    const countParams = [agentId];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (content_type) {
      countQuery += ' AND content_type = ?';
      countParams.push(content_type);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    // Parse JSON fields and transform for frontend
    const parsedPages = pages.map(page => {
      const parsed = {
        ...page,
        content_metadata: page.content_metadata ? JSON.parse(page.content_metadata) : null,
        tags: page.tags ? JSON.parse(page.tags) : null
      };
      // Transform each page for frontend consumption
      return transformPageForFrontend(parsed);
    });

    console.log(`📄 Fetched ${parsedPages.length} pages for agent ${agentId} (from database)`);

    res.json({
      success: true,
      pages: parsedPages,
      total: total || 0,
      limit: parsedLimit,
      offset: parsedOffset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/agent-pages/agents/:agentId/pages/:pageId
 * Get a single page by ID
 */
router.get('/agents/:agentId/pages/:pageId', (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized',
        message: 'Agent pages database connection is not available'
      });
    }

    const { agentId, pageId } = req.params;

    const page = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ? AND agent_id = ?'
    ).get(pageId, agentId);

    if (!page) {
      console.log(`❌ Page ${pageId} not found for agent ${agentId}`);
      return res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `Page with ID ${pageId} not found for agent ${agentId}`
      });
    }

    // Parse JSON fields
    const parsedPage = {
      ...page,
      content_metadata: page.content_metadata ? JSON.parse(page.content_metadata) : null,
      tags: page.tags ? JSON.parse(page.tags) : null
    };

    // Transform page for frontend consumption
    const transformedPage = transformPageForFrontend(parsedPage);

    console.log(`📄 Fetched page ${pageId} for agent ${agentId} (from database)`);

    res.json({
      success: true,
      page: transformedPage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/agent-pages/agents/:agentId/pages
 * Create a new page
 */
router.post('/agents/:agentId/pages', (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized',
        message: 'Agent pages database connection is not available'
      });
    }

    const { agentId } = req.params;
    const { id, title, content_type, content_value, content_metadata, status, tags } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Title is required'
      });
    }

    if (!content_value) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Content value is required'
      });
    }

    // Ensure agent exists (auto-create if needed)
    if (!ensureAgentExists(agentId)) {
      return res.status(500).json({
        success: false,
        error: 'Agent creation failed',
        message: 'Failed to ensure agent exists'
      });
    }

    // Generate ID if not provided
    const pageId = id || crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert page
    db.prepare(`
      INSERT INTO agent_pages (
        id, agent_id, title, content_type, content_value,
        content_metadata, status, tags, created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pageId,
      agentId,
      title,
      content_type || 'json',
      content_value,
      content_metadata ? JSON.stringify(content_metadata) : null,
      status || 'published',
      tags ? JSON.stringify(tags) : null,
      now,
      now,
      1
    );

    // Fetch the created page
    const createdPage = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).get(pageId);

    const parsedPage = {
      ...createdPage,
      content_metadata: createdPage.content_metadata ? JSON.parse(createdPage.content_metadata) : null,
      tags: createdPage.tags ? JSON.parse(createdPage.tags) : null
    };

    console.log(`✅ Created page ${pageId} for agent ${agentId} (in database)`);

    res.status(201).json({
      success: true,
      page: parsedPage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating page:', error);

    // Handle foreign key constraint errors
    if (error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        error: 'Foreign key constraint error',
        message: 'Agent does not exist'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * PUT /api/agent-pages/agents/:agentId/pages/:pageId
 * Update an existing page (supports partial updates)
 */
router.put('/agents/:agentId/pages/:pageId', (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized',
        message: 'Agent pages database connection is not available'
      });
    }

    const { agentId, pageId } = req.params;
    const updates = req.body;

    // Check if page exists
    const existingPage = db.prepare(
      'SELECT id FROM agent_pages WHERE id = ? AND agent_id = ?'
    ).get(pageId, agentId);

    if (!existingPage) {
      console.log(`❌ Page ${pageId} not found for agent ${agentId}`);
      return res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `Page with ID ${pageId} not found for agent ${agentId}`
      });
    }

    // Build update query dynamically
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
      params.push(JSON.stringify(updates.content_metadata));
    }

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }

    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      params.push(JSON.stringify(updates.tags));
    }

    // Always update updated_at
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'No valid fields to update'
      });
    }

    // Add WHERE clause params
    params.push(pageId);
    params.push(agentId);

    // Execute update
    db.prepare(`
      UPDATE agent_pages
      SET ${fields.join(', ')}
      WHERE id = ? AND agent_id = ?
    `).run(...params);

    // Fetch updated page
    const updatedPage = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ? AND agent_id = ?'
    ).get(pageId, agentId);

    const parsedPage = {
      ...updatedPage,
      content_metadata: updatedPage.content_metadata ? JSON.parse(updatedPage.content_metadata) : null,
      tags: updatedPage.tags ? JSON.parse(updatedPage.tags) : null
    };

    console.log(`✅ Updated page ${pageId} for agent ${agentId} (in database)`);

    res.json({
      success: true,
      page: parsedPage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/agent-pages/agents/:agentId/pages/:pageId
 * Delete a page
 */
router.delete('/agents/:agentId/pages/:pageId', (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized',
        message: 'Agent pages database connection is not available'
      });
    }

    const { agentId, pageId } = req.params;

    // Check if page exists
    const existingPage = db.prepare(
      'SELECT id FROM agent_pages WHERE id = ? AND agent_id = ?'
    ).get(pageId, agentId);

    if (!existingPage) {
      console.log(`❌ Page ${pageId} not found for agent ${agentId}`);
      return res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `Page with ID ${pageId} not found for agent ${agentId}`
      });
    }

    // Delete page
    db.prepare(
      'DELETE FROM agent_pages WHERE id = ? AND agent_id = ?'
    ).run(pageId, agentId);

    console.log(`✅ Deleted page ${pageId} for agent ${agentId} (from database)`);

    res.json({
      success: true,
      message: 'Page deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
