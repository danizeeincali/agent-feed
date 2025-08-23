# TDD London School - Port Configuration Tests

## Overview

This test suite implements the **London School (mockist) approach** to Test-Driven Development, specifically focused on testing port configuration and separation between frontend and backend services.

## Problem Statement

**Issue**: Frontend competing with backend for same port causing connection failures and launcher hanging.

**Target Behavior**: 
- Frontend should use port 3000
- Backend should use port 3001  
- WebSocket connections should work with proper port separation
- Port collisions should be detected and resolved
- Launcher should not hang when port conflicts occur

## London School Methodology

### Core Principles

1. **Outside-In Development**: Start with user behavior, work down to implementation
2. **Mock-Driven Design**: Use mocks to define contracts between objects
3. **Behavior Verification**: Focus on HOW objects collaborate, not WHAT they contain
4. **Interaction Testing**: Test conversations between objects, not their internal state

### Test Structure

```
tests/tdd-london-school/port-configuration/
├── port-configuration.test.js           # Main test suite
├── services/                            # Service implementations
│   ├── PortConfigurationService.js
│   ├── LauncherService.js
│   └── WebSocketConnectionService.js
├── scenarios/                           # Specific test scenarios  
│   ├── port-collision-scenarios.test.js
│   └── websocket-connectivity.test.js
├── fixtures/                           # Test data and fixtures
│   └── port-test-fixtures.js
├── mocks/                              # Swarm mock coordination
│   └── swarm-mock-coordination.js
└── custom-reporters/                   # London School reporters
    └── interaction-reporter.js
```

## Key Test Scenarios

### 1. Port Allocation Contract Definition
- Tests proper port allocation workflow (3000 frontend, 3001 backend)
- Verifies service startup coordination through mock interactions
- Focuses on behavior verification over state testing

### 2. Port Collision Detection
- Tests detection of port conflicts between services
- Verifies resolution workflow through available port discovery
- Tests launcher hanging scenarios with timeout handling

### 3. WebSocket Connectivity
- Tests WebSocket server creation with proper port separation
- Verifies connection establishment patterns
- Tests connectivity validation between separated ports

### 4. Service Interaction Patterns
- Tests complete service startup workflow coordination
- Verifies cascading failure handling and cleanup
- Tests contract evolution and adaptation

## Running Tests

```bash
# Run all London School tests
npm test

# Run specific test categories
npm run test:port-collision
npm run test:websocket  
npm run test:london-school
npm run test:behavior

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Mock-Driven Design Examples

### Contract Definition Through Mocks

```javascript
// Define the contract through mock expectations
mockNetService.checkPortAvailability
  .mockResolvedValueOnce(true)  // Port 3000 available
  .mockResolvedValueOnce(true); // Port 3001 available

// Verify the conversation between objects
expect(mockNetService.checkPortAvailability).toHaveBeenCalledTimes(2);
expect(mockNetService.reservePort).toHaveBeenCalledWith(3000, 'frontend');
expect(mockNetService.reservePort).toHaveBeenCalledWith(3001, 'backend');
```

### Behavior Verification

```javascript
// Focus on interactions, not state
it('should coordinate service startup sequence', async () => {
  await orchestrator.startCompleteStack();
  
  // Verify the conversation flow
  expect(mockProcessManager.startBackendServer).toHaveBeenCalledBefore(
    mockProcessManager.startFrontendServer
  );
  expect(mockProcessManager.startFrontendServer).toHaveBeenCalledBefore(
    mockWebSocketServer.create
  );
});
```

### Outside-In Testing

```javascript
// Start with user behavior (outside)
describe('User Registration Feature', () => {
  it('should register new user successfully', async () => {
    // Test from the outside behavior down to collaborator interactions
    const result = await userService.register(validUserData);
    
    // Verify collaborator conversations
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ email: validUserData.email })
    );
    expect(mockNotifier.sendWelcome).toHaveBeenCalledWith(result.id);
  });
});
```

## Swarm Coordination

The tests include swarm coordination features for distributed testing:

- **Shared Mock Contracts**: Consistent mock definitions across swarm agents
- **Contract Verification**: Automatic validation of mock interactions
- **Interaction Reporting**: Detailed reports on object collaborations
- **Behavior Metrics**: Analysis of London School principle adherence

## Reports and Analysis

The custom interaction reporter provides:

- **Interaction Coverage**: Percentage of verified mock interactions
- **Behavior Verification Ratio**: Focus on behavior vs state testing
- **Collaboration Complexity**: Analysis of object interaction patterns  
- **Contract Adherence**: Verification of mock contract compliance

## Key Benefits

1. **Early Design Feedback**: Mocks reveal design issues before implementation
2. **Clear Contracts**: Mock expectations define precise service interfaces
3. **Behavior Focus**: Tests verify important interactions, not implementation details
4. **Fast Execution**: Mocked dependencies enable fast, isolated test execution
5. **Swarm Coordination**: Tests can be coordinated across distributed testing agents

## London School vs Detroit School

| Aspect | London School (This Suite) | Detroit School |
|--------|----------------------------|----------------|
| Focus | Behavior verification | State verification |
| Mocks | Mock all collaborators | Mock only expensive operations |
| Design | Outside-in, contract-driven | Inside-out, implementation-driven |
| Feedback | Early design insights | Late integration issues |
| Speed | Very fast (all mocked) | Slower (real dependencies) |

This test suite demonstrates comprehensive London School TDD methodology applied to the specific problem of port configuration and separation in distributed services.