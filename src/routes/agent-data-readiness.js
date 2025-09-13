/**
 * Agent Data Readiness Routes
 * Provides REST API endpoints for agent data readiness checks
 */

import express from 'express';
import agentDataService from '../services/agent-data-readiness.js';
import agentFileService from '../services/AgentFileService.js';

const router = express.Router();

/**
 * GET /api/agents/:agentId/data
 * Get data readiness status for a specific agent
 */
router.get('/agents/:agentId/data', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Validate agent ID
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({
        error: 'Invalid agent ID provided',
        hasData: false,
        data: null,
        message: 'Agent ID must be a non-empty string'
      });
    }

    // Get data readiness status
    const result = await agentDataService.getDataReadiness(agentId);
    
    // Return appropriate HTTP status
    const statusCode = result.hasData ? 200 : 204;
    
    res.status(statusCode).json(result);

  } catch (error) {
    console.error(`[DataReadinessAPI] Error for agent ${req.params.agentId}:`, error);
    
    res.status(500).json({
      error: 'Internal server error',
      hasData: false,
      data: null,
      message: 'Failed to check agent data readiness'
    });
  }
});

/**
 * GET /api/agents
 * Get list of all agents from markdown files with data readiness status
 */
router.get('/agents', async (req, res) => {
  try {
    // Get all agents from markdown files
    const agents = await agentFileService.getAgentsFromFiles();
    
    // Enhance agents with data readiness status from registered agents
    const registeredAgents = agentDataService.getRegisteredAgents();
    const registeredAgentsMap = new Map(registeredAgents.map(agent => [agent.id, agent]));
    
    const enhancedAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      display_name: agent.display_name,
      description: agent.description,
      status: agent.status,
      avatar_color: agent.avatar_color,
      capabilities: agent.capabilities,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
      // Add data readiness info if agent is registered
      lastCheck: registeredAgentsMap.get(agent.id)?.lastCheck || null,
      lastStatus: registeredAgentsMap.get(agent.id)?.lastStatus || null,
      options: registeredAgentsMap.get(agent.id)?.options || { timeout: 5000, retries: 0 }
    }));
    
    res.json({
      success: true,
      agents: enhancedAgents,
      totalAgents: enhancedAgents.length,
      registeredAgents: registeredAgents.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DataReadinessAPI] Error listing agents:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      success: false,
      agents: [],
      totalAgents: 0
    });
  }
});

/**
 * GET /api/agents/health
 * Health check for all registered agents
 */
router.get('/agents/health', async (req, res) => {
  try {
    const healthStatus = await agentDataService.healthCheck();
    
    const statusCode = healthStatus.healthyAgents === healthStatus.totalAgents ? 200 : 207;
    
    res.status(statusCode).json({
      success: true,
      ...healthStatus
    });

  } catch (error) {
    console.error('[DataReadinessAPI] Error in health check:', error);
    
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      totalAgents: 0,
      healthyAgents: 0,
      agents: {},
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/agents/:agentId/register
 * Register an agent (for testing purposes)
 */
router.post('/agents/:agentId/register', (req, res) => {
  try {
    const { agentId } = req.params;
    const { dataProvider, options } = req.body;

    if (!agentId) {
      return res.status(400).json({
        error: 'Agent ID is required',
        success: false
      });
    }

    // Simple registration for testing
    // In production, agents register themselves via the service
    const testDataProvider = () => Promise.resolve({
      hasData: false,
      data: null,
      message: 'Test agent - no data'
    });

    agentDataService.registerAgent(
      agentId,
      testDataProvider,
      options || {}
    );

    res.json({
      success: true,
      message: `Agent ${agentId} registered successfully`,
      agentId
    });

  } catch (error) {
    console.error('[DataReadinessAPI] Registration error:', error);
    
    res.status(500).json({
      error: 'Registration failed',
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/agents/:agentId
 * Unregister an agent
 */
router.delete('/agents/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    
    const removed = agentDataService.unregisterAgent(agentId);
    
    if (removed) {
      res.json({
        success: true,
        message: `Agent ${agentId} unregistered successfully`,
        agentId
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
        message: `Agent ${agentId} was not registered`,
        agentId
      });
    }

  } catch (error) {
    console.error('[DataReadinessAPI] Unregistration error:', error);
    
    res.status(500).json({
      error: 'Unregistration failed',
      success: false,
      message: error.message
    });
  }
});

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('[DataReadinessAPI] Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    hasData: false,
    data: null,
    message: 'An unexpected error occurred'
  });
});

export default router;