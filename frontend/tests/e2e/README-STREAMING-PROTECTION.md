# Streaming Loop Protection System - E2E Test Suite

## Overview

This E2E test suite validates the comprehensive 3-layer protection system that prevents infinite streaming loops, runaway processes, and system resource exhaustion in the Agent Feed application.

## Test File Location

```
/frontend/tests/e2e/streaming-loop-protection.spec.ts
```

## Test Scenarios

### 1. Timeout Auto-Stop Test
**Purpose**: Verify that queries exceeding 30 seconds are automatically stopped

**Test Flow**:
1. Submit a complex query that will trigger timeout
2. Wait for processing to start
3. Verify auto-stop message appears within 35 seconds
4. Confirm timeout explanation is displayed

**Screenshots Captured**:
- `01-timeout-initial-state.png` - Before query submission
- `02-timeout-query-submitted.png` - Query entered
- `03-timeout-processing.png` - Processing state
- `04-timeout-auto-stop-message.png` - Auto-stop notification
- `05-timeout-final-state.png` - Final state after timeout

### 2. Monitoring Dashboard Test
**Purpose**: Validate worker monitoring dashboard displays active workers

**Test Flow**:
1. Navigate to monitoring page (try multiple routes)
2. Verify active workers displayed
3. Check health indicators
4. Validate no errors on page

**Screenshots Captured**:
- `06-monitoring-dashboard-overview.png` - Dashboard view
- `07-monitoring-worker-details.png` - Worker details
- `08-monitoring-health-indicators.png` - Health metrics

### 3. Manual Kill Button Test
**Purpose**: Test manual worker termination functionality

**Test Flow**:
1. Submit a long-running query
2. Wait for processing to start
3. Locate and click kill/stop button
4. Verify worker termination

**Screenshots Captured**:
- `09-manual-kill-initial.png` - Initial state
- `10-manual-kill-processing.png` - Worker processing
- `11-manual-kill-button-visible.png` - Kill button visible
- `12-manual-kill-clicked.png` - After kill click
- `13-manual-kill-final-state.png` - Final state

### 4. Circuit Breaker Test
**Purpose**: Validate circuit breaker activation after multiple failures

**Test Flow**:
1. Trigger 3 consecutive failures
2. Verify circuit breaker opens
3. Check "System paused" message
4. Confirm subsequent requests are blocked

**Screenshots Captured**:
- `14-circuit-breaker-initial.png` - Initial state
- `15-circuit-breaker-failure-1.png` - First failure
- `15-circuit-breaker-failure-2.png` - Second failure
- `15-circuit-breaker-failure-3.png` - Third failure
- `16-circuit-breaker-open.png` - Circuit breaker open
- `17-circuit-breaker-blocked-attempt.png` - Blocked attempt

### 5. Real-Time Metrics Test
**Purpose**: Verify worker metrics and statistics display

**Test Flow**:
1. Navigate to metrics/analytics page
2. Check for metrics display
3. Verify charts and graphs
4. Validate real-time updates

**Screenshots Captured**:
- `18-metrics-initial-state.png` - Initial view
- `19-metrics-display.png` - Metrics visible
- `20-agents-page-metrics.png` - Agent page metrics
- `21-metrics-charts.png` - Charts/graphs
- `22-metrics-final-state.png` - Final state

### 6. Concurrent Requests Test
**Purpose**: Test system behavior under concurrent load

**Test Flow**:
1. Submit multiple queries rapidly
2. Verify concurrent processing
3. Check for crashes or errors
4. Validate all responses received

**Screenshots Captured**:
- `23-concurrent-initial.png` - Before submission
- `24-concurrent-processing.png` - Multiple workers
- `25-concurrent-responses.png` - Responses received
- `26-concurrent-final-state.png` - Final state

### 7. Worker Queue Test
**Purpose**: Validate queue display and processing status

**Test Flow**:
1. Navigate to queue view
2. Submit query to create activity
3. Verify queue display updates
4. Check processing indicators

**Screenshots Captured**:
- `27-queue-initial-state.png` - Initial state
- `28-queue-display.png` - Queue visible
- `29-queue-with-activity.png` - Queue activity
- `30-queue-final-state.png` - Final state

## Running Tests

### All Protection Tests
```bash
npm run test:e2e -- streaming-loop-protection
```

### Specific Test
```bash
npm run test:e2e -- streaming-loop-protection -g "should auto-stop query on timeout"
```

### With UI (Interactive Mode)
```bash
npm run test:e2e:ui -- streaming-loop-protection
```

### Headed Mode (See Browser)
```bash
npm run test:e2e -- streaming-loop-protection --headed
```

### Debug Mode
```bash
npx playwright test streaming-loop-protection --debug
```

### Update Screenshots
```bash
npm run test:e2e -- streaming-loop-protection --update-snapshots
```

## Screenshot Directory

All test screenshots are saved to:
```
/frontend/tests/screenshots/streaming-protection/
```

### Screenshot Naming Convention
- Format: `##-description.png`
- Sequential numbering for easy reference
- Descriptive names for clarity

## Test Configuration

### Timeouts
- Standard tests: 45 seconds
- Timeout test: 60 seconds
- Circuit breaker test: 120 seconds

### Browser Support
Tests run on:
- Chromium (Desktop Chrome)
- Firefox (Desktop)
- WebKit (Desktop Safari)

## Expected Outcomes

### Success Criteria
- All 7 test scenarios pass
- 30+ screenshots captured
- No test failures or crashes
- All protection layers validated

### Protection System Validation
- **Layer 1**: Timeout protection triggers correctly
- **Layer 2**: Worker monitoring dashboard functional
- **Layer 3**: Circuit breaker activates on threshold

## Troubleshooting

### Common Issues

**Tests timing out**:
- Increase timeout in test configuration
- Check if backend is running
- Verify network connectivity

**Screenshots not captured**:
- Ensure screenshot directory exists
- Check file permissions
- Verify Playwright installation

**Selectors not found**:
- Update selectors in test file
- Check if UI has changed
- Use debug mode to inspect elements

### Debug Commands
```bash
# Run single test with debug
npx playwright test -g "timeout" --debug

# Trace viewer
npx playwright show-trace trace.zip

# Generate report
npx playwright show-report
```

## Continuous Integration

These tests run automatically on:
- Pull requests to main/develop
- Commits to main branch
- Scheduled nightly runs

### CI Configuration
See `.github/workflows/protection-tests.yml`

## Documentation

### Full Documentation Set
1. [Main Documentation](../../docs/STREAMING-LOOP-PROTECTION.md)
2. [API Documentation](../../docs/STREAMING-LOOP-PROTECTION-API.md)
3. [Implementation Guide](../../docs/STREAMING-LOOP-PROTECTION-IMPLEMENTATION.md)
4. [Testing Guide](../../docs/STREAMING-LOOP-PROTECTION-TESTING.md)

## Maintenance

### Regular Tasks
- Update selectors when UI changes
- Review and update test data
- Regenerate baseline screenshots
- Update documentation

### Test Review Schedule
- Weekly: Check test execution time
- Monthly: Review and update fixtures
- Quarterly: Full test suite audit

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Capture relevant screenshots
3. Update this README
4. Add to CI pipeline
5. Document expected behavior

## Support

For issues or questions:
- GitHub Issues: [agent-feed/issues](https://github.com/your-org/agent-feed/issues)
- Test Documentation: [STREAMING-LOOP-PROTECTION-TESTING.md](../../docs/STREAMING-LOOP-PROTECTION-TESTING.md)
- Support: support@agent-feed.com
