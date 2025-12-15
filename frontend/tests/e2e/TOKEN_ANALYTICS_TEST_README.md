# Token Analytics Validation Tests - Quick Start Guide

## Overview

Comprehensive end-to-end tests that validate token analytics tracking for Avi DM conversations with real Claude Code integration.

## Prerequisites

1. **Servers Running:**
   ```bash
   # Check if servers are running
   curl http://localhost:5173 && echo "Frontend OK"
   curl http://localhost:3001/api/agents && echo "API Server OK"
   ```

2. **Start Servers (if needed):**
   ```bash
   # From project root
   npm run dev
   ```

## Running Tests

### Run All Token Analytics Tests
```bash
cd frontend
npx playwright test --config=playwright.config.token-analytics.ts
```

### Run Specific Scenario
```bash
# Scenario 1: Avi DM Conversation with Token Tracking
npx playwright test --config=playwright.config.token-analytics.ts --grep="Scenario 1"

# Scenario 2: Token Analytics Dashboard Validation
npx playwright test --config=playwright.config.token-analytics.ts --grep="Scenario 2"
```

### View HTML Report
```bash
npx playwright show-report playwright-report-token-analytics
```

### Debug Mode
```bash
npx playwright test --config=playwright.config.token-analytics.ts --debug
```

### Headed Mode (Watch Tests Run)
```bash
npx playwright test --config=playwright.config.token-analytics.ts --headed
```

## Test Structure

### Scenario 1: Avi DM Conversation with Token Tracking
**What it tests:**
- Message sending to Claude Code API
- Real Claude Code response reception
- Token analytics database record creation
- Database field validation
- Cost calculation accuracy

**Success Criteria:**
- ✅ Message sent successfully
- ✅ Response received within 120 seconds
- ✅ No mock/simulation indicators
- ✅ Database record created
- ✅ All fields validated (sessionId, model, tokens, cost, timestamp)

### Scenario 2: Token Analytics Dashboard Validation
**What it tests:**
- Analytics page loading
- Data visualization presence
- Database query functionality
- Screenshot capture
- Console error checking

**Success Criteria:**
- ✅ Analytics page accessible
- ✅ Data indicators present
- ✅ Database statistics retrievable
- ✅ Screenshots captured
- ✅ No critical errors

## Screenshots

All test screenshots are automatically saved to:
```
frontend/token-analytics-screenshots/
```

**Screenshot Files:**
1. `01-app-initial-state.png` - Initial app load
2. `02-avi-dm-interface.png` - Avi DM interface
3. `03-message-typed.png` - Message in input field
4. `04-message-sent.png` - Message sent state
5. `05-response-received.png` - Claude Code response
6. `06-analytics-page.png` - Analytics dashboard
7. `07-analytics-top.png` - Dashboard top section
8. `08-analytics-middle.png` - Dashboard middle section
9. `09-analytics-bottom.png` - Dashboard bottom section
10. `10-analytics-full-page.png` - Full dashboard page

## Database Queries

### Check Latest Token Analytics Record
```bash
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT * FROM token_analytics WHERE sessionId LIKE 'avi_dm_%' ORDER BY timestamp DESC LIMIT 1"
```

### Check Total Token Analytics Records
```bash
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT COUNT(*) FROM token_analytics"
```

### View Summary Statistics
```bash
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT COUNT(*) as requests, SUM(totalTokens) as tokens, ROUND(SUM(estimatedCost), 4) as cost FROM token_analytics"
```

### View Recent Avi DM Sessions
```bash
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT sessionId, timestamp, totalTokens, estimatedCost FROM token_analytics WHERE sessionId LIKE 'avi_dm_%' ORDER BY timestamp DESC LIMIT 5"
```

## Test Configuration

**File:** `playwright.config.token-analytics.ts`

**Key Settings:**
- **Timeout:** 180 seconds (3 minutes)
- **Workers:** 1 (sequential execution)
- **Browser:** Chromium
- **Viewport:** 1920x1080
- **Retries:** 0 (dev), 2 (CI)

## Troubleshooting

### Test Fails on Message Send
**Issue:** Send button is disabled
**Solution:** Verify message is typed in correct input field (should have placeholder "Type your message to Λvi...")

### Test Timeout Waiting for Response
**Issue:** Claude Code API takes too long
**Solution:**
- Check Claude Code API key is configured
- Verify API server is running (http://localhost:3001)
- Check network connectivity

### Database Record Not Found
**Issue:** Token analytics not written to database
**Solution:**
- Verify database exists at `/workspaces/agent-feed/database.db`
- Check API server logs for errors
- Ensure TokenAnalyticsWriter is initialized

### Analytics Page Not Loading
**Issue:** Dashboard doesn't display
**Solution:**
- Check frontend server is running (http://localhost:5173)
- Verify analytics route is configured
- Check browser console for errors

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Token Analytics Tests
  run: |
    cd frontend
    npx playwright test --config=playwright.config.token-analytics.ts
  timeout-minutes: 10

- name: Upload Test Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: token-analytics-report
    path: frontend/playwright-report-token-analytics/
```

## Test Maintenance

### Updating Test Message
Edit the `testMessage` variable in the test file:
```typescript
const testMessage = 'What is 2+2? Just answer with the number.';
```

### Adjusting Timeouts
Modify `playwright.config.token-analytics.ts`:
```typescript
timeout: 180000, // 3 minutes
```

### Adding More Validation
Add new expect assertions in the test scenarios:
```typescript
expect(record!.modelVersion, 'Model version should be set').toBeTruthy();
```

## Performance Benchmarks

**Expected Performance:**
- Message send: < 1 second
- Claude Code response: 2-30 seconds
- Database write: < 500ms
- Analytics page load: < 3 seconds
- Total test duration: 30-60 seconds

## Data Validation

The tests validate 100% real data:
- ✅ Real Claude Code API calls
- ✅ Real database writes
- ✅ Real token counts
- ✅ Real cost calculations
- ❌ NO mock data
- ❌ NO simulated responses

## Support

For issues or questions:
1. Check test logs: `/tmp/token-analytics-full-test.log`
2. Review screenshots: `frontend/token-analytics-screenshots/`
3. Inspect HTML report: `npx playwright show-report playwright-report-token-analytics`
4. Check database records using SQLite queries above

---

**Last Updated:** October 1, 2025
**Test Version:** 1.0.0
**Playwright Version:** Latest
