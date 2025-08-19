# Testing Procedures for Claude Code + AgentLink System

## Overview

This document outlines the comprehensive testing procedures for the Claude Code + AgentLink containerized development workflow system. The testing framework ensures reliability, performance, and security across all system components.

## Testing Architecture

### Test Pyramid Structure

```
         /\
        /E2E\      <- Complete user workflows (Playwright)
       /------\
      /Integr. \   <- Claude Code + AgentLink integration
     /----------\
    /   Unit     \ <- Component-level testing (Jest)
   /--------------\
```

## Test Suites

### 1. Unit Tests (`/tests/unit/`)

**Purpose**: Test individual components in isolation

**Coverage**:
- Agent coordination logic (`agent-coordinator.test.ts`)
- Authentication and authorization (`auth.test.ts`)  
- WebSocket communication (`websocket-handler.test.ts`)
- Database operations
- Utility functions

**Execution**:
```bash
npm test
# OR
npx jest tests/unit --config=tests/jest.config.js
```

**Requirements**:
- Minimum 80% code coverage
- All tests must pass
- Mock external dependencies
- Test execution time < 30 seconds

### 2. Integration Tests (`/tests/integration/`)

**Purpose**: Test system integration between components

**Coverage**:
- Claude Code swarm initialization
- Agent spawning and coordination
- Database connectivity and persistence
- WebSocket real-time communication
- Frontend-backend integration

**Execution**:
```bash
# Start services first
docker-compose up -d

# Run integration tests
npx jest tests/integration --config=tests/jest.config.js --runInBand
```

**Requirements**:
- All 17+ agent types must spawn successfully
- Database persistence across container restarts
- WebSocket connections handle 50+ concurrent clients
- API endpoints respond within 5 seconds

### 3. End-to-End Tests (`/tests/e2e/`)

**Purpose**: Test complete user workflows

**Coverage**:
- Complete user journey (login → agent spawning → SPARC workflow)
- Multi-user collaboration scenarios
- Error recovery and resilience testing
- Performance under load

**Execution**:
```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npx playwright test --config=tests/playwright.config.ts
```

**Test Scenarios**:
- User authentication and dashboard access
- Claude Flow swarm initialization
- Agent spawning (Chief of Staff → Development team)
- SPARC methodology workflow execution
- Real-time agent status monitoring
- System performance validation

### 4. Performance Tests (`/tests/performance/`)

**Purpose**: Validate system performance under load

**Coverage**:
- API endpoint response times
- Concurrent request handling
- Agent spawning performance
- WebSocket connection scalability
- Memory and resource usage

**Execution**:
```bash
npx jest tests/performance --config=tests/jest.config.js --testTimeout=120000
```

**Performance Benchmarks**:
- Container startup: < 60 seconds
- Memory usage: < 2GB total
- API response time: < 5 seconds average
- WebSocket latency: < 200ms
- Agent spawn time: < 10 seconds per agent

### 5. Security Tests (`/tests/security/`)

**Purpose**: Validate security measures and identify vulnerabilities

**Coverage**:
- Authentication and authorization
- Input validation and sanitization
- SQL injection prevention
- XSS attack prevention
- Container security
- Network security

**Execution**:
```bash
npx jest tests/security --config=tests/jest.config.js --runInBand
```

**Security Validations**:
- JWT token validation
- Role-based access control
- Input sanitization
- CORS policy enforcement
- Security headers presence
- Container privilege restrictions

## Test Execution Workflows

### Development Testing

```bash
# Quick development test cycle
npm run lint              # Code quality
npm run typecheck        # Type validation
npm test                 # Unit tests
```

### Full Test Suite

```bash
# Run comprehensive test suite
./scripts/run-all-tests.sh

# Or run specific test types
./scripts/run-all-tests.sh --unit
./scripts/run-all-tests.sh --integration
./scripts/run-all-tests.sh --e2e
```

### CI/CD Pipeline Testing

The automated pipeline runs tests in this sequence:

1. **Code Quality Checks**
   - ESLint code linting
   - TypeScript type checking
   - Security audit (npm audit)

2. **Unit Testing**
   - Jest unit test execution
   - Code coverage analysis
   - Test result reporting

3. **Integration Testing**
   - Docker service startup
   - Database and Redis connectivity
   - API integration validation

4. **End-to-End Testing**
   - Complete system deployment
   - User workflow validation
   - Cross-browser testing

5. **Performance & Security**
   - Load testing execution
   - Security vulnerability scanning
   - Resource usage validation

## Test Data Management

### Test Database

- **Test Environment**: Isolated PostgreSQL instance
- **Schema**: Mirrors production with test data
- **Cleanup**: Automatic between test runs
- **Fixtures**: Standardized test data sets

### Mock Services

- **External APIs**: Mocked Claude Flow responses
- **WebSocket**: Simulated real-time events
- **File System**: Temporary test directories
- **Time**: Controlled date/time for consistency

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
npm ci
cd frontend && npm ci

# Install test tools
npx playwright install
```

### Docker Test Environment

```bash
# Start test services
docker-compose -f docker-compose.test.yml up -d

# Verify services
curl http://localhost:8080/health
curl http://localhost:3000
```

### Environment Variables

```bash
# Test configuration
NODE_ENV=test
DB_NAME=agent_feed_test
JWT_SECRET=test-jwt-secret
LOG_LEVEL=error
CLAUDE_FLOW_ENABLED=false
```

## Test Reporting

### Coverage Reports

- **Location**: `/coverage/`
- **Format**: HTML, LCOV, JSON
- **Minimum**: 80% line coverage
- **CI Integration**: Codecov integration

### Test Results

- **Unit Tests**: JUnit XML format
- **Integration Tests**: JSON results
- **E2E Tests**: HTML reports with screenshots
- **Performance**: Metrics and timing data

### Artifacts

All test runs generate the following artifacts:

```
test-results/
├── coverage/           # Code coverage reports
├── e2e-output/        # Playwright test results
├── performance/       # Performance metrics
├── security/          # Security scan results
└── screenshots/       # Test failure screenshots
```

## Deployment Validation

### Production Deployment Testing

```bash
# Deploy to staging
./scripts/deploy-production.sh --domain staging.example.com

# Validate deployment
./scripts/validate-deployment.sh --domain staging.example.com

# Run production smoke tests
npx jest tests/production --config=tests/jest.config.js
```

### Health Checks

Continuous monitoring validates:

- Container health status
- API endpoint availability
- Database connectivity
- WebSocket functionality
- System resource usage
- Security compliance

## Test Maintenance

### Best Practices

1. **Test Independence**: Each test runs in isolation
2. **Deterministic Results**: Tests produce consistent outcomes
3. **Fast Execution**: Optimize for quick feedback
4. **Clear Assertions**: Readable and meaningful test cases
5. **Regular Updates**: Keep tests current with code changes

### Debugging Tests

```bash
# Run specific test file
npx jest tests/unit/agents/agent-coordinator.test.ts

# Debug mode
npx jest --detectOpenHandles --forceExit

# Verbose output
npx jest --verbose

# Watch mode for development
npx jest --watch
```

### Test Data Cleanup

```bash
# Clean test database
npm run test:db:reset

# Remove test artifacts
rm -rf test-results/ coverage/

# Docker cleanup
docker-compose down -v --remove-orphans
```

## Troubleshooting

### Common Issues

1. **Container Startup Timeout**
   - Increase timeout in test configuration
   - Check Docker resources
   - Verify port availability

2. **Database Connection Failures**
   - Ensure PostgreSQL is running
   - Check connection parameters
   - Verify migration completion

3. **WebSocket Connection Issues**
   - Confirm port accessibility
   - Check firewall settings
   - Validate authentication

4. **Performance Test Failures**
   - Monitor system resources
   - Adjust timeout values
   - Check for competing processes

### Getting Help

- Review test logs in `/test-results/`
- Check container logs: `docker-compose logs`
- Examine Jest verbose output
- Validate environment setup

## Continuous Improvement

### Metrics Tracking

- Test execution time trends
- Code coverage evolution
- Failure rate analysis
- Performance benchmark tracking

### Test Enhancement

- Regular test case reviews
- New scenario identification
- Performance optimization
- Security test updates

This comprehensive testing framework ensures the Claude Code + AgentLink system maintains high quality, reliability, and security standards throughout development and deployment.