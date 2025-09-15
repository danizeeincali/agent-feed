# Streaming Ticker Test Suite

## Overview

This test suite provides comprehensive TDD coverage for the streaming ticker system, including:

- **Unit Tests**: Claude output parsing, tool detection logic, message processing
- **Integration Tests**: SSE streaming, frontend-backend integration
- **Component Tests**: React ticker animations, state transitions
- **E2E Tests**: Complete user flow with Playwright
- **Performance Tests**: Streaming latency, memory usage
- **Error Tests**: Connection failures, malformed data, timeouts

## Test Categories

### 1. Unit Tests (`unit/`)
- `claude-output-parser.test.ts` - Claude output parsing logic
- `sse-connection-manager.test.ts` - SSE connection management
- `message-processor.test.ts` - Message processing and buffering
- `tool-detection.test.ts` - Tool execution detection
- `ticker-state-machine.test.ts` - State transitions

### 2. Integration Tests (`integration/`)
- `sse-streaming-flow.test.ts` - End-to-end SSE streaming
- `frontend-backend-integration.test.ts` - API integration
- `claude-instance-coordination.test.ts` - Multi-instance coordination

### 3. Component Tests (`component/`)
- `ticker-display.test.tsx` - React ticker component
- `posting-interface.test.tsx` - Posting interface interactions
- `animation-transitions.test.tsx` - CSS animations and transitions

### 4. E2E Tests (`e2e/`)
- `complete-flow.spec.ts` - Full user journey
- `error-recovery.spec.ts` - Error handling scenarios
- `performance-scenarios.spec.ts` - Performance under load

### 5. Performance Tests (`performance/`)
- `streaming-latency.test.ts` - Message delivery latency
- `memory-usage.test.ts` - Memory leak detection
- `concurrent-connections.test.ts` - Multi-connection performance

### 6. Error Tests (`errors/`)
- `connection-failures.test.ts` - Network failure scenarios
- `malformed-data.test.ts` - Invalid message handling
- `timeout-scenarios.test.ts` - Timeout recovery

## Test Data & Mocks

### Mock Data (`mocks/`)
- `claude-responses.json` - Sample Claude outputs
- `sse-events.json` - SSE event samples
- `error-scenarios.json` - Error condition data

### Test Utilities (`utils/`)
- `test-helpers.ts` - Common test utilities
- `mock-sse-server.ts` - Mock SSE server
- `performance-helpers.ts` - Performance measurement utils

## Running Tests

```bash
# All tests
npm run test:streaming-ticker

# Specific category
npm run test:unit:streaming
npm run test:integration:streaming
npm run test:e2e:streaming
npm run test:performance:streaming

# Watch mode
npm run test:streaming-ticker:watch

# Coverage
npm run test:streaming-ticker:coverage
```

## Coverage Targets

- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

## Performance Benchmarks

- **SSE Connection**: <500ms initial connection
- **Message Processing**: <10ms per message
- **UI Update**: <16ms (60fps)
- **Memory Usage**: <50MB sustained
- **Reconnection**: <2s after failure