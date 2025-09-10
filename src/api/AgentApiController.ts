/**
 * Agent API Controller - TDD Implementation
 * RESTful API endpoints for agent management
 */

import { Request, Response } from 'express';
import { AgentDiscoveryService } from '../agents/AgentDiscoveryService';
import { AgentWorkspaceManager } from '../services/AgentWorkspaceManager';
import { AgentDatabase } from '../database/AgentDatabase';
import { AgentDefinition, AgentMetrics } from '../types/AgentTypes';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export class AgentApiController {
  constructor(
    private discoveryService: AgentDiscoveryService,
    private workspaceManager: AgentWorkspaceManager,
    private database: AgentDatabase
  ) {}

  /**
   * GET /api/agents - List all agents
   */
  async listAgents(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        model,
        proactive,
        priority,
        search
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        res.status(400).json(this.errorResponse('Invalid pagination parameters'));
        return;
      }

      const offset = (pageNum - 1) * limitNum;
      const agents = await this.database.listAgents({
        limit: limitNum,
        offset,
        model: model as string,
        proactive: proactive ? proactive === 'true' : undefined,
        priority: priority as string,
        search: search as string
      });

      const response: ApiResponse<AgentDefinition[]> = {
        success: true,
        data: agents,
        message: `Found ${agents.length} agents`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error listing agents:', error);
      res.status(500).json(this.errorResponse('Failed to list agents'));
    }
  }

  /**
   * GET /api/agents/:name - Get specific agent
   */
  async getAgent(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      if (!name || typeof name !== 'string') {
        res.status(400).json(this.errorResponse('Agent name is required'));
        return;
      }

      const agent = await this.database.getAgent(name);

      if (!agent) {
        res.status(404).json(this.errorResponse(`Agent '${name}' not found`));
        return;
      }

      const response: ApiResponse<AgentDefinition> = {
        success: true,
        data: agent,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting agent:', error);
      res.status(500).json(this.errorResponse('Failed to get agent'));
    }
  }

  /**
   * GET /api/agents/slug/:slug - Get agent by slug
   */
  async getAgentBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      if (!slug || typeof slug !== 'string') {
        res.status(400).json(this.errorResponse('Agent slug is required'));
        return;
      }

      const agent = await this.database.getAgentBySlug(slug);

      if (!agent) {
        res.status(404).json(this.errorResponse(`Agent with slug '${slug}' not found`));
        return;
      }

      const response: ApiResponse<AgentDefinition> = {
        success: true,
        data: agent,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting agent by slug:', error);
      res.status(500).json(this.errorResponse('Failed to get agent'));
    }
  }

  /**
   * POST /api/agents/sync - Sync agents from filesystem
   */
  async syncAgents(req: Request, res: Response): Promise<void> {
    try {
      // Force discovery service to rescan
      this.discoveryService.clearCache();
      const agents = await this.discoveryService.discoverAgents();

      // Save all agents to database
      const savedCount = await Promise.all(
        agents.map(async (agent) => {
          try {
            await this.database.saveAgent(agent);
            return 1;
          } catch (error) {
            console.warn(`Failed to save agent ${agent.name}:`, error);
            return 0;
          }
        })
      );

      const totalSaved = savedCount.reduce((sum, count) => sum + count, 0);

      const response: ApiResponse<{ discovered: number; saved: number }> = {
        success: true,
        data: {
          discovered: agents.length,
          saved: totalSaved
        },
        message: `Synced ${totalSaved} of ${agents.length} agents`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error syncing agents:', error);
      res.status(500).json(this.errorResponse('Failed to sync agents'));
    }
  }

  /**
   * GET /api/agents/:name/metrics - Get agent metrics
   */
  async getAgentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      if (!name || typeof name !== 'string') {
        res.status(400).json(this.errorResponse('Agent name is required'));
        return;
      }

      const metrics = await this.database.getMetrics(name);

      if (!metrics) {
        res.status(404).json(this.errorResponse(`Metrics not found for agent '${name}'`));
        return;
      }

      const response: ApiResponse<AgentMetrics> = {
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting agent metrics:', error);
      res.status(500).json(this.errorResponse('Failed to get agent metrics'));
    }
  }

  /**
   * POST /api/agents/:name/metrics - Update agent metrics
   */
  async updateAgentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const metrics = req.body as Partial<AgentMetrics>;

      if (!name || typeof name !== 'string') {
        res.status(400).json(this.errorResponse('Agent name is required'));
        return;
      }

      // Validate metrics data
      if (typeof metrics !== 'object' || metrics === null) {
        res.status(400).json(this.errorResponse('Invalid metrics data'));
        return;
      }

      await this.database.updateMetrics(name, metrics);

      const response: ApiResponse<{ updated: boolean }> = {
        success: true,
        data: { updated: true },
        message: `Metrics updated for agent '${name}'`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating agent metrics:', error);
      res.status(500).json(this.errorResponse('Failed to update agent metrics'));
    }
  }

  /**
   * GET /api/agents/:name/workspace - Get agent workspace info
   */
  async getAgentWorkspace(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      if (!name || typeof name !== 'string') {
        res.status(400).json(this.errorResponse('Agent name is required'));
        return;
      }

      const workspace = await this.workspaceManager.getWorkspace(name);

      if (!workspace) {
        res.status(404).json(this.errorResponse(`Workspace not found for agent '${name}'`));
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: workspace,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting agent workspace:', error);
      res.status(500).json(this.errorResponse('Failed to get agent workspace'));
    }
  }

  /**
   * POST /api/agents/:name/workspace - Create agent workspace
   */
  async createAgentWorkspace(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      if (!name || typeof name !== 'string') {
        res.status(400).json(this.errorResponse('Agent name is required'));
        return;
      }

      const workspace = await this.workspaceManager.createWorkspace(name);

      const response: ApiResponse = {
        success: true,
        data: workspace,
        message: `Workspace created for agent '${name}'`,
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating agent workspace:', error);
      res.status(500).json(this.errorResponse('Failed to create agent workspace'));
    }
  }

  /**
   * GET /api/agents/:name/logs - Get agent logs
   */
  async getAgentLogs(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { limit = 50 } = req.query;

      if (!name || typeof name !== 'string') {
        res.status(400).json(this.errorResponse('Agent name is required'));
        return;
      }

      const limitNum = parseInt(limit as string, 10);
      if (limitNum < 1 || limitNum > 1000) {
        res.status(400).json(this.errorResponse('Limit must be between 1 and 1000'));
        return;
      }

      const logs = await this.database.getLogs(name, limitNum);

      const response: ApiResponse = {
        success: true,
        data: logs,
        message: `Retrieved ${logs.length} log entries`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting agent logs:', error);
      res.status(500).json(this.errorResponse('Failed to get agent logs'));
    }
  }

  /**
   * POST /api/agents/:name/logs - Add log entry
   */
  async addAgentLog(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { level, message, context } = req.body;

      if (!name || typeof name !== 'string') {
        res.status(400).json(this.errorResponse('Agent name is required'));
        return;
      }

      if (!level || !message) {
        res.status(400).json(this.errorResponse('Level and message are required'));
        return;
      }

      if (!['info', 'warn', 'error', 'debug'].includes(level)) {
        res.status(400).json(this.errorResponse('Invalid log level'));
        return;
      }

      await this.database.addLog(name, level, message, context);

      const response: ApiResponse<{ logged: boolean }> = {
        success: true,
        data: { logged: true },
        message: 'Log entry added successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error adding agent log:', error);
      res.status(500).json(this.errorResponse('Failed to add log entry'));
    }
  }

  /**
   * GET /api/stats - Get database statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = this.database.getStats();

      const response: ApiResponse = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json(this.errorResponse('Failed to get statistics'));
    }
  }

  /**
   * GET /api/health - Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Basic health checks
      const checks = {
        database: true,
        discovery: true,
        workspace: true,
        timestamp: new Date().toISOString()
      };

      // Test database connection
      try {
        this.database.getStats();
      } catch {
        checks.database = false;
      }

      // Test discovery service
      try {
        await this.discoveryService.needsRefresh();
      } catch {
        checks.discovery = false;
      }

      // Test workspace manager
      try {
        await this.workspaceManager.listWorkspaces();
      } catch {
        checks.workspace = false;
      }

      const healthy = checks.database && checks.discovery && checks.workspace;
      const status = healthy ? 200 : 503;

      const response: ApiResponse = {
        success: healthy,
        data: checks,
        message: healthy ? 'All systems operational' : 'Some systems experiencing issues',
        timestamp: new Date().toISOString()
      };

      res.status(status).json(response);
    } catch (error) {
      console.error('Error in health check:', error);
      res.status(500).json(this.errorResponse('Health check failed'));
    }
  }

  /**
   * Create error response
   * @param message Error message
   * @returns ApiResponse with error
   */
  private errorResponse(message: string): ApiResponse {
    return {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };
  }
}