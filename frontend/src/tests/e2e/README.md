# WebSocket Hub E2E Tests - Quick Start Guide

## Overview

This directory contains comprehensive End-to-End (E2E) tests for WebSocket Hub functionality, validating real WebSocket connections, multi-instance communication, security boundaries, and performance metrics.

## Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
npx playwright install
```

### 2. Start Required Services
```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start frontend server  
cd frontend
npm run dev

# Services should be running on:
# - Backend: http://localhost:3000
# - Frontend: http://localhost:3001
```

### 3. Run Tests
```bash
# Run all WebSocket Hub E2E tests
npm run test:websocket-hub

# Run with browser UI for debugging
npm run test:websocket-hub:headed

# Run specific test categories
npm run test:websocket-core        # Core functionality
npm run test:websocket-security    # Security validation  
npm run test:websocket-performance # Performance testing
```

## Test Structure

```
src/tests/e2e/
├── websocket-hub-e2e.spec.ts          # Main E2E test suite
├── websocket-security-e2e.spec.ts     # Security validation tests
├── websocket-performance-e2e.spec.ts  # Performance testing
├── websocket-hub-setup.ts             # Global setup and teardown
├── utils/
│   └── websocket-test-helpers.ts       # Test utilities and helpers
└── reporters/
    └── websocket-reporter.ts           # Custom test reporter
```

## Test Categories

### ✅ Full Communication Flow
- Frontend → Hub → Prod Claude → Hub → Frontend
- Webhook to WebSocket conversion  
- Message routing integrity
- Response correlation

### ✅ Multi-Instance Routing
- Dev vs Prod Claude instance routing
- Simultaneous multi-instance communication
- Load balancing validation
- Failover mechanisms

### ✅ Security Validation
- Authentication and authorization
- Input validation and sanitization  
- Channel isolation
- Rate limiting and DoS prevention

### ✅ Connection Resilience
- Network interruption handling
- Automatic reconnection
- Message queue persistence
- Connection stability under load

### ✅ Performance Testing
- Latency measurements (< 1000ms)
- Throughput testing (> 10 msg/sec)
- Load testing (Light/Medium/Heavy)
- Memory leak detection
- Resource utilization

### ✅ Integration Testing  
- Port 3001 WebSocket server integration
- Frontend UI component compatibility
- Backend API coordination

## Configuration

### Test Configuration Files
- `playwright.websocket-hub.config.ts` - Playwright configuration for WebSocket tests
- `websocket-hub-setup.ts` - Global setup with mock servers

### Environment Variables
```bash
NODE_ENV=test
WEBSOCKET_ENABLED=true
BASE_URL=http://localhost:3001
```

### Performance Thresholds
- Connection Time: < 2000ms
- Message Latency: < 1000ms  
- Throughput: > 10 messages/sec
- Error Rate: < 5%
- Memory Usage: < 100MB increase

## Test Results

### Reports Generated
- `test-results/websocket-hub-e2e/html-report/` - Interactive HTML report
- `test-results/websocket-hub-e2e/metrics-report.json` - Performance metrics
- `test-results/websocket-hub-e2e/performance-analysis.md` - Analysis report

### View Reports
```bash
# Open interactive HTML report
npm run test:websocket-report

# View performance metrics
cat test-results/websocket-hub-e2e/metrics-report.json | jq
```

## Debug Mode

### Enable Debug Output
```bash
# Debug mode with step-by-step execution
npm run test:websocket-hub:debug

# Enable verbose logging
DEBUG=* npm run test:websocket-hub

# Generate traces for failed tests
npx playwright test --trace on --config=playwright.websocket-hub.config.ts
```

### Debug Features
- Real-time browser debugging
- Step-by-step test execution
- Network request inspection
- WebSocket message logging
- Performance metric collection

## Common Issues & Solutions

### Connection Failures
**Issue**: WebSocket connections fail to establish  
**Solution**: 
- Verify backend server is running on port 3000
- Check frontend server is running on port 3001
- Ensure WebSocket is enabled in environment

### Test Timeouts
**Issue**: Tests exceed timeout limits  
**Solution**:
- Check system resources (CPU/Memory)
- Reduce test concurrency
- Increase timeout in configuration

### Performance Issues  
**Issue**: Tests fail performance thresholds
**Solution**:
- Review performance metrics in reports
- Check system load during test execution
- Optimize server configuration

## Custom Test Development

### Adding New Tests
1. Create test file in appropriate category
2. Use existing test helpers and utilities
3. Follow naming convention: `websocket-[category]-e2e.spec.ts`
4. Add to configuration projects if needed

### Test Utilities Available
- `EnhancedWebSocketTestClient` - Feature-rich WebSocket client
- `MockServerManager` - Mock Claude instance management
- `LoadTestRunner` - Performance and load testing
- `TestDataGenerator` - Test data generation utilities

### Example Test Structure
```typescript
import { test, expect } from '@playwright/test';
import { EnhancedWebSocketTestClient } from './utils/websocket-test-helpers';

test.describe('Custom WebSocket Feature', () => {
  test('should validate custom functionality', async () => {
    const client = new EnhancedWebSocketTestClient('ws://localhost:8080');
    await client.connect();
    
    // Your test logic here
    await client.send('test_message', { data: 'test' });
    const response = await client.waitForMessage('test_response');
    
    expect(response).toBeDefined();
    client.disconnect();
  });
});
```

## CI/CD Integration

Tests are designed for CI/CD pipelines with:
- Automated test execution
- Performance threshold validation
- Security compliance checks
- Comprehensive reporting
- Artifact collection

### GitHub Actions Example
```yaml
- name: Run WebSocket E2E Tests
  run: |
    npm ci
    npx playwright install
    npm run test:websocket-all
    
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: websocket-test-results
    path: test-results/websocket-hub-e2e/
```

## Support

For detailed documentation, see: `/docs/WEBSOCKET_HUB_E2E_TESTING.md`

For issues or questions:
1. Check the troubleshooting section in main documentation
2. Review test logs and reports
3. Enable debug mode for detailed analysis
4. Contact the development team

---

**Last Updated**: December 2024  
**Test Suite Version**: 1.0.0