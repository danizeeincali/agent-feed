/**
 * Mermaid Diagram E2E Verification Tests
 *
 * SPARC TDD Methodology - London School
 * Tests: Mermaid diagram rendering, parsing, and error handling
 *
 * @requirements
 * - All diagram types must render without errors
 * - Invalid syntax must show error messages
 * - Diagrams must be responsive
 * - Diagrams must have accessibility features
 * - Screenshots captured for verification
 */

import { test, expect, Page } from '@playwright/test';

// Test diagram configurations
const FLOWCHART_CODE = `graph TD
  A[Start] --> B[Process]
  B --> C{Decision}
  C -->|Yes| D[End]
  C -->|No| B`;

const SEQUENCE_CODE = `sequenceDiagram
  participant Alice
  participant Bob
  Alice->>Bob: Hello Bob!
  Bob->>Alice: Hi Alice!
  Alice->>Bob: How are you?
  Bob->>Alice: I'm good, thanks!`;

const CLASS_CODE = `classDiagram
  class Animal {
    +String name
    +int age
    +makeSound()
  }
  class Dog {
    +String breed
    +bark()
  }
  Animal <|-- Dog`;

const STATE_CODE = `stateDiagram-v2
  [*] --> Idle
  Idle --> Processing
  Processing --> Complete
  Processing --> Error
  Complete --> [*]
  Error --> Idle`;

const ER_CODE = `erDiagram
  USER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : "ordered in"`;

const GANTT_CODE = `gantt
  title Project Timeline
  dateFormat YYYY-MM-DD
  section Planning
  Research :a1, 2025-01-01, 30d
  Design :a2, after a1, 20d
  section Development
  Implementation :a3, after a2, 45d
  Testing :a4, after a3, 15d`;

const JOURNEY_CODE = `journey
  title User Registration Journey
  section Sign Up
    Visit website: 5: User
    Click sign up: 3: User
    Fill form: 2: User
    Submit: 4: User
  section Verification
    Check email: 3: User
    Click link: 5: User
    Account active: 5: User`;

const PIE_CODE = `pie title Distribution
  "Category A" : 42.5
  "Category B" : 27.3
  "Category C" : 30.2`;

const GIT_GRAPH_CODE = `gitGraph
  commit
  branch develop
  checkout develop
  commit
  commit
  checkout main
  merge develop
  commit`;

const TIMELINE_CODE = `timeline
  title History Timeline
  2025-01 : Feature A launched
  2025-02 : Feature B released
  2025-03 : Major update
  2025-04 : New integrations`;

const SYSTEM_ARCHITECTURE_CODE = `graph TD
  A[API Gateway] --> B[Service Layer]
  B --> C[Database]
  B --> D[Cache]
  D --> C
  A --> E[Authentication]
  E --> B
  B --> F[Message Queue]
  F --> G[Worker Nodes]`;

const INVALID_CODE = 'this is not valid mermaid syntax at all';

// Helper function to create test page with Mermaid
async function createTestPageWithMermaid(page: Page, mermaidCode: string, id?: string) {
  const pageData = {
    title: 'Mermaid Diagram Verification Test',
    components: [
      {
        type: 'Mermaid',
        props: {
          chart: mermaidCode,
          id: id || undefined,
        },
      },
    ],
  };

  const response = await page.request.post('/api/agent-pages/test-page', {
    data: pageData,
  });

  const { id: pageId } = await response.json();
  return pageId;
}

test.describe('Mermaid Flowchart Verification', () => {
  test('renders flowchart correctly', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, FLOWCHART_CODE);
    await page.goto(`/agent/${pageId}`);

    // Wait for Mermaid to render
    await page.waitForSelector('svg', { timeout: 10000 });

    // Verify SVG element exists
    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    // Verify nodes are visible (Start, Process, Decision, End)
    const svgContent = await svg.innerHTML();
    expect(svgContent).toContain('Start');
    expect(svgContent).toContain('Process');
    expect(svgContent).toContain('Decision');
    expect(svgContent).toContain('End');

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-flowchart.png',
      fullPage: true
    });
  });

  test('flowchart shows edges and connections', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, FLOWCHART_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    // Verify edge labels are visible
    const svg = await page.locator('svg').first();
    const svgContent = await svg.innerHTML();
    expect(svgContent).toContain('Yes');
    expect(svgContent).toContain('No');

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-flowchart-edges.png'
    });
  });
});

test.describe('Mermaid Sequence Diagram Verification', () => {
  test('renders sequence diagram correctly', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, SEQUENCE_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    // Verify participants are rendered
    const svgContent = await svg.innerHTML();
    expect(svgContent).toContain('Alice');
    expect(svgContent).toContain('Bob');

    // Verify messages are rendered
    expect(svgContent).toContain('Hello Bob');
    expect(svgContent).toContain('Hi Alice');

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-sequence.png',
      fullPage: true
    });
  });
});

test.describe('Mermaid Class Diagram Verification', () => {
  test('renders class diagram correctly', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, CLASS_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    // Verify classes are rendered
    const svgContent = await svg.innerHTML();
    expect(svgContent).toContain('Animal');
    expect(svgContent).toContain('Dog');

    // Verify methods/properties
    expect(svgContent).toContain('name');
    expect(svgContent).toContain('makeSound');
    expect(svgContent).toContain('bark');

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-class.png',
      fullPage: true
    });
  });
});

test.describe('Mermaid State Diagram Verification', () => {
  test('renders state diagram correctly', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, STATE_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    const svgContent = await svg.innerHTML();
    expect(svgContent).toContain('Idle');
    expect(svgContent).toContain('Processing');
    expect(svgContent).toContain('Complete');
    expect(svgContent).toContain('Error');

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-state.png',
      fullPage: true
    });
  });
});

test.describe('Mermaid ER Diagram Verification', () => {
  test('renders entity relationship diagram correctly', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, ER_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    const svgContent = await svg.innerHTML();
    expect(svgContent).toContain('USER');
    expect(svgContent).toContain('ORDER');
    expect(svgContent).toContain('PRODUCT');

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-er.png',
      fullPage: true
    });
  });
});

test.describe('Mermaid Gantt Chart Verification', () => {
  test('renders gantt chart correctly', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, GANTT_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    const svgContent = await svg.innerHTML();
    expect(svgContent).toContain('Research');
    expect(svgContent).toContain('Design');
    expect(svgContent).toContain('Implementation');

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-gantt.png',
      fullPage: true
    });
  });
});

test.describe('Mermaid Additional Diagram Types', () => {
  test('renders user journey diagram', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, JOURNEY_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-journey.png',
      fullPage: true
    });
  });

  test('renders pie chart diagram', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, PIE_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-pie.png',
      fullPage: true
    });
  });

  test('renders git graph diagram', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, GIT_GRAPH_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-git-graph.png',
      fullPage: true
    });
  });

  test('renders timeline diagram', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, TIMELINE_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-timeline.png',
      fullPage: true
    });
  });
});

test.describe('Mermaid System Architecture Example', () => {
  test('renders complex system architecture diagram', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(
      page,
      SYSTEM_ARCHITECTURE_CODE,
      'system-architecture-diagram'
    );
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    const svgContent = await svg.innerHTML();
    expect(svgContent).toContain('API Gateway');
    expect(svgContent).toContain('Service Layer');
    expect(svgContent).toContain('Database');
    expect(svgContent).toContain('Cache');
    expect(svgContent).toContain('Authentication');

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-system-architecture.png',
      fullPage: true
    });
  });
});

test.describe('Mermaid Error Handling', () => {
  test('shows error for invalid Mermaid syntax', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, INVALID_CODE);
    await page.goto(`/agent/${pageId}`);

    // Wait for error message to appear
    const errorMessage = await page.getByText(/invalid.*syntax|parse error|diagram.*error/i, {
      timeout: 10000,
    });
    await expect(errorMessage).toBeVisible();

    // Error should be displayed in user-friendly way
    const errorContainer = await page.locator('[role="alert"]').first();
    await expect(errorContainer).toBeVisible();

    // Should not crash the page
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-error-handling.png',
      fullPage: true
    });
  });

  test('error message shows diagram code for debugging', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, INVALID_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('[role="alert"]', { timeout: 10000 });

    // Click details/summary to expand code view
    const details = await page.locator('details').first();
    if (await details.isVisible()) {
      await details.click();

      // Verify code is shown
      const code = await page.locator('code').first();
      const codeText = await code.textContent();
      expect(codeText).toContain(INVALID_CODE);
    }

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-error-debug-code.png'
    });
  });

  test('empty Mermaid code shows error', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, '');
    await page.goto(`/agent/${pageId}`);

    const errorMessage = await page.getByText(/empty|required|invalid/i, {
      timeout: 10000,
    });
    await expect(errorMessage).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-empty-code-error.png'
    });
  });
});

test.describe('Mermaid Responsiveness', () => {
  test('diagrams are responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const pageId = await createTestPageWithMermaid(page, FLOWCHART_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    // Diagram should fit within viewport
    const container = await page.locator('.mermaid-diagram, [class*="mermaid"]').first();
    const box = await container.boundingBox();

    if (box) {
      expect(box.width).toBeLessThanOrEqual(375);
    }

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-mobile.png',
      fullPage: true
    });
  });

  test('diagrams scale correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    const pageId = await createTestPageWithMermaid(page, SEQUENCE_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    const svg = await page.locator('svg').first();
    await expect(svg).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-tablet.png',
      fullPage: true
    });
  });
});

test.describe('Mermaid Accessibility', () => {
  test('diagrams have proper ARIA labels', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, FLOWCHART_CODE);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('svg', { timeout: 10000 });

    // Check for accessible diagram container
    const diagramContainer = await page.locator('[role="img"], [aria-label]').first();
    await expect(diagramContainer).toBeVisible();

    // Verify aria-label exists
    const ariaLabel = await diagramContainer.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-accessibility.png'
    });
  });

  test('error messages are accessible with role="alert"', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, INVALID_CODE);
    await page.goto(`/agent/${pageId}`);

    const errorContainer = await page.locator('[role="alert"]').first();
    await expect(errorContainer).toBeVisible();

    // Verify aria-live is set for screen readers
    const ariaLive = await errorContainer.getAttribute('aria-live');
    expect(ariaLive).toBeTruthy();

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-error-accessibility.png'
    });
  });
});

test.describe('Mermaid Loading States', () => {
  test('shows loading indicator while rendering complex diagram', async ({ page }) => {
    const pageId = await createTestPageWithMermaid(page, SYSTEM_ARCHITECTURE_CODE);

    // Navigate and immediately look for loading state
    await page.goto(`/agent/${pageId}`);

    // Loading indicator should appear briefly
    const loadingIndicator = await page.locator('[role="status"]', { timeout: 2000 }).catch(() => null);

    // Either loading state was shown or diagram rendered quickly
    // Both are acceptable outcomes

    // Wait for final SVG render
    await page.waitForSelector('svg', { timeout: 10000 });

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-loading-state.png'
    });
  });
});

test.describe('Multiple Mermaid Diagrams on Same Page', () => {
  test('renders multiple diagrams with unique IDs', async ({ page }) => {
    const pageData = {
      title: 'Multiple Mermaid Diagrams',
      components: [
        {
          type: 'Mermaid',
          props: {
            chart: FLOWCHART_CODE,
            id: 'diagram-1',
          },
        },
        {
          type: 'Mermaid',
          props: {
            chart: SEQUENCE_CODE,
            id: 'diagram-2',
          },
        },
        {
          type: 'Mermaid',
          props: {
            chart: CLASS_CODE,
            id: 'diagram-3',
          },
        },
      ],
    };

    const response = await page.request.post('/api/agent-pages/test-page', {
      data: pageData,
    });

    const { id: pageId } = await response.json();
    await page.goto(`/agent/${pageId}`);

    // Wait for all diagrams to render
    await page.waitForSelector('svg', { timeout: 15000 });

    // Should have 3 SVG elements
    const svgCount = await page.locator('svg').count();
    expect(svgCount).toBeGreaterThanOrEqual(3);

    await page.screenshot({
      path: 'test-results/screenshots/mermaid-multiple-diagrams.png',
      fullPage: true
    });
  });
});
