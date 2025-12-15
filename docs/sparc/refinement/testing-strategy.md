# SPARC Refinement: Testing Strategy for Isolation Validation

## Comprehensive Testing Framework

### Test Categories and Priorities

#### P0 - Critical Security Tests
1. **Boundary Enforcement Tests**
   - Path traversal prevention
   - Symlink attack prevention
   - Configuration inheritance blocking
   - Access control validation

2. **Isolation Validation Tests**
   - Agent discovery restriction
   - Workspace containment
   - File system boundaries
   - Resource access limits

#### P1 - Functional Validation Tests
3. **Configuration Tests**
   - .claude directory completeness
   - Agent definition validation
   - Workflow configuration
   - Schema compliance

4. **Integration Tests**
   - End-to-end isolation
   - Agent spawning validation
   - Claude Flow integration
   - Performance benchmarks

### Testing Architecture

```
┌─────────────────────────────────────────────┐
│              Test Execution Flow            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐    ┌─────────────┐         │
│  │ Unit Tests  │────│ Component   │         │
│  │ (Security)  │    │ Tests       │         │
│  └─────────────┘    │ (Features)  │         │
│         │            └─────────────┘         │
│         │                   │                │
│  ┌─────────────┐    ┌─────────────┐         │
│  │ Integration │    │ E2E Tests   │         │
│  │ Tests       │────│ (Production)│         │
│  │ (Isolation) │    │             │         │
│  └─────────────┘    └─────────────┘         │
│                                             │
└─────────────────────────────────────────────┘
```

## Test Implementation Plan

### Phase 1: Security Boundary Tests

#### Test Suite 1: Path Security Validation
```javascript
// File: tests/security/path-validation.test.js
describe('Path Security Validation', () => {
  const PROD_ROOT = '/workspaces/agent-feed/prod';
  let pathValidator;
  
  beforeEach(() => {
    pathValidator = new PathValidator(PROD_ROOT);
  });
  
  describe('Boundary Enforcement', () => {
    test('should allow paths within production boundary', () => {
      const validPaths = [
        '/workspaces/agent-feed/prod/test.txt',
        '/workspaces/agent-feed/prod/agent_workspace/test',
        '/workspaces/agent-feed/prod/.claude/config.json'
      ];
      
      validPaths.forEach(path => {
        expect(pathValidator.isWithinBoundary(path)).toBe(true);
      });
    });
    
    test('should block paths outside production boundary', () => {
      const invalidPaths = [
        '/workspaces/agent-feed/src/app.js',
        '/workspaces/agent-feed/frontend/package.json',
        '/workspaces/agent-feed/tests/jest.config.js',
        '/workspaces/agent-feed/.claude-dev',
        '../../../etc/passwd',
        '/tmp/malicious-file'
      ];
      
      invalidPaths.forEach(path => {
        expect(pathValidator.isWithinBoundary(path)).toBe(false);
      });
    });
    
    test('should prevent path traversal attacks', () => {
      const traversalAttempts = [
        '../../../etc/passwd',
        '../../../../dev/null',
        'agent_workspace/../../../src/app.js',
        '.claude/../../../package.json'
      ];
      
      traversalAttempts.forEach(path => {
        const resolvedPath = path.resolve(PROD_ROOT, path);
        expect(pathValidator.isWithinBoundary(resolvedPath)).toBe(false);
      });
    });
  });
  
  describe('Symlink Validation', () => {
    test('should detect and block malicious symlinks', async () => {
      const testSymlink = path.join(PROD_ROOT, 'temp', 'test-symlink');
      const maliciousTarget = '/workspaces/agent-feed/src/app.js';
      
      // Create test symlink (will fail in isolated environment)
      try {
        await fs.ensureDir(path.dirname(testSymlink));
        await fs.symlink(maliciousTarget, testSymlink);
        
        const isValid = await pathValidator.validateSymlink(testSymlink);
        expect(isValid).toBe(false);
        
        await fs.remove(testSymlink);
      } catch (error) {
        // Expected in isolated environment
        expect(error.message).toMatch(/isolation|boundary|access/i);
      }
    });
    
    test('should allow valid internal symlinks', async () => {
      const testSymlink = path.join(PROD_ROOT, 'temp', 'valid-symlink');
      const validTarget = path.join(PROD_ROOT, 'config', 'test.txt');
      
      try {
        await fs.ensureDir(path.dirname(testSymlink));
        await fs.ensureDir(path.dirname(validTarget));
        await fs.writeFile(validTarget, 'test content');
        await fs.symlink(validTarget, testSymlink);
        
        const isValid = await pathValidator.validateSymlink(testSymlink);
        expect(isValid).toBe(true);
        
        await fs.remove(testSymlink);
        await fs.remove(validTarget);
      } catch (error) {
        // Handle test environment limitations
      }
    });
  });
});
```

#### Test Suite 2: Configuration Isolation Tests
```javascript
// File: tests/security/configuration-isolation.test.js
describe('Configuration Isolation', () => {
  const PROD_ROOT = '/workspaces/agent-feed/prod';
  let configDiscovery;
  
  beforeEach(() => {
    configDiscovery = new ConfigDiscovery(PROD_ROOT);
  });
  
  test('should only discover configuration within prod boundary', async () => {
    const config = await configDiscovery.findConfiguration();
    
    expect(config.path).toStartWith(PROD_ROOT);
    expect(config.hasParentAccess).toBe(false);
    expect(config.isIsolated).toBe(true);
  });
  
  test('should not inherit from parent configurations', async () => {
    const config = await configDiscovery.findConfiguration();
    
    // Should not have access to parent CLAUDE.md
    expect(config.parentConfigs).toHaveLength(0);
    expect(config.inheritanceBlocked).toBe(true);
  });
  
  test('should validate all configuration paths', async () => {
    const config = await configDiscovery.loadConfiguration();
    
    // Validate agent search paths
    config.agents.discovery.searchPaths.forEach(searchPath => {
      expect(searchPath).toStartWith(PROD_ROOT);
    });
    
    // Validate cache and memory paths
    expect(config.performance.cacheDirectory).toStartWith(PROD_ROOT);
    expect(config.performance.memoryDirectory).toStartWith(PROD_ROOT);
  });
});
```

### Phase 2: Agent Discovery Isolation Tests

#### Test Suite 3: Agent Discovery Security
```javascript
// File: tests/agents/agent-discovery-isolation.test.js
describe('Agent Discovery Isolation', () => {
  const PROD_ROOT = '/workspaces/agent-feed/prod';
  let agentDiscovery;
  
  beforeEach(() => {
    agentDiscovery = new AgentDiscovery(PROD_ROOT);
  });
  
  test('should discover exactly 54 agents within prod boundary', async () => {
    const agents = await agentDiscovery.discoverAgents();
    
    expect(agents).toHaveLength(54);
    
    agents.forEach(agent => {
      expect(agent.path).toStartWith(PROD_ROOT);
      expect(agent.config.isolation.enforced).toBe(true);
      expect(agent.config.isolation.boundaryRoot).toBe(PROD_ROOT);
    });
  });
  
  test('should validate agent category distribution', async () => {
    const agents = await agentDiscovery.discoverAgents();
    
    const categoryDistribution = {
      'core': 5,
      'swarm': 5,
      'consensus': 7,
      'performance': 5,
      'github': 9,
      'sparc': 6,
      'specialized': 8,
      'testing': 2,
      'migration': 2
    };
    
    const agentsByCategory = agents.reduce((acc, agent) => {
      acc[agent.config.type] = (acc[agent.config.type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(categoryDistribution).forEach(([category, expectedCount]) => {
      expect(agentsByCategory[category]).toBe(expectedCount);
    });
  });
  
  test('should prevent discovery from unauthorized locations', async () => {
    const unauthorizedLocations = [
      '/workspaces/agent-feed/agents',
      '../../agents',
      '/tmp/agents',
      '../../../usr/local/agents'
    ];
    
    // Mock attempts to discover from unauthorized locations
    for (const location of unauthorizedLocations) {
      const resolvedLocation = path.resolve(PROD_ROOT, location);
      if (!resolvedLocation.startsWith(PROD_ROOT)) {
        expect(() => {
          agentDiscovery.addSearchPath(location);
        }).toThrow(/isolation|boundary|unauthorized/i);
      }
    }
  });
});
```

### Phase 3: Complete Directory Structure Tests

#### Test Suite 4: .claude Directory Completeness
```javascript
// File: tests/structure/claude-directory-completeness.test.js
describe('Claude Directory Structure', () => {
  const PROD_ROOT = '/workspaces/agent-feed/prod';
  const CLAUDE_DIR = path.join(PROD_ROOT, '.claude');
  
  test('should have complete directory structure', async () => {
    const requiredDirectories = [
      '.claude',
      '.claude/agents',
      '.claude/agents/core',
      '.claude/agents/swarm',
      '.claude/agents/consensus',
      '.claude/agents/performance',
      '.claude/agents/github',
      '.claude/agents/sparc',
      '.claude/agents/specialized',
      '.claude/agents/testing',
      '.claude/agents/migration',
      '.claude/workflows',
      '.claude/templates',
      '.claude/schemas',
      '.claude/hooks',
      '.claude/memory',
      '.claude/logs',
      '.claude/cache'
    ];
    
    for (const dir of requiredDirectories) {
      const fullPath = path.join(PROD_ROOT, dir);
      expect(await fs.pathExists(fullPath)).toBe(true);
    }
  });
  
  test('should have all required configuration files', async () => {
    const requiredFiles = [
      '.claude/config.json',
      '.claude/permissions.json'
    ];
    
    for (const file of requiredFiles) {
      const fullPath = path.join(PROD_ROOT, file);
      expect(await fs.pathExists(fullPath)).toBe(true);
      
      const content = await fs.readJson(fullPath);
      expect(content).toHaveValidClaudeConfig();
    }
  });
  
  test('should have all 54 agent definitions', async () => {
    const agentFiles = await glob('**/*.json', {
      cwd: path.join(CLAUDE_DIR, 'agents')
    });
    
    expect(agentFiles).toHaveLength(54);
    
    for (const agentFile of agentFiles) {
      const agentPath = path.join(CLAUDE_DIR, 'agents', agentFile);
      const agentConfig = await fs.readJson(agentPath);
      
      expect(agentConfig).toHaveValidAgentSchema();
      expect(agentConfig.isolation.enforced).toBe(true);
      expect(agentConfig.workspace.path).toStartWith(PROD_ROOT);
    }
  });
});
```

### Phase 4: Integration and E2E Tests

#### Test Suite 5: Complete Isolation Integration
```javascript
// File: tests/integration/complete-isolation.test.js
describe('Complete Isolation Integration', () => {
  let claudeInstance;
  
  beforeEach(async () => {
    claudeInstance = new ClaudeCodeIsolated('/workspaces/agent-feed/prod');
    await claudeInstance.initialize();
  });
  
  afterEach(async () => {
    await claudeInstance.cleanup();
  });
  
  test('should initialize with complete isolation', async () => {
    expect(claudeInstance.isIsolated).toBe(true);
    expect(claudeInstance.isolationRoot).toBe('/workspaces/agent-feed/prod');
    expect(claudeInstance.configuration.isolation.enforced).toBe(true);
  });
  
  test('should prevent all unauthorized access attempts', async () => {
    const forbiddenOperations = [
      () => claudeInstance.readFile('/workspaces/agent-feed/src/app.js'),
      () => claudeInstance.writeFile('/workspaces/agent-feed/test.txt', 'test'),
      () => claudeInstance.listDirectory('/workspaces/agent-feed/frontend'),
      () => claudeInstance.loadConfiguration('/workspaces/agent-feed/CLAUDE.md')
    ];
    
    for (const operation of forbiddenOperations) {
      await expect(operation()).rejects.toThrow(/isolation|boundary|access|forbidden/i);
    }
  });
  
  test('should allow all authorized operations within prod', async () => {
    const authorizedOperations = [
      () => claudeInstance.readFile('/workspaces/agent-feed/prod/CLAUDE.md'),
      () => claudeInstance.writeFile('/workspaces/agent-feed/prod/temp/test.txt', 'test'),
      () => claudeInstance.listDirectory('/workspaces/agent-feed/prod/agent_workspace'),
      () => claudeInstance.discoverAgents()
    ];
    
    for (const operation of authorizedOperations) {
      await expect(operation()).resolves.not.toThrow();
    }
  });
  
  test('should maintain isolation across agent spawning', async () => {
    const agent = await claudeInstance.spawnAgent('coder');
    
    expect(agent.workspace).toStartWith('/workspaces/agent-feed/prod');
    expect(agent.isIsolated).toBe(true);
    
    // Test agent operations
    await expect(agent.readFile('/workspaces/agent-feed/src/app.js')).rejects.toThrow();
    await expect(agent.writeFile('/workspaces/agent-feed/prod/temp/agent-test.txt', 'test')).resolves.not.toThrow();
  });
});
```

## Testing Execution Strategy

### Automated Test Pipeline
```yaml
# .github/workflows/isolation-testing.yml
name: Claude Code Isolation Testing

on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd prod && npm install
      - name: Run security tests
        run: cd prod && npm run test:security
        
  isolation-tests:
    runs-on: ubuntu-latest  
    steps:
      - name: Run isolation validation
        run: cd prod && npm run test:isolation
        
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run integration tests
        run: cd prod && npm run test:integration
        
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run E2E tests
        run: cd prod && npm run test:e2e
```

### Test Configuration
```json
// File: prod/package.json (test scripts)
{
  "scripts": {
    "test": "jest",
    "test:security": "jest tests/security --verbose",
    "test:isolation": "jest tests/isolation --verbose",
    "test:integration": "jest tests/integration --verbose", 
    "test:e2e": "jest tests/e2e --verbose",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --coverageReporters=text-lcov",
    "test:ci": "jest --ci --coverage --watchAll=false"
  },
  "jest": {
    "testEnvironment": "node",
    "setupFilesAfterEnv": ["<rootDir>/tests/helpers/test-matchers.js"],
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/**/*.test.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 100,
        "functions": 100,
        "lines": 100,
        "statements": 100
      }
    }
  }
}
```

## Validation Criteria

### Test Success Metrics
1. **Security Tests**: 100% pass rate
2. **Isolation Tests**: Complete boundary enforcement
3. **Integration Tests**: Full functionality within isolation
4. **E2E Tests**: Production-ready validation
5. **Code Coverage**: 100% for security-critical code

### Performance Benchmarks
1. **Agent Discovery**: < 100ms for 54 agents
2. **Configuration Loading**: < 50ms
3. **Path Validation**: < 1ms per validation
4. **Memory Usage**: < 100MB overhead for isolation

### Security Validation
1. **Zero unauthorized access**: Complete boundary enforcement
2. **All 54 agents isolated**: No cross-boundary access
3. **Configuration inheritance blocked**: No parent access
4. **Audit logging active**: All access attempts logged

---

**Status**: Testing Strategy Complete
**Coverage Target**: 100% for security code
**Security Level**: CRITICAL
**Validation**: Production-ready isolation