/**
 * Global Setup for Agents Page E2E Tests
 * London School TDD - Test Environment Preparation
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Global setup function for Playwright E2E tests
 * Prepares test environment and mock data
 */
async function globalSetup() {
  console.log('🚀 Setting up Agents Page E2E test environment...');
  
  try {
    // Create test directories if they don't exist
    await ensureTestDirectories();
    
    // Setup mock agent workspace
    await setupMockAgentWorkspace();
    
    // Prepare test data
    await prepareTestData();
    
    // Setup WebSocket mock server if needed
    await setupMockWebSocketServer();
    
    console.log('✅ Agents Page E2E test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}

/**
 * Ensure required test directories exist
 */
async function ensureTestDirectories() {
  const directories = [
    path.join(__dirname, '../coverage'),
    path.join(__dirname, '../../../temp/test-workspace'),
    path.join(__dirname, '../../../temp/test-agents')
  ];
  
  for (const dir of directories) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`📁 Created test directory: ${dir}`);
    }
  }
}

/**
 * Setup mock agent workspace with test agents
 */
async function setupMockAgentWorkspace() {
  const testWorkspacePath = path.join(__dirname, '../../../temp/test-workspace');
  
  // Test agent configurations
  const testAgents = [
    {
      id: 'personal-todos-agent',
      name: 'Personal TODOs Agent',
      description: 'Manages and tracks personal tasks and objectives with intelligent prioritization',
      version: '1.0.0',
      status: 'active',
      type: 'posting-agent',
      tags: ['productivity', 'personal', 'todos'],
      capabilities: ['task-creation', 'priority-management', 'completion-tracking'],
      configuration: {
        maxTasks: 50,
        priorityLevels: ['P1', 'P2', 'P3', 'P4']
      },
      metrics: {
        tasksCompleted: 127,
        averageCompletionTime: 2.3,
        successRate: 0.92
      }
    },
    {
      id: 'meeting-next-steps-agent',
      name: 'Meeting Next Steps Agent',
      description: 'Captures and tracks action items from meetings with automatic follow-up',
      version: '1.1.0',
      status: 'active',
      type: 'posting-agent',
      tags: ['meetings', 'action-items', 'follow-up'],
      capabilities: ['action-extraction', 'assignment-tracking', 'deadline-management'],
      configuration: {
        maxActionItems: 100,
        defaultDeadlineDays: 7
      },
      metrics: {
        meetingsProcessed: 45,
        actionItemsTracked: 234,
        completionRate: 0.87
      }
    },
    {
      id: 'agent-ideas-agent',
      name: 'Agent Ideas Generator',
      description: 'Generates and refines agent enhancement ideas with feasibility analysis',
      version: '0.9.0',
      status: 'inactive',
      type: 'utility-agent',
      tags: ['innovation', 'ideas', 'enhancement'],
      capabilities: ['idea-generation', 'feasibility-analysis', 'impact-assessment'],
      configuration: {
        ideaCategories: ['efficiency', 'features', 'integration'],
        minViabilityScore: 0.6
      },
      metrics: {
        ideasGenerated: 89,
        implementedIdeas: 12,
        averageImpactScore: 0.74
      }
    }
  ];
  
  // Create agent directories and metadata files
  for (const agent of testAgents) {
    const agentDir = path.join(testWorkspacePath, agent.id);
    await fs.mkdir(agentDir, { recursive: true });
    
    // Create agent metadata file
    const metadataPath = path.join(agentDir, 'agent-metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(agent, null, 2));
    
    // Create basic agent structure
    const structureFiles = [
      'README.md',
      'config.yaml',
      'package.json'
    ];
    
    for (const file of structureFiles) {
      const filePath = path.join(agentDir, file);
      const content = generateAgentFileContent(file, agent);
      await fs.writeFile(filePath, content);
    }
    
    console.log(`🤖 Created test agent: ${agent.name}`);
  }
}

/**
 * Generate content for agent files
 */
function generateAgentFileContent(fileName, agent) {
  switch (fileName) {
    case 'README.md':
      return `# ${agent.name}\n\n${agent.description}\n\n## Version\n${agent.version}\n\n## Status\n${agent.status}`;
    
    case 'config.yaml':
      return `---
name: ${agent.name}
version: ${agent.version}
status: ${agent.status}
type: ${agent.type}
tags: ${agent.tags.join(', ')}
capabilities:${agent.capabilities.map(cap => `\n  - ${cap}`).join('')}
configuration:
${Object.entries(agent.configuration).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`).join('\n')}
`;
    
    case 'package.json':
      return JSON.stringify({
        name: agent.id,
        version: agent.version,
        description: agent.description,
        main: 'index.js',
        scripts: {
          start: 'node index.js',
          test: 'npm test'
        },
        keywords: agent.tags,
        author: 'System'
      }, null, 2);
    
    default:
      return '';
  }
}

/**
 * Prepare test data for various scenarios
 */
async function prepareTestData() {
  const testDataPath = path.join(__dirname, '../../../temp/test-data');
  await fs.mkdir(testDataPath, { recursive: true });
  
  // Create test scenarios data
  const testScenarios = {
    emptyWorkspace: {
      agents: [],
      description: 'Empty workspace with no agents'
    },
    singleAgent: {
      agents: ['personal-todos-agent'],
      description: 'Workspace with single agent'
    },
    multipleAgents: {
      agents: ['personal-todos-agent', 'meeting-next-steps-agent', 'agent-ideas-agent'],
      description: 'Workspace with multiple agents'
    },
    mixedStatusAgents: {
      agents: [
        { id: 'personal-todos-agent', status: 'active' },
        { id: 'meeting-next-steps-agent', status: 'inactive' },
        { id: 'agent-ideas-agent', status: 'error' }
      ],
      description: 'Agents with mixed statuses'
    }
  };
  
  const scenariosPath = path.join(testDataPath, 'test-scenarios.json');
  await fs.writeFile(scenariosPath, JSON.stringify(testScenarios, null, 2));
  
  console.log('📊 Prepared test scenarios data');
}

/**
 * Setup mock WebSocket server for testing real-time features
 */
async function setupMockWebSocketServer() {
  // Note: In a real implementation, this would start a WebSocket server
  // For this mock setup, we'll just create the configuration
  const wsConfig = {
    host: 'localhost',
    port: 3001,
    mockEvents: [
      {
        type: 'agent-status-change',
        data: {
          agentId: 'personal-todos-agent',
          status: 'inactive',
          timestamp: Date.now()
        }
      },
      {
        type: 'agent-metrics-update',
        data: {
          agentId: 'meeting-next-steps-agent',
          metrics: {
            performance: 0.88,
            reliability: 0.94
          },
          timestamp: Date.now()
        }
      }
    ]
  };
  
  const wsConfigPath = path.join(__dirname, '../../../temp/websocket-config.json');
  await fs.writeFile(wsConfigPath, JSON.stringify(wsConfig, null, 2));
  
  console.log('🔌 Mock WebSocket server configuration prepared');
}

module.exports = globalSetup;