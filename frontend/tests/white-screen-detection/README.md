# White Screen Detection Test Suite

## Overview
Comprehensive Playwright test suite designed to detect white screen issues through real browser rendering, console error detection, and interactive element testing.

## Test Files

### 1. `comprehensive-white-screen.spec.ts`
**Main white screen detection with visual analysis**
- Real browser rendering verification
- Console error tracking and analysis
- DOM element counting and visibility checks
- Performance metrics collection
- Screenshot capture with failure analysis
- Network request monitoring
- Infinite loop detection

### 2. `component-rendering.spec.ts`
**React component mounting and rendering verification**
- React app initialization checks
- Component lifecycle monitoring
- Interactive element validation
- CSS loading and styling verification
- Component error boundary testing
- Accessibility and color contrast analysis

### 3. `performance-monitoring.spec.ts`
**Performance and blocking operation detection**
- CPU usage monitoring during interactions
- Memory leak detection with snapshots
- Long task and blocking operation identification
- Layout shift monitoring (CLS)
- Network performance analysis
- Stress testing with rapid interactions
- Multi-tab performance simulation

### 4. `visual-regression.spec.ts`
**Visual regression and layout analysis**
- Visual white screen detection through color analysis
- DOM structure validation
- Responsive design testing across viewports
- Loading state transition monitoring
- Layout stability verification
- Visual comparison with baselines
- Screenshot-based regression detection

### 5. `real-time-monitoring.spec.ts`
**Real-time health monitoring and early warning system**
- Continuous health monitoring during test execution
- Early warning system for white screen precursors
- Memory usage tracking over time
- Error rate analysis and trending
- Interactive health checks during user actions
- Emergency screenshot capture on critical issues

## Key Features

### ✅ Real Browser Testing
- Tests actual user experience, not just HTTP responses
- Full page screenshots for visual verification
- DOM inspection with element counting
- Interactive element validation

### ✅ Comprehensive Error Detection
- JavaScript console error tracking
- Network request failure monitoring
- React component error boundaries
- Unhandled promise rejection capture

### ✅ Performance Monitoring
- Memory usage analysis with leak detection
- CPU usage estimation during interactions
- Long task identification (>50ms)
- Layout shift monitoring (CLS)
- Network performance metrics

### ✅ Visual Analysis
- Color analysis to detect white/blank screens
- DOM structure validation
- Responsive design testing
- Loading state monitoring
- Visual regression comparison

### ✅ Early Warning System
- Precursor error detection
- Risk scoring based on multiple indicators
- Preventive action recommendations
- Real-time health status monitoring

## Usage

### Run All White Screen Tests
```bash
npm run test:white-screen
```

### Run Specific Test Files
```bash
# Comprehensive detection
npx playwright test frontend/tests/white-screen-detection/comprehensive-white-screen.spec.ts

# Component rendering
npx playwright test frontend/tests/white-screen-detection/component-rendering.spec.ts

# Performance monitoring
npx playwright test frontend/tests/white-screen-detection/performance-monitoring.spec.ts

# Visual regression
npx playwright test frontend/tests/white-screen-detection/visual-regression.spec.ts

# Real-time monitoring
npx playwright test frontend/tests/white-screen-detection/real-time-monitoring.spec.ts
```

### Debug Mode
```bash
npm run test:debug
```

### UI Mode
```bash
npm run test:playwright:ui
```

### Headed Mode (See Browser)
```bash
npm run test:headed
```

## Configuration

### Test Thresholds
- **Performance**: 5 second max load time, <100MB memory usage
- **Errors**: 0 critical JavaScript errors allowed
- **DOM**: Minimum 10 visible elements, 5 text nodes
- **Visual**: <80% white pixel percentage
- **Memory**: <20MB growth during test execution
- **Network**: <10% request failure rate

### Screenshot Locations
- `frontend/test-results/white-screen-errors/` - Error screenshots
- `frontend/test-results/visual-baselines/` - Baseline images
- `frontend/test-results/visual-actual/` - Current test screenshots
- `frontend/test-results/visual-diffs/` - Visual difference images

## Test Reports

### Generated Reports
- `preflight-report.json` - Pre-test application health
- `real-time-health-report.json` - Continuous monitoring data
- `early-warning-report.json` - Risk assessment and warnings
- `final-test-report.json` - Test execution summary
- `WHITE_SCREEN_ALERT.json` - Critical issue alerts

### HTML Report
```bash
npx playwright show-report frontend/playwright-report
```

## Troubleshooting

### Common Issues

1. **Application Not Running**
   ```bash
   # Ensure dev server is running
   cd frontend && npm run dev
   ```

2. **Port Conflicts**
   - Default test expects app on `http://localhost:5173`
   - Update `baseURL` in `playwright.config.ts` if different

3. **Test Timeouts**
   - Check network connectivity
   - Increase timeout in test configuration
   - Review console errors in browser

4. **Screenshot Failures**
   - Ensure sufficient disk space
   - Check directory permissions
   - Review browser headless mode settings

### White Screen Indicators

The tests detect white screens through multiple indicators:
- Very few visible DOM elements (<10)
- No interactive elements (buttons, links)
- Minimal text content (<50 characters)
- High percentage of white/transparent pixels (>80%)
- Critical JavaScript errors
- Empty React root element
- Failed network requests for critical resources

### Performance Warning Signs
- Memory usage >50MB
- CPU usage consistently >80%
- DOM size >10,000 nodes
- Long tasks >100ms duration
- Layout shifts >0.1 CLS score
- Network requests >10% failure rate

## Integration

### CI/CD Integration
```yaml
- name: Run White Screen Tests
  run: |
    npm run build
    npm run preview &
    npm run test:white-screen
```

### GitHub Actions
```yaml
- uses: actions/setup-node@v3
- run: npx playwright install
- run: npm run test:playwright
```

This comprehensive test suite provides robust detection of white screen issues and performance problems that could impact user experience.