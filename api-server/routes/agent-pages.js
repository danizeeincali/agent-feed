/**
 * Agent Pages API Routes
 * Database-backed routes for managing agent pages
 * Phase 2B: Updated to use database selector for PostgreSQL/SQLite
 */

import express from 'express';
import crypto from 'crypto';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { validatePageMiddleware } from '../middleware/page-validation.js';
import feedbackLoop from '../services/feedback-loop.js';
import dbSelector from '../config/database-selector.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

/**
 * Initialize routes with database connection
 * @param {Database} database - Better-sqlite3 database instance (legacy)
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
 * Trigger page-verification-agent asynchronously
 * @param {string} agentId - Agent ID
 * @param {string} pageId - Page ID
 * @returns {Promise<void>}
 */
async function triggerPageVerification(agentId, pageId) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../../prod/agent_workspace/page-verification-agent/verify-page.sh');

    console.log(`🔍 Triggering page verification for ${agentId}/${pageId}...`);

    // Spawn verification script in background
    const verificationProcess = spawn(scriptPath, [agentId, pageId], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
        HEADLESS: 'true'
      }
    });

    // Detach so it runs independently
    verificationProcess.unref();

    console.log(`✅ Page verification triggered for ${agentId}/${pageId} (PID: ${verificationProcess.pid})`);
    resolve();
  });
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
 * Updated: Phase 2B - Uses database selector
 */
router.get('/agents/:agentId/pages', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 20, offset = 0, status, content_type } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);

    // Use database selector to get pages
    const pages = await dbSelector.getPagesByAgent(agentId, 'anonymous');

    // Apply filters and pagination
    let filteredPages = pages;

    if (status) {
      filteredPages = filteredPages.filter(page => page.status === status);
    }

    if (content_type) {
      filteredPages = filteredPages.filter(page => page.content_type === content_type);
    }

    // Sort by created_at DESC
    filteredPages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = filteredPages.length;
    const paginatedPages = filteredPages.slice(parsedOffset, parsedOffset + parsedLimit);

    // Parse JSON fields and transform for frontend
    const parsedPages = paginatedPages.map(page => {
      const parsed = {
        ...page,
        content_metadata: page.content_metadata ? JSON.parse(page.content_metadata) : null,
        tags: Array.isArray(page.tags) ? page.tags : (page.tags ? JSON.parse(page.tags) : null)
      };
      // Transform each page for frontend consumption
      return transformPageForFrontend(parsed);
    });

    const dbSource = dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite';
    console.log(`📄 Fetched ${parsedPages.length} pages for agent ${agentId} (from ${dbSource})`);

    res.json({
      success: true,
      pages: parsedPages,
      total,
      limit: parsedLimit,
      offset: parsedOffset,
      source: dbSource,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });
  }
});

/**
 * GET /api/agent-pages/agents/:agentId/pages/:pageId
 * Get a single page by ID
 * Updated: Phase 2B - Uses database selector
 */
router.get('/agents/:agentId/pages/:pageId', async (req, res) => {
  try {
    const { agentId, pageId } = req.params;

    // Use database selector to get page
    const page = await dbSelector.getPageById(pageId, 'anonymous');

    if (!page || page.agent_id !== agentId) {
      const dbSource = dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite';
      console.log(`❌ Page ${pageId} not found for agent ${agentId}`);
      return res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `Page with ID ${pageId} not found for agent ${agentId}`,
        source: dbSource
      });
    }

    // Parse JSON fields
    const parsedPage = {
      ...page,
      content_metadata: page.content_metadata ? JSON.parse(page.content_metadata) : null,
      tags: Array.isArray(page.tags) ? page.tags : (page.tags ? JSON.parse(page.tags) : null)
    };

    // Transform page for frontend consumption
    const transformedPage = transformPageForFrontend(parsedPage);

    const dbSource = dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite';
    console.log(`📄 Fetched page ${pageId} for agent ${agentId} (from ${dbSource})`);

    res.json({
      success: true,
      page: transformedPage,
      source: dbSource,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });
  }
});

/**
 * POST /api/agent-pages/agents/:agentId/pages
 * Create a new page with feedback loop integration
 * Updated: Phase 2B - Uses database selector
 */
router.post('/agents/:agentId/pages', validatePageMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { id, title, content_type, content_value, content_metadata, status, tags } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Title is required',
        source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
      });
    }

    if (!content_value) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Content value is required',
        source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
      });
    }

    // Ensure agent exists (auto-create if needed) - only for SQLite legacy support
    if (db && !dbSelector.usePostgres) {
      if (!ensureAgentExists(agentId)) {
        return res.status(500).json({
          success: false,
          error: 'Agent creation failed',
          message: 'Failed to ensure agent exists',
          source: 'SQLite'
        });
      }
    }

    // Generate ID if not provided
    const pageId = id || crypto.randomUUID();

    // Check if validation passed (from middleware)
    // If req.validationErrors exists, we had validation failures
    if (req.validationErrors && req.validationErrors.length > 0) {
      console.log(`⚠️ Validation failed for page ${pageId}, recording in feedback loop`);

      // Record each validation failure in the feedback system
      for (const error of req.validationErrors) {
        await feedbackLoop.recordFailure(pageId, agentId, {
          type: error.type || 'validation_error',
          message: error.message,
          details: error.details,
          componentType: error.component?.type,
          validationRule: error.rule,
          pageConfig: content_value,
          stackTrace: error.stack
        });
      }

      // Return validation errors with feedback suggestions
      // Transform errors back to simpler format for API response
      const simpleErrors = req.validation.errors.map(err => ({
        path: err.path,
        field: err.field,
        message: err.message,
        code: err.code,
        severity: err.severity,
        suggestion: err.suggestion
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Page validation failed',
        errors: simpleErrors,
        pageId,
        feedbackRecorded: true,
        source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
      });
    }

    // Use database selector to create page
    const pageData = {
      id: pageId,
      agent_id: agentId,
      title,
      content_type: content_type || 'json',
      content_value,
      content_metadata,
      status: status || 'published',
      tags
    };

    const createdPage = await dbSelector.upsertPage('anonymous', pageData);

    // Record success in feedback system
    await feedbackLoop.recordSuccess(pageId, agentId, content_value);

    const parsedPage = {
      ...createdPage,
      content_metadata: createdPage.content_metadata ? JSON.parse(createdPage.content_metadata) : null,
      tags: Array.isArray(createdPage.tags) ? createdPage.tags : (createdPage.tags ? JSON.parse(createdPage.tags) : null)
    };

    const dbSource = dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite';
    console.log(`✅ Created page ${pageId} for agent ${agentId} (in ${dbSource})`);

    // Trigger page-verification-agent asynchronously (don't block response)
    triggerPageVerification(agentId, pageId).catch(error => {
      console.error(`⚠️ Page verification trigger failed for ${pageId}:`, error.message);
      // Don't fail the request - verification is async
    });

    res.status(201).json({
      success: true,
      page: parsedPage,
      source: dbSource,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating page:', error);

    // Handle foreign key constraint errors
    if (error.message.includes('FOREIGN KEY constraint') || error.message.includes('foreign key')) {
      return res.status(400).json({
        success: false,
        error: 'Foreign key constraint error',
        message: 'Agent does not exist',
        source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });
  }
});

/**
 * PUT /api/agent-pages/agents/:agentId/pages/:pageId
 * Update an existing page (supports partial updates)
 * Updated: Phase 2B - Uses database selector
 */
router.put('/agents/:agentId/pages/:pageId', async (req, res) => {
  try {
    const { agentId, pageId } = req.params;
    const updates = req.body;

    // Check if page exists
    const existingPage = await dbSelector.getPageById(pageId, 'anonymous');

    if (!existingPage || existingPage.agent_id !== agentId) {
      const dbSource = dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite';
      console.log(`❌ Page ${pageId} not found for agent ${agentId}`);
      return res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `Page with ID ${pageId} not found for agent ${agentId}`,
        source: dbSource
      });
    }

    // Validate that there are fields to update
    const validFields = ['title', 'content_type', 'content_value', 'content_metadata', 'status', 'tags'];
    const hasValidUpdates = Object.keys(updates).some(key => validFields.includes(key));

    if (!hasValidUpdates) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'No valid fields to update',
        source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
      });
    }

    // Merge existing page data with updates
    const pageData = {
      id: pageId,
      agent_id: agentId,
      title: updates.title !== undefined ? updates.title : existingPage.title,
      content_type: updates.content_type !== undefined ? updates.content_type : existingPage.content_type,
      content_value: updates.content_value !== undefined ? updates.content_value : existingPage.content_value,
      content_metadata: updates.content_metadata !== undefined ? updates.content_metadata : existingPage.content_metadata,
      status: updates.status !== undefined ? updates.status : existingPage.status,
      tags: updates.tags !== undefined ? updates.tags : existingPage.tags
    };

    // Use database selector to update page
    const updatedPage = await dbSelector.upsertPage('anonymous', pageData);

    const parsedPage = {
      ...updatedPage,
      content_metadata: updatedPage.content_metadata ? JSON.parse(updatedPage.content_metadata) : null,
      tags: Array.isArray(updatedPage.tags) ? updatedPage.tags : (updatedPage.tags ? JSON.parse(updatedPage.tags) : null)
    };

    const dbSource = dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite';
    console.log(`✅ Updated page ${pageId} for agent ${agentId} (in ${dbSource})`);

    res.json({
      success: true,
      page: parsedPage,
      source: dbSource,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });
  }
});

/**
 * DELETE /api/agent-pages/agents/:agentId/pages/:pageId
 * Delete a page
 * Updated: Phase 2B - Uses database selector
 */
router.delete('/agents/:agentId/pages/:pageId', async (req, res) => {
  try {
    const { agentId, pageId } = req.params;

    // Check if page exists
    const existingPage = await dbSelector.getPageById(pageId, 'anonymous');

    if (!existingPage || existingPage.agent_id !== agentId) {
      const dbSource = dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite';
      console.log(`❌ Page ${pageId} not found for agent ${agentId}`);
      return res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `Page with ID ${pageId} not found for agent ${agentId}`,
        source: dbSource
      });
    }

    // Delete page using database selector
    const deleted = await dbSelector.deletePage(pageId, 'anonymous');

    if (!deleted) {
      const dbSource = dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite';
      return res.status(500).json({
        success: false,
        error: 'Delete failed',
        message: 'Failed to delete page',
        source: dbSource
      });
    }

    const dbSource = dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite';
    console.log(`✅ Deleted page ${pageId} for agent ${agentId} (from ${dbSource})`);

    res.json({
      success: true,
      message: 'Page deleted successfully',
      source: dbSource,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });
  }
});

export default router;
