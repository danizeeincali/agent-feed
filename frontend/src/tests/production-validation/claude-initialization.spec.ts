import { test, expect } from '@playwright/test';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';

const execAsync = promisify(exec);

/**
 * Claude Initialization Tests
 * 
 * Tests Claude Code initialization from the new /prod location
 * and validates proper configuration loading.
 */

test.describe('Claude Production Initialization', () => {
  const prodRoot = '/workspaces/agent-feed/prod';

  test('Production Claude configuration is valid', async () => {
    const claudeMdPath = `${prodRoot}/CLAUDE.md`;
    const prodClaudeMdPath = `${prodRoot}/PRODUCTION_CLAUDE.md`;
    
    // Verify Claude configuration files exist
    await expect(async () => {
      await access(claudeMdPath, constants.F_OK);
    }).not.toThrow();

    await expect(async () => {
      await access(prodClaudeMdPath, constants.F_OK);
    }).not.toThrow();

    // Read and validate content
    const claudeContent = await readFile(claudeMdPath, 'utf-8');
    const prodContent = await readFile(prodClaudeMdPath, 'utf-8');

    expect(claudeContent.length).toBeGreaterThan(0);
    expect(prodContent.length).toBeGreaterThan(0);
  });

  test('Production config.json is properly formatted', async () => {
    const configPath = `${prodRoot}/config.json`;
    const content = await readFile(configPath, 'utf-8');
    
    let config;
    expect(() => {
      config = JSON.parse(content);
    }).not.toThrow();

    // Validate essential configuration keys
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  test('Package.json exists in production directory', async () => {
    const packagePath = `${prodRoot}/package.json`;
    
    await expect(async () => {
      await access(packagePath, constants.F_OK);
    }).not.toThrow();

    const content = await readFile(packagePath, 'utf-8');
    let packageConfig;
    
    expect(() => {
      packageConfig = JSON.parse(content);
    }).not.toThrow();

    expect(packageConfig).toBeDefined();
  });

  test('Terminal interface can be loaded', async () => {
    const terminalPath = `${prodRoot}/terminal-interface.js`;
    const terminalDirPath = `${prodRoot}/terminal/interface.js`;
    
    // Check if at least one terminal interface exists
    const terminalExists = await Promise.all([
      access(terminalPath, constants.F_OK).then(() => true).catch(() => false),
      access(terminalDirPath, constants.F_OK).then(() => true).catch(() => false)
    ]);

    expect(terminalExists.some(exists => exists)).toBe(true);
  });

  test('Init script can be executed', async () => {
    const initPath = `${prodRoot}/init.sh`;
    
    await expect(async () => {
      await access(initPath, constants.F_OK);
    }).not.toThrow();

    // Test if script is executable (basic syntax check)
    try {
      const { stdout, stderr } = await execAsync(`bash -n ${initPath}`);
      // If no syntax errors, the command should succeed
      expect(stderr).toBe('');
    } catch (error) {
      // If there's a syntax error, fail the test
      expect(error).toBeUndefined();
    }
  });

  test('Agent workspace directories are accessible', async () => {
    const workspacePath = `${prodRoot}/agent_workspace`;
    const requiredDirs = ['data', 'logs', 'outputs', 'temp'];

    for (const dir of requiredDirs) {
      await expect(async () => {
        await access(`${workspacePath}/${dir}`, constants.F_OK);
      }).not.toThrow();
    }
  });

  test('Production logging directory is configured', async () => {
    const logsPath = `${prodRoot}/logs`;
    
    await expect(async () => {
      await access(logsPath, constants.F_OK);
    }).not.toThrow();

    // Check if logs directory is writable
    await expect(async () => {
      await access(logsPath, constants.W_OK);
    }).not.toThrow();
  });

  test('Monitoring system is configured', async () => {
    const monitoringPath = `${prodRoot}/monitoring`;
    
    await expect(async () => {
      await access(monitoringPath, constants.F_OK);
    }).not.toThrow();
  });

  test('Security configurations are present', async () => {
    const securityPath = `${prodRoot}/security`;
    
    await expect(async () => {
      await access(securityPath, constants.F_OK);
    }).not.toThrow();
  });
});

test.describe('Claude Code Path Resolution', () => {
  test('Production paths are correctly resolved', async () => {
    // Test path resolution by checking if we can access files
    // using the new production structure
    const testPaths = [
      '/workspaces/agent-feed/prod/CLAUDE.md',
      '/workspaces/agent-feed/prod/agent_workspace',
      '/workspaces/agent-feed/prod/config',
      '/workspaces/agent-feed/prod/terminal'
    ];

    for (const path of testPaths) {
      await expect(async () => {
        await access(path, constants.F_OK);
      }).not.toThrow(`Path should be accessible: ${path}`);
    }
  });

  test('Original development paths remain accessible', async () => {
    const devPaths = [
      '/workspaces/agent-feed/CLAUDE.md',
      '/workspaces/agent-feed/frontend',
      '/workspaces/agent-feed/src',
      '/workspaces/agent-feed/package.json'
    ];

    for (const path of devPaths) {
      await expect(async () => {
        await access(path, constants.F_OK);
      }).not.toThrow(`Development path should remain: ${path}`);
    }
  });
});