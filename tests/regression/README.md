# CSS Architecture Regression Test Suite

A comprehensive TDD regression testing framework designed to prevent CSS architecture regressions in the agent-feed project. This suite validates the unified CSS architecture combining React 18.2.0, Tailwind CSS 4.x, and Next.js 14.0.0.

## 🎯 Purpose

This test suite was created to prevent regressions of the CSS architecture fixes that resolved white screen issues and ensured proper integration between:
- CSS Variables (HSL format)
- Tailwind CSS utilities
- React component rendering
- Server-side rendering (SSR)
- Multi-viewport responsive design

## 📋 Test Coverage

### 1. CSS Variable Loading Tests (`css-variable-loading.test.js`)
- ✅ HSL format validation (`--background: 0 0% 100%`)
- ✅ CSS custom property inheritance
- ✅ Dark mode variable switching
- ✅ Layer precedence validation
- ✅ Accessibility contrast ratios

### 2. Tailwind Class Application Tests (`tailwind-class-application.test.js`)
- ✅ Basic utility class application
- ✅ Flexbox and Grid utilities
- ✅ Responsive breakpoint classes
- ✅ Hover and focus states
- ✅ Custom config utilities
- ✅ Dark mode classes

### 3. Component Rendering Tests (`component-rendering.test.js`)
- ✅ White screen prevention
- ✅ Layout component rendering
- ✅ Loading state handling
- ✅ Error boundary styling
- ✅ Form component styling
- ✅ Animation performance
- ✅ FOUC prevention

### 4. React Hook Integration Tests (`react-hook-integration.test.js`)
- ✅ useState with CSS updates
- ✅ useEffect infinite loop prevention
- ✅ Animation frame management
- ✅ Event listener cleanup
- ✅ DOM mutation handling
- ✅ Intersection observer integration

### 5. Multi-viewport Responsive Tests (`multi-viewport-responsive.test.js`)
- ✅ Mobile (375px), Tablet (768px), Desktop (1920px)
- ✅ Responsive navigation
- ✅ Grid layout adaptation
- ✅ Typography scaling
- ✅ Spacing adjustments
- ✅ Media queries
- ✅ Orientation changes
- ✅ Accessibility maintenance

### 6. Build Process Validation Tests (`build-process-validation.test.js`)
- ✅ Next.js build success
- ✅ Tailwind CSS compilation
- ✅ CSS variable preservation
- ✅ PostCSS processing
- ✅ TypeScript compilation
- ✅ Static asset handling

### 7. Server Integration Tests (`server-integration.test.js`)
- ✅ Frontend (3003) and Backend (3000) integration
- ✅ SSR CSS hydration
- ✅ CORS configuration
- ✅ Performance under load
- ✅ Error page styling
- ✅ Security headers

## 🚀 Quick Start

### Run All Tests
```bash
# Run the complete regression suite
./tests/regression/run-regression-suite.js

# Or with npm
npm run test:regression
```

### Run Individual Test Types
```bash
# Jest unit tests only
npx jest --config tests/regression/jest.config.regression.js

# Playwright E2E tests only
npx playwright test --config tests/regression/playwright.config.regression.js
```

## 📊 Test Results and Reports

Test results are generated in `/tests/regression/reports/`:

- `regression-test-results.xml` - Jest unit test results (JUnit format)
- `regression-e2e-results.xml` - Playwright E2E test results (JUnit format)
- `regression-summary.json` - Combined test summary (JSON)
- `regression-summary.txt` - Human-readable summary
- `playwright/` - Playwright HTML reports
- `screenshots/` - Visual regression screenshots

## 🔧 Configuration

### Jest Configuration
- **Config**: `jest.config.regression.js`
- **Setup**: `jest.setup.regression.js`
- **Environment**: `jest.env.js`
- **Sequencer**: `jest.sequencer.js`

### Playwright Configuration
- **Config**: `playwright.config.regression.js`
- **Global Setup**: `playwright.global-setup.js`
- **Global Teardown**: `playwright.global-teardown.js`

## 🛠 Prerequisites

Before running the tests, ensure:

1. **Dependencies installed**:
   ```bash
   npm install
   ```

2. **Playwright browsers installed**:
   ```bash
   npx playwright install --with-deps
   ```

3. **Development server running** (for E2E tests):
   ```bash
   npm run dev  # Should start on port 3003
   ```

4. **Backend server running** (for integration tests):
   ```bash
   # Backend should be available on port 3000
   ```

## 📁 Directory Structure

```
tests/regression/
├── README.md                          # This file
├── run-regression-suite.js            # Main test runner
├── jest.config.regression.js          # Jest configuration
├── jest.setup.regression.js           # Jest test setup
├── jest.env.js                        # Environment variables
├── jest.sequencer.js                  # Test execution order
├── playwright.config.regression.js    # Playwright configuration
├── playwright.global-setup.js         # Playwright setup
├── playwright.global-teardown.js      # Playwright teardown
├── css-variable-loading.test.js       # CSS variables tests
├── tailwind-class-application.test.js # Tailwind utilities tests
├── component-rendering.test.js        # Component rendering tests
├── react-hook-integration.test.js     # React hooks tests
├── multi-viewport-responsive.test.js  # Responsive design tests
├── build-process-validation.test.js   # Build process tests
├── server-integration.test.js         # Server integration tests
├── reports/                           # Test results and reports
└── screenshots/                       # Visual regression screenshots
```

## 🔍 Custom Jest Matchers

The test suite includes custom Jest matchers for CSS testing:

```javascript
// CSS variable validation
expect(cssText).toHaveValidCSSVariable('background');

// HSL format validation
expect('221.2 83.2% 53.3%').toHaveValidHSLFormat();

// Tailwind class validation
expect(element).toHaveTailwindClass('bg-primary');

// Viewport visibility
expect(element).toBeVisibleInViewport();

// Responsive CSS validation
expect(cssText).toHaveResponsiveCSS('md');
```

## 🎯 Target Specifications

This test suite validates:
- **React**: 18.2.0
- **Next.js**: 14.0.0
- **Tailwind CSS**: 4.1.13
- **PostCSS**: 8.5.6
- **TypeScript**: 5.9.2

## 🚨 Common Issues and Solutions

### White Screen Issues
If tests detect white screen issues:
1. Check CSS variable loading
2. Verify Tailwind compilation
3. Validate component rendering
4. Review build process logs

### CSS Variable Failures
If CSS variable tests fail:
1. Ensure HSL format (no parentheses)
2. Check `:root` and `.dark` definitions
3. Verify CSS layer structure
4. Validate PostCSS configuration

### Responsive Test Failures
If responsive tests fail:
1. Check Tailwind breakpoint configuration
2. Verify media query compilation
3. Test viewport meta tag
4. Validate responsive utility classes

### Build Process Failures
If build tests fail:
1. Check Next.js configuration
2. Verify Tailwind config paths
3. Review PostCSS setup
4. Validate TypeScript compilation

## 📈 Continuous Integration

To integrate with CI/CD:

```yaml
- name: Run CSS Regression Tests
  run: |
    npm ci
    npx playwright install --with-deps
    npm run dev &
    sleep 10
    ./tests/regression/run-regression-suite.js
```

## 🔄 Maintenance

### Adding New Tests
1. Create test file in `/tests/regression/`
2. Follow naming convention: `*.test.js`
3. Update jest.sequencer.js for execution order
4. Add coverage documentation to README

### Updating Configurations
1. Modify respective config files
2. Test changes locally
3. Update documentation
4. Validate CI integration

## 📝 Contributing

When adding new CSS features:
1. Add corresponding regression tests
2. Update test coverage documentation
3. Ensure tests cover edge cases
4. Test across all supported browsers

## 📞 Support

For issues with the regression test suite:
1. Check test output and logs
2. Review configuration files
3. Validate environment setup
4. Check for known issues in README

---

**Last Updated**: September 28, 2025
**Test Suite Version**: 1.0.0
**Supported Environment**: Node.js 16+, agent-feed project