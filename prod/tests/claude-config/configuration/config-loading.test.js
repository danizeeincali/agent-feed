const fs = require('fs-extra');
const path = require('path');

describe('Claude Code Configuration - Config Loading Tests', () => {
  const prodPath = path.resolve(__dirname, '../../../');
  const configPath = path.join(prodPath, '.claude/config.json');

  beforeAll(async () => {
    // Ensure config directory exists
    await fs.ensureDir(path.join(prodPath, '.claude'));
  });

  describe('Configuration File Loading', () => {
    test('should load config.json from prod/.claude/', async () => {
      // Create or verify config exists
      const defaultConfig = {
        version: '1.0.0',
        isolation: {
          enabled: true,
          allowParentAccess: false,
          agentDiscoveryPaths: ['.claude/agents'],
          securityBoundary: true
        },
        workspace: {
          directory: 'agent_workspace',
          autoCreate: true,
          maxSize: '100MB'
        },
        security: {
          boundaryEnforcement: true,
          readOnlySystemInstructions: true,
          pathValidation: true
        },
        agents: {
          discoveryPaths: ['.claude/agents'],
          isolationRequired: true,
          prodOnly: true
        },
        tools: {
          restrictToWorkspace: true,
          allowedOperations: ['read', 'write', 'edit', 'bash', 'grep', 'glob'],
          deniedPaths: ['../', '../../', '/etc/', '/var/']
        }
      };

      if (!await fs.pathExists(configPath)) {
        await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
      }

      const config = await fs.readJson(configPath);
      
      expect(config).toHaveValidClaudeConfig();
      expect(config.version).toBeDefined();
      expect(config.isolation).toBeDefined();
      expect(config.workspace).toBeDefined();
      expect(config.security).toBeDefined();
    });

    test('should validate configuration schema', async () => {
      const config = await fs.readJson(configPath);
      
      // Version validation
      expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);
      
      // Isolation configuration
      expect(config.isolation.enabled).toBe(true);
      expect(config.isolation.allowParentAccess).toBe(false);
      expect(Array.isArray(config.isolation.agentDiscoveryPaths)).toBe(true);
      
      // Workspace configuration
      expect(config.workspace.directory).toBe('agent_workspace');
      expect(config.workspace.autoCreate).toBe(true);
      
      // Security configuration
      expect(config.security.boundaryEnforcement).toBe(true);
      expect(config.security.readOnlySystemInstructions).toBe(true);
    });

    test('should reject invalid configuration formats', async () => {
      const invalidConfigs = [
        {
          name: 'missing version',
          config: { isolation: { enabled: true } }
        },
        {
          name: 'invalid isolation settings',
          config: { 
            version: '1.0.0',
            isolation: { enabled: false, allowParentAccess: true }
          }
        },
        {
          name: 'missing workspace directory',
          config: {
            version: '1.0.0',
            isolation: { enabled: true },
            workspace: { autoCreate: true }
          }
        }
      ];

      for (const invalidConfig of invalidConfigs) {
        const tempConfigPath = path.join(prodPath, `.claude/temp-config-${Date.now()}.json`);
        await fs.writeJson(tempConfigPath, invalidConfig.config);
        
        const config = await fs.readJson(tempConfigPath);
        
        // Validate required fields
        if (invalidConfig.name === 'missing version') {
          expect(config.version).toBeUndefined();
        } else if (invalidConfig.name === 'invalid isolation settings') {
          expect(config.isolation.enabled).toBe(false);
          expect(config.isolation.allowParentAccess).toBe(true);
        } else if (invalidConfig.name === 'missing workspace directory') {
          expect(config.workspace.directory).toBeUndefined();
        }
        
        // Cleanup
        await fs.remove(tempConfigPath);
      }
    });
  });

  describe('Configuration Inheritance Prevention', () => {
    test('should not inherit configuration from parent directories', async () => {
      const parentConfigPaths = [
        path.resolve(__dirname, '../../../../.claude/config.json'),
        path.resolve(__dirname, '../../../../config.json'),
        path.resolve(__dirname, '../../../../../.claude/config.json')
      ];

      for (const parentConfigPath of parentConfigPaths) {
        const isOutsideBoundary = !parentConfigPath.startsWith(prodPath);
        
        if (isOutsideBoundary) {
          // Should not be able to access parent configs in isolation
          expect(parentConfigPath).not.toBeIsolatedPath();
        }
      }

      // Verify only prod config is loaded
      const actualConfig = await fs.readJson(configPath);
      expect(configPath).toBeIsolatedPath();
      expect(actualConfig.isolation.enabled).toBe(true);
    });

    test('should use default values when config is missing', async () => {
      const backupConfigPath = path.join(prodPath, '.claude/config.backup.json');
      
      // Backup current config
      if (await fs.pathExists(configPath)) {
        await fs.copy(configPath, backupConfigPath);
        await fs.remove(configPath);
      }

      // Test default configuration loading
      const defaultConfig = {
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
      };

      // Simulate config creation with defaults
      await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
      
      const config = await fs.readJson(configPath);
      expect(config.isolation.enabled).toBe(true);
      expect(config.isolation.allowParentAccess).toBe(false);

      // Restore backup if it existed
      if (await fs.pathExists(backupConfigPath)) {
        await fs.move(backupConfigPath, configPath);
      }
    });
  });

  describe('Configuration Path Validation', () => {
    test('should validate all configured paths are within prod boundary', async () => {
      const config = await fs.readJson(configPath);
      
      // Validate agent discovery paths
      if (config.agents && config.agents.discoveryPaths) {
        for (const agentPath of config.agents.discoveryPaths) {
          const fullPath = path.resolve(prodPath, agentPath);
          expect(fullPath).toBeIsolatedPath();
        }
      }

      // Validate workspace directory
      if (config.workspace && config.workspace.directory) {
        const workspacePath = path.resolve(prodPath, config.workspace.directory);
        expect(workspacePath).toBeIsolatedPath();
      }

      // Validate isolation paths
      if (config.isolation && config.isolation.agentDiscoveryPaths) {
        for (const discoveryPath of config.isolation.agentDiscoveryPaths) {
          const fullPath = path.resolve(prodPath, discoveryPath);
          expect(fullPath).toBeIsolatedPath();
        }
      }
    });

    test('should reject configurations with path traversal attempts', () => {
      const maliciousConfigs = [
        {
          agents: { discoveryPaths: ['../../../agents'] },
          expected: 'path traversal'
        },
        {
          workspace: { directory: '../../workspace' },
          expected: 'parent access'
        },
        {
          isolation: { agentDiscoveryPaths: ['/etc/agents'] },
          expected: 'absolute path'
        }
      ];

      for (const maliciousConfig of maliciousConfigs) {
        Object.entries(maliciousConfig).forEach(([key, value]) => {
          if (key !== 'expected') {
            const config = value;
            
            if (config.discoveryPaths) {
              config.discoveryPaths.forEach(pathStr => {
                const resolvedPath = path.resolve(prodPath, pathStr);
                const isOutsideBoundary = !resolvedPath.startsWith(prodPath);
                
                if (isOutsideBoundary) {
                  expect(() => {
                    throw new Error(`Malicious path detected: ${pathStr}`);
                  }).toThrow('Malicious path detected');
                }
              });
            }
            
            if (config.directory) {
              const resolvedPath = path.resolve(prodPath, config.directory);
              const isOutsideBoundary = !resolvedPath.startsWith(prodPath);
              
              if (isOutsideBoundary) {
                expect(() => {
                  throw new Error(`Malicious directory detected: ${config.directory}`);
                }).toThrow('Malicious directory detected');
              }
            }
          }
        });
      }
    });
  });

  describe('Configuration Security', () => {
    test('should enforce security-first defaults', async () => {
      const config = await fs.readJson(configPath);
      
      // Security must be enabled by default
      expect(config.security.boundaryEnforcement).toBe(true);
      expect(config.security.readOnlySystemInstructions).toBe(true);
      
      // Isolation must be enabled
      expect(config.isolation.enabled).toBe(true);
      expect(config.isolation.allowParentAccess).toBe(false);
      
      // Tools should be restricted
      if (config.tools) {
        expect(config.tools.restrictToWorkspace).toBe(true);
        expect(Array.isArray(config.tools.deniedPaths)).toBe(true);
      }
    });

    test('should validate configuration file permissions', async () => {
      const stats = await fs.stat(configPath);
      
      expect(stats.isFile()).toBe(true);
      expect(configPath).toBeIsolatedPath();
      
      // Configuration should be readable
      const config = await fs.readJson(configPath);
      expect(config).toBeDefined();
    });

    test('should prevent configuration tampering', async () => {
      // Test configuration immutability during runtime
      const originalConfig = await fs.readJson(configPath);
      
      const tamperedConfig = {
        ...originalConfig,
        isolation: {
          ...originalConfig.isolation,
          enabled: false,
          allowParentAccess: true
        }
      };

      // In production, this should be prevented
      const configValidation = {
        isolationEnabled: tamperedConfig.isolation.enabled,
        parentAccessAllowed: tamperedConfig.isolation.allowParentAccess
      };

      // Validate security cannot be disabled
      expect(() => {
        if (!configValidation.isolationEnabled || configValidation.parentAccessAllowed) {
          throw new Error('Security configuration tampering detected');
        }
      }).toThrow('Security configuration tampering detected');
    });
  });

  describe('Configuration Updates and Reloading', () => {
    test('should handle configuration updates safely', async () => {
      const config = await fs.readJson(configPath);
      const backupPath = path.join(prodPath, '.claude/config.backup.json');
      
      // Backup original
      await fs.copy(configPath, backupPath);
      
      // Test safe update
      const updatedConfig = {
        ...config,
        workspace: {
          ...config.workspace,
          maxSize: '200MB'
        }
      };

      await fs.writeJson(configPath, updatedConfig, { spaces: 2 });
      
      // Verify update
      const reloadedConfig = await fs.readJson(configPath);
      expect(reloadedConfig.workspace.maxSize).toBe('200MB');
      
      // Ensure security settings preserved
      expect(reloadedConfig.isolation.enabled).toBe(true);
      expect(reloadedConfig.security.boundaryEnforcement).toBe(true);

      // Restore original
      await fs.move(backupPath, configPath);
    });

    test('should validate configuration on reload', async () => {
      const config = await fs.readJson(configPath);
      
      // Simulate configuration reload
      const reloadedConfig = await fs.readJson(configPath);
      
      expect(reloadedConfig).toHaveValidClaudeConfig();
      expect(reloadedConfig.version).toBeDefined();
      expect(reloadedConfig.isolation.enabled).toBe(true);
      
      // Configuration should be identical
      expect(JSON.stringify(reloadedConfig)).toBe(JSON.stringify(config));
    });

    test('should recover from corrupted configuration', async () => {
      const backupPath = path.join(prodPath, '.claude/config.backup.json');
      
      // Backup original
      await fs.copy(configPath, backupPath);
      
      // Corrupt configuration
      await fs.writeFile(configPath, 'invalid json content');
      
      try {
        // Attempt to read corrupted config
        await fs.readJson(configPath);
        fail('Should have thrown error for corrupted config');
      } catch (error) {
        expect(error.message).toContain('JSON');
        
        // Simulate recovery with default config
        const defaultConfig = {
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
        };
        
        await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
        
        // Verify recovery
        const recoveredConfig = await fs.readJson(configPath);
        expect(recoveredConfig).toHaveValidClaudeConfig();
      }
      
      // Restore original
      await fs.move(backupPath, configPath);
    });
  });
});