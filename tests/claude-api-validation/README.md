# Claude API Validation Test Suite

This test suite validates that the Claude API integration is making real calls to Anthropic's servers and tracking usage metrics correctly.

## Test Coverage

### 1. Real API Call Validation (`real-api-call.test.js`)
- ✅ Makes actual API calls to Anthropic servers
- ✅ Verifies response authenticity from Anthropic
- ✅ Tests API error handling
- ✅ Validates rate limiting behavior
- ✅ Checks response metadata and structure

### 2. Usage and Cost Tracking (`usage-tracking.test.js`)
- ✅ Tracks token usage accurately
- ✅ Calculates costs based on Anthropic pricing
- ✅ Accumulates usage over multiple requests
- ✅ Exports usage data for analytics
- ✅ Validates cost calculations against known pricing

### 3. Analytics Endpoints (`analytics-endpoints.test.js`)
- ✅ Tests analytics endpoint availability
- ✅ Validates analytics data structure
- ✅ Checks usage analytics accuracy
- ✅ Tests cost analytics endpoints
- ✅ Validates health monitoring

### 4. Token Accuracy (`token-accuracy.test.js`)
- ✅ Tests token counting accuracy
- ✅ Validates token scaling with input length
- ✅ Tests special characters and Unicode handling
- ✅ Verifies output token counting
- ✅ Tests max_tokens limits

### 5. Manual Validation Script (`manual-validation.js`)
- ✅ Interactive test runner
- ✅ Comprehensive API connectivity tests
- ✅ Real-time usage tracking
- ✅ Detailed reporting
- ✅ Cost estimation

## Setup

1. Ensure the API key is configured in `.env`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

2. Install dependencies:
   ```bash
   cd /workspaces/agent-feed/tests/claude-api-validation
   npm install
   ```

## Running Tests

### Run All Tests
```bash
npm run test:all
```

### Run Individual Test Suites
```bash
npm run test:real-api     # Basic API connectivity
npm run test:usage       # Usage tracking
npm run test:analytics   # Analytics endpoints
npm run test:tokens      # Token accuracy
```

### Run Manual Validation
```bash
npm run validate
```

### Run with Jest
```bash
npm test                 # All Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage
```

## Expected Results

### ✅ Successful Test Run Should Show:
- Real API responses from Anthropic servers
- Accurate token counting and usage tracking
- Proper cost calculations
- Response authenticity verification
- Error handling working correctly

### 📊 Usage Metrics Tracked:
- Input/output token counts
- Cost calculations per request
- Total accumulated usage
- Token accuracy measurements
- Response timing data

### 🔍 What Tests Verify:
1. **Real API Connectivity**: Calls actually reach Anthropic servers
2. **Authentication**: API key works correctly
3. **Response Authenticity**: Responses come from Claude, not mocks
4. **Usage Tracking**: Token consumption measured accurately
5. **Cost Tracking**: Pricing calculations are correct
6. **Analytics**: Backend endpoints return real usage data

## Test Files

- `real-api-call.test.js` - Core API connectivity tests
- `usage-tracking.test.js` - Usage and cost tracking validation
- `analytics-endpoints.test.js` - Analytics endpoint testing
- `token-accuracy.test.js` - Token counting accuracy tests
- `manual-validation.js` - Interactive validation script
- `package.json` - Test suite dependencies and scripts
- `validation-report.json` - Generated test report (after running)
- `usage-report.json` - Generated usage report (after running)

## Cost Estimates

These tests use minimal tokens to keep costs low:
- Estimated cost per full test run: < $0.10
- Uses Claude 3 Haiku (most cost-effective model)
- Small token limits for test responses
- Designed for frequent testing without high costs

## Troubleshooting

### API Key Issues
- Verify `ANTHROPIC_API_KEY` is set in `.env`
- Ensure key starts with `sk-ant-api03-`
- Check key has sufficient credits

### Backend Not Running
- Some analytics tests expect backend on `localhost:3000`
- Tests will skip gracefully if backend unavailable
- Run `npm run dev` in main project to start backend

### Network Issues
- Tests require internet connectivity
- Anthropic API must be reachable
- Check firewall/proxy settings

## API Key Security

⚠️ **Important**: The API key used in these tests is for validation purposes only. In production:
- Never expose API keys in logs or client-side code
- Use environment variables for API key storage
- Implement proper API key rotation
- Monitor usage and costs regularly