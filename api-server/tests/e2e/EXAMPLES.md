# Production Validation Tests - Usage Examples

## Quick Start

### 1. Basic Test Run

```bash
# Ensure server is running
cd /workspaces/agent-feed/api-server
npm start &

# In another terminal, run tests
npm test tests/e2e/production-validation.test.js
```

### 2. Run with Environment Variables

```bash
# Set production environment
NODE_ENV=production \
USE_POSTGRES=true \
API_BASE_URL=http://localhost:3001 \
npm test tests/e2e/production-validation.test.js
```

## Specific Test Scenarios

### Testing Only Security Headers

```bash
npm test tests/e2e/production-validation.test.js -- --grep "Security Headers"
```

**Expected Output:**
```
API Security Headers
  ✓ should include Strict-Transport-Security (HSTS) header
  ✓ should include Content-Security-Policy (CSP) header
  ✓ should include X-Frame-Options header
  ✓ should include X-Content-Type-Options header
  ✓ should include X-XSS-Protection header
  ✓ should not expose sensitive server information

6 tests passed
```

### Testing Database Connection Pool

```bash
# Ensure PostgreSQL is configured
export USE_POSTGRES=true
npm test tests/e2e/production-validation.test.js -- --grep "Database Connection Pooling"
```

**Expected Output:**
```
Database Connection Pooling
  ✓ Pool size: min = 4, max = 16
  ✓ Connection timeout: 2000 ms
  ✓ Successfully acquired 3 connections from pool
  ✓ Pool connections are functional
  ✓ Released all connections back to pool
  ✓ Handled 18 concurrent queries (pool max: 16)
  ✓ Database health check passed

5 tests passed
```

### Performance Testing

```bash
npm test tests/e2e/production-validation.test.js -- --grep "Performance Under Load"
```

**Expected Output:**
```
Performance Under Load
  ✓ Handled 20/20 concurrent requests
  ✓ Total time: 245ms, Avg: 12.25ms per request
  ✓ Performance within SLA (< 500ms average)
  ✓ Health check avg: 8.50ms, max: 12ms
  ✓ Executed 50 queries in 156ms
  ✓ Average query time: 3.12ms
  ✓ Query performance excellent (< 50ms average)

3 tests passed
```

### Error Handling Validation

```bash
npm test tests/e2e/production-validation.test.js -- --grep "Error Handling"
```

**Expected Output:**
```
Error Handling
  ✓ Error response does not contain stack trace
  ✓ Error message does not contain sensitive information
  ✓ Database errors are caught and handled
  ✓ /api/nonexistent returned status 404
  ✓ /api/claude-code/health returned status 200

4 tests passed
```

## Pre-Production Deployment Workflow

### Step 1: Environment Setup

```bash
# Set production environment in .env
cat > .env.production << 'ENVFILE'
NODE_ENV=production
USE_POSTGRES=true
DATABASE_URL=postgresql://user:secure_password@localhost:5432/avidm_prod
DB_HOST=localhost
DB_PORT=5432
DB_POOL_MIN=8
DB_POOL_MAX=32
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=2000
LOG_LEVEL=info
ENVFILE
```

### Step 2: Run Full Production Validation

```bash
# Load production environment
source .env.production

# Start server in production mode
NODE_ENV=production npm start &

# Wait for server to be ready
sleep 5

# Run all production validation tests
npm test tests/e2e/production-validation.test.js

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ All production validation tests passed!"
else
  echo "❌ Production validation failed - review logs"
  exit 1
fi
```

### Step 3: Review Production Readiness Checklist

```bash
# Run only the checklist test
npm test tests/e2e/production-validation.test.js -- --grep "Production Readiness Checklist"
```

**Expected Output:**
```
Production Readiness Checklist:
  ✓ NODE_ENV configured
  ✓ Database connection configured
  ✓ Connection pool configured
  ✓ Secure password configured
  ✓ Log level configured
  ✓ Database health check passing

6/6 checks passed
```

## Continuous Integration Example

### GitHub Actions

```yaml
# .github/workflows/production-validation.yml
name: Production Validation

on:
  push:
    branches: [main, production]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: api-server/package-lock.json

      - name: Install dependencies
        run: cd api-server && npm ci

      - name: Setup environment
        run: |
          cd api-server
          cat > .env << EOF
          NODE_ENV=production
          USE_POSTGRES=true
          DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db
          DB_HOST=localhost
          DB_PORT=5432
          DB_POOL_MIN=4
          DB_POOL_MAX=16
          LOG_LEVEL=info
          EOF

      - name: Initialize database
        run: cd api-server && npm run db:migrate

      - name: Start API server
        run: cd api-server && npm start &

      - name: Wait for server
        run: |
          timeout 30 bash -c 'until curl -f http://localhost:3001/api/claude-code/health; do sleep 1; done'

      - name: Run production validation tests
        run: cd api-server && npm test tests/e2e/production-validation.test.js

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: api-server/test-results/
```

## Docker Deployment Testing

```bash
# Build production image
docker build -t agent-feed-api:production .

# Run container with PostgreSQL
docker run -d \
  --name agent-feed-postgres \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  postgres:16

# Run API server
docker run -d \
  --name agent-feed-api \
  --link agent-feed-postgres:postgres \
  -e NODE_ENV=production \
  -e USE_POSTGRES=true \
  -e DATABASE_URL=postgresql://postgres:secure_password@postgres:5432/avidm_prod \
  -p 3001:3001 \
  agent-feed-api:production

# Wait for startup
sleep 10

# Run production validation tests against Docker container
API_BASE_URL=http://localhost:3001 \
npm test tests/e2e/production-validation.test.js

# Cleanup
docker stop agent-feed-api agent-feed-postgres
docker rm agent-feed-api agent-feed-postgres
```

## Troubleshooting Common Issues

### Issue: Connection Refused

**Symptom:**
```
⚠ Could not test HSTS - server may not be running
ECONNREFUSED 127.0.0.1:3001
```

**Solution:**
```bash
# Check if server is running
curl http://localhost:3001/api/claude-code/health

# If not, start it
cd api-server && npm start
```

### Issue: Database Connection Failed

**Symptom:**
```
❌ PostgreSQL health check failed
error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check PostgreSQL status
docker ps | grep postgres

# If not running, start it
docker-compose up -d postgres

# Verify connection
psql -h localhost -U postgres -d avidm_dev
```

### Issue: Tests Timing Out

**Symptom:**
```
Timeout - Async callback was not invoked within the 30000 ms timeout
```

**Solution:**
```bash
# Increase timeout
VITEST_TIMEOUT=60000 npm test tests/e2e/production-validation.test.js

# Or reduce concurrent load in tests
export TEST_CONCURRENCY=10
```

### Issue: Pool Exhaustion

**Symptom:**
```
❌ Connection pool exhausted
remaining connection slots are reserved
```

**Solution:**
```bash
# Increase pool size in .env
DB_POOL_MAX=32

# Or reduce test concurrency
export TEST_PARALLEL=1
npm test tests/e2e/production-validation.test.js
```

## Advanced Usage

### Custom API Base URL

```bash
# Test against staging environment
API_BASE_URL=https://staging.example.com \
npm test tests/e2e/production-validation.test.js
```

### Selective Test Execution

```bash
# Run only critical production tests
npm test tests/e2e/production-validation.test.js \
  -- --grep "Environment Variable Validation|Security Headers|Database Connection Pooling"
```

### Parallel Test Execution

```bash
# Run tests in parallel (be careful with database tests)
npm test tests/e2e/production-validation.test.js -- --reporter=verbose --threads
```

### Generate HTML Report

```bash
# Run tests with HTML reporter
npm test tests/e2e/production-validation.test.js -- --reporter=html

# View report
open html/index.html
```

## Monitoring and Alerts

### Slack Notification on Failure

```bash
#!/bin/bash
# run-production-tests.sh

npm test tests/e2e/production-validation.test.js

if [ $? -ne 0 ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚨 Production validation tests failed!"}' \
    $SLACK_WEBHOOK_URL
fi
```

### Email Alert on Failure

```bash
#!/bin/bash
# run-with-email-alert.sh

TEST_OUTPUT=$(npm test tests/e2e/production-validation.test.js 2>&1)

if [ $? -ne 0 ]; then
  echo "$TEST_OUTPUT" | mail -s "Production Validation Failed" team@example.com
fi
```

## Best Practices

1. **Run Before Every Deployment**
   ```bash
   # Add to deployment script
   npm test tests/e2e/production-validation.test.js || exit 1
   ```

2. **Scheduled Testing**
   ```bash
   # Add to crontab for daily checks
   0 2 * * * cd /path/to/api-server && npm test tests/e2e/production-validation.test.js
   ```

3. **Post-Deployment Verification**
   ```bash
   # After deployment, verify production
   API_BASE_URL=https://production.example.com \
   npm test tests/e2e/production-validation.test.js -- --grep "Security Headers|Performance"
   ```

4. **Environment Parity Testing**
   ```bash
   # Test staging matches production config
   diff .env.staging .env.production
   npm test tests/e2e/production-validation.test.js
   ```
