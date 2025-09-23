# CSS Regression Test Suite

A comprehensive test suite for validating CSS styles, compilation, and visual regression in the agent-feed project.

## 📁 Test Structure

```
tests/css-regression/
├── README.md                          # This documentation
├── css-processing.test.js             # CSS file processing and compilation tests
├── tailwind-utilities.test.js         # Tailwind CSS utility class tests
├── critical-styles.test.js            # Critical styles application tests
├── dark-mode-styles.test.js           # Dark mode and theme switching tests
├── custom-css-classes.test.js         # Custom CSS class functionality tests
├── css-variables.test.js              # CSS custom properties tests
├── css-console-errors.test.js         # CSS error detection and validation tests
├── css-utilities.jest.test.js         # Jest unit tests for CSS utilities
└── visual-regression.spec.ts          # Playwright E2E visual regression tests
```

## 🧪 Test Categories

### 1. CSS Processing Tests (`css-processing.test.js`)
- **Purpose**: Verify CSS files are properly processed and compiled
- **Coverage**:
  - CSS file existence validation
  - Configuration file validation (Tailwind, Next.js)
  - CSS content validation
  - CSS syntax validation
  - Build process validation

**Key Tests**:
- ✅ CSS files exist and are readable
- ✅ Tailwind configuration is valid
- ✅ Next.js CSS optimization is enabled
- ✅ CSS syntax is error-free
- ✅ Build dependencies are correctly configured

### 2. Tailwind Utilities Tests (`tailwind-utilities.test.js`)
- **Purpose**: Ensure Tailwind CSS utility classes are properly compiled
- **Coverage**:
  - Tailwind configuration validation
  - Utility class generation
  - Custom color utilities
  - Responsive utilities
  - Animation utilities
  - PostCSS integration

**Key Tests**:
- ✅ Content paths are correctly configured
- ✅ Custom theme colors are defined
- ✅ Standard utility classes are available
- ✅ Responsive breakpoints work
- ✅ Custom animations are configured
- ✅ Text shadow utilities are functional

### 3. Critical Styles Tests (`critical-styles.test.js`)
- **Purpose**: Validate critical styles for layout, colors, and spacing
- **Coverage**:
  - Layout display properties
  - Color application
  - Spacing utilities
  - Typography styles
  - Custom CSS class validation

**Key Tests**:
- ✅ Grid and Flexbox layouts work correctly
- ✅ Color systems are properly applied
- ✅ Spacing utilities function as expected
- ✅ Typography scales are consistent
- ✅ Custom agents.css classes are valid

### 4. Dark Mode Tests (`dark-mode-styles.test.js`)
- **Purpose**: Test dark mode implementation and theme switching
- **Coverage**:
  - CSS variable definitions
  - Theme-aware class selectors
  - Tailwind dark mode classes
  - Ray container effects
  - System preference detection

**Key Tests**:
- ✅ Dark mode CSS variables are defined
- ✅ Light/dark theme switching works
- ✅ Theme-aware classes apply correctly
- ✅ Visual effects adapt to themes
- ✅ System preferences are respected

### 5. Custom CSS Classes Tests (`custom-css-classes.test.js`)
- **Purpose**: Verify custom CSS classes work correctly
- **Coverage**:
  - Agents page styles
  - CSS animations and keyframes
  - Responsive design classes
  - Modal and component styles
  - CSS class integration

**Key Tests**:
- ✅ All required agent classes are defined
- ✅ Layout styles apply correctly
- ✅ Animations and transitions work
- ✅ Responsive breakpoints function
- ✅ Custom and Tailwind classes integrate seamlessly

### 6. CSS Variables Tests (`css-variables.test.js`)
- **Purpose**: Test CSS custom properties (variables) functionality
- **Coverage**:
  - CSS variable definitions
  - Variable usage in styles
  - Dynamic variable updates
  - Variable inheritance
  - Media query variables
  - Error handling

**Key Tests**:
- ✅ Root-level variables are defined
- ✅ Theme switching updates variables
- ✅ Variables are used correctly in styles
- ✅ Fallback values work
- ✅ Nested variables resolve properly
- ✅ Performance impact is minimal

### 7. CSS Console Errors Tests (`css-console-errors.test.js`)
- **Purpose**: Validate no CSS errors are reported in console
- **Coverage**:
  - Syntax error detection
  - Property validation
  - Units and values validation
  - Custom properties error handling
  - Media query parsing
  - Performance optimization

**Key Tests**:
- ✅ No syntax errors in CSS files
- ✅ Valid CSS properties are used
- ✅ CSS units are correctly formatted
- ✅ Custom properties handle errors gracefully
- ✅ Media queries are properly structured
- ✅ CSS specificity is reasonable

### 8. CSS Utilities Jest Tests (`css-utilities.jest.test.js`)
- **Purpose**: Unit tests for CSS utility functions and helpers
- **Coverage**:
  - Class name utilities
  - CSS variable utilities
  - Theme utilities
  - Responsive utilities
  - Animation utilities
  - Color utilities
  - CSS parsing utilities

**Key Tests**:
- ✅ Class name joining works correctly
- ✅ CSS variable getters/setters function
- ✅ Theme switching utilities work
- ✅ Responsive class generation works
- ✅ Color conversion utilities are accurate
- ✅ CSS parsing handles various inputs
- ✅ Performance is acceptable

### 9. Visual Regression Tests (`visual-regression.spec.ts`)
- **Purpose**: E2E visual testing with Playwright
- **Coverage**:
  - CSS loading and compilation in browsers
  - Tailwind utility application
  - Dark mode switching
  - Responsive design behavior
  - Animation and transition functionality
  - Custom CSS class application
  - CSS variable integration
  - Performance testing

**Key Tests**:
- ✅ Styles load and apply correctly in browsers
- ✅ Tailwind utilities work as expected
- ✅ Theme switching is visually correct
- ✅ Responsive breakpoints trigger properly
- ✅ Animations and transitions function
- ✅ Custom styles are applied correctly
- ✅ CSS variables update dynamically
- ✅ Performance meets expectations

## 🚀 Running the Tests

### Prerequisites
```bash
npm install
```

### Run All CSS Tests
```bash
# Jest tests
npm test tests/css-regression/*.test.js

# Playwright tests
npx playwright test tests/css-regression/visual-regression.spec.ts
```

### Run Specific Test Categories
```bash
# CSS Processing
npm test tests/css-regression/css-processing.test.js

# Tailwind Utilities
npm test tests/css-regression/tailwind-utilities.test.js

# Critical Styles
npm test tests/css-regression/critical-styles.test.js

# Dark Mode
npm test tests/css-regression/dark-mode-styles.test.js

# Custom Classes
npm test tests/css-regression/custom-css-classes.test.js

# CSS Variables
npm test tests/css-regression/css-variables.test.js

# Console Errors
npm test tests/css-regression/css-console-errors.test.js

# Utilities
npm test tests/css-regression/css-utilities.jest.test.js

# Visual Regression (Playwright)
npx playwright test tests/css-regression/visual-regression.spec.ts
```

### Run with Coverage
```bash
npm test -- --coverage tests/css-regression/
```

### Run in Watch Mode
```bash
npm test -- --watch tests/css-regression/
```

## 📊 Test Results Analysis

### Coverage Areas
- **CSS File Processing**: 100% of CSS files are validated
- **Tailwind Configuration**: All utility classes are tested
- **Theme Implementation**: Complete dark/light mode coverage
- **Responsive Design**: All breakpoints are verified
- **Custom Styles**: All project-specific CSS is tested
- **Error Detection**: Comprehensive syntax and runtime error checking
- **Visual Validation**: Real browser rendering verification

### Performance Benchmarks
- CSS parsing: < 1000ms for large files
- Class name operations: < 100ms for 10k operations
- CSS loading: < 2000ms for complex stylesheets
- Theme switching: Smooth transitions with no flicker

### Browser Compatibility
The visual regression tests run on:
- ✅ Chromium (latest)
- ✅ Firefox (latest)
- ✅ WebKit (Safari)
- ✅ Mobile Chrome
- ✅ Mobile Safari

## 🔧 Configuration

### Jest Configuration
Tests use the project's Jest configuration from `package.json`:
```json
{
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"]
}
```

### Playwright Configuration
Visual tests use Playwright's default configuration with:
- Multiple browser engines
- Responsive viewport testing
- Screenshot comparison
- Performance monitoring

## 🐛 Debugging Failed Tests

### Common Issues
1. **CSS File Not Found**: Ensure all CSS files exist in expected locations
2. **Tailwind Configuration Error**: Verify `tailwind.config.ts` syntax
3. **Theme Variables Missing**: Check CSS variable definitions
4. **Visual Regression Mismatch**: Review screenshot comparisons

### Debugging Commands
```bash
# Verbose test output
npm test -- --verbose tests/css-regression/

# Debug specific test
npm test -- --testNamePattern="should apply" tests/css-regression/

# Playwright debug mode
npx playwright test --debug tests/css-regression/visual-regression.spec.ts

# Generate new visual baselines
npx playwright test --update-snapshots tests/css-regression/visual-regression.spec.ts
```

## 📈 Metrics and Reports

### Test Metrics
- **Total Tests**: 200+ individual test cases
- **Coverage Areas**: 9 major CSS categories
- **Browser Coverage**: 5 different engines
- **Viewport Coverage**: Mobile, tablet, desktop
- **Performance Tests**: Load time, rendering speed

### Generated Reports
- Jest test results and coverage
- Playwright test reports with screenshots
- Performance benchmark results
- CSS validation reports

## 🔄 Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example CI configuration
- name: Run CSS Regression Tests
  run: |
    npm test tests/css-regression/
    npx playwright test tests/css-regression/visual-regression.spec.ts
```

## 📚 Dependencies

### Test Dependencies
- **Jest**: JavaScript testing framework
- **Playwright**: E2E testing and browser automation
- **JSDOM**: DOM manipulation for Node.js
- **fs/path**: File system operations

### Project Dependencies
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS transformation tool
- **Next.js**: React framework with CSS optimization

## 🛠 Maintenance

### Adding New Tests
1. Create test file in `/tests/css-regression/`
2. Follow existing naming conventions
3. Include comprehensive test coverage
4. Update this README with new test information

### Updating Baselines
When CSS changes are intentional:
```bash
# Update visual baselines
npx playwright test --update-snapshots

# Update test expectations
# Modify test files to match new expected behavior
```

## 📞 Support

For issues with CSS regression tests:
1. Check the specific test category that's failing
2. Review the debugging section above
3. Ensure all dependencies are correctly installed
4. Verify CSS files exist and are syntactically correct

---

*This test suite ensures CSS reliability, performance, and visual consistency across the agent-feed project.*