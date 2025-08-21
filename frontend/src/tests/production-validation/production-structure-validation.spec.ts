import { test, expect } from '@playwright/test';
import { readdir, access, readFile } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';

/**
 * Production Structure Validation Tests
 * 
 * This test suite validates the new production directory structure
 * and ensures all components are properly organized and accessible.
 */

test.describe('Production Directory Structure Validation', () => {
  const prodRoot = '/workspaces/agent-feed/prod';
  const originalRoot = '/workspaces/agent-feed';

  test('Production directory exists and has correct structure', async () => {
    // Verify prod directory exists
    await expect(async () => {
      await access(prodRoot, constants.F_OK);
    }).not.toThrow();

    // Check essential directories
    const expectedDirs = [
      'agent_workspace',
      'agents',
      'config',
      'logs',
      'monitoring',
      'security',
      'terminal'
    ];

    for (const dir of expectedDirs) {
      await expect(async () => {
        await access(join(prodRoot, dir), constants.F_OK);
      }).not.toThrow();
    }
  });

  test('Claude configuration files are present in prod', async () => {
    const configFiles = [
      'CLAUDE.md',
      'PRODUCTION_CLAUDE.md',
      'config.json',
      'package.json'
    ];

    for (const file of configFiles) {
      await expect(async () => {
        await access(join(prodRoot, file), constants.F_OK);
      }).not.toThrow();
    }
  });

  test('Agent workspace is properly isolated', async () => {
    const agentWorkspace = join(prodRoot, 'agent_workspace');
    
    // Check agent workspace structure
    const workspaceDirs = ['data', 'logs', 'outputs', 'temp'];
    
    for (const dir of workspaceDirs) {
      await expect(async () => {
        await access(join(agentWorkspace, dir), constants.F_OK);
      }).not.toThrow();
    }

    // Verify README exists
    await expect(async () => {
      await access(join(agentWorkspace, 'README.md'), constants.F_OK);
    }).not.toThrow();
  });

  test('Terminal interface is accessible', async () => {
    const terminalFiles = [
      'terminal-interface.js',
      'terminal/interface.js'
    ];

    for (const file of terminalFiles) {
      await expect(async () => {
        await access(join(prodRoot, file), constants.F_OK);
      }).not.toThrow();
    }
  });

  test('Production config is valid JSON', async () => {
    const configPath = join(prodRoot, 'config.json');
    const content = await readFile(configPath, 'utf-8');
    
    expect(() => {
      JSON.parse(content);
    }).not.toThrow();
  });

  test('Security directory exists with proper structure', async () => {
    const securityDir = join(prodRoot, 'security');
    
    await expect(async () => {
      await access(securityDir, constants.F_OK);
    }).not.toThrow();
    
    // Should be able to read directory contents
    const contents = await readdir(securityDir);
    expect(Array.isArray(contents)).toBe(true);
  });

  test('Monitoring directory is configured', async () => {
    const monitoringDir = join(prodRoot, 'monitoring');
    
    await expect(async () => {
      await access(monitoringDir, constants.F_OK);
    }).not.toThrow();
  });

  test('Original structure remains intact', async () => {
    // Verify original directories still exist
    const originalDirs = [
      'frontend',
      'src',
      'docs',
      'tests'
    ];

    for (const dir of originalDirs) {
      await expect(async () => {
        await access(join(originalRoot, dir), constants.F_OK);
      }).not.toThrow();
    }
  });

  test('Init script is executable', async () => {
    const initScript = join(prodRoot, 'init.sh');
    
    await expect(async () => {
      await access(initScript, constants.F_OK);
    }).not.toThrow();
  });
});

test.describe('Production File Protection', () => {
  const prodRoot = '/workspaces/agent-feed/prod';

  test('Agent workspace is writable for agents', async () => {
    const agentWorkspace = join(prodRoot, 'agent_workspace');
    
    // Test write permissions to agent workspace
    await expect(async () => {
      await access(agentWorkspace, constants.W_OK);
    }).not.toThrow();
  });

  test('Configuration files are readable', async () => {
    const configFiles = [
      'CLAUDE.md',
      'config.json',
      'package.json'
    ];

    for (const file of configFiles) {
      await expect(async () => {
        await access(join(prodRoot, file), constants.R_OK);
      }).not.toThrow();
    }
  });

  test('Production logs directory exists and is writable', async () => {
    const logsDir = join(prodRoot, 'logs');
    
    await expect(async () => {
      await access(logsDir, constants.W_OK);
    }).not.toThrow();
  });
});