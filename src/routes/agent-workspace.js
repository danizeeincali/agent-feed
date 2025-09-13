/**
 * Agent Workspace API Routes
 * RESTful endpoints for agent workspace management
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AgentWorkspaceService } from '../services/workspace/AgentWorkspaceService.js';
import { AgentWorkspaceSchemaManager } from '../database/schema/agent-workspace-schema.js';

const router = express.Router();

// Initialize workspace service and schema manager
let workspaceService = null;
let schemaManager = null;

/**
 * Initialize workspace service with database and agent service
 */
const initializeServices = async (req, res, next) => {
  try {
    if (!workspaceService && req.app.locals.databaseService) {
      const databaseService = req.app.locals.databaseService;
      const agentService = req.app.locals.agentService || {
        getAgent: async (id) => {
          // Fallback: get agent from database
          const agents = await databaseService.getAgents();
          return agents.find(a => a.id === id || a.name === id);
        },
        validateAgent: async (id) => {
          const agent = await agentService.getAgent(id);
          return !!agent;
        }
      };

      workspaceService = new AgentWorkspaceService(
        undefined, // Use default fs
        databaseService,
        agentService,
        console
      );

      // Initialize schema manager
      schemaManager = new AgentWorkspaceSchemaManager(databaseService);
      
      // Apply schema if needed
      try {
        await schemaManager.validateSchema();
      } catch (error) {
        console.log('🔄 Applying agent workspace schema...');
        await schemaManager.applySchema();
      }
    }
    next();
  } catch (error) {
    console.error('Failed to initialize workspace services:', error);
    res.status(500).json({ 
      error: 'Service initialization failed',
      message: error.message 
    });
  }
};

/**
 * POST /api/agents/:agentId/workspace/init
 * Initialize workspace for an agent
 */
router.post('/:agentId/workspace/init', initializeServices, async (req, res) => {
  try {
    const { agentId } = req.params;
    
    console.log(`🚀 Initializing workspace for agent: ${agentId}`);
    
    if (!agentId) {
      return res.status(400).json({
        error: 'Agent ID is required',
        code: 'MISSING_AGENT_ID'
      });
    }

    const workspace = await workspaceService.initializeWorkspace(agentId);
    
    res.status(201).json({
      success: true,
      message: `Workspace initialized for agent: ${agentId}`,
      workspace,
      workspace_path: workspace.workspace_path
    });

  } catch (error) {
    console.error(`Failed to initialize workspace for agent ${req.params.agentId}:`, error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Agent not found',
        message: error.message,
        code: 'AGENT_NOT_FOUND'
      });
    }

    res.status(500).json({
      error: 'Workspace initialization failed',
      message: error.message,
      code: 'WORKSPACE_INIT_ERROR'
    });
  }
});

/**
 * GET /api/agents/:agentId/workspace
 * Get workspace information for an agent
 */
router.get('/:agentId/workspace', initializeServices, async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({
        error: 'Agent ID is required',
        code: 'MISSING_AGENT_ID'
      });
    }

    const workspaceInfo = await workspaceService.getWorkspaceInfo(agentId);
    
    if (!workspaceInfo) {
      return res.status(404).json({
        error: 'Workspace not found',
        message: `No workspace found for agent: ${agentId}`,
        code: 'WORKSPACE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      agent_id: agentId,
      ...workspaceInfo
    });

  } catch (error) {
    console.error(`Failed to get workspace info for agent ${req.params.agentId}:`, error);
    res.status(500).json({
      error: 'Failed to get workspace information',
      message: error.message,
      code: 'WORKSPACE_INFO_ERROR'
    });
  }
});

/**
 * GET /api/agents/:agentId/pages
 * List all pages for an agent
 */
router.get('/:agentId/pages', initializeServices, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { 
      page_type, 
      status, 
      content_type,
      limit = 50, 
      offset = 0,
      search
    } = req.query;

    if (!agentId) {
      return res.status(400).json({
        error: 'Agent ID is required',
        code: 'MISSING_AGENT_ID'
      });
    }

    // Build filters
    const filters = {};
    if (page_type) filters.page_type = page_type;
    if (status) filters.status = status;
    if (content_type) filters.content_type = content_type;
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const result = await workspaceService.listAgentPages(agentId, filters);
    
    res.json({
      success: true,
      agent_id: agentId,
      ...result
    });

  } catch (error) {
    console.error(`Failed to list pages for agent ${req.params.agentId}:`, error);
    res.status(500).json({
      error: 'Failed to list agent pages',
      message: error.message,
      code: 'PAGES_LIST_ERROR'
    });
  }
});

/**
 * POST /api/agents/:agentId/pages
 * Create a new page for an agent
 */
router.post('/:agentId/pages', initializeServices, async (req, res) => {
  try {
    const { agentId } = req.params;
    const pageData = req.body;

    if (!agentId) {
      return res.status(400).json({
        error: 'Agent ID is required',
        code: 'MISSING_AGENT_ID'
      });
    }

    // Validate required fields
    const requiredFields = ['title', 'content_type', 'content_value'];
    for (const field of requiredFields) {
      if (!pageData[field]) {
        return res.status(400).json({
          error: `Missing required field: ${field}`,
          code: 'MISSING_REQUIRED_FIELD'
        });
      }
    }

    const page = await workspaceService.createAgentPage(agentId, pageData);
    
    res.status(201).json({
      success: true,
      message: 'Page created successfully',
      agent_id: agentId,
      page
    });

  } catch (error) {
    console.error(`Failed to create page for agent ${req.params.agentId}:`, error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message,
        code: 'VALIDATION_ERROR'
      });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Agent or workspace not found',
        message: error.message,
        code: 'NOT_FOUND'
      });
    }

    res.status(500).json({
      error: 'Page creation failed',
      message: error.message,
      code: 'PAGE_CREATION_ERROR'
    });
  }
});

/**
 * GET /api/agents/:agentId/pages/:pageId
 * Get a specific page for an agent
 */
router.get('/:agentId/pages/:pageId', initializeServices, async (req, res) => {
  try {
    const { agentId, pageId } = req.params;

    if (!agentId || !pageId) {
      return res.status(400).json({
        error: 'Agent ID and Page ID are required',
        code: 'MISSING_REQUIRED_PARAMS'
      });
    }

    // Get page from database service
    const databaseService = req.app.locals.databaseService;
    const page = await databaseService.getAgentPage(agentId, pageId);
    
    if (!page) {
      return res.status(404).json({
        error: 'Page not found',
        message: `Page ${pageId} not found for agent ${agentId}`,
        code: 'PAGE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      agent_id: agentId,
      page
    });

  } catch (error) {
    console.error(`Failed to get page ${req.params.pageId} for agent ${req.params.agentId}:`, error);
    res.status(500).json({
      error: 'Failed to get page',
      message: error.message,
      code: 'PAGE_GET_ERROR'
    });
  }
});

/**
 * PUT /api/agents/:agentId/pages/:pageId
 * Update a specific page for an agent
 */
router.put('/:agentId/pages/:pageId', initializeServices, async (req, res) => {
  try {
    const { agentId, pageId } = req.params;
    const updateData = req.body;

    if (!agentId || !pageId) {
      return res.status(400).json({
        error: 'Agent ID and Page ID are required',
        code: 'MISSING_REQUIRED_PARAMS'
      });
    }

    // Update page in database
    const databaseService = req.app.locals.databaseService;
    const updatedPage = await databaseService.updateAgentPage(agentId, pageId, updateData);
    
    if (!updatedPage) {
      return res.status(404).json({
        error: 'Page not found',
        message: `Page ${pageId} not found for agent ${agentId}`,
        code: 'PAGE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Page updated successfully',
      agent_id: agentId,
      page: updatedPage
    });

  } catch (error) {
    console.error(`Failed to update page ${req.params.pageId} for agent ${req.params.agentId}:`, error);
    res.status(500).json({
      error: 'Failed to update page',
      message: error.message,
      code: 'PAGE_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /api/agents/:agentId/pages/:pageId
 * Delete a specific page for an agent
 */
router.delete('/:agentId/pages/:pageId', initializeServices, async (req, res) => {
  try {
    const { agentId, pageId } = req.params;

    if (!agentId || !pageId) {
      return res.status(400).json({
        error: 'Agent ID and Page ID are required',
        code: 'MISSING_REQUIRED_PARAMS'
      });
    }

    // Delete page from database
    const databaseService = req.app.locals.databaseService;
    const deleted = await databaseService.deleteAgentPage(agentId, pageId);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Page not found',
        message: `Page ${pageId} not found for agent ${agentId}`,
        code: 'PAGE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Page deleted successfully',
      agent_id: agentId,
      page_id: pageId
    });

  } catch (error) {
    console.error(`Failed to delete page ${req.params.pageId} for agent ${req.params.agentId}:`, error);
    res.status(500).json({
      error: 'Failed to delete page',
      message: error.message,
      code: 'PAGE_DELETE_ERROR'
    });
  }
});

/**
 * GET /api/workspace/health
 * Health check for workspace service
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        workspace_service: !!workspaceService,
        schema_manager: !!schemaManager,
        database_service: !!req.app.locals.databaseService
      }
    };

    if (schemaManager) {
      try {
        await schemaManager.validateSchema();
        health.schema_validation = 'passed';
      } catch (error) {
        health.schema_validation = 'failed';
        health.schema_error = error.message;
      }
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;