# SPARC Refinement Phase: TDD Implementation of Claude Code Isolation

## Test-Driven Development Strategy

### 1. Testing Pyramid for Isolation

```
         ┌─────────────────────────────────┐
         │   Integration Tests (E2E)       │ ← Production validation
         │  - Full isolation testing       │
         │  - Cross-boundary validation    │
         └─────────────────────────────────┘
                        ▲
         ┌─────────────────────────────────┐
         │   Component Tests (API)         │ ← Module validation  
         │  - Agent discovery isolation    │
         │  - Configuration validation     │
         │  - Path security enforcement    │
         └─────────────────────────────────┘
                        ▲
         ┌─────────────────────────────────┐
         │   Unit Tests (Functions)        │ ← Algorithm validation
         │  - Path validation functions    │
         │  - Security validation         │
         │  - Configuration parsing       │
         └─────────────────────────────────┘
```

## Implementation Plan with TDD

### Phase 1: Core Security Functions

#### Test 1: Path Validation
```javascript
// Test file: tests/unit/path-validator.test.js
describe('PathValidator', () => {
  test('should validate paths within isolation boundary', () => {
    const validator = new PathValidator('/workspaces/agent-feed/prod');
    
    expect(validator.isValid('/workspaces/agent-feed/prod/test')).toBe(true);
    expect(validator.isValid('/workspaces/agent-feed/src')).toBe(false);
    expect(validator.isValid('../..')).toBe(false);
  });
  
  test('should resolve symlinks and validate', () => {
    // RED: This test will fail initially
    // Implementation needed in PathValidator.resolveAndValidate()
  });
});
```

**Implementation**:
```javascript
class PathValidator {
  constructor(isolationRoot) {
    this.isolationRoot = path.resolve(isolationRoot);
  }
  
  isValid(requestedPath) {
    const normalizedPath = path.resolve(requestedPath);
    return normalizedPath.startsWith(this.isolationRoot);
  }
  
  resolveAndValidate(requestedPath) {
    // TDD: Implement to make test pass
    try {
      const realPath = fs.realpathSync(requestedPath);
      return this.isValid(realPath);
    } catch (error) {
      return false;
    }
  }
}
```

#### Test 2: Configuration Discovery
```javascript
// Test file: tests/unit/config-discovery.test.js
describe('ConfigDiscovery', () => {
  test('should find .claude directory within isolation boundary', async () => {
    const discovery = new ConfigDiscovery('/workspaces/agent-feed/prod');
    
    const config = await discovery.findConfiguration();
    expect(config.path).toStartWith('/workspaces/agent-feed/prod');
    expect(config.isIsolated).toBe(true);
  });
  
  test('should not access parent directory configurations', async () => {
    // RED: This test will fail until parent blocking is implemented
    const discovery = new ConfigDiscovery('/workspaces/agent-feed/prod');
    
    const config = await discovery.findConfiguration();
    expect(config.hasParentAccess).toBe(false);
  });
});
```

### Phase 2: Agent Discovery Isolation

#### Test 3: Agent Discovery
```javascript
// Test file: tests/unit/agent-discovery.test.js
describe('AgentDiscovery', () => {
  beforeEach(() => {
    // Setup isolated agent directory
    this.agentDir = '/workspaces/agent-feed/prod/.claude/agents';
    fs.ensureDirSync(this.agentDir);
  });
  
  test('should discover agents only from isolated paths', async () => {
    const discovery = new AgentDiscovery('/workspaces/agent-feed/prod');
    
    const agents = await discovery.discoverAgents();
    
    agents.forEach(agent => {
      expect(agent.path).toStartWith('/workspaces/agent-feed/prod');
      expect(agent.isIsolated).toBe(true);
    });
  });
  
  test('should validate agent configurations', async () => {
    // RED: Will fail until validation is implemented
    const discovery = new AgentDiscovery('/workspaces/agent-feed/prod');
    
    const agents = await discovery.discoverAgents();
    
    agents.forEach(agent => {
      expect(agent.config).toHaveValidSchema();
      expect(agent.config.isolation).toBeDefined();
      expect(agent.config.isolation.enforced).toBe(true);
    });
  });
});
```

### Phase 3: Complete .claude Directory Implementation

#### Test 4: Directory Structure Creation
```javascript
// Test file: tests/unit/claude-directory-setup.test.js
describe('ClaudeDirectorySetup', () => {
  test('should create complete .claude directory structure', async () => {
    const setup = new ClaudeDirectorySetup('/workspaces/agent-feed/prod');
    
    await setup.createDirectoryStructure();
    
    const expectedDirs = [
      '.claude',
      '.claude/agents',
      '.claude/workflows', 
      '.claude/templates',
      '.claude/schemas',
      '.claude/hooks',
      '.claude/memory',
      '.claude/logs',
      '.claude/cache'
    ];
    
    expectedDirs.forEach(dir => {
      expect(fs.existsSync(path.join('/workspaces/agent-feed/prod', dir))).toBe(true);
    });
  });
  
  test('should create all 54 agent definitions', async () => {
    const setup = new ClaudeDirectorySetup('/workspaces/agent-feed/prod');
    
    await setup.createAgentDefinitions();
    
    const agentCategories = {
      'core': 5,        // coder, reviewer, tester, planner, researcher
      'swarm': 5,       // hierarchical-coordinator, mesh-coordinator, etc.
      'consensus': 7,   // byzantine-coordinator, raft-manager, etc.
      'performance': 5, // perf-analyzer, performance-benchmarker, etc.
      'github': 9,      // github-modes, pr-manager, etc.
      'sparc': 6,       // sparc-coord, sparc-coder, etc.
      'specialized': 8, // backend-dev, mobile-dev, etc.
      'testing': 2,     // tdd-london-swarm, production-validator
      'migration': 2    // migration-planner, swarm-init
    };
    
    Object.entries(agentCategories).forEach(([category, count]) => {
      const categoryPath = path.join('/workspaces/agent-feed/prod/.claude/agents', category);
      const agentFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.json'));
      expect(agentFiles.length).toBe(count);
    });
  });
});
```

**Implementation**:
```javascript
class ClaudeDirectorySetup {
  constructor(isolationRoot) {
    this.isolationRoot = isolationRoot;
    this.claudeDir = path.join(isolationRoot, '.claude');
  }
  
  async createDirectoryStructure() {
    const directories = [
      'agents', 'workflows', 'templates', 'schemas', 
      'hooks', 'memory', 'logs', 'cache'
    ];
    
    await fs.ensureDir(this.claudeDir);
    
    for (const dir of directories) {
      await fs.ensureDir(path.join(this.claudeDir, dir));
    }
    
    // Create subdirectories for agent categories
    const agentCategories = [
      'core', 'swarm', 'consensus', 'performance', 
      'github', 'sparc', 'specialized', 'testing', 'migration'
    ];
    
    for (const category of agentCategories) {
      await fs.ensureDir(path.join(this.claudeDir, 'agents', category));
    }
  }
  
  async createAgentDefinitions() {
    const agentDefinitions = this.getAgentDefinitions();
    
    for (const [category, agents] of Object.entries(agentDefinitions)) {
      for (const agent of agents) {
        const agentPath = path.join(
          this.claudeDir, 'agents', category, `${agent.name}.json`
        );
        
        const agentConfig = {
          name: agent.name,
          version: '1.0.0',
          type: category,
          description: agent.description,
          capabilities: agent.capabilities,
          workspace: {
            required: true,
            path: `/workspaces/agent-feed/prod/agent_workspace/agents/${agent.name}`,
            permissions: {
              read: ['/workspaces/agent-feed/prod'],
              write: ['/workspaces/agent-feed/prod/agent_workspace'],
              blocked: ['/workspaces/agent-feed/src']
            }
          },
          isolation: {
            enforced: true,
            boundaryRoot: this.isolationRoot
          }
        };
        
        await fs.writeJson(agentPath, agentConfig, { spaces: 2 });
      }
    }
  }
  
  getAgentDefinitions() {
    return {
      core: [
        { name: 'coder', description: 'Core development agent', capabilities: ['coding', 'debugging'] },
        { name: 'reviewer', description: 'Code review agent', capabilities: ['review', 'quality'] },
        { name: 'tester', description: 'Testing agent', capabilities: ['testing', 'validation'] },
        { name: 'planner', description: 'Planning agent', capabilities: ['planning', 'architecture'] },
        { name: 'researcher', description: 'Research agent', capabilities: ['research', 'analysis'] }
      ],
      // ... all other agent definitions
    };
  }
}
```

### Phase 4: Integration Testing

#### Test 5: Complete Isolation Validation
```javascript
// Test file: tests/integration/isolation-integration.test.js
describe('Complete Isolation Integration', () => {
  let claudeInstance;
  
  beforeEach(async () => {
    // Setup complete isolated environment
    claudeInstance = new ClaudeCodeIsolated('/workspaces/agent-feed/prod');
    await claudeInstance.initialize();
  });
  
  test('should initialize with complete isolation', async () => {
    expect(claudeInstance.isIsolated).toBe(true);
    expect(claudeInstance.isolationRoot).toBe('/workspaces/agent-feed/prod');
    expect(claudeInstance.hasParentAccess).toBe(false);
  });
  
  test('should discover all 54 agents within isolation', async () => {
    const agents = await claudeInstance.discoverAgents();
    
    expect(agents.length).toBe(54);
    
    agents.forEach(agent => {
      expect(agent.path).toStartWith('/workspaces/agent-feed/prod');
      expect(agent.isIsolated).toBe(true);
    });
  });
  
  test('should prevent access to development files', async () => {
    const forbiddenPaths = [
      '/workspaces/agent-feed/src/app.js',
      '/workspaces/agent-feed/frontend/package.json',
      '/workspaces/agent-feed/tests/jest.config.js',
      '/workspaces/agent-feed/.claude-dev',
      '/workspaces/agent-feed/CLAUDE.md'
    ];
    
    for (const forbiddenPath of forbiddenPaths) {
      await expect(claudeInstance.readFile(forbiddenPath)).rejects.toThrow(/isolation|boundary|access/i);
    }
  });
  
  test('should allow access to production files only', async () => {
    const allowedPaths = [
      '/workspaces/agent-feed/prod/CLAUDE.md',
      '/workspaces/agent-feed/prod/config/claude.config.js',
      '/workspaces/agent-feed/prod/.claude/config.json'
    ];
    
    for (const allowedPath of allowedPaths) {
      if (fs.existsSync(allowedPath)) {
        const content = await claudeInstance.readFile(allowedPath);
        expect(content).toBeDefined();
      }
    }
  });
});
```

### Phase 5: TDD Implementation Steps

#### Step 1: Setup Test Environment
```bash
cd /workspaces/agent-feed/prod
npm install --save-dev jest fs-extra
```

#### Step 2: Create Test Structure
```
/workspaces/agent-feed/prod/tests/
├── unit/
│   ├── path-validator.test.js
│   ├── config-discovery.test.js
│   ├── agent-discovery.test.js
│   └── claude-directory-setup.test.js
├── integration/
│   ├── isolation-integration.test.js
│   ├── agent-workspace-integration.test.js
│   └── configuration-integration.test.js
├── e2e/
│   ├── complete-isolation-e2e.test.js
│   └── production-validation-e2e.test.js
├── fixtures/
│   ├── mock-agents/
│   └── test-configs/
└── helpers/
    ├── test-matchers.js
    └── setup-helpers.js
```

#### Step 3: Custom Test Matchers
```javascript
// Test file: tests/helpers/test-matchers.js
expect.extend({
  toBeIsolatedPath(received) {
    const prodRoot = '/workspaces/agent-feed/prod';
    const isIsolated = received.startsWith(prodRoot);
    
    return {
      message: () => `Expected ${received} ${isIsolated ? 'not ' : ''}to be within isolation boundary`,
      pass: isIsolated
    };
  },
  
  toHaveValidClaudeConfig(received) {
    const requiredFields = ['version', 'environment', 'isolation', 'agents', 'security'];
    const hasRequiredFields = requiredFields.every(field => received.hasOwnProperty(field));
    
    return {
      message: () => `Expected config to have required fields: ${requiredFields.join(', ')}`,
      pass: hasRequiredFields
    };
  },
  
  toHaveValidSchema(received) {
    const requiredAgentFields = ['name', 'version', 'type', 'workspace', 'isolation'];
    const hasRequiredFields = requiredAgentFields.every(field => received.hasOwnProperty(field));
    
    return {
      message: () => `Expected agent config to have required fields: ${requiredAgentFields.join(', ')}`,
      pass: hasRequiredFields
    };
  }
});
```

## TDD Implementation Cycle

### Red-Green-Refactor Cycle

#### Cycle 1: Path Validation
1. **RED**: Write failing test for path validation
2. **GREEN**: Implement minimal PathValidator class
3. **REFACTOR**: Optimize path resolution and validation

#### Cycle 2: Configuration Discovery
1. **RED**: Write failing test for config discovery
2. **GREEN**: Implement ConfigDiscovery class
3. **REFACTOR**: Add caching and optimization

#### Cycle 3: Agent Discovery
1. **RED**: Write failing test for agent discovery isolation
2. **GREEN**: Implement AgentDiscovery class
3. **REFACTOR**: Add validation and error handling

#### Cycle 4: Complete Integration
1. **RED**: Write failing integration tests
2. **GREEN**: Integrate all components
3. **REFACTOR**: Optimize performance and security

## Testing Strategy

### 1. Unit Test Coverage Requirements
- Path validation: 100%
- Configuration parsing: 100%
- Agent discovery: 100%
- Security validation: 100%

### 2. Integration Test Scenarios
- Complete isolation setup
- Agent discovery and validation
- Configuration inheritance blocking
- Security boundary enforcement

### 3. End-to-End Test Scenarios
- Production Claude instance initialization
- Complete workflow execution
- Cross-boundary access prevention
- Performance validation

## Implementation Deliverables

### Code Deliverables
1. **PathValidator** class with complete isolation
2. **ConfigDiscovery** class with parent blocking
3. **AgentDiscovery** class with validation
4. **ClaudeDirectorySetup** class with complete structure
5. **ClaudeCodeIsolated** main class

### Test Deliverables
1. **54 agent definitions** in JSON format
2. **Complete test suite** with 100% coverage
3. **Integration test scenarios**
4. **E2E validation tests**
5. **Performance benchmarks**

### Configuration Deliverables
1. **Complete .claude directory** structure
2. **All configuration files** properly isolated
3. **Security validation** implementations
4. **Audit logging** mechanisms

---

**Status**: TDD Implementation Plan Complete
**Test Coverage Target**: 100%
**Security Level**: CRITICAL
**Next Phase**: Implementation Execution