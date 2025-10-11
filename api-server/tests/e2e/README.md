# E2E Production Validation Tests

## Overview

This directory contains end-to-end integration tests that validate the application is production-ready. All tests use **real API calls and database queries** - no mocking or simulation.

## Test Files

### `production-validation.test.js`

Comprehensive production readiness validation covering:

1. **Environment Variable Validation**
   - Required production variables are set
   - No development/debug settings in production
   - Secure password configuration
   - Appropriate log levels

2. **Database Connection Pooling**
   - Pool size matches configuration
   - Connection acquisition works correctly
   - Connection timeouts configured properly
   - Pool doesn't exceed max connections under load
   - Database health checks pass

3. **API Security Headers**
   - Strict-Transport-Security (HSTS)
   - Content-Security-Policy (CSP)
   - X-Frame-Options
   - X-Content-Type-Options
   - X-XSS-Protection
   - No sensitive server information exposed

4. **Rate Limiting** (if configured)
   - Rate limit headers present
   - Requests are properly rate limited
   - Concurrent requests handled appropriately

5. **Error Handling**
   - Stack traces not exposed in production
   - Error responses are sanitized
   - No sensitive information in errors
   - Proper HTTP status codes
   - Database errors handled gracefully

6. **Performance Under Load**
   - Concurrent request handling
   - Response times within SLA (< 500ms average)
   - Health checks respond quickly (< 1s)
   - Database queries efficient under load (< 50ms average)

7. **Logging Configuration**
   - Log level appropriate for environment
   - Sensitive data not logged
   - Query logging controlled

8. **Production Readiness Checklist**
   - Comprehensive checklist of all prerequisites
   - Clear pass/fail indicators

## Prerequisites

### Running Server
The API server must be running before executing tests:

```bash
cd /workspaces/agent-feed/api-server
npm start
```

The server should be accessible at `http://localhost:3001` (or set `API_BASE_URL` environment variable).

### Database Setup

#### PostgreSQL (Recommended for Production)
```bash
# Set environment variable
export USE_POSTGRES=true

# Ensure PostgreSQL is running and configured in .env
# Database should be initialized with proper schema
```

#### SQLite (Development)
```bash
# Set environment variable
export USE_POSTGRES=false

# SQLite databases will be used from /workspaces/agent-feed/data/
```

### Environment Variables

Required variables (set in `.env` file):
```bash
# Environment
NODE_ENV=production  # or development

# Database
DATABASE_URL=postgresql://user:password@host:port/database
DB_HOST=localhost
DB_PORT=5432
POSTGRES_DB=avidm_prod
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password_here

# Connection Pool
DB_POOL_MIN=4
DB_POOL_MAX=16
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=2000
DB_STATEMENT_TIMEOUT_MS=30000

# Logging
LOG_LEVEL=info  # error, warn, info, debug
```

## Running the Tests

### Run All Production Validation Tests
```bash
cd /workspaces/agent-feed/api-server
npm test tests/e2e/production-validation.test.js
```

### Run with Watch Mode
```bash
npm run test:watch tests/e2e/production-validation.test.js
```

### Run with Coverage
```bash
npm run test:coverage tests/e2e/production-validation.test.js
```

### Run Specific Test Suites
```bash
# Only environment validation
npm test tests/e2e/production-validation.test.js -- --grep "Environment Variable Validation"

# Only database pooling tests
npm test tests/e2e/production-validation.test.js -- --grep "Database Connection Pooling"

# Only security headers
npm test tests/e2e/production-validation.test.js -- --grep "API Security Headers"

# Only performance tests
npm test tests/e2e/production-validation.test.js -- --grep "Performance Under Load"
```

## Test Output

### Successful Run Example
```
🔍 Running Production Validation Tests
Environment: production
Database Mode: PostgreSQL

✓ Environment Variable Validation (5 tests)
  ✓ NODE_ENV: production
  ✓ No debug flags in production mode
  ✓ All required environment variables are set
  ✓ Password does not contain common weak patterns
  ✓ Log level appropriate for production: info

✓ Database Connection Pooling (5 tests)
  ✓ Pool size: min = 4, max = 16
  ✓ Connection timeout: 2000 ms
  ✓ Successfully acquired 3 connections from pool
  ✓ Handled 18 concurrent queries (pool max: 16)
  ✓ Database health check passed

✓ API Security Headers (6 tests)
  ✓ HSTS header present: max-age=31536000; includeSubDomains
  ✓ CSP header present: default-src 'self'...
  ✓ X-Frame-Options header present: DENY
  ✓ X-Content-Type-Options header present: nosniff
  ✓ X-XSS-Protection header present: 1; mode=block
  ✓ X-Powered-By header not present

Production Readiness Checklist:
  ✓ NODE_ENV configured
  ✓ Database connection configured
  ✓ Connection pool configured
  ✓ Secure password configured
  ✓ Log level configured
  ✓ Database health check passing

  6/6 checks passed
```

## Interpreting Results

### Status Icons
- `✓` - Test passed
- `✗` - Test failed (requires attention)
- `⚠` - Warning (recommended but not critical)
- `ℹ` - Informational (skipped or N/A)

### Common Issues

#### Server Not Running
```
⚠ Could not test HSTS - server may not be running
```
**Solution**: Start the API server with `npm start`

#### Database Connection Failed
```
❌ PostgreSQL health check failed
```
**Solution**:
- Check database is running: `docker ps | grep postgres`
- Verify connection string in `.env`
- Check network connectivity

#### Missing Environment Variables
```
⚠ Missing environment variables: DB_POOL_MIN, DB_POOL_MAX
```
**Solution**: Add missing variables to `.env` file

#### Security Headers Missing
```
⚠ HSTS header not set (recommended for production)
```
**Solution**: Add security middleware like `helmet` to Express server

#### Performance Below SLA
```
⚠ Performance outside SLA: 750ms average
```
**Solution**:
- Check database connection pool size
- Optimize slow queries
- Review server resources (CPU, memory)
- Check for network latency

#### Weak Password Detected
```
✗ Password contains common weak patterns
```
**Solution**: Update `POSTGRES_PASSWORD` in `.env` with strong password

## Production Deployment Checklist

Before deploying to production, ensure all these tests pass:

- [ ] All environment variables configured
- [ ] `NODE_ENV=production` set
- [ ] Secure passwords configured (no default/weak passwords)
- [ ] Database health check passing
- [ ] Connection pool properly sized
- [ ] Security headers present (HSTS, CSP, X-Frame-Options, etc.)
- [ ] Error responses sanitized (no stack traces)
- [ ] Performance within SLA (< 500ms average response)
- [ ] Log level set to `info` or higher
- [ ] Rate limiting configured (if applicable)

## Continuous Integration

### GitHub Actions Example
```yaml
name: Production Validation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd api-server && npm install

      - name: Start API server
        run: cd api-server && npm start &
        env:
          NODE_ENV: production
          USE_POSTGRES: true
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/test_db

      - name: Wait for server
        run: sleep 5

      - name: Run production validation tests
        run: cd api-server && npm test tests/e2e/production-validation.test.js
```

## Troubleshooting

### Tests Timing Out
Increase timeout in test file or environment:
```bash
# Set longer timeout
VITEST_TIMEOUT=60000 npm test tests/e2e/production-validation.test.js
```

### Connection Pool Exhausted
Reduce concurrent test load or increase pool size:
```bash
export DB_POOL_MAX=32
```

### Database Locked (SQLite)
SQLite may encounter locks under concurrent load:
```bash
# Switch to PostgreSQL for production testing
export USE_POSTGRES=true
```

## Contributing

When adding new production validation tests:

1. **Use real API/database calls** - No mocking
2. **Make tests resilient** - Handle server not running gracefully
3. **Provide clear output** - Use console.log for progress
4. **Test both success and failure** - Validate error handling
5. **Document prerequisites** - Update this README
6. **Consider environment** - Skip production-only tests in development

## Related Documentation

- [PostgreSQL Configuration](../../config/postgres.js)
- [Database Selector](../../config/database-selector.js)
- [API Server](../../server.js)
- [Environment Variables](../../../.env)

## Support

For issues or questions:
1. Check test output for specific error messages
2. Review environment variable configuration
3. Verify database connectivity
4. Check server logs for additional context
