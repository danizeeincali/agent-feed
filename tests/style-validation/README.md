# Style Validation Test Suite

Comprehensive Playwright-based visual testing suite for validating Tailwind CSS implementation and ensuring consistent styling across the Agent Feed application.

## 🎯 Purpose

This test suite provides automated visual validation to:
- Verify proper Tailwind CSS implementation
- Ensure responsive design consistency
- Validate component styling across browsers and viewports
- Detect visual regressions
- Monitor CSS performance and usage

## 📁 Test Files

| File | Purpose |
|------|---------|
| `visual-regression.spec.ts` | Main visual regression tests with screenshot capture |
| `tailwind-validation.spec.ts` | Tailwind CSS-specific style validation |
| `responsive-design.spec.ts` | Multi-viewport responsive design testing |
| `component-styling.spec.ts` | Individual component styling validation |
| `visual-regression-framework.spec.ts` | Advanced framework for regression testing |
| `playwright.config.ts` | Test configuration and browser setup |
| `run-tests.js` | Test runner with report generation |

## 🚀 Quick Start

```bash
# Install dependencies (if not already installed)
npm install

# Run all style validation tests
npm test

# Run specific test categories
npm run test:visual      # Visual regression
npm run test:tailwind    # Tailwind validation
npm run test:responsive  # Responsive design
npm run test:components  # Component styling
```

## 🖼️ Screenshot Testing

The suite captures screenshots for:
- **Full pages** at multiple viewport sizes
- **Individual components** (buttons, cards, navigation)
- **Interactive states** (hover, focus, active)
- **Theme variations** (light/dark mode)
- **Error states** and loading indicators
- **Cross-browser consistency**

## 📱 Responsive Testing

Validates layouts across 7 viewport sizes:
- Mobile Portrait (390×844)
- Mobile Landscape (844×390)
- Tablet Portrait (768×1024)
- Tablet Landscape (1024×768)
- Desktop Small (1366×768)
- Desktop Large (1920×1080)
- Ultrawide (2560×1440)

## 🎨 Tailwind Validation

Checks for proper implementation of:
- **Color schemes** (primary blues, secondary grays)
- **Typography scale** (font sizes, line heights)
- **Spacing system** (padding, margins on 4px grid)
- **Layout utilities** (flexbox, grid)
- **Interactive states** (hover, focus effects)
- **Custom animations** (pulse-slow, bounce-gentle)

## 🔧 Configuration

### Browser Support
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)

### Test Settings
- Headless mode for CI/CD
- Disabled animations for consistency
- 20% pixel difference threshold
- Full page and viewport screenshots

## 📊 Reporting

Generates comprehensive reports including:
- Test pass/fail summary
- Screenshot gallery
- CSS coverage analysis
- Performance metrics
- Accessibility validation results
- Tailwind utility usage

## 🛠️ Development Commands

```bash
# Debug tests with browser UI
npm run test:headed

# Step-by-step debugging
npm run test:debug

# Update baseline screenshots
npm run test:update-snapshots

# View HTML test report
npm run report

# Clean test artifacts
npm run clean
```

## 📋 Test Checklist

### Visual Regression
- [ ] Homepage renders correctly
- [ ] Agent dashboard displays properly
- [ ] Terminal interface styling
- [ ] Navigation components
- [ ] Button states and variants
- [ ] Card layouts and shadows
- [ ] Modal dialogs and overlays

### Tailwind CSS
- [ ] Primary colors (#3b82f6) applied
- [ ] Secondary colors (#64748b) applied
- [ ] Font sizes follow scale
- [ ] Spacing uses 4px/8px grid
- [ ] Border radius consistency
- [ ] Shadow effects working
- [ ] Hover/focus states active

### Responsive Design
- [ ] No horizontal overflow on mobile
- [ ] Touch targets ≥44px on mobile
- [ ] Text remains readable at all sizes
- [ ] Images scale appropriately
- [ ] Navigation adapts to screen size
- [ ] Forms work on mobile devices

### Component Styling
- [ ] Buttons have proper states
- [ ] Cards have consistent styling
- [ ] Forms show validation states
- [ ] Navigation highlights active items
- [ ] Loading indicators animate
- [ ] Error messages display correctly

## 🐛 Troubleshooting

### Common Issues

**Tests timeout**
```bash
# Increase timeout in playwright.config.ts
timeout: 180000  // 3 minutes
```

**Screenshot differences**
```bash
# Update baselines if changes are intentional
npm run test:update-snapshots
```

**Server connection failed**
```bash
# Check if servers are running
curl http://localhost:5173  # Frontend
curl http://localhost:3000  # Backend
```

**CSS not loading**
```bash
# Verify Tailwind build
cd ../../frontend && npm run build
```

### Debug Mode

Run tests in debug mode to step through execution:
```bash
npm run test:debug
```

## 📈 Performance Monitoring

The suite tracks:
- CSS file sizes and usage
- Render performance metrics
- Screenshot file sizes
- Bundle analysis data

## ♿ Accessibility Testing

Validates:
- Focus indicator visibility
- Color contrast ratios
- Touch target sizes
- High contrast mode support
- Reduced motion preferences

## 🔄 CI/CD Integration

Designed for continuous integration:
- Headless browser execution
- JSON test result output
- Screenshot artifact storage
- Performance regression detection

## 📝 Creating New Tests

To add new visual tests:

1. **Create test file**:
```typescript
import { test, expect } from '@playwright/test';

test('My new component', async ({ page }) => {
  await page.goto('/my-page');
  await page.waitForLoadState('networkidle');

  const component = page.locator('.my-component');
  await expect(component).toHaveScreenshot('my-component.png');
});
```

2. **Add to test runner**:
Edit `run-tests.js` to include your new test file.

3. **Update configuration**:
Modify `playwright.config.ts` if needed for special requirements.

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Visual Testing Best Practices](https://playwright.dev/docs/test-screenshots)

---

For detailed results and analysis, see the generated report at:
`/workspaces/agent-feed/docs/STYLE_VALIDATION_REPORT.md`