/**
 * Agent Data Initialization Service
 * Registers agents and initializes their data providers
 */

import agentDataService from './agent-data-readiness.js';
import fs from 'fs';
import path from 'path';

/**
 * Initialize all agent data providers
 */
function initializeAgentDataProviders() {
  console.log('[AgentDataInit] Initializing agent data providers...');

  // Register personal-todos-agent
  agentDataService.registerAgent('personal-todos-agent', async () => {
    try {
      const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/personal-todos-agent';
      const taskDbPath = path.join(workspaceDir, 'tasks.json');
      
      if (!fs.existsSync(taskDbPath)) {
        return {
          hasData: false,
          data: null,
          message: 'No task database found'
        };
      }
      
      const tasks = JSON.parse(fs.readFileSync(taskDbPath, 'utf8'));
      const activeTasks = tasks.filter(t => t.status !== 'completed');
      
      return {
        hasData: activeTasks.length > 0,
        data: {
          totalTasks: tasks.length,
          activeTasks: activeTasks.length,
          priorities: activeTasks.reduce((acc, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            return acc;
          }, {}),
          recentUpdates: tasks
            .filter(t => t.updated_at)
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 5)
        },
        message: activeTasks.length > 0 
          ? `${activeTasks.length} active tasks available`
          : 'All tasks completed'
      };
    } catch (error) {
      return {
        hasData: false,
        data: null,
        message: `Error reading task data: ${error.message}`
      };
    }
  });

  // Register page-builder-agent
  agentDataService.registerAgent('page-builder-agent', async () => {
    try {
      const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/page-builder-agent';
      const dataDir = '/workspaces/agent-feed/data/agent-pages';
      
      // Count created pages
      let pagesCreated = 0;
      if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir);
        pagesCreated = files.filter(f => f.endsWith('.json')).length;
      }
      
      // Count available templates
      let templatesAvailable = 0;
      if (fs.existsSync(workspaceDir)) {
        const templateDir = path.join(workspaceDir, 'templates');
        if (fs.existsSync(templateDir)) {
          templatesAvailable = fs.readdirSync(templateDir).length;
        }
      }
      
      return {
        hasData: pagesCreated > 0 || templatesAvailable > 0,
        data: {
          pagesCreated,
          templatesAvailable,
          lastActivity: new Date().toISOString()
        },
        message: pagesCreated > 0 
          ? `Page builder active with ${pagesCreated} pages created`
          : 'Page builder ready, no pages created yet'
      };
    } catch (error) {
      return {
        hasData: false,
        data: null,
        message: `Error accessing page builder data: ${error.message}`
      };
    }
  });

  // Register a test agent for demonstration
  agentDataService.registerAgent('test-agent', async () => {
    return {
      hasData: false,
      data: null,
      message: 'Test agent - no real data available'
    };
  });

  console.log('[AgentDataInit] Agent data providers initialized successfully');
}

export {
  initializeAgentDataProviders
};