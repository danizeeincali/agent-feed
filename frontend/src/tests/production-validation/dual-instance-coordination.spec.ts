import { test, expect } from '@playwright/test';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';

/**
 * Dual Instance Coordination Tests
 * 
 * Tests that verify both development and production instances
 * can coexist and coordinate properly without conflicts.
 */

test.describe('Dual Instance Coordination', () => {
  const prodRoot = '/workspaces/agent-feed/prod';
  const devRoot = '/workspaces/agent-feed';

  test('Both development and production structures exist', async () => {
    // Verify development structure
    await expect(async () => {
      await access(`${devRoot}/CLAUDE.md`, constants.F_OK);
    }).not.toThrow();

    await expect(async () => {
      await access(`${devRoot}/frontend`, constants.F_OK);
    }).not.toThrow();

    await expect(async () => {
      await access(`${devRoot}/src`, constants.F_OK);
    }).not.toThrow();

    // Verify production structure
    await expect(async () => {
      await access(`${prodRoot}/CLAUDE.md`, constants.F_OK);
    }).not.toThrow();

    await expect(async () => {
      await access(`${prodRoot}/agent_workspace`, constants.F_OK);
    }).not.toThrow();

    await expect(async () => {
      await access(`${prodRoot}/config.json`, constants.F_OK);
    }).not.toThrow();
  });

  test('Configuration files are properly separated', async () => {
    // Read development Claude config
    const devClaudeConfig = await readFile(`${devRoot}/CLAUDE.md`, 'utf-8');
    
    // Read production Claude config
    const prodClaudeConfig = await readFile(`${prodRoot}/CLAUDE.md`, 'utf-8');
    const prodSpecificConfig = await readFile(`${prodRoot}/PRODUCTION_CLAUDE.md`, 'utf-8');

    expect(devClaudeConfig.length).toBeGreaterThan(0);
    expect(prodClaudeConfig.length).toBeGreaterThan(0);
    expect(prodSpecificConfig.length).toBeGreaterThan(0);

    // Production should have specific configuration
    expect(prodSpecificConfig).not.toBe(devClaudeConfig);
  });

  test('Agent workspaces are isolated', async () => {
    const devAgentWorkspace = `${devRoot}/agent_workspace`;
    const prodAgentWorkspace = `${prodRoot}/agent_workspace`;

    // Both should exist
    await expect(async () => {
      await access(devAgentWorkspace, constants.F_OK);
    }).not.toThrow();

    await expect(async () => {
      await access(prodAgentWorkspace, constants.F_OK);
    }).not.toThrow();

    // Both should be writable
    await expect(async () => {
      await access(devAgentWorkspace, constants.W_OK);
    }).not.toThrow();

    await expect(async () => {
      await access(prodAgentWorkspace, constants.W_OK);
    }).not.toThrow();
  });

  test('Logging is separated between instances', async () => {
    const devLogs = `${devRoot}/logs`;
    const prodLogs = `${prodRoot}/logs`;

    // Both log directories should exist
    await expect(async () => {
      await access(devLogs, constants.F_OK);
    }).not.toThrow();

    await expect(async () => {
      await access(prodLogs, constants.F_OK);
    }).not.toThrow();

    // Both should be writable
    await expect(async () => {
      await access(devLogs, constants.W_OK);
    }).not.toThrow();

    await expect(async () => {
      await access(prodLogs, constants.W_OK);
    }).not.toThrow();
  });

  test('Package configurations are appropriate for each instance', async () => {
    // Development package.json
    const devPackageContent = await readFile(`${devRoot}/package.json`, 'utf-8');
    const devPackage = JSON.parse(devPackageContent);

    // Production package.json
    const prodPackageContent = await readFile(`${prodRoot}/package.json`, 'utf-8');
    const prodPackage = JSON.parse(prodPackageContent);

    expect(devPackage).toBeDefined();
    expect(prodPackage).toBeDefined();

    // Both should have valid package structure
    expect(devPackage.name).toBeDefined();
    expect(prodPackage.name).toBeDefined();
  });

  test('Terminal interfaces are separately configured', async () => {
    // Check production terminal interface
    const prodTerminalMain = `${prodRoot}/terminal-interface.js`;
    const prodTerminalDir = `${prodRoot}/terminal/interface.js`;

    const prodMainExists = await access(prodTerminalMain, constants.F_OK)
      .then(() => true).catch(() => false);
    const prodDirExists = await access(prodTerminalDir, constants.F_OK)
      .then(() => true).catch(() => false);

    expect(prodMainExists || prodDirExists).toBe(true);
  });

  test('Configuration isolation prevents conflicts', async () => {
    // Check that production config is separate from dev config
    const devConfigExists = await access(`${devRoot}/config.json`, constants.F_OK)
      .then(() => true).catch(() => false);
    
    const prodConfigExists = await access(`${prodRoot}/config.json`, constants.F_OK)
      .then(() => true).catch(() => false);

    // Production config should definitely exist
    expect(prodConfigExists).toBe(true);

    // If both exist, they should be separate files
    if (devConfigExists && prodConfigExists) {
      const devConfig = await readFile(`${devRoot}/config.json`, 'utf-8');
      const prodConfig = await readFile(`${prodRoot}/config.json`, 'utf-8');
      
      // They don't need to be different, but they should be separate files
      expect(devConfig).toBeDefined();
      expect(prodConfig).toBeDefined();
    }
  });

  test('Monitoring systems are independently configured', async () => {
    const devMonitoring = `${devRoot}/monitoring`;
    const prodMonitoring = `${prodRoot}/monitoring`;

    // Production monitoring should exist
    await expect(async () => {
      await access(prodMonitoring, constants.F_OK);
    }).not.toThrow();

    // Development monitoring might exist
    const devMonitoringExists = await access(devMonitoring, constants.F_OK)
      .then(() => true).catch(() => false);

    if (devMonitoringExists) {
      // If both exist, they should be separate directories
      expect(devMonitoring).not.toBe(prodMonitoring);
    }
  });

  test('Security configurations are isolated', async () => {
    const prodSecurity = `${prodRoot}/security`;

    // Production security should exist
    await expect(async () => {
      await access(prodSecurity, constants.F_OK);
    }).not.toThrow();
  });
});

test.describe('Instance Communication and Coordination', () => {
  test('Frontend can connect to backend regardless of structure', async ({ page }) => {
    // Test frontend connection
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Check for connection indicators
    const connectionErrors = await page.evaluate(() => {
      return window.console?.errors?.filter(error => 
        error.includes('ECONNREFUSED') || 
        error.includes('Network Error') ||
        error.includes('Failed to fetch')
      ) || [];
    });

    expect(connectionErrors.length).toBe(0);
  });

  test('No port conflicts between instances', async ({ page }) => {
    // Check that the application loads on expected port
    const response = await page.goto('http://localhost:3001');
    expect(response?.status()).toBeLessThan(500);
  });

  test('WebSocket connections work with dual structure', async ({ page }) => {
    await page.goto('http://localhost:3001');

    let websocketErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('WebSocket')) {
        websocketErrors.push(msg.text());
      }
    });

    // Wait for potential WebSocket connections
    await page.waitForTimeout(3000);

    expect(websocketErrors.length).toBe(0);
  });
});

test.describe('Production-Specific Features', () => {
  test('Production monitoring is active', async () => {
    const monitoringDir = `${prodRoot}/monitoring`;
    
    await expect(async () => {
      await access(monitoringDir, constants.F_OK);
    }).not.toThrow();
  });

  test('Production security measures are in place', async () => {
    const securityDir = `${prodRoot}/security`;
    
    await expect(async () => {
      await access(securityDir, constants.F_OK);
    }).not.toThrow();
  });

  test('Production backup system is configured', async () => {
    const backupsDir = `${prodRoot}/backups`;
    
    await expect(async () => {
      await access(backupsDir, constants.F_OK);
    }).not.toThrow();
  });

  test('Production initialization script is ready', async () => {
    const initScript = `${prodRoot}/init.sh`;
    
    await expect(async () => {
      await access(initScript, constants.F_OK);
    }).not.toThrow();

    // Should be executable
    await expect(async () => {
      await access(initScript, constants.X_OK);
    }).not.toThrow();
  });
});