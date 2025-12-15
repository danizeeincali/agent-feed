// Production Claude Configuration
// Location: /workspaces/agent-feed/prod

module.exports = {
  // Production Environment
  environment: 'production',
  debug: true,
  
  // Workspace Configuration
  workspace: {
    path: '/workspaces/agent-feed/prod/agent_workspace',
    protected: true,
    autoCleanup: true,
    maxSize: '1GB'
  },
  
  // Agent Settings
  agents: {
    maxConcurrent: 10,
    defaultTimeout: 300000, // 5 minutes
    logLevel: 'info',
    workspaceIsolation: true
  },
  
  // Security Settings
  security: {
    dangerousPermissions: true, // Required for production debugging
    workspaceAccess: 'restricted',
    logSensitiveData: false
  },
  
  // Logging
  logging: {
    level: 'info',
    file: '/workspaces/agent-feed/prod/logs/claude.log',
    maxSize: '100MB',
    maxFiles: 5
  },
  
  // Terminal Interface
  terminal: {
    enabled: true,
    interface: '/workspaces/agent-feed/prod/terminal/interface.js',
    historySize: 1000
  },
  
  // Integration
  integration: {
    frontend: 'http://localhost:3001',
    backend: 'http://localhost:3000',
    websocket: 'ws://localhost:3000'
  },
  
  // Performance
  performance: {
    monitoring: true,
    metrics: '/workspaces/agent-feed/prod/monitoring/',
    healthCheck: true
  }
};