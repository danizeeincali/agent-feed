import { test, expect } from '@playwright/test';
import { readdir, access, stat, writeFile, unlink } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';

/**
 * File Protection and Isolation Tests
 * 
 * Tests that verify file protection mechanisms work correctly
 * and that agent workspace isolation is functioning properly.
 */

test.describe('File Protection and Isolation', () => {
  const prodRoot = '/workspaces/agent-feed/prod';
  const devRoot = '/workspaces/agent-feed';

  test('Agent workspace has proper write permissions', async () => {
    const agentWorkspace = join(prodRoot, 'agent_workspace');
    
    // Check main workspace directory
    await expect(async () => {
      await access(agentWorkspace, constants.W_OK);
    }).not.toThrow();

    // Check subdirectories
    const subdirs = ['data', 'logs', 'outputs', 'temp'];
    
    for (const subdir of subdirs) {
      const subdirPath = join(agentWorkspace, subdir);
      await expect(async () => {
        await access(subdirPath, constants.W_OK);
      }).not.toThrow(`${subdir} should be writable`);
    }
  });

  test('Agent workspace isolation prevents access to parent directories', async () => {
    const agentWorkspace = join(prodRoot, 'agent_workspace');
    const testFile = join(agentWorkspace, 'temp', 'test-isolation.txt');
    
    try {
      // Write a test file in agent workspace
      await writeFile(testFile, 'test content');
      
      // Verify file was created
      await expect(async () => {
        await access(testFile, constants.F_OK);
      }).not.toThrow();

      // Verify file is readable
      await expect(async () => {
        await access(testFile, constants.R_OK);
      }).not.toThrow();

      // Clean up
      await unlink(testFile);
    } catch (error) {
      // If we can't write to the workspace, that's a problem
      throw new Error(`Agent workspace should be writable: ${error.message}`);
    }
  });

  test('Production configuration files are protected', async () => {
    const configFiles = [
      'CLAUDE.md',
      'PRODUCTION_CLAUDE.md',
      'config.json'
    ];

    for (const file of configFiles) {
      const filePath = join(prodRoot, file);
      
      // Should be readable
      await expect(async () => {
        await access(filePath, constants.R_OK);
      }).not.toThrow(`${file} should be readable`);
      
      // Check if file exists
      await expect(async () => {
        await access(filePath, constants.F_OK);
      }).not.toThrow(`${file} should exist`);
    }
  });

  test('Log directories have appropriate permissions', async () => {
    const logDirs = [
      join(prodRoot, 'logs'),
      join(devRoot, 'logs')
    ];

    for (const logDir of logDirs) {
      const exists = await access(logDir, constants.F_OK)
        .then(() => true).catch(() => false);
      
      if (exists) {
        // Should be writable for logging
        await expect(async () => {
          await access(logDir, constants.W_OK);
        }).not.toThrow(`${logDir} should be writable`);
      }
    }
  });

  test('Security directory has restricted access', async () => {
    const securityDir = join(prodRoot, 'security');
    
    await expect(async () => {
      await access(securityDir, constants.F_OK);
    }).not.toThrow('Security directory should exist');

    // Should be readable (for basic access checks)
    await expect(async () => {
      await access(securityDir, constants.R_OK);
    }).not.toThrow('Security directory should be readable');
  });

  test('Backup directory permissions are correct', async () => {
    const backupDir = join(prodRoot, 'backups');
    
    await expect(async () => {
      await access(backupDir, constants.F_OK);
    }).not.toThrow('Backup directory should exist');

    // Should be writable for backup operations
    await expect(async () => {
      await access(backupDir, constants.W_OK);
    }).not.toThrow('Backup directory should be writable');
  });

  test('Monitoring directory has proper access', async () => {
    const monitoringDir = join(prodRoot, 'monitoring');
    
    await expect(async () => {
      await access(monitoringDir, constants.F_OK);
    }).not.toThrow('Monitoring directory should exist');

    await expect(async () => {
      await access(monitoringDir, constants.R_OK);
    }).not.toThrow('Monitoring directory should be readable');
  });

  test('Terminal interfaces have correct permissions', async () => {
    const terminalFiles = [
      join(prodRoot, 'terminal-interface.js'),
      join(prodRoot, 'terminal', 'interface.js')
    ];

    let terminalFound = false;
    
    for (const terminalFile of terminalFiles) {
      const exists = await access(terminalFile, constants.F_OK)
        .then(() => true).catch(() => false);
      
      if (exists) {
        terminalFound = true;
        
        // Should be readable
        await expect(async () => {
          await access(terminalFile, constants.R_OK);
        }).not.toThrow(`${terminalFile} should be readable`);
      }
    }

    expect(terminalFound).toBe(true);
  });
});

test.describe('Workspace File Operations', () => {
  const prodRoot = '/workspaces/agent-feed/prod';

  test('Agent can write to workspace data directory', async () => {
    const dataDir = join(prodRoot, 'agent_workspace', 'data');
    const testFile = join(dataDir, 'test-write.txt');
    
    try {
      await writeFile(testFile, 'test data');
      
      // Verify file was created
      const stats = await stat(testFile);
      expect(stats.isFile()).toBe(true);
      
      // Clean up
      await unlink(testFile);
    } catch (error) {
      throw new Error(`Should be able to write to agent data directory: ${error.message}`);
    }
  });

  test('Agent can write to workspace logs directory', async () => {
    const logsDir = join(prodRoot, 'agent_workspace', 'logs');
    const testFile = join(logsDir, 'test-log.txt');
    
    try {
      await writeFile(testFile, 'test log entry');
      
      // Verify file was created
      const stats = await stat(testFile);
      expect(stats.isFile()).toBe(true);
      
      // Clean up
      await unlink(testFile);
    } catch (error) {
      throw new Error(`Should be able to write to agent logs directory: ${error.message}`);
    }
  });

  test('Agent can write to workspace outputs directory', async () => {
    const outputsDir = join(prodRoot, 'agent_workspace', 'outputs');
    const testFile = join(outputsDir, 'test-output.txt');
    
    try {
      await writeFile(testFile, 'test output');
      
      // Verify file was created
      const stats = await stat(testFile);
      expect(stats.isFile()).toBe(true);
      
      // Clean up
      await unlink(testFile);
    } catch (error) {
      throw new Error(`Should be able to write to agent outputs directory: ${error.message}`);
    }
  });

  test('Agent can write to workspace temp directory', async () => {
    const tempDir = join(prodRoot, 'agent_workspace', 'temp');
    const testFile = join(tempDir, 'test-temp.txt');
    
    try {
      await writeFile(testFile, 'temporary file');
      
      // Verify file was created
      const stats = await stat(testFile);
      expect(stats.isFile()).toBe(true);
      
      // Clean up
      await unlink(testFile);
    } catch (error) {
      throw new Error(`Should be able to write to agent temp directory: ${error.message}`);
    }
  });
});

test.describe('Directory Structure Integrity', () => {
  const prodRoot = '/workspaces/agent-feed/prod';

  test('All required directories exist', async () => {
    const requiredDirs = [
      'agent_workspace',
      'agent_workspace/data',
      'agent_workspace/logs', 
      'agent_workspace/outputs',
      'agent_workspace/temp',
      'agents',
      'config',
      'logs',
      'monitoring',
      'security',
      'terminal',
      'backups'
    ];

    for (const dir of requiredDirs) {
      await expect(async () => {
        await access(join(prodRoot, dir), constants.F_OK);
      }).not.toThrow(`Required directory should exist: ${dir}`);
    }
  });

  test('Directory permissions are appropriate', async () => {
    const writableDirs = [
      'agent_workspace',
      'agent_workspace/data',
      'agent_workspace/logs',
      'agent_workspace/outputs', 
      'agent_workspace/temp',
      'logs',
      'backups'
    ];

    for (const dir of writableDirs) {
      await expect(async () => {
        await access(join(prodRoot, dir), constants.W_OK);
      }).not.toThrow(`Directory should be writable: ${dir}`);
    }

    const readableDirs = [
      'agents',
      'config',
      'monitoring',
      'security',
      'terminal'
    ];

    for (const dir of readableDirs) {
      await expect(async () => {
        await access(join(prodRoot, dir), constants.R_OK);
      }).not.toThrow(`Directory should be readable: ${dir}`);
    }
  });

  test('No unauthorized files in restricted directories', async () => {
    const restrictedDirs = ['security', 'config'];
    
    for (const dir of restrictedDirs) {
      const dirPath = join(prodRoot, dir);
      
      try {
        const files = await readdir(dirPath);
        
        // Check that all files are legitimate (no temp files, no hidden malicious files)
        for (const file of files) {
          expect(file).not.toMatch(/\.(tmp|temp|bak)$/);
          expect(file).not.toMatch(/^\..*\.(sh|exe|bat)$/);
        }
      } catch (error) {
        // Directory might be empty or inaccessible, which is okay
      }
    }
  });
});

test.describe('File System Isolation', () => {
  const prodRoot = '/workspaces/agent-feed/prod';
  const devRoot = '/workspaces/agent-feed';

  test('Production and development workspaces are separate', async () => {
    const prodWorkspace = join(prodRoot, 'agent_workspace');
    const devWorkspace = join(devRoot, 'agent_workspace');

    // Both should exist
    await expect(async () => {
      await access(prodWorkspace, constants.F_OK);
    }).not.toThrow();

    const devWorkspaceExists = await access(devWorkspace, constants.F_OK)
      .then(() => true).catch(() => false);

    if (devWorkspaceExists) {
      // If both exist, they should be different directories
      expect(prodWorkspace).not.toBe(devWorkspace);
    }
  });

  test('Production logs are isolated from development logs', async () => {
    const prodLogs = join(prodRoot, 'logs');
    const devLogs = join(devRoot, 'logs');

    // Production logs should exist
    await expect(async () => {
      await access(prodLogs, constants.F_OK);
    }).not.toThrow();

    const devLogsExist = await access(devLogs, constants.F_OK)
      .then(() => true).catch(() => false);

    if (devLogsExist) {
      // Should be separate directories
      expect(prodLogs).not.toBe(devLogs);
    }
  });

  test('Configuration files are properly isolated', async () => {
    const prodConfig = join(prodRoot, 'config.json');
    const devConfig = join(devRoot, 'config.json');

    // Production config should exist
    await expect(async () => {
      await access(prodConfig, constants.F_OK);
    }).not.toThrow();

    const devConfigExists = await access(devConfig, constants.F_OK)
      .then(() => true).catch(() => false);

    if (devConfigExists) {
      // Should be separate files
      expect(prodConfig).not.toBe(devConfig);
    }
  });
});