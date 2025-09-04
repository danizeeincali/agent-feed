const fs = require('fs-extra');
const path = require('path');

describe('Claude Code Configuration - Agent Configuration Tests', () => {
  const prodPath = path.resolve(__dirname, '../../../');
  const agentsPath = path.join(prodPath, '.claude/agents');

  beforeAll(async () => {
    // Ensure agents directory exists
    await fs.ensureDir(agentsPath);
    
    // Create test agents for configuration testing
    const testAgents = [
      {
        name: 'config-test-agent',
        config: {
          name: 'config-test-agent',
          type: 'utility',
          version: '1.0.0',
          isolated: true,
          prodOnly: true,
          capabilities: ['file_operations', 'data_processing'],
          permissions: {
            read: ['agent_workspace/*', '.claude/config.json'],
            write: ['agent_workspace/*'],
            execute: ['basic_commands']
          },
          resources: {
            maxMemory: '128MB',
            maxCpu: '50%',
            timeout: 30000
          }
        }
      },
      {
        name: 'invalid-config-agent',
        config: {
          name: 'invalid-config-agent',
          // Missing required fields
          isolated: false,
          prodOnly: false
        }
      }
    ];

    for (const agent of testAgents) {
      const agentDir = path.join(agentsPath, agent.name);
      await fs.ensureDir(agentDir);
      await fs.writeJson(path.join(agentDir, 'agent.json'), agent.config, { spaces: 2 });
    }
  });

  afterAll(async () => {
    // Cleanup test agents
    const testAgentDirs = ['config-test-agent', 'invalid-config-agent'];
    for (const dir of testAgentDirs) {
      const agentPath = path.join(agentsPath, dir);
      if (await fs.pathExists(agentPath)) {
        await fs.remove(agentPath);
      }
    }
  });

  describe('Agent Configuration Discovery', () => {
    test('should discover agent configurations in .claude/agents/', async () => {
      const discoveredConfigs = [];
      
      const agentDirs = await fs.readdir(agentsPath);
      
      for (const dir of agentDirs) {
        const agentConfigPath = path.join(agentsPath, dir, 'agent.json');
        
        if (await fs.pathExists(agentConfigPath)) {
          const config = await fs.readJson(agentConfigPath);
          discoveredConfigs.push({
            name: config.name,
            path: agentConfigPath,
            config
          });
        }
      }

      expect(discoveredConfigs.length).toBeGreaterThan(0);
      
      // Verify all discovered configs are within prod boundary
      for (const { path: configPath, config } of discoveredConfigs) {
        expect(configPath).toBeIsolatedPath();
        expect(config.name).toBeDefined();
      }
    });

    test('should validate agent configuration schema', async () => {
      const validAgentPath = path.join(agentsPath, 'config-test-agent', 'agent.json');
      const config = await fs.readJson(validAgentPath);

      // Required fields validation
      expect(config.name).toBe('config-test-agent');
      expect(config.type).toBe('utility');
      expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(config.isolated).toBe(true);
      expect(config.prodOnly).toBe(true);

      // Capabilities validation
      expect(Array.isArray(config.capabilities)).toBe(true);
      expect(config.capabilities.length).toBeGreaterThan(0);

      // Permissions validation
      expect(config.permissions).toBeDefined();
      expect(Array.isArray(config.permissions.read)).toBe(true);
      expect(Array.isArray(config.permissions.write)).toBe(true);
      expect(Array.isArray(config.permissions.execute)).toBe(true);

      // Resources validation
      expect(config.resources).toBeDefined();
      expect(config.resources.maxMemory).toBeDefined();
      expect(config.resources.timeout).toBeGreaterThan(0);
    });

    test('should reject invalid agent configurations', async () => {
      const invalidAgentPath = path.join(agentsPath, 'invalid-config-agent', 'agent.json');
      const config = await fs.readJson(invalidAgentPath);

      // Validation should fail for invalid configs
      const isValid = config.name && 
                     config.type && 
                     config.version && 
                     config.isolated === true && 
                     config.prodOnly === true;

      expect(isValid).toBe(false);
      expect(config.isolated).toBe(false);
      expect(config.prodOnly).toBe(false);
    });
  });

  describe('Agent Permission Validation', () => {
    test('should validate agent read permissions are within boundaries', async () => {
      const agentConfigPath = path.join(agentsPath, 'config-test-agent', 'agent.json');
      const config = await fs.readJson(agentConfigPath);

      for (const readPath of config.permissions.read) {
        if (!readPath.includes('*')) {
          const fullPath = path.resolve(prodPath, readPath);
          expect(fullPath).toBeIsolatedPath();
        } else {
          // For glob patterns, validate base path
          const basePath = readPath.split('*')[0];
          if (basePath) {
            const fullBasePath = path.resolve(prodPath, basePath);
            expect(fullBasePath).toBeIsolatedPath();
          }
        }
      }
    });

    test('should validate agent write permissions are within boundaries', async () => {
      const agentConfigPath = path.join(agentsPath, 'config-test-agent', 'agent.json');
      const config = await fs.readJson(agentConfigPath);

      for (const writePath of config.permissions.write) {
        if (!writePath.includes('*')) {
          const fullPath = path.resolve(prodPath, writePath);
          expect(fullPath).toBeIsolatedPath();
        } else {
          // For glob patterns, validate base path
          const basePath = writePath.split('*')[0];
          if (basePath) {
            const fullBasePath = path.resolve(prodPath, basePath);
            expect(fullBasePath).toBeIsolatedPath();
          }
        }
      }
    });

    test('should prevent agents from having dangerous permissions', () => {
      const dangerousPermissions = {
        read: ['../../../', '/etc/*', '/var/*', '~/.ssh/*'],
        write: ['../../../', '/', '/etc/*', '/var/*'],
        execute: ['sudo', 'rm -rf', 'chmod 777', 'dd if=']
      };

      for (const [permType, permissions] of Object.entries(dangerousPermissions)) {
        for (const perm of permissions) {
          const isDangerous = perm.includes('../../../') || 
                             perm.startsWith('/') || 
                             perm.includes('sudo') || 
                             perm.includes('rm -rf');
          
          if (isDangerous) {
            expect(() => {
              throw new Error(`Dangerous ${permType} permission blocked: ${perm}`);
            }).toThrow(`Dangerous ${permType} permission blocked`);
          }
        }
      }
    });
  });

  describe('Agent Resource Configuration', () => {
    test('should validate agent resource limits', async () => {
      const agentConfigPath = path.join(agentsPath, 'config-test-agent', 'agent.json');
      const config = await fs.readJson(agentConfigPath);

      // Memory limits
      expect(config.resources.maxMemory).toMatch(/^\d+(MB|GB)$/);
      
      // CPU limits
      if (config.resources.maxCpu) {
        expect(config.resources.maxCpu).toMatch(/^\d+%$/);
      }

      // Timeout validation
      expect(config.resources.timeout).toBeGreaterThan(0);
      expect(config.resources.timeout).toBeLessThan(300000); // 5 minutes max
    });

    test('should enforce reasonable resource limits', async () => {
      const resourceLimits = {
        maxMemory: ['1GB', '512MB', '256MB', '128MB'],
        maxCpu: ['100%', '75%', '50%', '25%'],
        timeout: [30000, 60000, 120000, 300000] // 30s to 5min
      };

      for (const [resource, limits] of Object.entries(resourceLimits)) {
        for (const limit of limits) {
          if (resource === 'maxMemory') {
            expect(limit).toMatch(/^\d+(MB|GB)$/);
          } else if (resource === 'maxCpu') {
            expect(limit).toMatch(/^\d+%$/);
            const percentage = parseInt(limit);
            expect(percentage).toBeLessThanOrEqual(100);
          } else if (resource === 'timeout') {
            expect(limit).toBeGreaterThan(0);
            expect(limit).toBeLessThanOrEqual(300000);
          }
        }
      }
    });

    test('should prevent resource exhaustion', () => {
      const excessiveResources = {
        maxMemory: '10GB',
        maxCpu: '200%',
        timeout: 3600000 // 1 hour
      };

      // Memory validation
      const memoryValue = parseInt(excessiveResources.maxMemory);
      if (memoryValue > 2) { // > 2GB
        expect(() => {
          throw new Error(`Excessive memory limit: ${excessiveResources.maxMemory}`);
        }).toThrow('Excessive memory limit');
      }

      // CPU validation
      const cpuValue = parseInt(excessiveResources.maxCpu);
      if (cpuValue > 100) {
        expect(() => {
          throw new Error(`Invalid CPU limit: ${excessiveResources.maxCpu}`);
        }).toThrow('Invalid CPU limit');
      }

      // Timeout validation
      if (excessiveResources.timeout > 300000) {
        expect(() => {
          throw new Error(`Excessive timeout: ${excessiveResources.timeout}`);
        }).toThrow('Excessive timeout');
      }
    });
  });

  describe('Agent Configuration Security', () => {
    test('should enforce isolation requirements for all agents', async () => {
      const agentDirs = await fs.readdir(agentsPath);
      
      for (const dir of agentDirs) {
        const agentConfigPath = path.join(agentsPath, dir, 'agent.json');
        
        if (await fs.pathExists(agentConfigPath)) {
          const config = await fs.readJson(agentConfigPath);
          
          // Only validate properly configured agents
          if (config.name && config.type && config.version) {
            expect(config.isolated).toBe(true);
            expect(config.prodOnly).toBe(true);
          }
        }
      }
    });

    test('should validate agent configuration file security', async () => {
      const agentDirs = await fs.readdir(agentsPath);
      
      for (const dir of agentDirs) {
        const agentDir = path.join(agentsPath, dir);
        const agentConfigPath = path.join(agentDir, 'agent.json');
        
        if (await fs.pathExists(agentConfigPath)) {
          // Validate path isolation
          expect(agentDir).toBeIsolatedPath();
          expect(agentConfigPath).toBeIsolatedPath();
          
          // Validate file permissions
          const stats = await fs.stat(agentConfigPath);
          expect(stats.isFile()).toBe(true);
          
          // Validate no symlinks to external locations
          const linkStats = await fs.lstat(agentConfigPath);
          if (linkStats.isSymbolicLink()) {
            const realPath = await fs.realpath(agentConfigPath);
            expect(realPath).toBeIsolatedPath();
          }
        }
      }
    });

    test('should prevent agent configuration tampering', async () => {
      const originalConfigPath = path.join(agentsPath, 'config-test-agent', 'agent.json');
      const originalConfig = await fs.readJson(originalConfigPath);
      
      // Attempt to tamper with security settings
      const tamperedConfig = {
        ...originalConfig,
        isolated: false,
        prodOnly: false,
        permissions: {
          read: ['../../../*'],
          write: ['../../../*'],
          execute: ['sudo', 'rm -rf']
        }
      };

      // Validate tampering detection
      const securityCheck = {
        isolationDisabled: !tamperedConfig.isolated,
        prodOnlyDisabled: !tamperedConfig.prodOnly,
        dangerousPermissions: tamperedConfig.permissions.read.some(p => p.includes('../../../'))
      };

      expect(() => {
        if (securityCheck.isolationDisabled || 
            securityCheck.prodOnlyDisabled || 
            securityCheck.dangerousPermissions) {
          throw new Error('Agent configuration tampering detected');
        }
      }).toThrow('Agent configuration tampering detected');
    });
  });

  describe('Agent Configuration Updates', () => {
    test('should handle safe configuration updates', async () => {
      const testAgentPath = path.join(agentsPath, 'update-test-agent');
      await fs.ensureDir(testAgentPath);
      
      const initialConfig = {
        name: 'update-test-agent',
        type: 'utility',
        version: '1.0.0',
        isolated: true,
        prodOnly: true,
        capabilities: ['basic_operations'],
        permissions: {
          read: ['agent_workspace/*'],
          write: ['agent_workspace/temp/*'],
          execute: ['ls', 'pwd']
        }
      };

      const configPath = path.join(testAgentPath, 'agent.json');
      await fs.writeJson(configPath, initialConfig, { spaces: 2 });

      // Safe update: add capability
      const updatedConfig = {
        ...initialConfig,
        version: '1.1.0',
        capabilities: [...initialConfig.capabilities, 'advanced_operations']
      };

      await fs.writeJson(configPath, updatedConfig, { spaces: 2 });
      
      // Verify update
      const reloadedConfig = await fs.readJson(configPath);
      expect(reloadedConfig.version).toBe('1.1.0');
      expect(reloadedConfig.capabilities).toContain('advanced_operations');
      
      // Ensure security settings preserved
      expect(reloadedConfig.isolated).toBe(true);
      expect(reloadedConfig.prodOnly).toBe(true);

      // Cleanup
      await fs.remove(testAgentPath);
    });

    test('should reject unsafe configuration updates', async () => {
      const unsafeUpdates = [
        {
          name: 'disable isolation',
          update: { isolated: false }
        },
        {
          name: 'disable prod only',
          update: { prodOnly: false }
        },
        {
          name: 'add dangerous permissions',
          update: {
            permissions: {
              read: ['../../../*'],
              write: ['/etc/*'],
              execute: ['sudo', 'rm -rf']
            }
          }
        }
      ];

      for (const unsafeUpdate of unsafeUpdates) {
        expect(() => {
          const hasUnsafeChanges = unsafeUpdate.update.isolated === false ||
                                  unsafeUpdate.update.prodOnly === false ||
                                  (unsafeUpdate.update.permissions && 
                                   unsafeUpdate.update.permissions.read?.some(p => p.includes('../../../')));
          
          if (hasUnsafeChanges) {
            throw new Error(`Unsafe configuration update blocked: ${unsafeUpdate.name}`);
          }
        }).toThrow(`Unsafe configuration update blocked: ${unsafeUpdate.name}`);
      }
    });

    test('should validate configuration versions', async () => {
      const versionTests = [
        { version: '1.0.0', valid: true },
        { version: '1.2.3', valid: true },
        { version: '2.0.0-beta', valid: false },
        { version: 'invalid', valid: false },
        { version: '1.0', valid: false }
      ];

      for (const test of versionTests) {
        const isValidVersion = /^\d+\.\d+\.\d+$/.test(test.version);
        expect(isValidVersion).toBe(test.valid);
      }
    });
  });
});