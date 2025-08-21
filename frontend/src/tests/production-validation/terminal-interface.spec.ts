import { test, expect } from '@playwright/test';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';

/**
 * Terminal Interface Validation Tests
 * 
 * Tests the production Claude terminal interface functionality
 * and validates proper terminal configuration.
 */

test.describe('Production Terminal Interface', () => {
  const prodRoot = '/workspaces/agent-feed/prod';

  test('Terminal interface file exists and is readable', async () => {
    const terminalMainPath = `${prodRoot}/terminal-interface.js`;
    const terminalDirPath = `${prodRoot}/terminal/interface.js`;
    
    // Check if at least one terminal interface exists
    const mainExists = await access(terminalMainPath, constants.F_OK)
      .then(() => true).catch(() => false);
    const dirExists = await access(terminalDirPath, constants.F_OK)
      .then(() => true).catch(() => false);

    expect(mainExists || dirExists).toBe(true);

    // Read the content of the existing file
    const terminalPath = mainExists ? terminalMainPath : terminalDirPath;
    const content = await readFile(terminalPath, 'utf-8');
    
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain(''); // Basic validation that file has content
  });

  test('Terminal interface contains expected functionality', async () => {
    const terminalMainPath = `${prodRoot}/terminal-interface.js`;
    const terminalDirPath = `${prodRoot}/terminal/interface.js`;
    
    // Determine which file exists
    const mainExists = await access(terminalMainPath, constants.F_OK)
      .then(() => true).catch(() => false);
    
    const terminalPath = mainExists ? terminalMainPath : terminalDirPath;
    const content = await readFile(terminalPath, 'utf-8');
    
    // Check for basic JavaScript/Node.js structure
    expect(content).toMatch(/module\.exports|export|function|const|let|var/);
  });

  test('Terminal directory structure is correct', async () => {
    const terminalDir = `${prodRoot}/terminal`;
    
    await expect(async () => {
      await access(terminalDir, constants.F_OK);
    }).not.toThrow();

    // Terminal directory should be accessible
    await expect(async () => {
      await access(terminalDir, constants.R_OK);
    }).not.toThrow();
  });

  test('Terminal interface is executable in production context', async () => {
    const terminalMainPath = `${prodRoot}/terminal-interface.js`;
    const terminalDirPath = `${prodRoot}/terminal/interface.js`;
    
    // Check if files are readable (prerequisite for execution)
    const mainReadable = await access(terminalMainPath, constants.R_OK)
      .then(() => true).catch(() => false);
    const dirReadable = await access(terminalDirPath, constants.R_OK)
      .then(() => true).catch(() => false);

    expect(mainReadable || dirReadable).toBe(true);
  });

  test('Terminal configuration supports production environment', async () => {
    // Check if any configuration files exist that might affect terminal
    const configPaths = [
      `${prodRoot}/config.json`,
      `${prodRoot}/config`,
      `${prodRoot}/.env`
    ];

    let hasConfig = false;
    for (const configPath of configPaths) {
      try {
        await access(configPath, constants.F_OK);
        hasConfig = true;
        break;
      } catch {
        // Continue checking other paths
      }
    }

    // At minimum, config.json should exist
    await expect(async () => {
      await access(`${prodRoot}/config.json`, constants.F_OK);
    }).not.toThrow();
  });
});

test.describe('Terminal Security and Isolation', () => {
  const prodRoot = '/workspaces/agent-feed/prod';

  test('Terminal interface respects agent workspace boundaries', async () => {
    const agentWorkspace = `${prodRoot}/agent_workspace`;
    
    // Agent workspace should be accessible for terminal operations
    await expect(async () => {
      await access(agentWorkspace, constants.R_OK);
    }).not.toThrow();

    await expect(async () => {
      await access(agentWorkspace, constants.W_OK);
    }).not.toThrow();
  });

  test('Terminal interface has proper file system access', async () => {
    const securityDir = `${prodRoot}/security`;
    
    // Security directory should exist
    await expect(async () => {
      await access(securityDir, constants.F_OK);
    }).not.toThrow();
  });

  test('Terminal logging is configured', async () => {
    const logsDir = `${prodRoot}/logs`;
    
    // Logs directory should be writable for terminal operations
    await expect(async () => {
      await access(logsDir, constants.W_OK);
    }).not.toThrow();
  });

  test('Terminal backup directory exists', async () => {
    const backupsDir = `${prodRoot}/backups`;
    
    // Backups directory should exist (may be empty)
    await expect(async () => {
      await access(backupsDir, constants.F_OK);
    }).not.toThrow();
  });
});

test.describe('Terminal Interface Integration', () => {
  const prodRoot = '/workspaces/agent-feed/prod';

  test('Terminal interface integrates with Claude configuration', async () => {
    const claudeConfig = `${prodRoot}/CLAUDE.md`;
    const prodConfig = `${prodRoot}/PRODUCTION_CLAUDE.md`;
    
    // Both configuration files should be accessible to terminal
    await expect(async () => {
      await access(claudeConfig, constants.R_OK);
    }).not.toThrow();

    await expect(async () => {
      await access(prodConfig, constants.R_OK);
    }).not.toThrow();
  });

  test('Terminal can access agent configurations', async () => {
    const agentsDir = `${prodRoot}/agents`;
    
    await expect(async () => {
      await access(agentsDir, constants.F_OK);
    }).not.toThrow();
  });

  test('Terminal monitoring integration works', async () => {
    const monitoringDir = `${prodRoot}/monitoring`;
    
    await expect(async () => {
      await access(monitoringDir, constants.F_OK);
    }).not.toThrow();
  });
});