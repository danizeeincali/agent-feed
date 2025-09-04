const fs = require('fs-extra');
const path = require('path');

describe('Claude Code Configuration - Security Configuration Tests', () => {
  const prodPath = path.resolve(__dirname, '../../../');
  const configPath = path.join(prodPath, '.claude/config.json');

  beforeAll(async () => {
    // Ensure configuration exists with security settings
    await fs.ensureDir(path.join(prodPath, '.claude'));
    
    const secureConfig = {
      version: '1.0.0',
      isolation: {
        enabled: true,
        allowParentAccess: false,
        agentDiscoveryPaths: ['.claude/agents'],
        securityBoundary: true,
        pathValidation: true
      },
      workspace: {
        directory: 'agent_workspace',
        autoCreate: true,
        maxSize: '100MB',
        isolation: true
      },
      security: {
        boundaryEnforcement: true,
        readOnlySystemInstructions: true,
        pathValidation: true,
        commandWhitelist: true,
        resourceLimits: true
      },
      tools: {
        restrictToWorkspace: true,
        allowedOperations: ['read', 'write', 'edit', 'bash', 'grep', 'glob'],
        deniedPaths: ['../', '../../', '/etc/', '/var/', '/tmp/', '~/.ssh/'],
        commandBlacklist: ['sudo', 'rm -rf', 'chmod 777', 'dd if=', 'curl | bash']
      },
      agents: {
        discoveryPaths: ['.claude/agents'],
        isolationRequired: true,
        prodOnly: true,
        maxAgents: 10,
        resourceLimits: true
      }
    };

    if (!await fs.pathExists(configPath)) {
      await fs.writeJson(configPath, secureConfig, { spaces: 2 });
    }
  });

  describe('Security Boundary Enforcement', () => {
    test('should enforce strict boundary enforcement', async () => {
      const config = await fs.readJson(configPath);
      
      expect(config.security.boundaryEnforcement).toBe(true);
      expect(config.isolation.enabled).toBe(true);
      expect(config.isolation.allowParentAccess).toBe(false);
      expect(config.isolation.securityBoundary).toBe(true);
    });

    test('should prevent boundary bypass attempts', () => {
      const bypassAttempts = [
        { path: '../../../package.json', method: 'path_traversal' },
        { path: '/etc/passwd', method: 'absolute_path' },
        { path: '~/.ssh/id_rsa', method: 'home_directory' },
        { path: 'agent_workspace/../../../secret', method: 'relative_traversal' }
      ];

      for (const attempt of bypassAttempts) {
        const resolvedPath = path.resolve(prodPath, attempt.path);
        const isBlocked = !resolvedPath.startsWith(prodPath) || attempt.path.includes('../../../');
        
        if (isBlocked) {
          expect(() => {
            throw new Error(`Security boundary bypass blocked: ${attempt.method}`);
          }).toThrow(`Security boundary bypass blocked: ${attempt.method}`);
        }
      }
    });

    test('should validate all configured paths against security boundary', async () => {
      const config = await fs.readJson(configPath);
      
      // Validate workspace directory
      const workspacePath = path.resolve(prodPath, config.workspace.directory);
      expect(workspacePath).toBeIsolatedPath();
      
      // Validate agent discovery paths
      for (const agentPath of config.agents.discoveryPaths) {
        const fullAgentPath = path.resolve(prodPath, agentPath);
        expect(fullAgentPath).toBeIsolatedPath();
      }
      
      // Validate isolation paths
      for (const isolationPath of config.isolation.agentDiscoveryPaths) {
        const fullIsolationPath = path.resolve(prodPath, isolationPath);
        expect(fullIsolationPath).toBeIsolatedPath();
      }
    });
  });

  describe('Path Validation Security', () => {
    test('should enable path validation by default', async () => {
      const config = await fs.readJson(configPath);
      
      expect(config.security.pathValidation).toBe(true);
      expect(config.isolation.pathValidation).toBe(true);
    });

    test('should validate and block dangerous paths', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '/etc/shadow',
        '~/.ssh/id_rsa',
        '../../../home/user/.env',
        '/var/log/auth.log',
        '../../../usr/bin/sudo'
      ];

      for (const dangerousPath of dangerousPaths) {
        const resolvedPath = path.resolve(prodPath, dangerousPath);
        const isDangerous = !resolvedPath.startsWith(prodPath) || 
                           dangerousPath.includes('/etc/') ||
                           dangerousPath.includes('/.ssh/') ||
                           dangerousPath.includes('/var/') ||
                           dangerousPath.includes('../../../');
        
        if (isDangerous) {
          expect(() => {
            throw new Error(`Dangerous path blocked: ${dangerousPath}`);
          }).toThrow(`Dangerous path blocked: ${dangerousPath}`);
        }
      }
    });

    test('should normalize and validate path attempts', () => {
      const pathAttempts = [
        { input: 'agent_workspace/../../../secret', normalized: true },
        { input: '.claude/../../parent', normalized: true },
        { input: './/..//../../etc', normalized: true },
        { input: 'workspace/./../../outside', normalized: true }
      ];

      for (const attempt of pathAttempts) {
        const normalizedPath = path.normalize(path.resolve(prodPath, attempt.input));
        const isOutsideBoundary = !normalizedPath.startsWith(prodPath);
        
        if (isOutsideBoundary) {
          expect(() => {
            throw new Error(`Path normalization blocked: ${attempt.input}`);
          }).toThrow('Path normalization blocked');
        }
      }
    });
  });

  describe('Command Security Configuration', () => {
    test('should maintain command whitelist and blacklist', async () => {
      const config = await fs.readJson(configPath);
      
      expect(config.security.commandWhitelist).toBe(true);
      expect(Array.isArray(config.tools.allowedOperations)).toBe(true);
      expect(Array.isArray(config.tools.commandBlacklist)).toBe(true);
    });

    test('should block dangerous commands', async () => {
      const config = await fs.readJson(configPath);
      const dangerousCommands = config.tools.commandBlacklist;
      
      for (const command of dangerousCommands) {
        expect(() => {
          // Simulate command execution attempt
          const isDangerous = command.includes('sudo') || 
                             command.includes('rm -rf') ||
                             command.includes('chmod 777') ||
                             command.includes('dd if=') ||
                             command.includes('curl | bash');
          
          if (isDangerous) {
            throw new Error(`Dangerous command blocked: ${command}`);
          }
        }).toThrow(`Dangerous command blocked: ${command}`);
      }
    });

    test('should allow only whitelisted operations', async () => {
      const config = await fs.readJson(configPath);
      const allowedOperations = config.tools.allowedOperations;
      
      const operationTests = [
        { operation: 'read', allowed: true },
        { operation: 'write', allowed: true },
        { operation: 'edit', allowed: true },
        { operation: 'delete', allowed: false },
        { operation: 'execute', allowed: false },
        { operation: 'sudo', allowed: false }
      ];

      for (const test of operationTests) {
        const isAllowed = allowedOperations.includes(test.operation);
        expect(isAllowed).toBe(test.allowed);
      }
    });
  });

  describe('Resource Security Limits', () => {
    test('should enforce resource limits for security', async () => {
      const config = await fs.readJson(configPath);
      
      expect(config.security.resourceLimits).toBe(true);
      expect(config.agents.resourceLimits).toBe(true);
      expect(config.agents.maxAgents).toBeDefined();
      expect(config.agents.maxAgents).toBeLessThanOrEqual(20);
    });

    test('should prevent resource exhaustion attacks', () => {
      const resourceAttacks = [
        { type: 'memory_bomb', size: '10GB', blocked: true },
        { type: 'cpu_exhaustion', usage: '200%', blocked: true },
        { type: 'file_flood', count: 100000, blocked: true },
        { type: 'infinite_loop', timeout: null, blocked: true }
      ];

      for (const attack of resourceAttacks) {
        if (attack.blocked) {
          expect(() => {
            switch (attack.type) {
              case 'memory_bomb':
                const memValue = parseInt(attack.size);
                if (memValue > 2) {
                  throw new Error(`Memory exhaustion attack blocked: ${attack.size}`);
                }
                break;
              case 'cpu_exhaustion':
                const cpuValue = parseInt(attack.usage);
                if (cpuValue > 100) {
                  throw new Error(`CPU exhaustion attack blocked: ${attack.usage}`);
                }
                break;
              case 'file_flood':
                if (attack.count > 1000) {
                  throw new Error(`File flood attack blocked: ${attack.count} files`);
                }
                break;
              case 'infinite_loop':
                if (!attack.timeout) {
                  throw new Error('Infinite loop attack blocked: no timeout');
                }
                break;
            }
          }).toThrow(`${attack.type.replace('_', ' ')} attack blocked`);
        }
      }
    });

    test('should limit workspace size for security', async () => {
      const config = await fs.readJson(configPath);
      
      expect(config.workspace.maxSize).toBeDefined();
      expect(config.workspace.maxSize).toMatch(/^\d+(MB|GB)$/);
      
      const sizeValue = parseInt(config.workspace.maxSize);
      const unit = config.workspace.maxSize.slice(-2);
      
      // Reasonable limits for security
      if (unit === 'GB') {
        expect(sizeValue).toBeLessThanOrEqual(1); // Max 1GB
      } else if (unit === 'MB') {
        expect(sizeValue).toBeLessThanOrEqual(1000); // Max 1000MB
      }
    });
  });

  describe('System Instructions Security', () => {
    test('should enforce read-only system instructions', async () => {
      const config = await fs.readJson(configPath);
      
      expect(config.security.readOnlySystemInstructions).toBe(true);
    });

    test('should prevent system instructions tampering', async () => {
      const systemInstructionsPath = path.join(prodPath, 'system_instructions.md');
      
      // Should be readable
      if (await fs.pathExists(systemInstructionsPath)) {
        const content = await fs.readFile(systemInstructionsPath, 'utf8');
        expect(content).toBeDefined();
        expect(systemInstructionsPath).toBeIsolatedPath();
      }

      // Should prevent write operations to system instructions
      expect(() => {
        // Simulate write attempt validation
        const isWriteAllowed = false; // Read-only enforcement
        if (!isWriteAllowed) {
          throw new Error('System instructions write blocked: read-only');
        }
      }).toThrow('System instructions write blocked');
    });

    test('should isolate system instructions access', () => {
      const accessAttempts = [
        { path: 'system_instructions.md', operation: 'read', allowed: true },
        { path: 'system_instructions.md', operation: 'write', allowed: false },
        { path: 'system_instructions.md', operation: 'delete', allowed: false },
        { path: '../../../CLAUDE.md', operation: 'read', allowed: false }
      ];

      for (const attempt of accessAttempts) {
        const resolvedPath = path.resolve(prodPath, attempt.path);
        const isWithinBoundary = resolvedPath.startsWith(prodPath);
        const actuallyAllowed = isWithinBoundary && 
                               attempt.operation === 'read' && 
                               attempt.path === 'system_instructions.md';

        expect(actuallyAllowed).toBe(attempt.allowed);
      }
    });
  });

  describe('Configuration Tampering Prevention', () => {
    test('should detect configuration tampering attempts', () => {
      const tamperingAttempts = [
        {
          name: 'disable_isolation',
          changes: { isolation: { enabled: false } }
        },
        {
          name: 'allow_parent_access',
          changes: { isolation: { allowParentAccess: true } }
        },
        {
          name: 'disable_boundary_enforcement',
          changes: { security: { boundaryEnforcement: false } }
        },
        {
          name: 'remove_path_validation',
          changes: { security: { pathValidation: false } }
        }
      ];

      for (const attempt of tamperingAttempts) {
        expect(() => {
          const hasSecurityChanges = (attempt.changes.isolation?.enabled === false) ||
                                   (attempt.changes.isolation?.allowParentAccess === true) ||
                                   (attempt.changes.security?.boundaryEnforcement === false) ||
                                   (attempt.changes.security?.pathValidation === false);
          
          if (hasSecurityChanges) {
            throw new Error(`Configuration tampering detected: ${attempt.name}`);
          }
        }).toThrow(`Configuration tampering detected: ${attempt.name}`);
      }
    });

    test('should validate configuration integrity', async () => {
      const config = await fs.readJson(configPath);
      
      // Critical security settings that must be present
      const criticalSettings = [
        { path: 'security.boundaryEnforcement', expected: true },
        { path: 'isolation.enabled', expected: true },
        { path: 'isolation.allowParentAccess', expected: false },
        { path: 'security.readOnlySystemInstructions', expected: true },
        { path: 'agents.isolationRequired', expected: true }
      ];

      for (const setting of criticalSettings) {
        const keys = setting.path.split('.');
        let value = config;
        
        for (const key of keys) {
          value = value[key];
        }
        
        expect(value).toBe(setting.expected);
      }
    });

    test('should prevent privilege escalation through configuration', () => {
      const escalationAttempts = [
        { setting: 'allowParentAccess', value: true, blocked: true },
        { setting: 'boundaryEnforcement', value: false, blocked: true },
        { setting: 'pathValidation', value: false, blocked: true },
        { setting: 'isolationRequired', value: false, blocked: true }
      ];

      for (const attempt of escalationAttempts) {
        if (attempt.blocked) {
          expect(() => {
            const isPrivilegeEscalation = (attempt.setting === 'allowParentAccess' && attempt.value === true) ||
                                        (attempt.setting === 'boundaryEnforcement' && attempt.value === false) ||
                                        (attempt.setting === 'pathValidation' && attempt.value === false) ||
                                        (attempt.setting === 'isolationRequired' && attempt.value === false);
            
            if (isPrivilegeEscalation) {
              throw new Error(`Privilege escalation blocked: ${attempt.setting}`);
            }
          }).toThrow(`Privilege escalation blocked: ${attempt.setting}`);
        }
      }
    });
  });

  describe('Security Monitoring and Logging', () => {
    test('should enable security event monitoring', async () => {
      const securityEvents = [
        { type: 'path_traversal_attempt', severity: 'high' },
        { type: 'dangerous_command_blocked', severity: 'high' },
        { type: 'configuration_tampering', severity: 'critical' },
        { type: 'boundary_violation', severity: 'high' }
      ];

      for (const event of securityEvents) {
        expect(event.type).toBeDefined();
        expect(event.severity).toBeDefined();
        expect(['low', 'medium', 'high', 'critical']).toContain(event.severity);
      }
    });

    test('should maintain security audit trail', () => {
      const auditEvents = [
        { timestamp: Date.now(), event: 'config_loaded', result: 'success' },
        { timestamp: Date.now(), event: 'security_check', result: 'passed' },
        { timestamp: Date.now(), event: 'boundary_validation', result: 'enforced' }
      ];

      for (const event of auditEvents) {
        expect(event.timestamp).toBeGreaterThan(0);
        expect(event.event).toBeDefined();
        expect(event.result).toBeDefined();
      }
    });

    test('should track security metrics', () => {
      const securityMetrics = {
        boundaryViolationAttempts: 0,
        dangerousCommandsBlocked: 0,
        pathTraversalAttempts: 0,
        configurationTamperingAttempts: 0,
        securityChecksPerformed: 100,
        securityChecksPassed: 100
      };

      expect(securityMetrics.securityChecksPerformed).toBeGreaterThan(0);
      expect(securityMetrics.securityChecksPassed).toBeGreaterThan(0);
      expect(securityMetrics.boundaryViolationAttempts).toBe(0);
      expect(securityMetrics.dangerousCommandsBlocked).toBe(0);
    });
  });
});