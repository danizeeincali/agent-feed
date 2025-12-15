/**
 * Agent API Endpoints
 * REST API for agent discovery, status, and management
 */

import express from 'express';
import { agentService } from '../services/agentService.js';

const router = express.Router();

/**
 * Get all agents with optional filtering
 * GET /api/agents?category=Communication&status=active&search=feedback&sortBy=name
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      status: req.query.status,
      search: req.query.search,
      sortBy: req.query.sortBy || 'name'
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    const agents = agentService.getAgents(filters);
    
    res.json({
      success: true,
      data: agents,
      count: agents.length,
      filters: filters
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents',
      message: error.message
    });
  }
});

/**
 * Get agent by ID
 * GET /api/agents/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = agentService.getAgent(id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        message: `Agent with ID '${id}' does not exist`
      });
    }
    
    const status = agentService.getAgentStatus(id);
    
    res.json({
      success: true,
      data: {
        ...agent,
        status: status
      }
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent',
      message: error.message
    });
  }
});

/**
 * Get agent status
 * GET /api/agents/:id/status
 */
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = agentService.getAgent(id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        message: `Agent with ID '${id}' does not exist`
      });
    }
    
    const status = agentService.getAgentStatus(id);
    
    res.json({
      success: true,
      data: {
        agentId: id,
        ...status,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching agent status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent status',
      message: error.message
    });
  }
});

/**
 * Get all agent statuses
 * GET /api/agents/status/all
 */
router.get('/status/all', async (req, res) => {
  try {
    const statuses = agentService.getAgentStatuses();
    
    res.json({
      success: true,
      data: statuses,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching agent statuses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent statuses',
      message: error.message
    });
  }
});

/**
 * Get agent metrics and analytics
 * GET /api/agents/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = agentService.getAgentMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching agent metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent metrics',
      message: error.message
    });
  }
});

/**
 * Get agent categories
 * GET /api/agents/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const agents = agentService.getAgents();
    const categories = {};
    
    agents.forEach(agent => {
      if (!categories[agent.category]) {
        categories[agent.category] = {
          name: agent.category,
          count: 0,
          agents: []
        };
      }
      categories[agent.category].count++;
      categories[agent.category].agents.push({
        id: agent.id,
        name: agent.name,
        status: agentService.getAgentStatus(agent.id)?.status || 'inactive'
      });
    });
    
    res.json({
      success: true,
      data: Object.values(categories)
    });
  } catch (error) {
    console.error('Error fetching agent categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent categories',
      message: error.message
    });
  }
});

/**
 * Trigger agent discovery scan
 * POST /api/agents/scan
 */
router.post('/scan', async (req, res) => {
  try {
    await agentService.scanAgents();
    
    const agents = agentService.getAgents();
    const metrics = agentService.getAgentMetrics();
    
    res.json({
      success: true,
      message: 'Agent scan completed',
      data: {
        agentsFound: agents.length,
        metrics: metrics
      }
    });
  } catch (error) {
    console.error('Error triggering agent scan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan agents',
      message: error.message
    });
  }
});

/**
 * Get agent files
 * GET /api/agents/:id/files
 */
router.get('/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = agentService.getAgent(id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        message: `Agent with ID '${id}' does not exist`
      });
    }
    
    res.json({
      success: true,
      data: {
        agentId: id,
        files: agent.files || [],
        totalSize: agent.size || 0,
        languages: agent.metadata?.languages || []
      }
    });
  } catch (error) {
    console.error('Error fetching agent files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent files',
      message: error.message
    });
  }
});

/**
 * Search agents
 * GET /api/agents/search?q=feedback&category=Communication
 */
router.get('/search', async (req, res) => {
  try {
    const { q, category, status } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search query',
        message: 'Search query must be at least 2 characters long'
      });
    }
    
    const filters = {
      search: q.trim(),
      category,
      status
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    const agents = agentService.getAgents(filters);
    
    res.json({
      success: true,
      data: agents,
      count: agents.length,
      query: q,
      filters: filters
    });
  } catch (error) {
    console.error('Error searching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search agents',
      message: error.message
    });
  }
});

/**
 * Health check endpoint
 * GET /api/agents/health
 */
router.get('/health', async (req, res) => {
  try {
    const isInitialized = agentService.isInitialized;
    const agentCount = agentService.agents.size;
    const metrics = agentService.getAgentMetrics();
    
    res.json({
      success: true,
      data: {
        status: isInitialized ? 'healthy' : 'initializing',
        initialized: isInitialized,
        agentCount: agentCount,
        lastScan: metrics.lastUpdate,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error checking agent service health:', error);
    res.status(500).json({
      success: false,
      error: 'Service health check failed',
      message: error.message
    });
  }
});

// Error handling middleware for agent routes
router.use((error, req, res, next) => {
  console.error('Agent API Error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

export default router;