const fs = require('fs-extra');
const path = require('path');

// Global test setup
beforeAll(async () => {
  // Ensure prod directory structure exists
  const prodPath = path.resolve(__dirname, '../../../');
  await fs.ensureDir(path.join(prodPath, '.claude/agents'));
  await fs.ensureDir(path.join(prodPath, 'agent_workspace'));
  
  // Create test configuration if it doesn't exist
  const configPath = path.join(prodPath, '.claude/config.json');
  if (!await fs.pathExists(configPath)) {
    await fs.writeJson(configPath, {
      version: '1.0.0',
      isolation: {
        enabled: true,
        allowParentAccess: false,
        agentDiscoveryPaths: ['.claude/agents']
      },
      workspace: {
        directory: 'agent_workspace',
        autoCreate: true
      },
      security: {
        boundaryEnforcement: true,
        readOnlySystemInstructions: true
      }
    }, { spaces: 2 });
  }
});

// Global test teardown
afterAll(async () => {
  // Cleanup test artifacts if needed
  console.log('Test suite completed');
});

// Custom matchers for Claude Code testing
expect.extend({
  toBeIsolatedPath(received) {
    const prodPath = path.resolve(__dirname, '../../../');
    const isWithinProd = received.startsWith(prodPath);
    const doesNotAccessParent = !received.includes('../../../') && 
                               !received.includes('/workspaces/agent-feed/') ||
                               received.startsWith(prodPath);
    
    return {
      message: () => `expected ${received} to be isolated within prod directory`,
      pass: isWithinProd && doesNotAccessParent
    };
  },
  
  toHaveValidClaudeConfig(received) {
    const requiredKeys = ['version', 'isolation', 'workspace', 'security'];
    const hasAllKeys = requiredKeys.every(key => received.hasOwnProperty(key));
    
    return {
      message: () => `expected configuration to have all required keys: ${requiredKeys.join(', ')}`,
      pass: hasAllKeys
    };
  }
});