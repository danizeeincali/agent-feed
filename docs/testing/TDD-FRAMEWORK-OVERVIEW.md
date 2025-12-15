# Claude Code VPS + AgentLink TDD Framework

## Overview

This is a comprehensive Test-Driven Development framework specifically designed for the Claude Code VPS + AgentLink implementation, following **London School TDD principles** with mock-driven development and behavior verification.

## Framework Architecture

### 🏗️ Core Components

```
tests/
├── unit/           # Phase-specific unit tests
│   ├── phase1/     # Database schema & API gateway
│   ├── phase2/     # Agent framework & Claude Code integration
│   ├── phase3/     # Frontend integration & MCP protocol
│   └── phase4/     # Production security & monitoring
├── integration/    # Cross-system integration tests
├── contract/       # Claude Code ↔ AgentLink API contracts
├── performance/    # Multi-agent workflow performance
├── security/       # Security and compliance testing
├── e2e/           # Complete workflow end-to-end tests
├── agents/        # Agent-specific testing framework
├── factories/     # Mock creation and management
├── helpers/       # Test utilities and coordination
└── fixtures/      # Test data and configurations
```

## London School TDD Principles

### 🎯 Mock-Driven Development

Our framework follows the London School (mockist) approach with:

- **Outside-In Development**: Start with acceptance tests, work down to implementation
- **Mock-First Design**: Use mocks to define contracts and isolate units
- **Behavior Verification**: Focus on interactions between objects, not state
- **Contract Testing**: Verify communication protocols between systems

### 🔄 TDD Cycle

```
Red → Green → Refactor → Mock → Verify → Integrate
```

1. **Red**: Write failing test with proper mocks
2. **Green**: Implement minimal code to pass
3. **Refactor**: Improve design while maintaining tests
4. **Mock**: Verify mock interactions and contracts
5. **Verify**: Ensure behavioral compliance
6. **Integrate**: Test real system integration

## Implementation Phases

### 📊 Phase 1: Database Schema & API Gateway
- **Focus**: Data layer and HTTP API testing
- **Mock Strategy**: Database operations, HTTP requests/responses
- **Key Tests**: Schema validation, API contracts, rate limiting

```javascript
// Example: Database schema validation
it('should create agent_executions table with proper schema', async () => {
  const schemaManager = new DatabaseSchema(mockDatabase, mockValidator);
  await schemaManager.createAgentExecutionsTable();
  
  expect(mockValidator.validateSchema).toHaveBeenCalledWith(
    expect.objectContaining(expectedSchema)
  );
});
```

### 🤖 Phase 2: Agent Framework & Claude Code Integration
- **Focus**: Agent lifecycle and tool integration
- **Mock Strategy**: Claude Code tools (Read, Write, Edit, Bash), Agent coordination
- **Key Tests**: Agent spawning, tool execution, handoff patterns

```javascript
// Example: Agent handoff testing
it('should coordinate agent handoff with context preservation', async () => {
  const handoffResult = await framework.handoffAgent(
    sourceAgent, targetAgent, handoffContext
  );
  
  expect(mockSwarmCoordination.sendMessage).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'handoff', context: handoffContext })
  );
});
```

### 🌐 Phase 3: Frontend Integration & MCP Protocol
- **Focus**: Real-time updates and protocol compliance
- **Mock Strategy**: WebSocket connections, MCP client/server
- **Key Tests**: Event broadcasting, protocol validation, session persistence

```javascript
// Example: Real-time update testing
it('should broadcast agent execution start to connected clients', async () => {
  await frontendIntegration.broadcastAgentEvent(executionEvent);
  
  expect(mockAgentLinkAPI.emitWebSocketEvent).toHaveBeenCalledWith({
    eventType: 'agent_execution_start',
    data: executionEvent
  });
});
```

### 🔒 Phase 4: Production Security & Monitoring
- **Focus**: Security, compliance, and observability
- **Mock Strategy**: Authentication systems, encryption services, monitoring
- **Key Tests**: Token validation, audit logging, performance metrics

```javascript
// Example: Security testing
it('should handle token tampering attempts with security logging', async () => {
  const authResult = await authService.authenticateRequest({
    headers: { authorization: `Bearer ${tamperedToken}` }
  });
  
  expect(mockAuditLogger.logFailure).toHaveBeenCalledWith(
    expect.objectContaining({ reason: 'token_tampering', severity: 'high' })
  );
});
```

## Mock Factory System

### 🏭 Centralized Mock Creation

The `MockFactory` provides consistent, reusable mocks for all system components:

```javascript
// Claude Code Tools
const claudeCodeMocks = mockFactory.createClaudeCodeMocks();
// Returns: { Read, Write, Edit, MultiEdit, Bash, Glob, Grep, LS }

// AgentLink API
const agentLinkMocks = mockFactory.createAgentLinkMocks();
// Returns: { postAgentExecution, postActivity, updateProject, emitWebSocketEvent }

// Agent Configurations
const agentMocks = mockFactory.createAgentMocks('coder');
// Returns: { initialize, execute, cleanup, receiveMessage, sendMessage, handoff }
```

### 🎭 Mock Strategies

1. **Tool Mocking**: Claude Code operations return predictable responses
2. **API Mocking**: AgentLink endpoints simulate real behavior patterns
3. **Agent Mocking**: Agent lifecycle and coordination behaviors
4. **Infrastructure Mocking**: Database, WebSocket, encryption services

## Contract Testing

### 📋 Contract Verification

The framework ensures all contracts between Claude Code and AgentLink are satisfied:

```javascript
// Contract definition
const writeContract = {
  input: { file_path: 'string', content: 'string' },
  output: { success: 'boolean', path: 'string', bytesWritten: 'number' },
  sideEffects: [{
    system: 'AgentLink',
    action: 'postActivity',
    data: { type: 'file_operation', details: 'object' }
  }]
};

// Contract verification
expect(result).toSatisfyContract(writeContract);
```

### 🔗 Contract Chain Validation

Tests verify complete interaction chains:
1. Claude Code tool execution
2. AgentLink API logging
3. WebSocket event broadcasting
4. Database state changes

## Agent Testing Framework

### 🧪 Comprehensive Agent Testing

The framework tests all 21+ agent configurations:

```javascript
// Core agents: coder, reviewer, tester, planner, researcher
// Coordination: hierarchical-coordinator, mesh-coordinator, adaptive-coordinator
// Consensus: byzantine-coordinator, raft-manager, gossip-coordinator
// Performance: perf-analyzer, performance-benchmarker, task-orchestrator
// GitHub: github-modes, pr-manager, code-review-swarm
// SPARC: sparc-coord, sparc-coder, specification, pseudocode, architecture
```

### 🔄 Agent Test Categories

1. **Configuration Validation**: MD config parsing and validation
2. **Capability Testing**: Agent-specific function verification
3. **Coordination Testing**: Multi-agent workflow execution
4. **Performance Testing**: Response time and resource usage
5. **Error Handling**: Failure modes and recovery

## Performance Testing

### ⚡ Multi-Agent Workflow Performance

The framework includes comprehensive performance testing:

- **Response Time**: Individual agent execution timing
- **Throughput**: Concurrent request handling capacity
- **Resource Usage**: Memory and CPU consumption monitoring
- **Scalability**: Load testing with increasing agent counts
- **Bottleneck Analysis**: Performance constraint identification

### 📈 Performance Profiler

```javascript
const profiler = new PerformanceProfiler();
profiler.startMeasurement('agent_workflow');
// ... execute workflow
const metrics = profiler.endMeasurement('agent_workflow');

// Results include:
// - Duration, memory delta, CPU usage
// - Markers for workflow phases
// - Threshold violation alerts
// - Trend analysis
```

## Security Testing

### 🛡️ Security Test Coverage

- **Authentication**: JWT token validation and tampering detection
- **Authorization**: Role-based access control enforcement
- **Encryption**: Data-at-rest and data-in-transit protection
- **Audit Logging**: Comprehensive activity tracking
- **Rate Limiting**: DDoS protection and abuse prevention
- **Compliance**: SOC2, GDPR, and other regulatory requirements

### 🔍 Security Validation

```javascript
// Example: Encryption validation
it('should encrypt sensitive agent data at rest', async () => {
  const secureData = await securityManager.encryptSensitiveData(sensitiveData);
  
  expect(mockEncryption.encrypt).toHaveBeenCalledWith(
    JSON.stringify(sensitiveData), encryptionKey
  );
  expect(secureData.encrypted).toBe(true);
});
```

## CI/CD Integration

### 🚀 GitHub Actions Pipeline

The framework includes a comprehensive CI/CD pipeline:

```yaml
# Pipeline stages:
1. Phase 1 Tests (Database & API)
2. Phase 2 Tests (Agents & Integration)
3. Phase 3 Tests (Frontend & MCP)
4. Phase 4 Tests (Security & Monitoring)
5. Contract Tests
6. Performance Tests
7. Integration Tests
8. E2E Tests
9. Quality Gates
10. Deployment Ready Check
```

### 📊 Quality Gates

- **Coverage Threshold**: 90% minimum across all phases
- **Performance Benchmarks**: Response time and resource usage limits
- **Security Checks**: Vulnerability scanning and compliance validation
- **Contract Compliance**: All API contracts must pass
- **Code Quality**: Linting, type checking, and best practices

## Test Execution

### 🏃‍♂️ Running Tests

```bash
# Run all tests
npm test

# Phase-specific tests
npm run test:phase1    # Database & API Gateway
npm run test:phase2    # Agent Framework
npm run test:phase3    # Frontend Integration
npm run test:security  # Security Tests

# Specialized test suites
npm run test:contract     # Contract Testing
npm run test:performance  # Performance Testing
npm run test:integration  # Integration Testing
npm run test:e2e         # End-to-End Testing
npm run test:agents      # Agent Framework Testing

# Coverage analysis
npm run test:coverage
npm run coverage:report
```

### 📈 Test Reports

The framework generates comprehensive reports:

- **Coverage Reports**: Line, function, branch, and statement coverage
- **Performance Reports**: Benchmarks, trends, and bottleneck analysis
- **Contract Reports**: API compliance and violation tracking
- **Security Reports**: Vulnerability assessments and compliance status
- **Quality Reports**: Code quality metrics and recommendations

## Best Practices

### ✅ London School TDD Guidelines

1. **Start with Contracts**: Define interfaces through mock expectations
2. **Focus on Behavior**: Test interactions, not implementation details
3. **Use Descriptive Tests**: Test names should describe business behavior
4. **Keep Tests Fast**: Mock external dependencies for speed
5. **Verify Interactions**: Use `toHaveBeenCalledWith` and similar matchers
6. **Test One Thing**: Each test should verify a single behavior
7. **Red-Green-Refactor**: Follow the TDD cycle religiously

### 🎯 Mock Best Practices

1. **Minimal Mocks**: Only mock what you need to isolate the unit under test
2. **Realistic Responses**: Mock responses should match real system behavior
3. **Error Scenarios**: Test both success and failure paths
4. **State Verification**: Use mocks to verify state changes when appropriate
5. **Contract Verification**: Ensure mocks accurately represent real interfaces

### 🔧 Maintenance Guidelines

1. **Keep Tests Updated**: Update tests when contracts change
2. **Review Mock Usage**: Regularly review and refactor mock implementations
3. **Monitor Performance**: Track test execution time and optimize slow tests
4. **Documentation**: Keep test documentation synchronized with implementation
5. **Feedback Loops**: Use test results to improve development processes

## Tools and Dependencies

### 🛠️ Core Testing Stack

- **Jest**: Test runner and assertion library
- **Babel**: JavaScript compilation and transformation
- **ESLint**: Code linting and style enforcement
- **TypeScript**: Type checking and IDE support
- **NYC**: Coverage analysis and reporting
- **Supertest**: HTTP assertion testing

### 📦 Mock Libraries

- **Custom MockFactory**: Centralized mock creation and management
- **Jest Mocks**: Built-in Jest mocking capabilities
- **Test Doubles**: Spies, stubs, and fakes for different scenarios

### 🔄 CI/CD Tools

- **GitHub Actions**: Automated testing and deployment
- **Codecov**: Coverage reporting and analysis
- **ESLint**: Code quality and consistency
- **npm scripts**: Task automation and workflow management

## Getting Started

### 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Initial Test Suite**:
   ```bash
   npm test
   ```

3. **Check Coverage**:
   ```bash
   npm run test:coverage
   ```

4. **Run Specific Phase**:
   ```bash
   npm run test:phase1
   ```

### 📚 Learning Path

1. **Study London School TDD**: Understand mock-driven development principles
2. **Explore Mock Factory**: Learn how mocks are created and managed
3. **Run Phase Tests**: Execute each implementation phase tests
4. **Examine Contract Tests**: Understand API contract verification
5. **Review Agent Tests**: Study agent configuration and coordination testing
6. **Analyze Performance Tests**: Learn performance benchmarking techniques
7. **Study Security Tests**: Understand security validation approaches

### 🤝 Contributing

1. **Follow TDD Principles**: Always write tests first
2. **Use Mock Factory**: Leverage existing mock creation patterns
3. **Update Contracts**: Keep API contracts synchronized
4. **Add Performance Tests**: Include performance validation for new features
5. **Document Changes**: Update documentation for new test patterns

## Support and Resources

- **Documentation**: `/docs/testing/` directory
- **Examples**: Each test file includes comprehensive examples
- **Mock Patterns**: `/tests/factories/` for mock implementation patterns
- **Helper Utilities**: `/tests/helpers/` for test coordination and verification
- **CI/CD Configuration**: `/.github/workflows/` for pipeline setup

---

This TDD framework provides a robust foundation for developing and maintaining the Claude Code VPS + AgentLink implementation with confidence, ensuring high quality, performance, and security through comprehensive testing.