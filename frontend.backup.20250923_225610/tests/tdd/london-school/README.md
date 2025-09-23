# London School TDD Test Suite for ClaudeServiceManager

## Overview

This comprehensive test suite follows the London School (mockist) approach to Test-Driven Development, focusing on behavior verification and interaction testing for the ClaudeServiceManager architecture.

## Test Structure

```
london-school/
├── unit/                     # Mock-driven unit tests
│   ├── ClaudeServiceManager.test.tsx
│   └── useClaudeInstances.test.ts
├── integration/              # Component coordination tests
│   └── ClaudeManagerCoordination.test.tsx
├── e2e/                      # End-to-end workflow tests
│   └── CompleteFeedWorkflow.test.tsx
├── regression/               # Bug fix and regression tests
│   └── ConnectionButtonFix.test.tsx
├── contracts/                # Mock contract verification
│   └── MockContracts.test.ts
├── coordination/             # Test coordination and coverage
│   └── TestCoordination.test.ts
├── test-setup.ts            # Mock setup and utilities
├── vitest.config.ts         # Vitest configuration
├── jest.config.js           # Jest configuration
└── package.json             # Test package configuration
```

## Testing Strategy

### 1. Mock-Driven Development
- **Outside-In Testing**: Start with user behavior, drive down to implementation
- **Interaction Focus**: Test how objects collaborate, not what they contain
- **Contract Definition**: Use mocks to define clear interfaces
- **Behavior Verification**: Verify interactions between components

### 2. Test Categories

#### Unit Tests (Mock-Driven)
- **ClaudeServiceManager**: Instance tracking, worker designation, job submission
- **useClaudeInstances**: Hook behavior, state management, WebSocket coordination
- **Input Validation**: Security and format validation
- **Error Handling**: API errors, connection failures, retry logic

#### Integration Tests
- **Manager Coordination**: ClaudeServiceManager + ClaudeInstanceManager interaction
- **Feed Integration**: Feed component job submission flows
- **Backend API**: API integration patterns
- **Directory Validation**: /prod directory requirement enforcement

#### E2E Scenarios
- **Complete Workflows**: Full feed processing from creation to results
- **Interactive Management**: Claude conversation workflows
- **Failover Handling**: Worker instance failure and recovery
- **State Synchronization**: Multi-component state management

#### Regression Tests
- **ConnectionButton Fix**: Button state management bugs
- **API Spam Prevention**: Rate limiting and request deduplication
- **Memory Leak Prevention**: Resource cleanup and memory management
- **Performance Under Load**: High-frequency update handling

## Running Tests

### Quick Start
```bash
# Run all London School tests
npm test

# Watch mode for development
npm run test:watch

# Coverage analysis
npm run test:coverage

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:regression
```

### Advanced Testing
```bash
# Contract verification
npm run test:contracts

# Test coordination analysis
npm run test:coordination

# Performance benchmarking
npm run benchmark

# Coverage analysis with recommendations
npm run coverage:analyze
```

## Key Features

### 1. Mock Contracts
- **WebSocket Contract**: Connection, message sending, event handling
- **API Contract**: HTTP requests, responses, error handling
- **Service Contract**: Instance management, command execution

### 2. Behavior Verification
- **Interaction Patterns**: Verify object collaboration sequences
- **Contract Compliance**: Ensure interface adherence
- **State Transitions**: Validate state management flows
- **Error Recovery**: Test resilience and fault tolerance

### 3. London School Principles
- **Mock External Dependencies**: Database, APIs, WebSockets
- **Test Interactions**: Focus on object conversations
- **Drive Design**: Use tests to define interfaces
- **Verify Behavior**: Test what objects do, not what they are

## Coverage Targets

- **Overall Coverage**: 92.5%+ (Line, Branch, Function)
- **Critical Components**: 95%+ coverage
- **Error Paths**: 85%+ coverage
- **Integration Points**: 90%+ coverage

### Critical Coverage Areas
- Instance creation and lifecycle management
- WebSocket connection and message handling
- API error handling and retry logic
- Input validation and security
- State synchronization across components

## Mock Strategy

### 1. External Dependencies
- **WebSocket/SSE**: Mocked for connection testing
- **Fetch API**: Mocked for HTTP request testing
- **Performance APIs**: Mocked for consistent timing
- **DOM APIs**: Mocked for browser compatibility

### 2. Internal Collaborators
- **useHTTPSSE Hook**: Mocked for connection behavior
- **NLD Capture Utility**: Mocked for error tracking
- **Component Context**: Mocked for isolation

## Best Practices

### 1. Test Design
- Start with failing test that describes desired behavior
- Use mocks to define collaborator contracts
- Focus on verification of interactions
- Keep tests focused and isolated

### 2. Mock Management
- Use factory functions for consistent mock creation
- Verify interactions, not implementations
- Keep mocks simple and behavior-focused
- Reset mocks between tests

### 3. Behavior Verification
- Test object conversations and protocols
- Verify call order and timing
- Check error handling interactions
- Validate state transition behaviors

## Continuous Integration

Tests are configured to run in CI/CD pipelines with:
- Parallel execution for performance
- Coverage reporting and thresholds
- JUnit XML output for CI integration
- HTML reports for detailed analysis

## Troubleshooting

### Common Issues
1. **Mock not working**: Verify mock is properly imported and configured
2. **Timing issues**: Use fake timers or proper async/await patterns
3. **State persistence**: Ensure proper cleanup between tests
4. **Coverage gaps**: Check for missed interaction paths

### Debug Tools
- Use `test:watch` for development feedback
- Check coverage reports for missed paths
- Use `test:ui` for interactive debugging
- Analyze benchmark results for performance issues