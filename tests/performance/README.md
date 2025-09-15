# Performance Regression Testing Suite

This comprehensive performance testing suite monitors and prevents performance regressions across the Agent Feed application.

## 🎯 Performance Budgets

### Core Web Vitals
- **Page Load**: < 2 seconds
- **First Contentful Paint (FCP)**: < 1.8 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms
- **Total Blocking Time (TBT)**: < 300ms

### Bundle Size
- **Total Bundle**: < 512KB
- **Main Chunk**: < 300KB
- **Vendor Chunk**: < 200KB
- **Individual Chunks**: < 100KB

### Memory Usage
- **Peak Memory**: < 50MB
- **Memory Growth Rate**: < 10%
- **Memory Leak Threshold**: < 5MB

### API Performance
- **Response Time**: < 500ms
- **Error Rate**: < 1%
- **Throughput**: > 100 req/s

### User Interactions
- **Click-to-Paint**: < 150ms
- **Form Response**: < 100ms
- **Scroll Frame Rate**: > 60 FPS
- **Lighthouse Score**: > 90

## 🔧 Test Components

### 1. Lighthouse CI (`lighthouse-config.js`)
- Automated performance audits
- Core Web Vitals monitoring
- Accessibility and SEO checks
- Performance budget enforcement

### 2. Bundle Analyzer (`bundle-analyzer.js`)
- Bundle size tracking
- Dependency analysis
- Dead code detection
- Regression detection

### 3. Memory Leak Detector (`memory-leak-detector.js`)
- React component lifecycle tracking
- Event listener leak detection
- Memory growth analysis
- Automated cleanup verification

### 4. API Performance Tests (`api-performance.spec.ts`)
- Response time monitoring
- Load testing scenarios
- Error rate tracking
- Throughput measurements

### 5. User Interaction Metrics (`user-interaction-metrics.js`)
- Click-to-paint latency
- Form responsiveness
- Scroll performance
- Touch interaction timing

## 🚀 Usage

### Run All Performance Tests
```bash
npm run test:performance
```

### Individual Test Suites
```bash
# Lighthouse audit
npm run test:performance:lighthouse

# Bundle analysis
npm run test:performance:bundle

# Memory leak detection
npm run test:performance:memory

# API performance
npm run test:performance:api

# User interaction metrics
npm run test:performance:interaction
```

### Update Performance Baselines
```bash
npm run performance:baseline
```

### CI/CD Performance Testing
```bash
npm run ci:performance
```

## 📊 Reports and Monitoring

### Generated Reports
- `performance-report.json` - Comprehensive test results
- `performance-summary.txt` - Human-readable summary
- `bundle-analysis-*.json` - Bundle size analysis
- `memory-leak-report.txt` - Memory analysis results
- `ci-performance-report.json` - CI-friendly summary

### Report Locations
All reports are saved to: `tests/performance/reports/`

### Baseline Files
- `bundle-baseline.json` - Bundle size baseline
- `api-baseline.json` - API performance baseline
- Lighthouse baselines managed by LHCI

## 🔄 CI/CD Integration

### GitHub Actions Workflow
The performance regression workflow (`.github/workflows/performance-regression.yml`) runs:

1. **On every push** to main/develop branches
2. **On pull requests** to main branch
3. **Parallel test execution** for faster results
4. **Automatic baseline updates** on main branch
5. **PR comments** with performance summaries
6. **Build failure** on regression detection

### Environment Variables
```bash
LIGHTHOUSE_CI_TOKEN=<lighthouse-ci-token>
PERFORMANCE_ALERT_EMAIL=<alert-email>
PERFORMANCE_ALERT_SLACK_WEBHOOK=<slack-webhook>
```

## 🎛️ Configuration

### Performance Budgets
Edit thresholds in:
- `lighthouse-config.js` - Lighthouse budgets
- `bundle-analyzer.js` - Bundle size limits
- `memory-leak-detector.js` - Memory thresholds
- `api-performance.spec.ts` - API limits
- `user-interaction-metrics.js` - Interaction budgets

### Test Scenarios
Customize test scenarios in each test file:
- Add new pages to test
- Modify interaction patterns
- Adjust test durations
- Configure load test parameters

## 🚨 Failure Handling

### Regression Detection
Tests fail automatically when:
- Bundle size increases > 5%
- Lighthouse scores drop below 90
- Memory leaks detected
- API response times exceed 500ms
- User interaction scores below 80

### Debugging Failures
1. Check detailed reports in `tests/performance/reports/`
2. Review PR comments for specific regressions
3. Use `VERBOSE_TESTS=true` for detailed output
4. Run individual test suites for isolation

### Common Issues
- **Bundle size regression**: Check for new dependencies or large assets
- **Memory leaks**: Review component cleanup and event listeners
- **Poor Lighthouse scores**: Optimize images, reduce JavaScript execution time
- **Slow APIs**: Check database queries and network requests
- **Interaction delays**: Optimize event handlers and DOM manipulation

## 🛠️ Development

### Adding New Tests
1. Create test file in appropriate subdirectory
2. Follow existing patterns for configuration
3. Add npm script to `package.json`
4. Update CI workflow if needed

### Local Development
```bash
# Install dependencies
npm install

# Build application
npm run build

# Start development server
npm run dev

# Run performance tests
npm run test:performance
```

### Debugging
```bash
# Verbose test output
VERBOSE_TESTS=true npm run test:performance

# Debug specific test
DEBUG_TESTS=true npm run test:performance:bundle

# Skip browser tests (faster)
npm run ci:performance
```

## 📈 Performance Optimization

### Bundle Optimization
- Use dynamic imports for code splitting
- Remove unused dependencies
- Optimize images and assets
- Enable tree shaking

### Memory Optimization
- Implement proper component cleanup
- Remove event listeners in useEffect cleanup
- Avoid memory leaks in closures
- Use React.memo for expensive components

### Runtime Optimization
- Minimize main thread blocking
- Optimize critical rendering path
- Use Web Workers for heavy computation
- Implement proper caching strategies

## 🔗 Related Tools

- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Puppeteer](https://github.com/puppeteer/puppeteer)
- [Playwright](https://github.com/microsoft/playwright)
- [Next.js Bundle Analyzer](https://github.com/vercel/next.js/tree/canary/packages/next-bundle-analyzer)

---

🎯 **Goal**: Maintain optimal performance through automated monitoring and prevention of regressions.