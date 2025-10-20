---
name: Testing Patterns
description: Comprehensive testing frameworks including unit, integration, E2E, visual regression, accessibility, and performance testing
version: "1.0.0"
category: shared
_protected: false
_allowed_agents: ["page-verification-agent", "dynamic-page-testing-agent", "tester-agent"]
_last_updated: "2025-10-18"
---

# Testing Patterns Skill

## Purpose

Provides comprehensive testing frameworks and patterns for ensuring code quality, functionality, accessibility, and performance. Covers unit testing, integration testing, end-to-end testing, visual regression, accessibility testing, and performance benchmarking.

## When to Use This Skill

- Writing and organizing test suites
- Implementing Test-Driven Development (TDD)
- Validating UI components and pages
- Ensuring accessibility compliance
- Detecting visual regressions
- Performance testing and benchmarking
- API and integration testing

## Core Testing Frameworks

### 1. Unit Testing with Jest/Vitest

**Test Structure Pattern**:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

describe('ComponentName', () => {
  // Group related tests
  describe('when initialized', () => {
    it('renders with default props', () => {
      render(<ComponentName />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('displays correct initial state', () => {
      render(<ComponentName initialValue="test" />);
      expect(screen.getByText('test')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('handles click events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<ComponentName onClick={handleClick} />);
      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty state gracefully', () => {
      render(<ComponentName items={[]} />);
      expect(screen.getByText('No items')).toBeInTheDocument();
    });

    it('handles errors without crashing', () => {
      expect(() => {
        render(<ComponentName data={null} />);
      }).not.toThrow();
    });
  });
});
```

**AAA Pattern (Arrange-Act-Assert)**:
```typescript
it('updates count when button is clicked', async () => {
  // ARRANGE: Set up test conditions
  const user = userEvent.setup();
  render(<Counter initialCount={0} />);

  // ACT: Perform the action
  await user.click(screen.getByRole('button', { name: 'Increment' }));

  // ASSERT: Verify the outcome
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

**Mock Patterns**:
```typescript
// Mock functions
const mockCallback = vi.fn();
mockCallback.mockReturnValue(42);
mockCallback.mockResolvedValue({ data: 'test' });

// Mock modules
vi.mock('./api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'mock' }))
}));

// Spy on methods
const spy = vi.spyOn(object, 'method');
expect(spy).toHaveBeenCalledWith('expected-arg');
spy.mockRestore();

// Partial mocks (keep some real implementation)
vi.mock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    specificFunction: vi.fn()
  };
});
```

**Testing Async Code**:
```typescript
// Promise-based
it('fetches data successfully', async () => {
  const data = await fetchData();
  expect(data).toEqual({ result: 'success' });
});

// Using waitFor for async updates
it('updates UI after data loads', async () => {
  render(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});

// Testing loading states
it('shows spinner while loading', async () => {
  render(<DataComponent />);

  // Initially loading
  expect(screen.getByRole('status')).toBeInTheDocument();

  // After load completes
  await waitFor(() => {
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
```

**Custom Test Utilities**:
```typescript
// Custom render with providers
const renderWithProviders = (
  ui: ReactElement,
  {
    preloadedState = {},
    store = configureStore({ reducer, preloadedState }),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }) => (
    <Provider store={store}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </Provider>
  );

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        `expected ${received} to be within range ${floor} - ${ceiling}`
    };
  }
});
```

### 2. Integration Testing

**API Integration Tests**:
```typescript
describe('API Integration', () => {
  describe('GET /api/users', () => {
    it('returns list of users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveLength(10);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('handles pagination correctly', async () => {
      const response = await request(app)
        .get('/api/users?page=2&limit=5')
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination).toMatchObject({
        page: 2,
        limit: 5,
        total: expect.any(Number)
      });
    });

    it('returns 401 when unauthorized', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });
  });

  describe('POST /api/users', () => {
    it('creates new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body).toMatchObject(userData);
      expect(response.body.id).toBeDefined();
    });

    it('validates required fields', async () => {
      await request(app)
        .post('/api/users')
        .send({ name: 'John Doe' })
        .set('Authorization', `Bearer ${token}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.errors).toContain('email is required');
        });
    });
  });
});
```

**Database Integration Tests**:
```typescript
describe('User Repository', () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.migrate.latest();
    await db.seed.run();
  });

  afterEach(async () => {
    await db.migrate.rollback();
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      const user = await userRepo.findById(1);

      expect(user).toBeDefined();
      expect(user.id).toBe(1);
    });

    it('returns null when not found', async () => {
      const user = await userRepo.findById(9999);
      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    it('creates user in database', async () => {
      const userData = { name: 'Test', email: 'test@example.com' };
      const user = await userRepo.create(userData);

      expect(user.id).toBeDefined();

      const found = await userRepo.findById(user.id);
      expect(found).toMatchObject(userData);
    });

    it('enforces unique constraints', async () => {
      const userData = { name: 'Test', email: 'existing@example.com' };

      await expect(userRepo.create(userData)).rejects.toThrow(
        'Email already exists'
      );
    });
  });
});
```

**Component Integration Tests**:
```typescript
describe('UserForm Integration', () => {
  it('submits form and updates user list', async () => {
    const user = userEvent.setup();

    render(<UserManagementPage />);

    // Fill in form
    await user.type(screen.getByLabelText('Name'), 'John Doe');
    await user.type(screen.getByLabelText('Email'), 'john@example.com');

    // Submit form
    await user.click(screen.getByRole('button', { name: 'Create User' }));

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText('User created successfully')).toBeInTheDocument();
    });

    // Verify user appears in list
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows validation errors', async () => {
    const user = userEvent.setup();

    render(<UserManagementPage />);

    // Submit empty form
    await user.click(screen.getByRole('button', { name: 'Create User' }));

    // Verify validation errors
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });
});
```

### 3. End-to-End Testing with Playwright

**Page Object Model Pattern**:
```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  // Locators
  get emailInput() {
    return this.page.getByLabel('Email');
  }

  get passwordInput() {
    return this.page.getByLabel('Password');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: 'Log In' });
  }

  get errorMessage() {
    return this.page.getByRole('alert');
  }

  // Actions
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async goto() {
    await this.page.goto('/login');
  }

  // Assertions
  async expectToBeLoggedIn() {
    await expect(this.page).toHaveURL('/dashboard');
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}

// Usage in tests
test('successful login', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  await loginPage.expectToBeLoggedIn();
});
```

**E2E Test Patterns**:
```typescript
import { test, expect } from '@playwright/test';

describe('User Journey: Shopping Cart', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('complete purchase flow', async ({ page }) => {
    // Browse products
    await page.goto('/products');
    await page.getByRole('link', { name: 'Product 1' }).click();

    // Add to cart
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByText('Added to cart')).toBeVisible();

    // View cart
    await page.getByRole('link', { name: 'Cart (1)' }).click();
    await expect(page.getByText('Product 1')).toBeVisible();

    // Proceed to checkout
    await page.getByRole('button', { name: 'Checkout' }).click();

    // Fill shipping info
    await page.getByLabel('Address').fill('123 Main St');
    await page.getByLabel('City').fill('Anytown');
    await page.getByLabel('Zip Code').fill('12345');

    // Submit order
    await page.getByRole('button', { name: 'Place Order' }).click();

    // Verify confirmation
    await expect(page.getByText('Order confirmed')).toBeVisible();
    await expect(page.getByText(/Order #\d+/)).toBeVisible();
  });

  test('handles out of stock items', async ({ page }) => {
    await page.goto('/products/out-of-stock-item');

    await expect(
      page.getByRole('button', { name: 'Add to Cart' })
    ).toBeDisabled();

    await expect(page.getByText('Out of Stock')).toBeVisible();
  });
});
```

**Network Interception and Mocking**:
```typescript
test('mocks API responses', async ({ page }) => {
  // Mock successful response
  await page.route('**/api/users', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ])
    });
  });

  await page.goto('/users');

  await expect(page.getByText('John Doe')).toBeVisible();
  await expect(page.getByText('Jane Smith')).toBeVisible();
});

test('handles API errors gracefully', async ({ page }) => {
  // Mock error response
  await page.route('**/api/users', (route) => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' })
    });
  });

  await page.goto('/users');

  await expect(
    page.getByText('Failed to load users')
  ).toBeVisible();
});
```

**Visual Testing with Playwright**:
```typescript
test('homepage visual regression', async ({ page }) => {
  await page.goto('/');

  // Take full page screenshot
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true
  });
});

test('component visual states', async ({ page }) => {
  await page.goto('/components/button');

  // Screenshot specific element
  const button = page.getByRole('button', { name: 'Primary' });
  await expect(button).toHaveScreenshot('button-primary.png');

  // Hover state
  await button.hover();
  await expect(button).toHaveScreenshot('button-primary-hover.png');

  // Disabled state
  await page.getByRole('checkbox', { name: 'Disabled' }).check();
  await expect(button).toHaveScreenshot('button-primary-disabled.png');
});

test('responsive layouts', async ({ page }) => {
  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage-mobile.png');

  // Test tablet viewport
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page).toHaveScreenshot('homepage-tablet.png');

  // Test desktop viewport
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page).toHaveScreenshot('homepage-desktop.png');
});
```

### 4. Accessibility Testing

**Axe-Core Integration**:
```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('page has no accessibility violations', async ({ page }) => {
  await page.goto('/');

  // Inject axe-core
  await injectAxe(page);

  // Run accessibility checks
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: {
      html: true
    }
  });
});

test('form accessibility', async ({ page }) => {
  await page.goto('/contact');
  await injectAxe(page);

  // Check specific element
  await checkA11y(page, '#contact-form', {
    rules: {
      // Run only specific rules
      'color-contrast': { enabled: true },
      'label': { enabled: true },
      'aria-required-attr': { enabled: true }
    }
  });
});
```

**Manual Accessibility Tests**:
```typescript
describe('Keyboard Navigation', () => {
  test('all interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Tab through all focusable elements
    let focusedElement = await page.evaluateHandle(
      () => document.activeElement
    );

    const interactiveElements = [];

    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab');

      const tagName = await page.evaluate(
        (el) => el?.tagName,
        focusedElement
      );

      if (tagName) {
        interactiveElements.push(tagName);
      }
    }

    // Verify critical elements are reachable
    expect(interactiveElements).toContain('BUTTON');
    expect(interactiveElements).toContain('A');
    expect(interactiveElements).toContain('INPUT');
  });

  test('modal traps focus correctly', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.getByRole('button', { name: 'Open Modal' }).click();

    // Verify focus is in modal
    const modalTitle = page.getByRole('heading', { name: 'Modal Title' });
    await expect(modalTitle).toBeFocused();

    // Tab through modal elements
    await page.keyboard.press('Tab');
    const closeButton = page.getByRole('button', { name: 'Close' });
    await expect(closeButton).toBeFocused();

    // Verify focus doesn't escape modal
    await page.keyboard.press('Tab');
    const firstElement = page.locator('[data-modal-first-focusable]');
    await expect(firstElement).toBeFocused();
  });
});

describe('Screen Reader Compatibility', () => {
  test('images have alt text', async ({ page }) => {
    await page.goto('/');

    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeDefined();

      // Decorative images should have empty alt
      const isDecorative = await img.evaluate(
        (el) => el.getAttribute('role') === 'presentation'
      );

      if (!isDecorative) {
        expect(alt).not.toBe('');
      }
    }
  });

  test('form labels are properly associated', async ({ page }) => {
    await page.goto('/contact');

    const inputs = await page.locator('input').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Must have either associated label, aria-label, or aria-labelledby
      if (!ariaLabel && !ariaLabelledBy) {
        expect(id).toBeDefined();

        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    }
  });

  test('ARIA landmarks are present', async ({ page }) => {
    await page.goto('/');

    // Check for main landmark
    await expect(page.locator('[role="main"], main')).toBeVisible();

    // Check for navigation landmark
    await expect(page.locator('[role="navigation"], nav')).toBeVisible();

    // Check for banner (header)
    await expect(page.locator('[role="banner"], header')).toBeVisible();

    // Check for contentinfo (footer)
    await expect(page.locator('[role="contentinfo"], footer')).toBeVisible();
  });
});

describe('Color Contrast', () => {
  test('text has sufficient contrast', async ({ page }) => {
    await page.goto('/');

    // Use axe-core for contrast checking
    await injectAxe(page);

    const results = await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });

    expect(results.violations).toHaveLength(0);
  });
});
```

### 5. Performance Testing

**Lighthouse Performance Tests**:
```typescript
import { playAudit } from 'playwright-lighthouse';

test('homepage meets performance thresholds', async ({ page }) => {
  await page.goto('/');

  await playAudit({
    page,
    thresholds: {
      performance: 90,
      accessibility: 95,
      'best-practices': 90,
      seo: 90,
      pwa: 0
    },
    reports: {
      formats: {
        json: true,
        html: true
      },
      directory: './lighthouse-reports'
    }
  });
});

test('product page performance', async ({ page }) => {
  await page.goto('/products/1');

  await playAudit({
    page,
    thresholds: {
      performance: 85,
      'first-contentful-paint': 2000,
      'largest-contentful-paint': 3000,
      'cumulative-layout-shift': 0.1,
      'time-to-interactive': 4000
    }
  });
});
```

**Custom Performance Metrics**:
```typescript
test('measures page load performance', async ({ page }) => {
  await page.goto('/');

  const performanceMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;

    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      domInteractive: navigation.domInteractive - navigation.fetchStart,
      ttfb: navigation.responseStart - navigation.requestStart
    };
  });

  // Assert performance thresholds
  expect(performanceMetrics.domContentLoaded).toBeLessThan(1000);
  expect(performanceMetrics.loadComplete).toBeLessThan(3000);
  expect(performanceMetrics.ttfb).toBeLessThan(200);
});

test('measures Core Web Vitals', async ({ page }) => {
  await page.goto('/');

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');

  const webVitals = await page.evaluate(() => {
    return new Promise((resolve) => {
      const metrics: any = {};

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.lcp = lastEntry.startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        metrics.fid = entries[0].processingStart - entries[0].startTime;
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        metrics.cls = clsValue;
      }).observe({ entryTypes: ['layout-shift'] });

      setTimeout(() => resolve(metrics), 5000);
    });
  });

  // Assert Core Web Vitals thresholds
  expect(webVitals.lcp).toBeLessThan(2500); // Good: < 2.5s
  expect(webVitals.cls).toBeLessThan(0.1);   // Good: < 0.1
  // FID threshold: < 100ms (if measured)
});
```

## Best Practices

### For Test Organization:
1. **Group Related Tests**: Use describe blocks for logical grouping
2. **Clear Test Names**: Describe what is being tested and expected outcome
3. **One Assertion Focus**: Each test should verify one specific behavior
4. **Independent Tests**: Tests should not depend on each other
5. **Consistent Structure**: Follow AAA pattern consistently

### For Test Reliability:
1. **Avoid Flaky Tests**: Use waitFor, proper timeouts, stable selectors
2. **Clean State**: Reset state between tests with beforeEach/afterEach
3. **Deterministic Data**: Use fixtures, avoid random data
4. **Proper Cleanup**: Close connections, clear mocks, reset state
5. **Isolation**: Mock external dependencies appropriately

### For Maintainability:
1. **Page Object Pattern**: Encapsulate page interactions in E2E tests
2. **Test Utilities**: Create reusable test helpers
3. **Custom Matchers**: Add domain-specific assertions
4. **Fixtures**: Reuse test data and setup code
5. **Documentation**: Comment complex test logic

### For Performance:
1. **Parallel Execution**: Run tests concurrently when possible
2. **Selective Mocking**: Mock only what's necessary
3. **Test Prioritization**: Run fast unit tests before slow E2E tests
4. **Resource Cleanup**: Prevent memory leaks in tests
5. **Efficient Selectors**: Use fast, reliable element selectors

## Integration with Other Skills

- **design-system**: Test component implementations match design specs
- **component-library**: Comprehensive component test coverage
- **code-standards**: Enforce testing standards in code review
- **accessibility-standards**: Automated a11y testing integration

## Success Metrics

- **Code Coverage**: >80% line coverage, >90% for critical paths
- **Test Reliability**: <1% flaky test rate
- **Test Performance**: Unit tests <5s, E2E tests <5min total
- **Accessibility Compliance**: Zero critical a11y violations
- **Visual Regression**: Zero unintended visual changes
- **Performance**: All pages meet Lighthouse thresholds

## References

- [jest-patterns.md](jest-patterns.md) - Jest testing patterns and examples
- [playwright-guide.md](playwright-guide.md) - Playwright E2E testing guide
- [accessibility-testing.md](accessibility-testing.md) - A11y testing comprehensive guide
- [performance-testing.md](performance-testing.md) - Performance testing strategies
- [test-fixtures.md](test-fixtures.md) - Reusable test data and utilities

---

**Remember**: Tests are living documentation of your system's behavior. Write tests that clearly communicate intent, catch regressions early, and give confidence to refactor. Quality tests enable quality code. Test behavior, not implementation.
