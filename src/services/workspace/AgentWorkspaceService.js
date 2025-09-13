/**
 * Agent Workspace Service
 * TDD London School implementation with proper dependency injection
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class AgentWorkspaceService {
  constructor(fileSystem = fs, databaseService, agentService, logger = console) {
    this.fileSystem = fileSystem;
    this.databaseService = databaseService;
    this.agentService = agentService;
    this.logger = logger;
    this.baseWorkspacePath = '/workspaces/agent-feed/prod/agent_workspace';
  }

  /**
   * Initialize workspace for an agent
   * Creates directory structure and database records
   */
  async initializeWorkspace(agentId) {
    try {
      this.logger.info(`Initializing workspace for agent: ${agentId}`);

      // Validate agent exists
      const agent = await this.agentService.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Check if workspace already exists
      const existingWorkspace = await this.databaseService.getAgentWorkspace(agentId);
      if (existingWorkspace) {
        this.logger.info(`Workspace already exists for agent: ${agentId}`);
        return existingWorkspace;
      }

      // Create workspace directory structure
      const workspacePath = path.join(this.baseWorkspacePath, agentId);
      await this._createDirectoryStructure(workspacePath);

      // Create database record
      const workspaceData = {
        id: uuidv4(),
        agent_id: agentId,
        workspace_path: workspacePath,
        structure: this._getDirectoryStructure(),
        metadata: {
          agent_name: agent.name,
          display_name: agent.display_name,
          created_by: 'system',
          initialization_version: '1.0.0'
        }
      };

      const workspace = await this.databaseService.createAgentWorkspace(workspaceData);
      
      this.logger.info(`Workspace initialized successfully for agent: ${agentId}`);
      return workspace;

    } catch (error) {
      this.logger.error(`Failed to initialize workspace for agent ${agentId}:`, error);
      throw new Error(`Workspace initialization failed: ${error.message}`);
    }
  }

  /**
   * Create agent page with validation
   */
  async createAgentPage(agentId, pageData) {
    try {
      this.logger.info(`Creating page for agent: ${agentId}`, { title: pageData.title });

      // Validate agent
      const isValidAgent = await this.agentService.validateAgent(agentId);
      if (!isValidAgent) {
        throw new Error(`Invalid agent: ${agentId}`);
      }

      // Ensure workspace exists
      const workspace = await this.databaseService.getAgentWorkspace(agentId);
      if (!workspace) {
        throw new Error(`Workspace not found for agent: ${agentId}`);
      }

      // Validate content type
      const validContentTypes = ['text', 'markdown', 'json', 'component'];
      if (!validContentTypes.includes(pageData.content_type)) {
        this.logger.error(`Invalid content type: ${pageData.content_type}`);
        throw new Error(`Invalid content type. Must be one of: ${validContentTypes.join(', ')}`);
      }

      // Validate page type
      const validPageTypes = ['persistent', 'dynamic', 'template'];
      if (pageData.page_type && !validPageTypes.includes(pageData.page_type)) {
        throw new Error(`Invalid page type. Must be one of: ${validPageTypes.join(', ')}`);
      }

      // Create page data
      const pageRecord = {
        id: uuidv4(),
        agent_id: agentId,
        title: pageData.title,
        page_type: pageData.page_type || 'dynamic',
        content_type: pageData.content_type,
        content_value: pageData.content_value,
        content_metadata: pageData.content_metadata || {},
        status: pageData.status || 'draft',
        tags: pageData.tags || []
      };

      const page = await this.databaseService.createAgentPage(pageRecord);
      
      this.logger.info(`Page created successfully for agent: ${agentId}`, { pageId: page.id });
      return page;

    } catch (error) {
      this.logger.error(`Failed to create page for agent ${agentId}:`, error);
      throw new Error(`Page creation failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive workspace information
   */
  async getWorkspaceInfo(agentId) {
    try {
      this.logger.debug(`Getting workspace info for agent: ${agentId}`);

      // Get workspace record
      const workspace = await this.databaseService.getAgentWorkspace(agentId);
      if (!workspace) {
        return null;
      }

      // Get workspace statistics
      const pages = await this.databaseService.getAgentPages(agentId);
      const workspacePath = workspace.workspace_path;

      // Get directory statistics
      let directoryStats = null;
      try {
        const stats = await this.fileSystem.stat(workspacePath);
        directoryStats = {
          exists: true,
          isDirectory: stats.isDirectory(),
          created: stats.birthtime,
          modified: stats.mtime,
          size: stats.size
        };
      } catch (error) {
        this.logger.warn(`Could not get directory stats for ${workspacePath}:`, error);
        directoryStats = { exists: false };
      }

      return {
        workspace,
        pages,
        statistics: {
          total_pages: pages.length,
          pages_by_type: this._groupPagesByType(pages),
          pages_by_status: this._groupPagesByStatus(pages),
          directory_stats: directoryStats
        }
      };

    } catch (error) {
      this.logger.error(`Failed to get workspace info for agent ${agentId}:`, error);
      throw new Error(`Failed to get workspace info: ${error.message}`);
    }
  }

  /**
   * List all pages for an agent
   */
  async listAgentPages(agentId, filters = {}) {
    try {
      this.logger.debug(`Listing pages for agent: ${agentId}`, filters);

      const pages = await this.databaseService.getAgentPages(agentId, filters);
      
      return {
        pages,
        total: pages.length,
        filters_applied: filters
      };

    } catch (error) {
      this.logger.error(`Failed to list pages for agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Create workspace directory structure
   * @private
   */
  async _createDirectoryStructure(workspacePath) {
    const directories = [
      path.join(workspacePath, 'pages', 'persistent'),
      path.join(workspacePath, 'pages', 'dynamic'),
      path.join(workspacePath, 'pages', 'templates'),
      path.join(workspacePath, 'ui'),
      path.join(workspacePath, 'data'),
      path.join(workspacePath, 'logs')
    ];

    for (const dir of directories) {
      try {
        await this.fileSystem.mkdir(dir, { recursive: true });
        this.logger.debug(`Created directory: ${dir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw new Error(`Failed to create directory ${dir}: ${error.message}`);
        }
      }
    }

    // Create initial configuration files
    await this._createInitialFiles(workspacePath);
  }

  /**
   * Create initial configuration files
   * @private
   */
  async _createInitialFiles(workspacePath) {
    const configFile = path.join(workspacePath, 'workspace.json');
    const config = {
      version: '1.0.0',
      created: new Date().toISOString(),
      structure: this._getDirectoryStructure(),
      settings: {
        auto_save: true,
        version_control: true,
        backup_enabled: true
      }
    };

    await this.fileSystem.writeFile(configFile, JSON.stringify(config, null, 2));
    
    // Create README file
    const readmeFile = path.join(workspacePath, 'README.md');
    const readmeContent = `# Agent Workspace

This workspace contains dynamic pages, UI components, and data for the agent.

## Directory Structure
- \`pages/\` - Agent-generated pages
  - \`persistent/\` - Long-term persistent content
  - \`dynamic/\` - Agent-editable dynamic content  
  - \`templates/\` - Page templates
- \`ui/\` - Custom UI components
- \`data/\` - Agent data storage
- \`logs/\` - Agent activity logs

## Usage
This workspace is managed by the Agent Dynamic Page Building System.
`;

    await this.fileSystem.writeFile(readmeFile, readmeContent);
  }

  /**
   * Get directory structure definition
   * @private
   */
  _getDirectoryStructure() {
    return {
      pages: {
        persistent: 'Long-term persistent data',
        dynamic: 'Agent-editable content',
        templates: 'Page templates'
      },
      ui: 'Custom UI components',
      data: 'Agent data storage',
      logs: 'Agent activity logs'
    };
  }

  /**
   * Group pages by type for statistics
   * @private
   */
  _groupPagesByType(pages) {
    return pages.reduce((acc, page) => {
      const type = page.page_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Group pages by status for statistics
   * @private
   */
  _groupPagesByStatus(pages) {
    return pages.reduce((acc, page) => {
      const status = page.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }
}

// Factory function for dependency injection
export function createAgentWorkspaceService(databaseService, agentService, logger) {
  return new AgentWorkspaceService(fs, databaseService, agentService, logger);
}

export default AgentWorkspaceService;