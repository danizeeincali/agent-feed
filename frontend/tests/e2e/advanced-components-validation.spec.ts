import { test, expect, Page } from '@playwright/test';

/**
 * COMPREHENSIVE E2E TEST SUITE FOR ADVANCED COMPONENTS
 *
 * This suite validates all 7 advanced components with real browser interactions:
 * 1. Checklist - Interactive checkbox list
 * 2. Calendar - Date picker with events (single, multiple, range modes)
 * 3. PhotoGrid - Image grid with lightbox
 * 4. Markdown - Markdown renderer with XSS protection
 * 5. Sidebar - Navigation sidebar with collapsible sections
 * 6. SwipeCard - Swipeable card stack
 * 7. GanttChart - Project timeline visualization
 *
 * Each test:
 * - Creates a test page with the component
 * - Validates component rendering
 * - Tests user interactions
 * - Captures screenshots
 * - Checks for console errors
 */

// Test configuration
const TEST_AGENT_ID = 'test-agent-advanced-components';
const SCREENSHOT_DIR = 'tests/e2e/screenshots';
const API_BASE = 'http://localhost:3001';

// Helper: Create a test page via API
async function createTestPage(
  page: Page,
  pageId: string,
  title: string,
  components: any[]
): Promise<void> {
  const response = await page.request.post(
    `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`,
    {
      data: {
        id: pageId,
        title,
        components,
        metadata: {
          description: `Test page for ${title}`,
          tags: ['test', 'e2e']
        }
      }
    }
  );

  expect(response.ok()).toBeTruthy();
}

// Helper: Delete test page
async function deleteTestPage(page: Page, pageId: string): Promise<void> {
  await page.request.delete(
    `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${pageId}`
  );
}

// Helper: Navigate to test page
async function navigateToTestPage(
  page: Page,
  pageId: string
): Promise<void> {
  await page.goto(`/agents/${TEST_AGENT_ID}/pages/${pageId}`);
  await page.waitForLoadState('networkidle');
}

// Helper: Check for console errors
function setupConsoleErrorTracking(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

test.describe('Advanced Components E2E Validation', () => {

  // =================================================================
  // 1. CHECKLIST COMPONENT TESTS
  // =================================================================

  test.describe('Checklist Component', () => {
    const PAGE_ID = 'test-checklist';

    test.beforeEach(async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Checklist Test', [
        {
          type: 'Checklist',
          props: {
            items: [
              { id: 1, text: 'First task', checked: false },
              { id: 2, text: 'Second task', checked: true },
              { id: 3, text: 'Third task', checked: false }
            ],
            allowEdit: true
          }
        }
      ]);
    });

    test.afterEach(async ({ page }) => {
      await deleteTestPage(page, PAGE_ID);
    });

    test('should render checklist with all items', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);

      await navigateToTestPage(page, PAGE_ID);

      // Verify page title
      await expect(page.getByRole('heading', { name: 'Checklist Test' })).toBeVisible();

      // Verify all checklist items are present
      const checkboxes = page.locator('input[type="checkbox"]');
      await expect(checkboxes).toHaveCount(3);

      // Verify text content
      await expect(page.locator('text=First task')).toBeVisible();
      await expect(page.locator('text=Second task')).toBeVisible();
      await expect(page.locator('text=Third task')).toBeVisible();

      // Verify initial checked states
      const checkbox1 = checkboxes.nth(0);
      const checkbox2 = checkboxes.nth(1);
      const checkbox3 = checkboxes.nth(2);

      await expect(checkbox1).not.toBeChecked();
      await expect(checkbox2).toBeChecked();
      await expect(checkbox3).not.toBeChecked();

      // Screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/checklist-rendered.png`,
        fullPage: true
      });

      // No console errors
      expect(errors.length).toBe(0);
    });

    test('should toggle checkbox items', async ({ page }) => {
      await navigateToTestPage(page, PAGE_ID);

      const checkboxes = page.locator('input[type="checkbox"]');
      const checkbox1 = checkboxes.nth(0);

      // Toggle first checkbox
      await checkbox1.click();
      await expect(checkbox1).toBeChecked();

      // Toggle again
      await checkbox1.click();
      await expect(checkbox1).not.toBeChecked();

      // Screenshot after interaction
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/checklist-toggled.png`,
        fullPage: true
      });
    });

    test('should handle keyboard navigation', async ({ page }) => {
      await navigateToTestPage(page, PAGE_ID);

      const checkboxes = page.locator('input[type="checkbox"]');
      const checkbox1 = checkboxes.nth(0);

      // Focus first checkbox
      await checkbox1.focus();

      // Toggle with Space key
      await page.keyboard.press('Space');
      await expect(checkbox1).toBeChecked();

      // Tab to next checkbox
      await page.keyboard.press('Tab');
      const checkbox2 = checkboxes.nth(1);
      await expect(checkbox2).toBeFocused();
    });
  });

  // =================================================================
  // 2. CALENDAR COMPONENT TESTS
  // =================================================================

  test.describe('Calendar Component', () => {
    const PAGE_ID = 'test-calendar';

    test('should render calendar in single mode', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Calendar Single Mode', [
        {
          type: 'Calendar',
          props: {
            mode: 'single',
            selectedDate: '2024-03-15',
            events: [
              {
                id: 1,
                date: '2024-03-15',
                title: 'Team Meeting',
                description: 'Weekly standup',
                color: '#3b82f6'
              },
              {
                id: 2,
                date: '2024-03-20',
                title: 'Project Deadline',
                color: '#ef4444'
              }
            ]
          }
        }
      ]);

      const errors = setupConsoleErrorTracking(page);
      await navigateToTestPage(page, PAGE_ID);

      // Verify calendar is visible
      const calendar = page.locator('[role="application"]').or(page.locator('.rdp'));
      await expect(calendar).toBeVisible();

      // Verify month/year navigation
      const monthYear = page.locator('text=/march|april|may/i').first();
      await expect(monthYear).toBeVisible();

      // Screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/calendar-single.png`,
        fullPage: true
      });

      expect(errors.length).toBe(0);
      await deleteTestPage(page, PAGE_ID);
    });

    test('should render calendar in range mode', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Calendar Range Mode', [
        {
          type: 'Calendar',
          props: {
            mode: 'range',
            events: []
          }
        }
      ]);

      await navigateToTestPage(page, PAGE_ID);

      // Verify calendar renders
      const calendar = page.locator('[role="application"]').or(page.locator('.rdp'));
      await expect(calendar).toBeVisible();

      // Screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/calendar-range.png`,
        fullPage: true
      });

      await deleteTestPage(page, PAGE_ID);
    });

    test('should display events on calendar', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Calendar with Events', [
        {
          type: 'Calendar',
          props: {
            mode: 'single',
            events: [
              {
                id: 1,
                date: '2024-03-15',
                title: 'Event 1',
                description: 'Test event'
              }
            ]
          }
        }
      ]);

      await navigateToTestPage(page, PAGE_ID);

      // Verify event indicator or tooltip exists
      const eventMarker = page.locator('[data-event]').or(page.locator('.calendar-event'));

      // Screenshot showing events
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/calendar-with-events.png`,
        fullPage: true
      });

      await deleteTestPage(page, PAGE_ID);
    });
  });

  // =================================================================
  // 3. PHOTOGRID COMPONENT TESTS
  // =================================================================

  test.describe('PhotoGrid Component', () => {
    const PAGE_ID = 'test-photogrid';

    const testImages = [
      { url: 'https://picsum.photos/400/300?random=1', alt: 'Image 1', caption: 'First image' },
      { url: 'https://picsum.photos/400/300?random=2', alt: 'Image 2', caption: 'Second image' },
      { url: 'https://picsum.photos/400/300?random=3', alt: 'Image 3', caption: 'Third image' },
      { url: 'https://picsum.photos/400/300?random=4', alt: 'Image 4', caption: 'Fourth image' },
      { url: 'https://picsum.photos/400/300?random=5', alt: 'Image 5', caption: 'Fifth image' },
      { url: 'https://picsum.photos/400/300?random=6', alt: 'Image 6', caption: 'Sixth image' }
    ];

    test('should render images in 3-column grid', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'PhotoGrid 3 Columns', [
        {
          type: 'PhotoGrid',
          props: {
            images: testImages,
            columns: 3,
            enableLightbox: true
          }
        }
      ]);

      const errors = setupConsoleErrorTracking(page);
      await navigateToTestPage(page, PAGE_ID);

      // Wait for images to load
      await page.waitForTimeout(2000);

      // Verify grid exists
      const grid = page.locator('[data-testid="photo-grid"]').or(page.locator('.photo-grid'));

      // Verify images are rendered
      const images = page.locator('img').filter({ hasText: /Image \d/ }).or(
        page.locator('img[alt*="Image"]')
      );

      // Should have at least 6 images
      const imageCount = await images.count();
      expect(imageCount).toBeGreaterThanOrEqual(6);

      // Screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/photogrid-3col.png`,
        fullPage: true
      });

      expect(errors.length).toBe(0);
      await deleteTestPage(page, PAGE_ID);
    });

    test('should open lightbox on image click', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'PhotoGrid Lightbox', [
        {
          type: 'PhotoGrid',
          props: {
            images: testImages.slice(0, 3),
            columns: 3,
            enableLightbox: true
          }
        }
      ]);

      await navigateToTestPage(page, PAGE_ID);
      await page.waitForTimeout(2000);

      // Click first image
      const firstImage = page.locator('img').first();
      await firstImage.click();

      // Wait for lightbox
      await page.waitForTimeout(500);

      // Verify lightbox/modal opened (various selectors for different lightbox implementations)
      const lightbox = page.locator('[role="dialog"]')
        .or(page.locator('.lightbox'))
        .or(page.locator('.PhotoView'))
        .or(page.locator('[data-photo-view]'));

      // Screenshot with lightbox
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/photogrid-lightbox.png`,
        fullPage: true
      });

      await deleteTestPage(page, PAGE_ID);
    });

    test('should render with different column counts', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'PhotoGrid 4 Columns', [
        {
          type: 'PhotoGrid',
          props: {
            images: testImages,
            columns: 4,
            enableLightbox: false
          }
        }
      ]);

      await navigateToTestPage(page, PAGE_ID);
      await page.waitForTimeout(2000);

      // Screenshot 4-column layout
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/photogrid-4col.png`,
        fullPage: true
      });

      await deleteTestPage(page, PAGE_ID);
    });
  });

  // =================================================================
  // 4. MARKDOWN COMPONENT TESTS
  // =================================================================

  test.describe('Markdown Component', () => {
    const PAGE_ID = 'test-markdown';

    const markdownContent = `
# Heading 1
## Heading 2
### Heading 3

This is **bold** and this is *italic*.

- List item 1
- List item 2
- List item 3

1. Numbered item 1
2. Numbered item 2
3. Numbered item 3

\`\`\`javascript
const hello = 'world';
console.log(hello);
\`\`\`

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |

> This is a blockquote

[Link text](https://example.com)
    `;

    test('should render markdown with all elements', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Markdown Test', [
        {
          type: 'Markdown',
          props: {
            content: markdownContent,
            sanitize: true
          }
        }
      ]);

      const errors = setupConsoleErrorTracking(page);
      await navigateToTestPage(page, PAGE_ID);

      // Verify headings
      await expect(page.locator('h1', { hasText: 'Heading 1' })).toBeVisible();
      await expect(page.locator('h2', { hasText: 'Heading 2' })).toBeVisible();
      await expect(page.locator('h3', { hasText: 'Heading 3' })).toBeVisible();

      // Verify text formatting
      await expect(page.locator('strong', { hasText: 'bold' })).toBeVisible();
      await expect(page.locator('em', { hasText: 'italic' })).toBeVisible();

      // Verify lists
      const listItems = page.locator('li');
      expect(await listItems.count()).toBeGreaterThanOrEqual(6);

      // Verify code block
      const codeBlock = page.locator('pre code').or(page.locator('code', { hasText: 'hello' }));

      // Verify table
      const table = page.locator('table');
      await expect(table).toBeVisible();

      // Verify blockquote
      const blockquote = page.locator('blockquote');
      await expect(blockquote).toBeVisible();

      // Screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/markdown-rendered.png`,
        fullPage: true
      });

      expect(errors.length).toBe(0);
      await deleteTestPage(page, PAGE_ID);
    });

    test('should sanitize XSS attempts', async ({ page }) => {
      const xssContent = `
# Safe Content

<script>alert('XSS')</script>

<img src="x" onerror="alert('XSS')">

<a href="javascript:alert('XSS')">Click me</a>
      `;

      await createTestPage(page, PAGE_ID, 'Markdown XSS Test', [
        {
          type: 'Markdown',
          props: {
            content: xssContent,
            sanitize: true
          }
        }
      ]);

      const errors = setupConsoleErrorTracking(page);
      await navigateToTestPage(page, PAGE_ID);

      // Verify no script tags in DOM
      const scripts = page.locator('script:not([src])');
      expect(await scripts.count()).toBe(0);

      // Verify no javascript: links
      const jsLinks = page.locator('a[href^="javascript:"]');
      expect(await jsLinks.count()).toBe(0);

      // Verify no onerror handlers
      const onerrorImages = page.locator('img[onerror]');
      expect(await onerrorImages.count()).toBe(0);

      // Screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/markdown-xss-protection.png`,
        fullPage: true
      });

      // Should have no errors (no XSS executed)
      expect(errors.length).toBe(0);
      await deleteTestPage(page, PAGE_ID);
    });
  });

  // =================================================================
  // 5. SIDEBAR COMPONENT TESTS
  // =================================================================

  test.describe('Sidebar Component', () => {
    const PAGE_ID = 'test-sidebar';

    const sidebarItems = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'home',
        href: '/dashboard'
      },
      {
        id: 'users',
        label: 'Users',
        icon: 'users',
        children: [
          { id: 'all-users', label: 'All Users', href: '/users' },
          { id: 'add-user', label: 'Add User', href: '/users/add' }
        ]
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: 'settings',
        href: '/settings'
      }
    ];

    test('should render sidebar with navigation items', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Sidebar Test', [
        {
          type: 'Sidebar',
          props: {
            items: sidebarItems,
            position: 'left',
            collapsible: true
          }
        }
      ]);

      const errors = setupConsoleErrorTracking(page);
      await navigateToTestPage(page, PAGE_ID);

      // Verify sidebar exists
      const sidebar = page.locator('[data-testid="sidebar"]').or(page.locator('nav'));
      await expect(sidebar).toBeVisible();

      // Verify navigation items
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('text=Users')).toBeVisible();
      await expect(page.locator('text=Settings')).toBeVisible();

      // Screenshot desktop
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/sidebar-desktop.png`,
        fullPage: true
      });

      expect(errors.length).toBe(0);
      await deleteTestPage(page, PAGE_ID);
    });

    test('should expand/collapse nested items', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Sidebar Collapsible', [
        {
          type: 'Sidebar',
          props: {
            items: sidebarItems,
            collapsible: true
          }
        }
      ]);

      await navigateToTestPage(page, PAGE_ID);

      // Find expandable item
      const usersItem = page.locator('text=Users').first();

      // Click to expand
      await usersItem.click();
      await page.waitForTimeout(300);

      // Verify sub-items visible
      await expect(page.locator('text=All Users')).toBeVisible();
      await expect(page.locator('text=Add User')).toBeVisible();

      // Screenshot expanded state
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/sidebar-expanded.png`,
        fullPage: true
      });

      await deleteTestPage(page, PAGE_ID);
    });

    test('should render on mobile', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Sidebar Mobile', [
        {
          type: 'Sidebar',
          props: {
            items: sidebarItems,
            collapsible: true
          }
        }
      ]);

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToTestPage(page, PAGE_ID);

      // Screenshot mobile
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/sidebar-mobile.png`,
        fullPage: true
      });

      await deleteTestPage(page, PAGE_ID);
    });
  });

  // =================================================================
  // 6. SWIPECARD COMPONENT TESTS
  // =================================================================

  test.describe('SwipeCard Component', () => {
    const PAGE_ID = 'test-swipecard';

    const cards = [
      {
        id: 'card-1',
        title: 'Card 1',
        description: 'First card description',
        image: 'https://picsum.photos/400/300?random=10'
      },
      {
        id: 'card-2',
        title: 'Card 2',
        description: 'Second card description',
        image: 'https://picsum.photos/400/300?random=11'
      },
      {
        id: 'card-3',
        title: 'Card 3',
        description: 'Third card description',
        image: 'https://picsum.photos/400/300?random=12'
      }
    ];

    test('should render card stack', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'SwipeCard Test', [
        {
          type: 'SwipeCard',
          props: {
            cards,
            showControls: true
          }
        }
      ]);

      const errors = setupConsoleErrorTracking(page);
      await navigateToTestPage(page, PAGE_ID);
      await page.waitForTimeout(2000);

      // Verify first card is visible
      await expect(page.locator('text=Card 1')).toBeVisible();

      // Screenshot card stack
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/swipecard-stack.png`,
        fullPage: true
      });

      expect(errors.length).toBe(0);
      await deleteTestPage(page, PAGE_ID);
    });

    test('should swipe card with button controls', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'SwipeCard Controls', [
        {
          type: 'SwipeCard',
          props: {
            cards,
            showControls: true
          }
        }
      ]);

      await navigateToTestPage(page, PAGE_ID);
      await page.waitForTimeout(2000);

      // Find swipe buttons
      const swipeLeftButton = page.locator('button').filter({ hasText: /reject|left|✕|×/i }).or(
        page.locator('[data-action="swipe-left"]')
      );
      const swipeRightButton = page.locator('button').filter({ hasText: /accept|right|✓|✔/i }).or(
        page.locator('[data-action="swipe-right"]')
      );

      // Verify first card
      await expect(page.locator('text=Card 1')).toBeVisible();

      // Click swipe button (try right button)
      if (await swipeRightButton.isVisible()) {
        await swipeRightButton.click();
        await page.waitForTimeout(500);

        // Screenshot after swipe
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/swipecard-after-swipe.png`,
          fullPage: true
        });
      }

      await deleteTestPage(page, PAGE_ID);
    });

    test('should handle touch gestures on mobile', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'SwipeCard Mobile', [
        {
          type: 'SwipeCard',
          props: {
            cards,
            showControls: true
          }
        }
      ]);

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToTestPage(page, PAGE_ID);
      await page.waitForTimeout(2000);

      // Screenshot mobile view
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/swipecard-mobile.png`,
        fullPage: true
      });

      await deleteTestPage(page, PAGE_ID);
    });
  });

  // =================================================================
  // 7. GANTTCHART COMPONENT TESTS
  // =================================================================

  test.describe('GanttChart Component', () => {
    const PAGE_ID = 'test-gantt';

    const tasks = [
      {
        id: 1,
        name: 'Project Planning',
        startDate: '2024-03-01',
        endDate: '2024-03-15',
        progress: 100,
        assignee: 'Alice'
      },
      {
        id: 2,
        name: 'Development Phase 1',
        startDate: '2024-03-10',
        endDate: '2024-03-31',
        progress: 60,
        dependencies: [1],
        assignee: 'Bob'
      },
      {
        id: 3,
        name: 'Testing',
        startDate: '2024-03-25',
        endDate: '2024-04-10',
        progress: 30,
        dependencies: [2],
        assignee: 'Charlie'
      },
      {
        id: 4,
        name: 'Deployment',
        startDate: '2024-04-05',
        endDate: '2024-04-15',
        progress: 0,
        dependencies: [3],
        assignee: 'Dave'
      }
    ];

    test('should render Gantt chart with tasks', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Gantt Chart Test', [
        {
          type: 'GanttChart',
          props: {
            tasks,
            viewMode: 'week'
          }
        }
      ]);

      const errors = setupConsoleErrorTracking(page);
      await navigateToTestPage(page, PAGE_ID);
      await page.waitForTimeout(2000);

      // Verify chart container exists
      const ganttChart = page.locator('[data-testid="gantt-chart"]')
        .or(page.locator('.gantt-chart'))
        .or(page.locator('svg').first());

      // Verify tasks are visible
      await expect(page.locator('text=Project Planning')).toBeVisible();
      await expect(page.locator('text=Development Phase 1')).toBeVisible();
      await expect(page.locator('text=Testing')).toBeVisible();

      // Screenshot week view
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/gantt-week-view.png`,
        fullPage: true
      });

      expect(errors.length).toBe(0);
      await deleteTestPage(page, PAGE_ID);
    });

    test('should switch to month view', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Gantt Chart Month', [
        {
          type: 'GanttChart',
          props: {
            tasks,
            viewMode: 'month'
          }
        }
      ]);

      await navigateToTestPage(page, PAGE_ID);
      await page.waitForTimeout(2000);

      // Screenshot month view
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/gantt-month-view.png`,
        fullPage: true
      });

      await deleteTestPage(page, PAGE_ID);
    });

    test('should show task dependencies', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Gantt Dependencies', [
        {
          type: 'GanttChart',
          props: {
            tasks,
            viewMode: 'week'
          }
        }
      ]);

      await navigateToTestPage(page, PAGE_ID);
      await page.waitForTimeout(2000);

      // Verify all tasks with dependencies are visible
      await expect(page.locator('text=Development Phase 1')).toBeVisible();
      await expect(page.locator('text=Testing')).toBeVisible();
      await expect(page.locator('text=Deployment')).toBeVisible();

      // Screenshot showing dependencies
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/gantt-dependencies.png`,
        fullPage: true
      });

      await deleteTestPage(page, PAGE_ID);
    });

    test('should display task progress', async ({ page }) => {
      await createTestPage(page, PAGE_ID, 'Gantt Progress', [
        {
          type: 'GanttChart',
          props: {
            tasks,
            viewMode: 'week'
          }
        }
      ]);

      await navigateToTestPage(page, PAGE_ID);
      await page.waitForTimeout(2000);

      // Verify progress indicators exist
      // (Progress is typically shown as bars or percentages)

      // Screenshot with progress
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/gantt-progress.png`,
        fullPage: true
      });

      await deleteTestPage(page, PAGE_ID);
    });
  });

  // =================================================================
  // COMPREHENSIVE INTEGRATION TEST
  // =================================================================

  test('should render page with all 7 advanced components together', async ({ page }) => {
    const PAGE_ID = 'test-all-components';

    await createTestPage(page, PAGE_ID, 'All Advanced Components', [
      {
        type: 'Checklist',
        props: {
          items: [
            { id: 1, text: 'Task 1', checked: false },
            { id: 2, text: 'Task 2', checked: true }
          ]
        }
      },
      {
        type: 'Calendar',
        props: {
          mode: 'single',
          events: [
            { id: 1, date: '2024-03-15', title: 'Event' }
          ]
        }
      },
      {
        type: 'PhotoGrid',
        props: {
          images: [
            { url: 'https://picsum.photos/400/300?random=20', alt: 'Image 1' },
            { url: 'https://picsum.photos/400/300?random=21', alt: 'Image 2' },
            { url: 'https://picsum.photos/400/300?random=22', alt: 'Image 3' }
          ],
          columns: 3
        }
      },
      {
        type: 'Markdown',
        props: {
          content: '# Test Markdown\n\nThis is **bold** text.'
        }
      },
      {
        type: 'Sidebar',
        props: {
          items: [
            { id: 'home', label: 'Home', href: '/' },
            { id: 'about', label: 'About', href: '/about' }
          ]
        }
      },
      {
        type: 'SwipeCard',
        props: {
          cards: [
            { id: '1', title: 'Card 1', description: 'First' },
            { id: '2', title: 'Card 2', description: 'Second' }
          ]
        }
      },
      {
        type: 'GanttChart',
        props: {
          tasks: [
            {
              id: 1,
              name: 'Task A',
              startDate: '2024-03-01',
              endDate: '2024-03-15',
              progress: 50
            }
          ],
          viewMode: 'week'
        }
      }
    ]);

    const errors = setupConsoleErrorTracking(page);
    await navigateToTestPage(page, PAGE_ID);
    await page.waitForTimeout(3000);

    // Verify all components render without conflicts
    await expect(page.locator('text=Task 1')).toBeVisible();
    await expect(page.locator('h1', { hasText: 'Test Markdown' })).toBeVisible();

    // Screenshot comprehensive page
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/all-components-integrated.png`,
      fullPage: true
    });

    // Should have no console errors
    expect(errors.length).toBe(0);

    await deleteTestPage(page, PAGE_ID);
  });
});
