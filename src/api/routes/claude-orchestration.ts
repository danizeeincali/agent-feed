/**
 * Claude Code Orchestration API Routes
 * Provides REST API endpoints for Claude Code agent management
 */

import express from 'express';
import { claudeCodeOrchestrator } from '@/orchestration/claude-code-orchestrator';
import { claudeIntegrationService } from '@/services/claude-integration';
import { logger } from '@/utils/logger';

const router = express.Router();

/**
 * GET /api/v1/claude/sessions
 * Get all sessions for the authenticated user
 */
router.get('/sessions', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'default-user';
    const sessions = claudeCodeOrchestrator.getUserSessions(userId);
    
    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    logger.error('Failed to get Claude sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/claude/sessions
 * Create a new Claude Code session
 */
router.post('/sessions', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'default-user';
    const { topology, maxAgents, autoSpawnAgents, workflow } = req.body;

    const session = await claudeCodeOrchestrator.createSession(userId, {
      topology,
      maxAgents,
      autoSpawnAgents,
      workflow
    });

    res.status(201).json({
      success: true,
      data: session,
      message: 'Claude session created successfully'
    });
  } catch (error) {
    logger.error('Failed to create Claude session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/claude/sessions/:sessionId
 * Get session details by ID
 */
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = claudeCodeOrchestrator.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: `Session ${sessionId} does not exist`
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Failed to get Claude session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/v1/claude/sessions/:sessionId
 * Terminate a Claude Code session
 */
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await claudeCodeOrchestrator.terminateSession(sessionId);

    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    logger.error('Failed to terminate Claude session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to terminate session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/claude/sessions/:sessionId/agents
 * Spawn a new agent in a session
 */
router.post('/sessions/:sessionId/agents', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type, name, capabilities } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Agent type is required'
      });
    }

    const agent = await claudeCodeOrchestrator.spawnAgent(sessionId, type, {
      name,
      capabilities
    });

    res.status(201).json({
      success: true,
      data: agent,
      message: 'Agent spawned successfully'
    });
  } catch (error) {
    logger.error('Failed to spawn Claude agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to spawn agent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/claude/sessions/:sessionId/agents
 * Get all agents in a session
 */
router.get('/sessions/:sessionId/agents', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = claudeCodeOrchestrator.getSession(sessionId);
    const agents = session ? session.agents : [];

    res.json({
      success: true,
      data: agents,
      count: agents.length
    });
  } catch (error) {
    logger.error('Failed to get Claude agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/claude/sessions/:sessionId/tasks
 * Orchestrate a new task
 */
router.post('/sessions/:sessionId/tasks', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type, description, priority, input, preferredAgents, timeout } = req.body;

    if (!type || !description) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Task type and description are required'
      });
    }

    const task = await claudeCodeOrchestrator.orchestrateTask(sessionId, {
      type,
      description,
      priority,
      input,
      preferredAgents,
      timeout
    });

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task orchestrated successfully'
    });
  } catch (error) {
    logger.error('Failed to orchestrate Claude task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to orchestrate task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/claude/sessions/:sessionId/tasks
 * Get all tasks in a session
 */
router.get('/sessions/:sessionId/tasks', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const tasks = claudeCodeOrchestrator.getSession(sessionId)?.tasks || [];

    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    logger.error('Failed to get Claude tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tasks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/claude/tasks/:taskId
 * Get task details by ID
 */
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = claudeIntegrationService.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `Task ${taskId} does not exist`
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Failed to get Claude task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/claude/agents/:agentId
 * Get agent details by ID
 */
router.get('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = claudeIntegrationService.getAgent(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        message: `Agent ${agentId} does not exist`
      });
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    logger.error('Failed to get Claude agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/claude/metrics
 * Get orchestration metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = claudeCodeOrchestrator.getMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get Claude metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/claude/health
 * Get Claude Code system health
 */
router.get('/health', async (req, res) => {
  try {
    const metrics = claudeCodeOrchestrator.getMetrics();
    const isHealthy = metrics.systemLoad < 0.8 && metrics.activeAgents > 0;

    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        metrics,
        timestamp: new Date().toISOString(),
        services: {
          orchestrator: 'active',
          integration_service: 'active',
          claude_server: 'active'
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get Claude health:', error);
    res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/claude/agent-types
 * Get available agent types and their configurations
 */
router.get('/agent-types', async (req, res) => {
  try {
    // Read agent configurations from the config file
    const fs = require('fs/promises');
    const configData = await fs.readFile('/workspaces/agent-feed/config/agents-config.json', 'utf-8');
    const config = JSON.parse(configData);

    const agentTypes = Object.keys(config.agents).map(agentType => ({
      type: agentType,
      displayName: config.agents[agentType].display_name,
      description: config.agents[agentType].description,
      capabilities: config.agents[agentType].capabilities,
      specializations: config.agents[agentType].specializations,
      priority: config.agents[agentType].priority,
      maxInstances: config.agents[agentType].max_instances
    }));

    res.json({
      success: true,
      data: agentTypes,
      count: agentTypes.length
    });
  } catch (error) {
    logger.error('Failed to get agent types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent types',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/claude/workflows/:workflowId/execute
 * Execute a predefined workflow
 */
router.post('/workflows/:workflowId/execute', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Session ID is required'
      });
    }

    await claudeCodeOrchestrator.executeWorkflow(sessionId, workflowId);

    res.json({
      success: true,
      message: `Workflow ${workflowId} executed successfully`
    });
  } catch (error) {
    logger.error('Failed to execute Claude workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;