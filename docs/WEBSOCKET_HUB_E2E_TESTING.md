# WebSocket Hub E2E Testing Documentation

## Overview

This document provides comprehensive guidance for the WebSocket Hub End-to-End (E2E) testing suite, designed to validate real WebSocket connections between the frontend and production Claude instances, ensuring webhook→WebSocket conversion works properly and multi-instance communication is secure and performant.

## Table of Contents

1. [Test Architecture](#test-architecture)
2. [Test Categories](#test-categories)
3. [Setup and Configuration](#setup-and-configuration)
4. [Running Tests](#running-tests)
5. [Test Scenarios](#test-scenarios)
6. [Performance Metrics](#performance-metrics)
7. [Security Validation](#security-validation)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Test Architecture

### Component Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   WebSocket     │───▶│   Prod Claude   │
│   (Port 3001)   │    │   Hub           │    │   Instance      │
└─────────────────┘    │   (Port 8080)   │    │   (Port 8081)   │
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Dev Claude    │
                       │   Instance      │
                       │   (Port 8082)   │
                       └─────────────────┘
```

### Test Infrastructure

- **Playwright E2E Framework**: Browser automation and testing
- **Mock Claude Instances**: Simulated Claude instances for isolated testing
- **WebSocket Test Clients**: Enhanced clients with metrics collection
- **Performance Monitor**: Real-time performance tracking
- **Security Validator**: Comprehensive security testing utilities

## Test Categories

### 1. Full Communication Flow Tests
- ✅ Frontend → Hub → Prod Claude → Hub → Frontend
- ✅ Webhook to WebSocket conversion validation
- ✅ Message routing integrity
- ✅ Response correlation

### 2. Multi-Instance Routing Tests
- ✅ Dev vs Prod Claude instance routing
- ✅ Simultaneous multi-instance communication
- ✅ Load balancing across instances
- ✅ Failover mechanisms

### 3. Security Validation Tests
- ✅ Channel isolation and data leakage prevention
- ✅ Authentication and authorization
- ✅ Input validation and sanitization
- ✅ Rate limiting and DoS prevention
- ✅ Protocol security validation

### 4. Connection Resilience Tests
- ✅ Network interruption handling
- ✅ Automatic reconnection
- ✅ Message queue persistence
- ✅ Connection stability under load

### 5. Performance Testing
- ✅ Latency measurements
- ✅ Throughput testing
- ✅ Load testing (Light/Medium/Heavy)
- ✅ Memory leak detection
- ✅ Resource utilization

### 6. Integration Testing
- ✅ Port 3001 WebSocket server integration
- ✅ Frontend UI component compatibility
- ✅ Backend API coordination

## Setup and Configuration

### Prerequisites

```bash
# Ensure dependencies are installed
cd frontend
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Variables

```bash
# Test environment configuration
NODE_ENV=test
WEBSOCKET_ENABLED=true
BASE_URL=http://localhost:3001

# Performance thresholds
WEBSOCKET_MAX_LATENCY=1000
WEBSOCKET_MIN_THROUGHPUT=10
WEBSOCKET_MAX_ERROR_RATE=0.05
```

### Test Data Directory Structure

```
test-results/websocket-hub-e2e/
├── artifacts/                 # Screenshots, videos, traces
├── html-report/              # Interactive HTML report
├── performance/              # Performance metrics
├── security/                 # Security test results
├── load-tests/              # Load test data
├── screenshots/             # Test screenshots
├── metrics-report.json      # Comprehensive metrics
├── performance-analysis.md  # Performance analysis
└── test-report.md          # Summary report
```

## Running Tests

### Quick Start

```bash
# Run all WebSocket Hub E2E tests
npm run test:websocket-hub

# Run with browser UI (for debugging)
npm run test:websocket-hub:headed

# Debug mode with step-by-step execution
npm run test:websocket-hub:debug
```

### Specific Test Categories

```bash
# Core functionality tests
npm run test:websocket-core

# Security validation tests
npm run test:websocket-security

# Performance and load tests
npm run test:websocket-performance

# Run all categories sequentially
npm run test:websocket-all
```

### Advanced Test Execution

```bash
# Run specific test files
npx playwright test websocket-hub-e2e.spec.ts --config=playwright.websocket-hub.config.ts

# Run with specific browsers
npx playwright test --project=websocket-firefox --config=playwright.websocket-hub.config.ts

# Run with custom timeout
npx playwright test --timeout=180000 --config=playwright.websocket-hub.config.ts

# Generate detailed reports
npm run test:websocket-report
```

## Test Scenarios

### 1. Full Communication Flow

**Scenario**: Validate complete message flow from frontend to Claude instance and back

```typescript
test('should establish complete Frontend→Hub→Prod Claude→Hub→Frontend communication', async () => {
  // 1. Frontend connects to WebSocket Hub
  // 2. Send message targeting prod Claude instance  
  // 3. Verify message reaches Claude instance
  // 4. Validate response routing back to frontend
  // 5. Measure end-to-end latency
});
```

**Success Criteria**:
- Message successfully routed through all components
- Response correlation maintained
- Latency < 1000ms
- No data corruption

### 2. Multi-Instance Routing

**Scenario**: Ensure proper routing between dev and prod Claude instances

```typescript
test('should route messages to correct Claude instances (Dev vs Prod)', async () => {
  // 1. Connect to hub with multiple clients
  // 2. Send messages targeting different instances
  // 3. Verify instance-specific routing
  // 4. Check for cross-instance isolation
});
```

**Success Criteria**:
- Messages reach correct target instances
- No cross-instance message leakage
- Concurrent routing works correctly
- Load balancing functions properly

### 3. Security Validation

**Scenario**: Comprehensive security testing across all vectors

```typescript
test('should prevent XSS attacks through WebSocket messages', async () => {
  // 1. Send various XSS payloads via WebSocket
  // 2. Verify input sanitization
  // 3. Check for script execution prevention
  // 4. Validate output encoding
});
```

**Success Criteria**:
- All XSS payloads neutralized
- SQL injection attempts blocked
- Rate limiting enforced
- Authentication validated

### 4. Performance Benchmarks

**Scenario**: Validate performance under various load conditions

```typescript
test('should achieve minimum throughput requirements', async () => {
  // 1. Establish baseline performance metrics
  // 2. Execute load test with defined parameters
  // 3. Measure throughput, latency, and error rates
  // 4. Compare against defined thresholds
});
```

**Success Criteria**:
- Throughput ≥ 10 messages/second
- Average latency < 1000ms
- 95th percentile latency < 1500ms
- Error rate < 5%

## Performance Metrics

### Key Performance Indicators (KPIs)

| Metric | Threshold | Measurement |
|--------|-----------|-------------|
| Connection Time | < 2000ms | Time to establish WebSocket connection |
| Message Latency | < 1000ms | Round-trip time for message processing |
| Throughput | > 10 msg/sec | Messages processed per second |
| Error Rate | < 5% | Percentage of failed operations |
| Memory Usage | < 100MB increase | Memory consumption over test duration |
| CPU Usage | < 80% | Maximum CPU utilization |
| Connection Stability | > 95% uptime | Connection availability percentage |

### Performance Monitoring

The test suite automatically collects and analyzes:

- **Connection Metrics**: Establishment time, stability, reconnection frequency
- **Message Metrics**: Latency distribution, throughput patterns, success rates
- **Resource Metrics**: Memory usage, CPU utilization, network bandwidth
- **System Metrics**: Response times, queue lengths, processing delays

### Performance Reports

Automated reports include:

- **Real-time Dashboards**: Live performance monitoring during test execution
- **Trend Analysis**: Performance changes over time
- **Comparative Analysis**: Performance across different configurations
- **Bottleneck Identification**: Automatic detection of performance issues

## Security Validation

### Security Test Categories

#### 1. Authentication & Authorization
- Token validation and expiration
- Session management and timeout
- User permission enforcement
- Role-based access control

#### 2. Input Validation
- XSS attack prevention
- SQL injection protection
- Command injection blocking
- Buffer overflow protection

#### 3. Data Protection
- Channel isolation verification
- Data leakage prevention
- Encryption validation
- Privacy boundary enforcement

#### 4. Rate Limiting & DoS Protection
- Connection rate limiting
- Message rate limiting
- Resource exhaustion prevention
- Distributed attack mitigation

### Security Metrics

| Security Test | Pass Criteria | Risk Level |
|---------------|---------------|------------|
| XSS Prevention | 100% payloads blocked | Critical |
| SQL Injection | No database access | Critical |
| Channel Isolation | Zero cross-channel leakage | High |
| Rate Limiting | Excess requests rejected | Medium |
| Auth Validation | Unauthorized access blocked | Critical |

## Troubleshooting

### Common Issues

#### 1. Connection Failures

**Symptom**: WebSocket connections fail to establish

**Diagnosis**:
```bash
# Check server availability
curl -i http://localhost:3000/health
curl -i http://localhost:3001

# Verify WebSocket endpoint
wscat -c ws://localhost:8080
```

**Solutions**:
- Ensure all required servers are running
- Check firewall and port configurations
- Validate WebSocket endpoint URLs
- Review server logs for errors

#### 2. Test Timeouts

**Symptom**: Tests fail due to timeout errors

**Diagnosis**:
- Check test execution logs
- Monitor system resource usage
- Verify network connectivity
- Review performance metrics

**Solutions**:
- Increase test timeouts in configuration
- Optimize server performance
- Reduce test concurrency
- Check for resource leaks

#### 3. Authentication Errors

**Symptom**: WebSocket connections rejected due to auth failures

**Diagnosis**:
```bash
# Check authentication configuration
grep -r "auth" src/tests/e2e/
```

**Solutions**:
- Verify authentication tokens
- Check session configuration
- Review permission settings
- Update test credentials

#### 4. Performance Issues

**Symptom**: Tests fail performance thresholds

**Diagnosis**:
- Review performance metrics in test reports
- Check system resource utilization
- Analyze network latency
- Identify bottlenecks

**Solutions**:
- Optimize server configuration
- Increase system resources
- Reduce test load
- Fix identified bottlenecks

### Debug Mode

Enable comprehensive debugging:

```bash
# Run tests with debug output
DEBUG=* npm run test:websocket-hub:debug

# Enable Playwright debugging
PWDEBUG=1 npm run test:websocket-hub

# Generate trace files
npm run test:websocket-hub -- --trace on
```

### Log Analysis

Test logs are available in multiple formats:

- **Console Output**: Real-time test execution logs
- **JSON Reports**: Structured test results and metrics
- **HTML Reports**: Interactive test result browser
- **Performance Logs**: Detailed performance metrics
- **Security Logs**: Security test results and violations

## Best Practices

### Test Development

1. **Test Isolation**: Each test should be independent and not rely on others
2. **Resource Cleanup**: Always clean up connections and resources
3. **Async Handling**: Properly handle asynchronous operations
4. **Error Handling**: Include comprehensive error handling
5. **Performance Monitoring**: Collect metrics for all operations

### Test Maintenance

1. **Regular Updates**: Keep tests updated with system changes
2. **Threshold Monitoring**: Regularly review and adjust performance thresholds
3. **Security Updates**: Update security tests with new attack vectors
4. **Documentation**: Maintain up-to-date test documentation
5. **CI Integration**: Ensure tests run reliably in CI/CD pipelines

### Performance Optimization

1. **Baseline Establishment**: Maintain baseline performance metrics
2. **Continuous Monitoring**: Monitor performance trends over time
3. **Bottleneck Identification**: Regularly analyze performance bottlenecks
4. **Resource Optimization**: Optimize test resource usage
5. **Scaling Validation**: Test performance under various load conditions

### Security Considerations

1. **Threat Modeling**: Regularly update security threat models
2. **Attack Simulation**: Include realistic attack scenarios
3. **Vulnerability Assessment**: Regular security vulnerability assessments
4. **Compliance Validation**: Ensure security compliance requirements
5. **Incident Response**: Test incident response procedures

## Continuous Integration

### CI/CD Pipeline Integration

```yaml
# Example GitHub Actions workflow
name: WebSocket Hub E2E Tests
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  websocket-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:websocket-all
      - uses: actions/upload-artifact@v3
        with:
          name: websocket-test-results
          path: test-results/websocket-hub-e2e/
```

### Quality Gates

- **Security**: All security tests must pass
- **Performance**: Performance must meet defined thresholds
- **Reliability**: Test success rate > 95%
- **Coverage**: WebSocket functionality coverage > 90%

## Conclusion

The WebSocket Hub E2E testing suite provides comprehensive validation of WebSocket functionality, ensuring:

- **Reliability**: Robust communication between frontend and Claude instances
- **Security**: Protection against various attack vectors
- **Performance**: Optimal performance under various load conditions
- **Scalability**: Ability to handle increasing load and complexity
- **Maintainability**: Clear documentation and debugging capabilities

For questions or issues, please refer to the troubleshooting section or contact the development team.

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: WebSocket E2E Test Team