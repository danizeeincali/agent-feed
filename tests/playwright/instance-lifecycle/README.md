# Claude Instance Lifecycle Tests

Comprehensive Playwright test suite validating the complete Claude instance lifecycle from page load through instance management.

## 🎯 Test Coverage

This test suite validates the complete user workflow after endpoint fixes:

### 1. Instance Listing (01-instance-listing)
- ✅ Instance listing loads successfully without "Failed to fetch instances" error
- ✅ Loading states are handled correctly
- ✅ Error states are displayed appropriately  
- ✅ Empty states work as expected
- ✅ UI remains responsive during loading
- ✅ Performance thresholds are met
- ✅ Accessibility standards are followed

### 2. Instance Creation (02-instance-creation)
- ✅ Instance creation works with corrected endpoints
- ✅ All Claude instance types can be created successfully
- ✅ Form validation works correctly
- ✅ Creation process provides appropriate feedback
- ✅ Error handling during creation works properly
- ✅ Endpoint correction validation
- ✅ Multiple instance creation scenarios

### 3. SSE Connection (03-sse-connection)
- ✅ SSE connection establishment after instance creation
- ✅ Connection management (connect/disconnect)
- ✅ Multiple SSE connections simultaneously
- ✅ Connection recovery after failures
- ✅ SSE connection health monitoring
- ✅ Cross-browser SSE compatibility

### 4. Terminal Streaming (04-terminal-streaming)
- ✅ Real-time terminal streaming functionality
- ✅ Command execution through SSE
- ✅ Terminal input/output synchronization
- ✅ Large output handling
- ✅ Terminal session persistence
- ✅ Performance and responsiveness

### 5. Multiple Instances (05-multiple-instances)
- ✅ Multiple instance management simultaneously
- ✅ Concurrent operations without interference
- ✅ Resource management with multiple instances
- ✅ Instance isolation maintenance
- ✅ Bulk operations functionality
- ✅ Instance coordination and communication

### 6. Error Recovery (06-error-recovery)
- ✅ Error recovery and graceful degradation scenarios
- ✅ Network failure recovery
- ✅ Server error recovery
- ✅ SSE connection recovery
- ✅ Graceful degradation to fallback modes
- ✅ System resilience and consistency

## 🚀 Quick Start

### Prerequisites

1. **Services Running**:
   ```bash
   # Frontend (port 5173)
   cd /workspaces/agent-feed/frontend && npm run dev

   # Backend (port 3000)
   cd /workspaces/agent-feed && npm run server:dev
   ```

2. **Playwright Installed**:
   ```bash
   npx playwright install
   ```

### Running Tests

**Run All Tests:**
```bash
cd /workspaces/agent-feed/tests/playwright/instance-lifecycle
node test-runner.ts all
```

**Run Specific Suite:**
```bash
node test-runner.ts suite instance-listing
node test-runner.ts suite instance-creation
node test-runner.ts suite sse-connection
```

**Run by Pattern:**
```bash
node test-runner.ts pattern "sse"      # SSE-related tests
node test-runner.ts pattern "error"    # Error handling tests
node test-runner.ts pattern "terminal" # Terminal functionality
```

**Cross-Browser Testing:**
```bash
node test-runner.ts cross-browser
```

**Individual Playwright Commands:**
```bash
# Run single test file
npx playwright test 01-instance-listing.lifecycle.spec.ts --config instance-lifecycle.config.ts

# Run with UI mode
npx playwright test --ui --config instance-lifecycle.config.ts

# Run in headed mode
npx playwright test --headed --config instance-lifecycle.config.ts
```

## 📊 Test Configuration

### Custom Configuration (`instance-lifecycle.config.ts`)
- **Timeout**: 3 minutes for complex lifecycle operations
- **Retries**: Enhanced retry logic for SSE operations  
- **Workers**: Single worker to prevent resource conflicts
- **Browsers**: Chrome, Firefox, and WebKit support
- **Reporting**: JSON, JUnit, and HTML reports

### Performance Thresholds
- **Page Load**: < 5 seconds
- **Instance Creation**: < 30 seconds
- **SSE Connection**: < 10 seconds
- **API Response**: < 3 seconds
- **UI Update**: < 1 second

## 🧪 Test Architecture

### Page Object Model
```typescript
// Centralized element management
class InstanceManagerPage {
  // Elements
  readonly instancesContainer: Locator;
  readonly createInstanceButton: Locator;
  readonly terminalContainer: Locator;
  
  // Actions
  async createInstance(name: string, type: string)
  async connectToTerminal()
  async mockSSEConnection(instanceId: string, messages: any[])
}
```

### Test Data Fixtures
```typescript
// Structured test data
export const validInstanceConfigs = {
  sonnet: { name: 'Test Sonnet', type: 'claude-3-5-sonnet' },
  opus: { name: 'Test Opus', type: 'claude-3-opus' },
  haiku: { name: 'Test Haiku', type: 'claude-3-haiku' }
};

export const mockAPIResponses = {
  instancesList: { success: true, data: mockInstances },
  error: (message: string) => ({ success: false, error: message })
};
```

### Mock Management
- **API Mocking**: Route-based request interception
- **SSE Mocking**: Server-Sent Events simulation
- **Error Injection**: Controlled failure scenarios
- **Network Conditions**: Connection issues simulation

## 📁 File Structure

```
tests/playwright/instance-lifecycle/
├── instance-lifecycle.config.ts          # Custom Playwright config
├── test-runner.ts                         # CLI test runner utility
├── README.md                             # This documentation
├── fixtures/
│   └── test-data.ts                      # Test data and mocks
├── page-objects/
│   └── InstanceManagerPage.ts            # Page object model
└── test-files/
    ├── 01-instance-listing.lifecycle.spec.ts     # Instance listing tests
    ├── 02-instance-creation.lifecycle.spec.ts    # Instance creation tests
    ├── 03-sse-connection.lifecycle.spec.ts       # SSE connection tests  
    ├── 04-terminal-streaming.lifecycle.spec.ts   # Terminal streaming tests
    ├── 05-multiple-instances.lifecycle.spec.ts   # Multiple instance tests
    └── 06-error-recovery.lifecycle.spec.ts       # Error recovery tests
```

## 🔧 Development Workflow

### Adding New Tests

1. **Identify Test Scenario**:
   ```typescript
   test('should handle new scenario', async ({ page }) => {
     // Test implementation
   });
   ```

2. **Update Page Objects**:
   ```typescript
   // Add new methods to InstanceManagerPage
   async newFunctionality() {
     // Implementation
   }
   ```

3. **Add Test Data**:
   ```typescript
   // Update fixtures/test-data.ts
   export const newTestData = {
     // Test data structure
   };
   ```

### Running During Development

**Watch Mode:**
```bash
npx playwright test --config instance-lifecycle.config.ts --headed --reporter=line
```

**Debug Mode:**
```bash
npx playwright test --config instance-lifecycle.config.ts --debug
```

**Single Test:**
```bash
npx playwright test --config instance-lifecycle.config.ts -g "should create instance successfully"
```

## 📊 Reporting and Analysis

### HTML Report
```bash
npx playwright show-report playwright-report/instance-lifecycle
```

### Test Results Analysis
- **JSON Results**: `test-results/instance-lifecycle-results.json`
- **JUnit XML**: `test-results/instance-lifecycle-results.xml`
- **Screenshots**: Captured on failure
- **Videos**: Retained on failure
- **Traces**: Available for debugging

### Performance Metrics
The test runner automatically measures and reports:
- Page load times
- Instance creation duration
- SSE connection establishment time
- API response times
- UI responsiveness metrics

## 🐛 Troubleshooting

### Common Issues

**1. Services Not Running**
```bash
# Check if services are accessible
curl http://localhost:3000/health
curl http://localhost:5173
```

**2. Port Conflicts**
```bash
# Kill processes using required ports
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

**3. Playwright Installation**
```bash
# Reinstall Playwright browsers
npx playwright install --force
```

**4. Test Flakiness**
- Increase timeouts in configuration
- Add explicit waits for dynamic content
- Use `waitForLoadState('networkidle')`

### Debug Commands

**Environment Validation:**
```bash
node test-runner.ts info  # Show test suite info
```

**Test Specific Browser:**
```bash
node test-runner.ts all --browser=firefox
```

**Verbose Logging:**
```bash
DEBUG=pw:* npx playwright test --config instance-lifecycle.config.ts
```

## 🎯 Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run Instance Lifecycle Tests
  run: |
    cd tests/playwright/instance-lifecycle
    node test-runner.ts all --headless
    
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: instance-lifecycle-results
    path: tests/playwright/instance-lifecycle/test-results/
```

### Test Quality Gates
- All tests must pass before deployment
- Performance thresholds must be met
- Cross-browser compatibility required
- Error recovery scenarios validated

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model Best Practices](https://playwright.dev/docs/pom)
- [Test Data Management](https://playwright.dev/docs/test-fixtures)
- [Debugging Tests](https://playwright.dev/docs/debug)

## 🤝 Contributing

1. **Add Test Cases**: Follow existing patterns
2. **Update Documentation**: Keep README current
3. **Performance Testing**: Include timing validations
4. **Error Scenarios**: Test failure conditions
5. **Cross-Browser**: Verify compatibility

---

**Test Suite Status**: ✅ Ready for Production Validation

This comprehensive test suite ensures the complete Claude instance lifecycle works correctly after the endpoint fixes, providing confidence in the system's reliability and user experience.