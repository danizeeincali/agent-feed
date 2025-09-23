# Component Registry Test Suite

A comprehensive TDD test suite for validating component registry functionality, security, accessibility, and mobile responsiveness.

## 🎯 Mission

Validate that the component registry:
1. **Renders Components Correctly** - All components render without errors with various props
2. **Validates Props Securely** - Zod schemas work correctly and reject invalid input
3. **Prevents Security Vulnerabilities** - XSS prevention and input sanitization work properly
4. **Supports Mobile-First Design** - Components adapt to different screen sizes responsively
5. **Integrates Components Seamlessly** - Registry functions work together in complex UIs
6. **Performs Efficiently** - No memory leaks or performance degradation

## 🏗️ Test Structure

```
/component-registry/
├── jest.config.js              # Jest configuration optimized for component testing
├── test-setup.ts              # Global test setup and utilities
├── run-tests.sh               # Comprehensive test suite runner
├── test-utilities.ts          # Shared test utilities and factories
│
├── unit/                      # Unit Tests
│   ├── navigation-components.test.ts    # Tabs, Breadcrumb, Pagination
│   ├── layout-components.test.ts        # Card, Container, Separator
│   ├── form-components.test.ts          # Button, Input, Select, Checkbox
│   └── display-components.test.ts       # Badge, Alert, Avatar, Progress
│
├── integration/               # Integration Tests
│   ├── component-registry.test.ts       # Registry functionality
│   └── mobile-responsiveness.test.ts    # Responsive behavior
│
├── security/                  # Security Tests
│   └── component-security.test.ts       # XSS prevention, sanitization
│
└── reports/                   # Generated test reports
    ├── coverage/              # Coverage reports
    └── *.xml, *.html         # Test result reports
```

## 🧪 Test Categories

### Unit Tests

**Navigation Components**
- ✅ Tabs component rendering and interaction
- ✅ Props validation and sanitization  
- ✅ Keyboard navigation support
- ✅ ARIA compliance and accessibility

**Layout Components**
- ✅ Card component variants and styling
- ✅ Container responsive behavior
- ✅ Separator semantic correctness
- ✅ Cross-component layout integrity

**Form Components**
- ✅ Button variants, states, and interactions
- ✅ Input types, validation, and constraints
- ✅ Touch target sizing for mobile
- ✅ Form component integration

**Display Components**
- ✅ Badge rendering and content sanitization
- ✅ Alert accessibility and announcements
- ✅ Avatar image loading and fallbacks
- ✅ Progress component state management

### Security Tests

**XSS Prevention**
- ✅ Script tag injection blocking
- ✅ JavaScript protocol URL validation
- ✅ Data URL with HTML content blocking
- ✅ Dangerous protocol detection (vbscript, about, file)

**HTML Injection Prevention**
- ✅ Dangerous HTML tag sanitization
- ✅ Event handler attribute removal
- ✅ CSS injection in style attributes
- ✅ Meta tag and iframe blocking

**Input Validation**
- ✅ Type safety enforcement
- ✅ Nested object sanitization
- ✅ Array data cleaning
- ✅ Function prop blocking

### Integration Tests

**Component Registry**
- ✅ Registry initialization and component lookup
- ✅ Validation system consistency
- ✅ Component composition and nesting
- ✅ Documentation and security policy integration

**Mobile Responsiveness**
- ✅ Viewport adaptation (375px, 768px, 1920px)
- ✅ Touch target sizing (44px minimum)
- ✅ Orientation change handling
- ✅ Performance on mobile devices

## 🚀 Running Tests

### Quick Start
```bash
# Run all tests
./run-tests.sh

# Run specific test suite
npm run test:component-registry

# Run with coverage
npm run test:component-registry:coverage

# Run in watch mode
npm run test:component-registry:watch
```

### Individual Test Categories
```bash
# Unit tests only
jest --testPathPattern="unit/"

# Security tests only
jest --testPathPattern="security/"

# Integration tests only  
jest --testPathPattern="integration/"

# Specific component tests
jest --testPathPattern="form-components"
```

### Advanced Options
```bash
# Debug mode with browser opening
jest --testPathPattern="security/" --verbose --no-cache

# Generate comprehensive coverage
jest --coverage --coverageDirectory=./coverage/full

# Performance profiling
jest --detectOpenHandles --detectLeaks
```

## 📊 Test Coverage

The test suite maintains high coverage standards:

- **Branches**: 95%+ for security tests, 90%+ for unit tests
- **Functions**: 90%+ across all categories
- **Lines**: 85%+ minimum coverage
- **Statements**: 85%+ minimum coverage

### Coverage Reports

After running tests, coverage reports are available:
- **HTML Report**: `./coverage/comprehensive/index.html`
- **LCOV Report**: `./coverage/comprehensive/lcov.info`
- **JSON Summary**: `./coverage/comprehensive/coverage-summary.json`

## 🔧 Test Utilities

The `test-utilities.ts` file provides comprehensive testing helpers:

### Component Test Factory
```typescript
// Generate valid props for any component
const buttonProps = ComponentTestFactory.createButtonProps({
  variant: 'primary',
  disabled: true
});

// Create malicious props for security testing
const maliciousProps = ComponentTestFactory.createMaliciousProps();

// Generate edge case scenarios
const edgeCases = ComponentTestFactory.createEdgeCaseProps();
```

### Component Renderer
```typescript
// Render component safely with validation
const { result, validation } = ComponentRenderer.renderComponent('Button', props);

// Render multiple components for batch testing
const results = ComponentRenderer.renderComponents([
  { name: 'Button', props: buttonProps },
  { name: 'Input', props: inputProps }
]);
```

### Security Testing
```typescript
// Test XSS resistance
const isSecure = SecurityTestUtils.testXSSResistance('Input', ['placeholder', 'value']);

// Test event handler blocking
const blocksHandlers = SecurityTestUtils.testEventHandlerBlocking('Button');
```

### Performance Testing
```typescript
// Measure render performance
const renderTime = PerformanceTestUtils.measureRenderTime('Card', props);

// Full performance benchmark
const benchmark = PerformanceTestUtils.benchmarkComponent('Button');
```

## 🎨 Responsive Testing

Mobile responsiveness is tested across three standard viewports:

| Device  | Viewport | Width × Height |
|---------|----------|----------------|
| Mobile  | 📱       | 375 × 667      |
| Tablet  | 📱       | 768 × 1024     |
| Desktop | 🖥️       | 1920 × 1080    |

### Touch Target Validation
- Minimum 44px × 44px for interactive elements
- Adequate spacing between tappable areas
- Proper focus indicators for keyboard navigation

### Content Adaptation
- Text wrapping and truncation
- Image scaling and aspect ratio maintenance
- Layout reflow without horizontal scrolling

## 🛡️ Security Validation

### XSS Attack Vectors Tested
1. **Script Injection**: `<script>alert("XSS")</script>`
2. **Event Handlers**: `<img onerror="alert(1)">`
3. **JavaScript URLs**: `javascript:alert("XSS")`
4. **Data URLs**: `data:text/html,<script>alert(1)</script>`
5. **CSS Injection**: `style="background:url('javascript:alert(1)')"`
6. **Meta Refresh**: `<meta http-equiv="refresh" content="0;url=javascript:alert(1)">`

### Sanitization Verification
- HTML entity encoding for dangerous characters
- URL protocol validation and blocking
- Event handler prop removal
- Nested object recursive cleaning

## ♿ Accessibility Testing

### WCAG Compliance
- **Perceivable**: Alt text, color contrast, text scaling
- **Operable**: Keyboard navigation, focus management
- **Understandable**: Clear labels, error messages
- **Robust**: Semantic HTML, ARIA attributes

### Screen Reader Support
- Proper heading hierarchy
- Form label associations
- Live region announcements
- Focus order and keyboard traps

## 📈 Performance Standards

### Render Performance
- **Individual Component**: < 100ms render time
- **Complex Layouts**: < 200ms for composite components
- **Mobile Devices**: < 150ms accounting for slower processors

### Memory Management
- **No Memory Leaks**: Stable memory usage over multiple renders
- **Cleanup**: Proper event listener and timer cleanup
- **Bundle Size**: Components should be tree-shakeable

## 🔍 Debugging Tests

### Common Issues

**Test Timeout**
```javascript
// Increase timeout for complex tests
jest.setTimeout(10000);
```

**Mock Failures**
```javascript
// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

**Async Issues**
```javascript
// Wait for async operations
await waitFor(() => {
  expect(screen.getByText('Expected')).toBeInTheDocument();
});
```

### Debug Mode
```bash
# Run with node inspector
node --inspect-brk node_modules/.bin/jest --runInBand --testPathPattern="your-test"

# Verbose logging
DEBUG=* jest --testPathPattern="your-test"
```

## 📋 Test Checklist

Before submitting changes, ensure all tests pass:

- [ ] **Unit Tests**: All component variants render correctly
- [ ] **Security Tests**: XSS prevention and input sanitization
- [ ] **Mobile Tests**: Responsive behavior and touch targets
- [ ] **Integration Tests**: Component registry functionality
- [ ] **Performance Tests**: Memory and render time benchmarks
- [ ] **Accessibility Tests**: Screen reader and keyboard support
- [ ] **Coverage Standards**: Meet minimum coverage thresholds

## 🤝 Contributing

### Adding New Component Tests
1. Add component to `ComponentTestFactory.createPropsForComponent()`
2. Create test file in appropriate `unit/` subdirectory
3. Include security, accessibility, and performance tests
4. Update this README with new component coverage

### Test Guidelines
- Use TDD London School methodology (outside-in testing)
- Mock external dependencies completely
- Test behavior, not implementation
- Include edge cases and error scenarios
- Maintain high code coverage standards

## 📚 References

- [Testing Library Best Practices](https://testing-library.com/docs/)
- [Jest Configuration](https://jestjs.io/docs/configuration)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Testing Patterns](https://react-testing-examples.com/)
- [Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Test Coverage**: 🎯 Comprehensive  
**Security**: 🛡️ XSS Protected  
**Accessibility**: ♿ WCAG Compliant  
**Mobile**: 📱 Touch Optimized  
**Performance**: ⚡ Benchmarked