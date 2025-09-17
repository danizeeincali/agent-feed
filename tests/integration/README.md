# Integration Test Suite

Comprehensive integration test suite for SDK and API endpoints, providing full coverage of the Agent Feed system's external interfaces.

## 🎯 Overview

This test suite validates:
- **API Integration Points**: `/api/avi/streaming-chat`, `/api/claude-code/streaming-chat`, `/api/streaming-ticker/stream`
- **SDK Functionality**: Frontend components, real-time communication, error handling
- **Streaming Behavior**: WebSocket connections, Server-Sent Events (SSE)
- **Performance**: Response times, concurrent requests, load testing
- **Security**: Input validation, rate limiting, error handling
- **Reliability**: Timeouts, retries, connection management

## 📁 Structure

```
tests/integration/
├── api-endpoints/                  # API endpoint tests
│   ├── avi-streaming-chat.test.ts
│   ├── claude-code-streaming-chat.test.ts
│   ├── streaming-ticker-sse.test.ts
│   ├── websocket-connections.test.ts
│   └── comprehensive-validation.test.ts
├── sdk-functionality/              # SDK integration tests
│   └── avi-sdk-integration.test.ts
├── mock-servers/                   # Mock server implementations
│   └── mock-api-server.ts
├── fixtures/                       # Test data and utilities
│   └── test-data.ts
├── test-runner.ts                  # Test orchestration
├── package.json                    # Dependencies and scripts
└── README.md                       # This file
```

## 🚀 Quick Start

### Installation

```bash
cd tests/integration
npm install
```

### Running Tests

```bash
# Run all integration tests
npm test

# Run specific test suites
npm run test:avi-api          # Avi API tests
npm run test:claude-api       # Claude Code API tests
npm run test:streaming        # SSE streaming tests
npm run test:websocket        # WebSocket tests
npm run test:validation       # Comprehensive validation
npm run test:sdk              # SDK integration tests

# Run with coverage
npm run test:coverage

# Run in parallel (use carefully)
npm run test:parallel

# Stop on first failure
npm run test:fail-fast

# Watch mode for development
npm run test:watch
```

## 🧪 Test Categories

### 1. API Endpoint Tests

#### Avi Streaming Chat API (`/api/avi/streaming-chat`)
- ✅ Message processing with various input types
- ✅ Image upload and handling
- ✅ Error handling and validation
- ✅ Response schema compliance
- ✅ Performance and concurrent requests
- ✅ Rate limiting validation

#### Claude Code Streaming Chat API (`/api/claude-code/streaming-chat`)
- ✅ Tool execution (Read, Write, Bash, Grep)
- ✅ Security and tool access restrictions
- ✅ Session management
- ✅ Background task execution
- ✅ Error recovery and resilience
- ✅ Performance under load

#### Streaming Ticker SSE (`/api/streaming-ticker/stream`)
- ✅ Server-Sent Events connection establishment
- ✅ Real-time event broadcasting
- ✅ Multiple concurrent connections
- ✅ Connection management and cleanup
- ✅ High-frequency event streaming
- ✅ Message ordering and reliability

### 2. WebSocket Integration

- ✅ Connection establishment and management
- ✅ Message exchange and acknowledgment
- ✅ Broadcasting between connections
- ✅ Connection resilience and reconnection
- ✅ Performance under high-frequency messaging
- ✅ Load testing with multiple connections

### 3. SDK Functionality

- ✅ Component rendering and initialization
- ✅ User interaction simulation
- ✅ API integration and error handling
- ✅ Real-time features (streaming ticker)
- ✅ State management and persistence
- ✅ Accessibility and user experience

### 4. Comprehensive Validation

- ✅ JSON Schema validation
- ✅ Data type verification
- ✅ HTTP status code compliance
- ✅ CORS header validation
- ✅ Security testing (XSS, injection)
- ✅ Unicode and special character handling
- ✅ Performance benchmarking
- ✅ Rate limiting enforcement

## 🔧 Configuration

### Environment Variables

```bash
# Test execution
VERBOSE=true|false          # Detailed output (default: true)
PARALLEL=true|false         # Parallel execution (default: false)
COVERAGE=true|false         # Coverage reporting (default: false)
FAIL_FAST=true|false       # Stop on first failure (default: false)
RETRIES=number             # Retry attempts (default: 1)
TIMEOUT=milliseconds       # Test timeout (default: 30000)
OUTPUT_DIR=path            # Report output directory

# Mock server configuration
MOCK_SERVER_PORT=port      # Mock server port (default: 3001)
MOCK_SERVER_DELAY=ms       # Response delay simulation
MOCK_ERROR_RATE=0.0-1.0    # Error simulation rate
```

### Jest Configuration

The test suite uses Jest with custom configuration for integration testing:

```json
{
  "testEnvironment": "node",
  "testTimeout": 30000,
  "detectOpenHandles": true,
  "forceExit": true,
  "maxWorkers": 1,
  "verbose": true
}
```

## 📊 Reports and Coverage

### Test Reports

After running tests, reports are generated in the `test-results/` directory:

```
test-results/
├── integration-test-report.json    # Machine-readable results
├── integration-test-report.html    # Human-readable HTML report
└── coverage/                       # Coverage reports (if enabled)
    ├── lcov.info
    ├── index.html
    └── coverage-final.json
```

### Coverage Analysis

Enable coverage reporting to analyze test coverage:

```bash
npm run test:coverage
```

Coverage includes:
- Line coverage
- Function coverage
- Branch coverage
- Statement coverage

## 🛠 Development

### Adding New Tests

1. **Create test file** in appropriate directory
2. **Follow naming convention**: `*.test.ts`
3. **Use test data fixtures** from `fixtures/test-data.ts`
4. **Include proper cleanup** in `afterEach`/`afterAll`
5. **Add to test runner** if needed

### Mock Server Usage

The mock server provides isolated testing environment:

```typescript
import MockApiServer from '../mock-servers/mock-api-server';

// Start mock server
const mockServer = new MockApiServer({ port: 3001 });
await mockServer.start();

// Override responses for testing
mockServer.setResponseOverride('POST:/api/test', {
  status: 200,
  data: { success: true }
});

// Cleanup
await mockServer.stop();
```

### Performance Testing

Performance tests measure:
- Response times
- Throughput (requests/second)
- Error rates
- Concurrent request handling
- Memory usage patterns

### Error Simulation

Tests include comprehensive error scenarios:
- Network failures
- Server errors (4xx, 5xx)
- Timeout conditions
- Malformed responses
- Rate limiting
- Connection drops

## 🔍 Debugging

### Verbose Output

Enable detailed logging:

```bash
VERBOSE=true npm test
```

### Debug Specific Tests

Run individual test files:

```bash
npx jest api-endpoints/avi-streaming-chat.test.ts --verbose
```

### Debug Mock Server

Enable mock server logging:

```typescript
const mockServer = new MockApiServer({
  logging: true,
  verbose: true
});
```

## 📈 Performance Benchmarks

Expected performance metrics:

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time | < 2s | Average response time |
| Concurrent Requests | 100/min | Successful concurrent handling |
| WebSocket Connections | 50+ | Simultaneous connections |
| SSE Throughput | 1000+ events/min | Event processing rate |
| Error Rate | < 1% | Failed requests percentage |

## 🛡 Security Testing

Security validations include:

- **Input Validation**: XSS, SQL injection, path traversal
- **Rate Limiting**: Request throttling and abuse prevention
- **Data Sanitization**: Proper encoding and filtering
- **Authentication**: Token validation and session management
- **CORS**: Cross-origin request policies
- **Headers**: Security header validation

## 🚨 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Kill processes using test ports
   lsof -ti:3001,8080 | xargs kill -9
   ```

2. **Mock Server Not Starting**
   ```bash
   # Check port availability
   netstat -tuln | grep :3001
   ```

3. **Test Timeouts**
   ```bash
   # Increase timeout
   TIMEOUT=60000 npm test
   ```

4. **Memory Issues**
   ```bash
   # Run with more memory
   node --max-old-space-size=4096 test-runner.ts
   ```

### Debug Environment

Set up debug environment:

```bash
export DEBUG=true
export VERBOSE=true
export NODE_ENV=test
npm test
```

## 📝 Contributing

1. **Follow test patterns** established in existing tests
2. **Include both positive and negative test cases**
3. **Add performance benchmarks** for new features
4. **Update documentation** for new test categories
5. **Ensure proper cleanup** to prevent test interference

## 🔗 Related Documentation

- [API Documentation](../../docs/api.md)
- [SDK Documentation](../../docs/sdk.md)
- [WebSocket Protocol](../../docs/websocket.md)
- [Performance Guidelines](../../docs/performance.md)
- [Security Policies](../../docs/security.md)

---

This comprehensive integration test suite ensures the reliability, performance, and security of the Agent Feed system's critical external interfaces.