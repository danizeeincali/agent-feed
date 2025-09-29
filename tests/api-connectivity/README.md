# API Connectivity Test Suite

Comprehensive test suite to validate API connectivity for the agent-feed project. These tests validate that API endpoints are working correctly by testing against **actual running servers** on ports 5173 and 3000.

## 🎯 Test Coverage

### Endpoints Tested
- ✅ `/api/agents` - Agent data retrieval
- ✅ `/api/agent-posts` - Post data and filtering
- ✅ `/api/streaming-ticker` - Streaming ticker endpoint
- ✅ `/api/health` - Health check endpoints
- ✅ CORS configuration validation
- ✅ Error handling for malformed requests

### Test Types
- **Jest Unit Tests**: Fast, focused API endpoint tests
- **Playwright E2E Tests**: Browser-based integration tests
- **Performance Tests**: Response time and concurrent request handling
- **Data Validation**: Ensures real data (not mocks) is returned
- **Error Handling**: Tests graceful failure scenarios

## 🚀 Quick Start

### Prerequisites
1. Backend server running on port 3000:
   ```bash
   cd /workspaces/agent-feed
   node simple-backend.js
   ```

2. Frontend server running on port 5173 (optional):
   ```bash
   cd /workspaces/agent-feed
   npm run dev
   ```

### Run All Tests
```bash
cd /workspaces/agent-feed
./tests/api-connectivity/run-api-tests.sh
```

### Run Individual Test Suites

#### Jest Tests Only
```bash
npm run test -- --config tests/api-connectivity/jest.config.js
```

#### Playwright Tests Only
```bash
npx playwright test --config tests/api-connectivity/playwright.config.js
```

## 📁 File Structure

```
tests/api-connectivity/
├── jest-api-connectivity.test.js    # Jest unit tests
├── playwright-api-connectivity.spec.js # Playwright E2E tests
├── jest.config.js                   # Jest configuration
├── playwright.config.js             # Playwright configuration
├── setup.js                         # Jest setup and utilities
├── global-setup.js                  # Playwright global setup
├── global-teardown.js               # Playwright global teardown
├── run-api-tests.sh                 # Test runner script
└── README.md                        # This file
```

## 🔧 Configuration

### Environment Variables
- `API_BASE_URL` - Backend API base URL (default: `http://localhost:3000`)
- `FRONTEND_URL` - Frontend URL (default: `http://localhost:5173`)
- `TEST_TIMEOUT` - Test timeout in milliseconds (default: `30000`)

### Example
```bash
export API_BASE_URL="http://localhost:3001"
export FRONTEND_URL="http://localhost:3000"
./tests/api-connectivity/run-api-tests.sh
```

## 🧪 Test Categories

### 1. Basic Connectivity Tests
- Server health checks
- Endpoint availability
- Response format validation

### 2. Data Validation Tests
- Real data vs mock data detection
- Data structure consistency
- Content validation

### 3. CORS Tests
- Cross-origin request handling
- Preflight request validation
- Header configuration

### 4. Error Handling Tests
- 404 error responses
- Malformed request handling
- Timeout scenarios

### 5. Performance Tests
- Response time measurement
- Concurrent request handling
- Load testing

## 📊 Test Results

Test results are saved in multiple formats:

### Jest Results
- `test-results/api-connectivity-results.xml` - JUnit format
- Console output with detailed logs

### Playwright Results
- `test-results/api-connectivity-report/` - HTML report
- `test-results/api-connectivity-results.json` - JSON format
- `test-results/api-connectivity-results.xml` - JUnit format

### Viewing Results
```bash
# Open Playwright HTML report
npx playwright show-report test-results/api-connectivity-report

# View JSON results
cat test-results/api-connectivity-results.json | jq '.'
```

## 🔍 Debugging Failed Tests

### Common Issues

#### Backend Server Not Running
```
❌ Backend server is not running at http://localhost:3000
```
**Solution**: Start the backend server:
```bash
node simple-backend.js
```

#### Port Conflicts
```
⚠️ Frontend server may not be running on port 5173
```
**Solution**: Check what's running on the port:
```bash
lsof -i :5173
netstat -tulpn | grep :5173
```

#### Network Issues
```
❌ Request timed out
```
**Solution**: Check server logs and increase timeout:
```bash
export TEST_TIMEOUT=60000
```

### Debug Mode

#### Jest Debug
```bash
npm run test -- --config tests/api-connectivity/jest.config.js --verbose --detectOpenHandles
```

#### Playwright Debug
```bash
npx playwright test --config tests/api-connectivity/playwright.config.js --debug
```

## 🚨 Real Data Requirements

These tests are designed to work with **REAL APIs**, not mocks:

### What This Means
- Tests hit actual HTTP endpoints
- Database queries are executed
- Real network requests are made
- Actual server responses are validated

### Ensuring Real Data
Tests include checks to detect mock/fake data:
- Names cannot contain "test", "mock", "placeholder", "demo"
- IDs must be meaningful (not "test-id", "mock-id")
- Content must have substantial length
- Data structure must be consistent

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: API Connectivity Tests
on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start backend
        run: node simple-backend.js &

      - name: Wait for backend
        run: npx wait-on http://localhost:3000/api/health

      - name: Run API tests
        run: ./tests/api-connectivity/run-api-tests.sh

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: api-test-results
          path: test-results/
```

## 📝 Writing New Tests

### Adding Jest Tests
```javascript
test('should validate new endpoint', async () => {
  const response = await fetch(`${API_BASE_URL}/api/new-endpoint`);

  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data).toHaveProperty('expectedField');

  console.log('✅ New endpoint test passed');
}, TEST_TIMEOUT);
```

### Adding Playwright Tests
```javascript
test('should validate new endpoint via browser', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/api/new-endpoint`);

  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(data).toHaveProperty('expectedField');

  console.log('✅ New endpoint E2E test passed');
});
```

## 🤝 Contributing

1. Add new tests following existing patterns
2. Ensure tests work with real data
3. Update this README with new test descriptions
4. Test your changes with the full test suite

## 📞 Support

If tests fail consistently:
1. Check server logs for errors
2. Verify database connectivity
3. Ensure all required environment variables are set
4. Check network connectivity between test runner and servers

## 🏆 Success Criteria

Tests pass when:
- ✅ All API endpoints respond correctly
- ✅ Real data is returned (not mocks)
- ✅ CORS headers are properly configured
- ✅ Error handling works as expected
- ✅ Performance meets requirements
- ✅ Data structure is consistent