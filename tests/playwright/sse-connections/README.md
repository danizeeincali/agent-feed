# SSE Connection Testing Suite

Comprehensive Playwright test suite for validating Server-Sent Events (SSE) connection functionality in the Claude Instance Manager.

## Test Coverage

### 1. Connection Establishment (`01-connection-establishment.spec.ts`)
- ✅ SSE connection establishment after instance creation
- ✅ URL fix validation (prioritizing `/v1/` path)
- ✅ Multiple instance type support
- ✅ Connection performance benchmarking
- ✅ Health monitoring and diagnostics
- ✅ Immediate command execution post-connection

### 2. Real-Time Streaming (`02-real-time-streaming.spec.ts`)
- ✅ Real-time terminal output streaming
- ✅ Message ordering and sequence integrity
- ✅ Incremental output without buffer storms
- ✅ Large output streaming efficiency
- ✅ Rapid command succession handling
- ✅ Interactive command feedback
- ✅ Error message streaming

### 3. Connection Retry & Recovery (`03-connection-retry-recovery.spec.ts`)
- ✅ Connection interruption and recovery
- ✅ Retry mechanisms with backoff
- ✅ Temporary network issue recovery
- ✅ Server restart scenario handling
- ✅ Data integrity during recovery
- ✅ Graceful error handling
- ✅ Resource leak prevention
- ✅ Concurrent recovery scenarios

### 4. Multiple Concurrent Connections (`04-multiple-concurrent-connections.spec.ts`)
- ✅ Two concurrent SSE connections
- ✅ Message isolation between connections
- ✅ Three connections with stress testing
- ✅ Resource allocation management
- ✅ Concurrent command execution
- ✅ Connection stability under load
- ✅ Connection cleanup for multiple instances

### 5. Resource Cleanup & Management (`05-resource-cleanup-management.spec.ts`)
- ✅ Proper SSE resource cleanup
- ✅ Memory leak prevention
- ✅ Graceful shutdown of active connections
- ✅ Cleanup after instance destruction
- ✅ Page navigation resource handling
- ✅ Connection buildup prevention
- ✅ Emergency cleanup scenarios
- ✅ Cleanup status and diagnostics

## Key Features Tested

### URL Fix Validation
Tests verify that the SSE connection URL fix resolves previous connection issues by:
- Testing both `/v1/` and legacy URL formats
- Prioritizing the correct URL path
- Measuring connection establishment times
- Validating successful streaming over corrected URLs

### Connection Resilience
- Automatic retry with exponential backoff
- Graceful handling of network interruptions
- Recovery from server restarts
- Maintenance of data integrity during recovery

### Performance & Scalability
- Multiple concurrent connection management
- Resource usage optimization
- Memory leak prevention
- Connection lifecycle management

### Real-Time Streaming
- Incremental output delivery
- Message ordering preservation
- Buffer storm prevention
- High-throughput streaming support

## Running the Tests

### Prerequisites
```bash
# Install dependencies
npm install
npx playwright install
```

### Run All Tests
```bash
npm run test:all
```

### Run Individual Test Suites
```bash
npm run test:connection-establishment
npm run test:real-time-streaming
npm run test:retry-recovery
npm run test:concurrent-connections
npm run test:resource-cleanup
```

### Debug Mode
```bash
npm run test:debug
```

### UI Mode
```bash
npm run test:ui
```

### CI Mode
```bash
npm run test:ci
```

## Test Configuration

### Timeouts
- **Global Test Timeout**: 3 minutes (for complex SSE scenarios)
- **Expect Timeout**: 45 seconds (for SSE connection establishment)
- **Action Timeout**: 45 seconds
- **Navigation Timeout**: 90 seconds

### Browser Support
- **Chromium**: Full feature testing
- **Firefox**: Cross-browser compatibility
- **WebKit**: Safari compatibility

### Environment Requirements
- **Frontend Server**: http://localhost:5173
- **Backend Server**: http://localhost:3000
- **Services**: Both frontend and backend must be running

## Test Architecture

### Page Objects
- `ClaudeInstancePage`: Manages Claude instance interactions
- `SSEConnectionTester`: Handles SSE connection testing
- `SSETestMonitor`: Monitors SSE message flow

### Utilities
- `SSEAssertions`: Common assertion patterns
- `SSEPerformanceUtils`: Performance measurement tools
- Connection lifecycle management
- Resource cleanup verification

### Global Setup/Teardown
- Automated service startup
- Health check validation
- Graceful shutdown
- Process cleanup

## Validation Points

### Connection Health
- Connection establishment success
- Message reception rate
- Error count monitoring
- Latency measurements

### Data Integrity
- Message ordering
- Duplicate detection
- Sequence validation
- Content verification

### Resource Management
- Connection count tracking
- Memory usage monitoring
- Cleanup verification
- Leak detection

### Performance Metrics
- Connection establishment time
- Message throughput
- Recovery time
- Cleanup duration

## Error Handling

### Expected Errors
- Connection timeouts (handled gracefully)
- Network interruptions (recovery tested)
- Invalid instance IDs (error validation)
- Instance destruction (cleanup tested)

### Error Recovery
- Automatic retry mechanisms
- Backoff strategies
- Graceful degradation
- Resource cleanup on errors

## Reporting

### HTML Report
```bash
npm run report
```

### Test Artifacts
- Screenshots on failure
- Video recordings
- Network traces
- Console logs

### Metrics Collected
- Connection establishment times
- Message throughput rates
- Memory usage patterns
- Error frequencies

## Integration with CI/CD

### GitHub Actions Support
```yaml
- name: Run SSE Connection Tests
  run: |
    cd tests/playwright/sse-connections
    npm install
    npx playwright install
    npm run test:ci
```

### Test Results
- JSON format for processing
- JUnit XML for CI integration
- HTML reports for visualization
- Performance metrics export

## Troubleshooting

### Common Issues
1. **Service Not Started**: Ensure frontend and backend are running
2. **Port Conflicts**: Check that ports 3000 and 5173 are available
3. **Connection Timeouts**: Verify network connectivity
4. **Resource Leaks**: Check for proper test cleanup

### Debug Information
- Connection establishment logs
- SSE message content
- Error stack traces  
- Performance metrics

## Contributing

### Adding New Tests
1. Follow existing test structure
2. Use provided utilities and page objects
3. Include proper cleanup in `afterEach`
4. Add comprehensive assertions

### Test Guidelines
- Test isolation (no dependencies between tests)
- Comprehensive cleanup
- Clear logging and diagnostics
- Performance considerations

This test suite provides comprehensive validation of SSE connection functionality, ensuring the URL fix resolves connection issues and SSE streaming works correctly in browser environments.