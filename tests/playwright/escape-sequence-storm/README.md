# Escape Sequence Storm Prevention - E2E Test Suite

This comprehensive Playwright test suite validates the prevention of terminal escape sequence storms across multiple browsers, devices, and stress conditions.

## 🎯 Overview

The escape sequence storm prevention system protects against:
- Rapid button clicking that spawns multiple processes
- Terminal output floods with escape sequences
- SSE connection storms
- Memory pressure and resource exhaustion
- Cross-browser compatibility issues
- Mobile and tablet device interactions

## 📋 Test Suites

### 1. Main E2E Suite (`main-e2e-suite.spec.ts`)
- **Purpose**: Core user journey validation
- **Duration**: 5-10 minutes
- **Coverage**: Basic storm prevention, single button clicks, terminal interaction, process management

### 2. Storm Simulation Tests (`storm-simulation.spec.ts`)
- **Purpose**: Intentional storm condition testing
- **Duration**: 10-15 minutes
- **Coverage**: Button spam, output floods, SSE storms, keyboard input storms, process crashes

### 3. Multi-Instance Concurrent Tests (`multi-instance-concurrent.spec.ts`)
- **Purpose**: Multiple Claude instances running simultaneously
- **Duration**: 15-20 minutes
- **Coverage**: Simultaneous button clicks, concurrent terminal operations, network interruptions

### 4. Stress Testing (`stress-testing.spec.ts`)
- **Purpose**: High-load scenarios and system limits
- **Duration**: 20-30 minutes
- **Coverage**: Extreme button clicks, high-frequency output, memory exhaustion, chaos testing

### 5. Cross-Browser Validation (`cross-browser-validation.spec.ts`)
- **Purpose**: Browser compatibility and device-specific testing
- **Duration**: 30-45 minutes
- **Coverage**: Chrome, Firefox, Safari, Edge, mobile devices, tablets

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- 8GB+ RAM recommended for full test suite

### Installation
```bash
# Navigate to test directory
cd tests/playwright/escape-sequence-storm

# Install dependencies
npm install

# Install Playwright browsers
npm run install
```

### Running Tests

#### All Tests (Recommended)
```bash
npm test
```

#### Individual Test Suites
```bash
npm run test:main          # Main E2E suite only
npm run test:storm         # Storm simulation tests
npm run test:concurrent    # Multi-instance tests  
npm run test:stress        # Stress testing
npm run test:cross-browser # Cross-browser validation
```

#### Browser-Specific Tests
```bash
npm run test:chromium      # Chrome/Chromium only
npm run test:firefox       # Firefox only
npm run test:webkit        # Safari/WebKit only
npm run test:mobile        # Mobile devices only
```

#### Special Test Modes
```bash
npm run test:smoke         # Quick smoke tests (5 minutes)
npm run test:performance   # Performance-focused tests
npm run test:debug         # Debug mode with browser UI
npm run test:headed        # Run with visible browsers
```

## 🔧 Configuration

### Environment Variables
```bash
# Test server URL (default: http://localhost:3000)
export TEST_BASE_URL=http://localhost:3000

# Browser selection
export BROWSERS=chromium,firefox,webkit

# Test modes
export DEBUG=true          # Enable debug mode
export HEADLESS=false      # Show browser UI
export SMOKE_TEST=true     # Run smoke tests only
export STRESS_TEST=true    # Enable stress test mode
export PERFORMANCE_TEST=true # Enable performance mode

# CI/CD Integration
export CI=true             # Enable CI mode
export SLACK_WEBHOOK_URL=  # Slack notifications
export EMAIL_NOTIFICATION= # Email notifications
```

### Custom Configuration
Edit `playwright.config.ts` to customize:
- Timeouts and retries
- Browser projects
- Reporter settings  
- Test parallelization
- Output directories

## 📊 Test Reports

### Viewing Reports
```bash
# Open HTML report
npm run test:report

# View test traces  
npm run test:trace
```

### Report Types Generated
- **HTML Report**: Interactive visual report with screenshots
- **JSON Report**: Machine-readable results for CI/CD
- **JUnit XML**: Compatible with most CI systems
- **Failure Analysis**: Detailed breakdown of any failures
- **Performance Report**: Resource usage and timing metrics
- **Badge Data**: Success rate badges for README

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
- name: Run Escape Sequence Storm Tests
  run: |
    cd tests/playwright/escape-sequence-storm
    npm run test:ci
  env:
    TEST_BASE_URL: ${{ env.TEST_SERVER_URL }}
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Other CI Systems
```bash
# Generic CI command
node run-ci-tests.js --projects chromium,firefox --retries 2
```

## 🧪 Test Architecture

### Page Object Model
- **ClaudeTerminalPage**: Main interaction interface
- **Utility Classes**: Monitoring, simulation, orchestration
- **Test Fixtures**: Setup/teardown helpers

### Key Components
- **EscapeSequenceMonitor**: Detects and analyzes escape sequences
- **StormSimulator**: Generates controlled storm conditions  
- **PerformanceTracker**: Monitors resource usage
- **ConcurrentTestOrchestrator**: Manages parallel test execution
- **BrowserCompatibilityTracker**: Cross-browser analysis

## 📈 Performance Benchmarks

### Expected Performance (Per Test Suite)
- **Main E2E**: < 10 minutes
- **Storm Simulation**: < 15 minutes  
- **Multi-Instance**: < 20 minutes
- **Stress Testing**: < 30 minutes
- **Cross-Browser**: < 45 minutes

### Resource Requirements
- **CPU**: 4+ cores recommended
- **Memory**: 8GB+ RAM
- **Network**: Stable connection for browser downloads
- **Disk**: 2GB+ free space for artifacts

## 🐛 Debugging

### Debug Mode
```bash
# Run single test with debug
npm run test:debug -- main-e2e-suite.spec.ts

# Inspect specific failure
playwright show-trace test-results/trace.zip
```

### Common Issues
1. **Browser Installation**: Run `npm run install:deps`
2. **Port Conflicts**: Check TEST_BASE_URL is correct
3. **Memory Issues**: Reduce workers or use sequential mode
4. **Timeout Issues**: Increase timeout in config

### Verbose Logging
```bash
DEBUG=pw:api npm test    # Playwright API calls
DEBUG=pw:browser npm test # Browser interactions  
VERBOSE=true npm test    # Test runner output
```

## 📝 Writing New Tests

### Test Template
```typescript
import { test, expect } from '@playwright/test';
import { ClaudeTerminalPage } from './page-objects/claude-terminal-page';
import { EscapeSequenceMonitor } from './utils/escape-sequence-monitor';

test.describe('My New Test Suite', () => {
  let claudePage: ClaudeTerminalPage;
  let escapeMonitor: EscapeSequenceMonitor;

  test.beforeEach(async ({ page }) => {
    claudePage = new ClaudeTerminalPage(page);
    escapeMonitor = new EscapeSequenceMonitor(page);
    
    await claudePage.navigate();
    await escapeMonitor.startMonitoring();
  });

  test('should prevent my specific storm condition', async () => {
    // Your test logic here
    await claudePage.clickSpawnButton();
    
    const report = await escapeMonitor.getReport();
    expect(report.stormDetected).toBe(false);
  });
});
```

### Best Practices
1. **Always use page objects** for UI interactions
2. **Start monitoring** before test actions
3. **Check storm prevention** in every test
4. **Clean up resources** in afterEach
5. **Use descriptive test names** 
6. **Add proper timeouts** for async operations

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Terminal Escape Sequences Reference](https://en.wikipedia.org/wiki/ANSI_escape_code)
- [Cross-Browser Testing Best Practices](https://web.dev/cross-browser-testing/)
- [Performance Testing Guidelines](https://web.dev/performance-testing/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run the full test suite
5. Submit a pull request

### Code Style
- Use TypeScript for all test files
- Follow existing naming conventions
- Add JSDoc comments for complex functions
- Maintain test independence (no shared state)

## 📄 License

This test suite is part of the Agent Feed project and follows the same license terms.

---

## 🆘 Support

If you encounter issues or need help:
1. Check the [Common Issues](#common-issues) section
2. Review the debug logs
3. Search existing GitHub issues
4. Create a new issue with:
   - Test command used
   - Error output
   - System information
   - Steps to reproduce