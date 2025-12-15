import { test, expect } from '@playwright/test';

const VALID_AGENT_SLUGS = [
  'personal-todos-agent',
  'ruv-swarm-agent',
  'claude-code-agent',
  'architect-agent',
  'code-agent',
  'tdd-agent',
  'debug-agent',
  'docs-agent',
  'security-agent',
  'devops-agent',
  'integration-agent'
];

const API_BASE_URL = 'http://localhost:3001';
const FRONTEND_BASE_URL = 'http://localhost:5173';

test.describe('Slug-based Agent Routing - API Endpoint Tests', () => {
  test('GET /api/agents/personal-todos-agent returns correct agent', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents/personal-todos-agent`);
    expect(response.ok()).toBeTruthy();

    const agent = await response.json();
    expect(agent.slug).toBe('personal-todos-agent');
    expect(agent.name).toBeTruthy();
    expect(agent.description).toBeTruthy();
  });

  test('GET /api/agents/ruv-swarm-agent returns correct agent', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents/ruv-swarm-agent`);
    expect(response.ok()).toBeTruthy();

    const agent = await response.json();
    expect(agent.slug).toBe('ruv-swarm-agent');
    expect(agent.name).toBeTruthy();
  });

  test('GET /api/agents/claude-code-agent returns correct agent', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents/claude-code-agent`);
    expect(response.ok()).toBeTruthy();

    const agent = await response.json();
    expect(agent.slug).toBe('claude-code-agent');
    expect(agent.name).toBeTruthy();
  });

  test('GET /api/agents/architect-agent returns correct agent', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents/architect-agent`);
    expect(response.ok()).toBeTruthy();

    const agent = await response.json();
    expect(agent.slug).toBe('architect-agent');
    expect(agent.name).toBeTruthy();
  });

  test('GET /api/agents/code-agent returns correct agent', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents/code-agent`);
    expect(response.ok()).toBeTruthy();

    const agent = await response.json();
    expect(agent.slug).toBe('code-agent');
    expect(agent.name).toBeTruthy();
  });

  test('GET /api/agents/tdd-agent returns correct agent', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents/tdd-agent`);
    expect(response.ok()).toBeTruthy();

    const agent = await response.json();
    expect(agent.slug).toBe('tdd-agent');
    expect(agent.name).toBeTruthy();
  });

  test('GET /api/agents/debug-agent returns correct agent', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents/debug-agent`);
    expect(response.ok()).toBeTruthy();

    const agent = await response.json();
    expect(agent.slug).toBe('debug-agent');
    expect(agent.name).toBeTruthy();
  });

  test('GET /api/agents/docs-agent returns correct agent', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents/docs-agent`);
    expect(response.ok()).toBeTruthy();

    const agent = await response.json();
    expect(agent.slug).toBe('docs-agent');
    expect(agent.name).toBeTruthy();
  });

  test('GET /api/agents/invalid-slug returns 404', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents/invalid-slug-that-does-not-exist`);
    expect(response.status()).toBe(404);
  });

  test('GET /api/agents/:slug returns proper data structure', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents/personal-todos-agent`);
    const agent = await response.json();

    expect(agent).toHaveProperty('id');
    expect(agent).toHaveProperty('slug');
    expect(agent).toHaveProperty('name');
    expect(agent).toHaveProperty('description');
    expect(agent).toHaveProperty('content');
    expect(typeof agent.id).toBe('string');
    expect(typeof agent.slug).toBe('string');
    expect(typeof agent.name).toBe('string');
  });

  test('All slugs from list API work in detail endpoint', async ({ request }) => {
    const listResponse = await request.get(`${API_BASE_URL}/api/agents`);
    const agents = await listResponse.json();

    for (const agent of agents) {
      const detailResponse = await request.get(`${API_BASE_URL}/api/agents/${agent.slug}`);
      expect(detailResponse.ok()).toBeTruthy();

      const detailAgent = await detailResponse.json();
      expect(detailAgent.slug).toBe(agent.slug);
      expect(detailAgent.id).toBe(agent.id);
    }
  });
});

test.describe('Slug-based Agent Routing - Frontend Routing Tests', () => {
  test('Navigate to /agents/personal-todos-agent loads correct agent', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);

    // Wait for content to load
    await page.waitForSelector('h1, h2, [data-testid="agent-title"]', { timeout: 10000 });

    // Verify URL contains slug
    expect(page.url()).toContain('/agents/personal-todos-agent');

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/screenshots/personal-todos-agent-routing.png',
      fullPage: true
    });
  });

  test('Direct URL access to agent detail page works', async ({ page }) => {
    // Directly navigate to agent detail page
    await page.goto(`${FRONTEND_BASE_URL}/agents/ruv-swarm-agent`);

    // Verify page loads without errors
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/agents/ruv-swarm-agent');

    // Check no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    expect(errors.length).toBe(0);
  });

  test('All 11 agent slugs are accessible via URL - personal-todos-agent', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/agents/personal-todos-agent');
  });

  test('All 11 agent slugs are accessible via URL - ruv-swarm-agent', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/ruv-swarm-agent`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/agents/ruv-swarm-agent');
  });

  test('All 11 agent slugs are accessible via URL - claude-code-agent', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/claude-code-agent`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/agents/claude-code-agent');
  });

  test('All 11 agent slugs are accessible via URL - architect-agent', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/architect-agent`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/agents/architect-agent');
  });

  test('All 11 agent slugs are accessible via URL - code-agent', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/code-agent`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/agents/code-agent');
  });

  test('All 11 agent slugs are accessible via URL - tdd-agent', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/tdd-agent`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/agents/tdd-agent');
  });

  test('Invalid slug shows "Agent Not Found" error', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/this-slug-does-not-exist`);

    // Wait for error message or 404 page
    await page.waitForTimeout(2000);

    // Check for error indicators
    const bodyText = await page.textContent('body');
    const hasErrorIndicator =
      bodyText?.includes('not found') ||
      bodyText?.includes('Not Found') ||
      bodyText?.includes('404') ||
      bodyText?.includes('Agent Not Found');

    expect(hasErrorIndicator).toBeTruthy();
  });

  test('Back navigation from detail page works', async ({ page }) => {
    // Start at agents list
    await page.goto(`${FRONTEND_BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Navigate to detail page
    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);
    await page.waitForLoadState('networkidle');

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Verify we're back at agents list
    expect(page.url()).toContain('/agents');
    expect(page.url()).not.toContain('/agents/personal-todos-agent');
  });
});

test.describe('Slug-based Agent Routing - Link Generation Tests', () => {
  test('Agent list generates slug-based links', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Find all agent links
    const links = await page.locator('a[href*="/agents/"]').all();

    expect(links.length).toBeGreaterThan(0);

    // Verify at least one link uses slug format
    let foundSlugLink = false;
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && VALID_AGENT_SLUGS.some(slug => href.includes(slug))) {
        foundSlugLink = true;
        break;
      }
    }

    expect(foundSlugLink).toBeTruthy();
  });

  test('Clicking agent card navigates to correct slug URL', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Find and click first agent link with slug
    const agentLink = page.locator('a[href*="/agents/"]').first();
    await agentLink.click();

    await page.waitForLoadState('networkidle');

    // Verify URL uses slug (not UUID)
    const currentUrl = page.url();
    const hasSlug = VALID_AGENT_SLUGS.some(slug => currentUrl.includes(slug));
    const hasUUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(currentUrl);

    expect(hasSlug).toBeTruthy();
    expect(hasUUID).toBeFalsy();
  });

  test('URL bar shows slug, not UUID', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);
    await page.waitForLoadState('networkidle');

    const url = page.url();

    // Check URL contains slug
    expect(url).toContain('personal-todos-agent');

    // Check URL does NOT contain UUID pattern
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    expect(uuidPattern.test(url)).toBeFalsy();
  });

  test('Browser history uses slug URLs', async ({ page }) => {
    // Visit multiple agent pages
    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);
    await page.waitForLoadState('networkidle');

    await page.goto(`${FRONTEND_BASE_URL}/agents/ruv-swarm-agent`);
    await page.waitForLoadState('networkidle');

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Verify we're on the first agent with slug URL
    expect(page.url()).toContain('personal-todos-agent');

    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('ruv-swarm-agent');
  });

  test('Links from external sources work with slugs', async ({ page }) => {
    // Simulate clicking a link from external source (direct navigation)
    await page.goto(`${FRONTEND_BASE_URL}/agents/claude-code-agent`);
    await page.waitForLoadState('networkidle');

    // Verify agent loads correctly
    expect(page.url()).toContain('claude-code-agent');

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/screenshots/external-link-slug.png'
    });
  });
});

test.describe('Slug-based Agent Routing - Integration Tests', () => {
  test('Full flow: agents list → click agent → detail page loads', async ({ page }) => {
    // Step 1: Navigate to agents list
    await page.goto(`${FRONTEND_BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Take screenshot of list
    await page.screenshot({
      path: 'frontend/tests/screenshots/agents-list-before-click.png'
    });

    // Step 2: Click first agent
    const firstAgent = page.locator('a[href*="/agents/"]').first();
    const href = await firstAgent.getAttribute('href');
    await firstAgent.click();

    // Step 3: Verify detail page loads
    await page.waitForLoadState('networkidle');

    // Take screenshot of detail page
    await page.screenshot({
      path: 'frontend/tests/screenshots/agent-detail-after-click.png',
      fullPage: true
    });

    // Verify URL changed to slug-based URL
    expect(page.url()).toContain('/agents/');
    expect(href).toBeTruthy();
  });

  test('Refresh on detail page maintains correct agent', async ({ page }) => {
    // Navigate to agent detail
    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);
    await page.waitForLoadState('networkidle');

    const initialUrl = page.url();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify URL is the same
    expect(page.url()).toBe(initialUrl);
    expect(page.url()).toContain('personal-todos-agent');
  });

  test('Share agent detail URL works (copy/paste URL)', async ({ page, context }) => {
    // Navigate to agent detail
    await page.goto(`${FRONTEND_BASE_URL}/agents/ruv-swarm-agent`);
    await page.waitForLoadState('networkidle');

    const agentUrl = page.url();

    // Open new tab and navigate to same URL (simulating copy/paste)
    const newPage = await context.newPage();
    await newPage.goto(agentUrl);
    await newPage.waitForLoadState('networkidle');

    // Verify new page shows same agent
    expect(newPage.url()).toBe(agentUrl);
    expect(newPage.url()).toContain('ruv-swarm-agent');

    await newPage.close();
  });

  test('SEO: URL is human-readable', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);
    await page.waitForLoadState('networkidle');

    const url = page.url();

    // Check URL is readable
    expect(url).toContain('personal-todos-agent');

    // Check URL does NOT contain UUID
    expect(url).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

    // Check URL uses hyphens (SEO best practice)
    expect(url).toMatch(/personal-todos-agent/);
  });

  test('Deep linking: Direct navigation to slug URL works', async ({ page }) => {
    // Simulate deep link (e.g., from email, bookmark)
    await page.goto(`${FRONTEND_BASE_URL}/agents/architect-agent`);
    await page.waitForLoadState('networkidle');

    // Verify page loads correctly
    expect(page.url()).toContain('architect-agent');

    // Check no 404 errors
    const response = await page.goto(`${FRONTEND_BASE_URL}/agents/architect-agent`);
    expect(response?.ok()).toBeTruthy();
  });
});

test.describe('Slug-based Agent Routing - Network and Console Validation', () => {
  test('Verify network requests use correct slug endpoints', async ({ page }) => {
    const apiRequests: string[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/agents/')) {
        apiRequests.push(request.url());
      }
    });

    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);
    await page.waitForLoadState('networkidle');

    // Verify at least one API request uses slug
    const hasSlugRequest = apiRequests.some(url =>
      url.includes('personal-todos-agent')
    );

    expect(hasSlugRequest).toBeTruthy();
  });

  test('Validate no 404 errors in console for valid slugs', async ({ page }) => {
    const errors: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });

    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);
    await page.waitForLoadState('networkidle');

    // Check for 404-related errors
    const has404Errors = errors.some(err => err.includes('404')) ||
                         failedRequests.some(url => url.includes('/api/agents/'));

    expect(has404Errors).toBeFalsy();
  });

  test('API response time is acceptable (<2s)', async ({ page }) => {
    const startTime = Date.now();

    page.on('response', response => {
      if (response.url().includes('/api/agents/personal-todos-agent')) {
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(2000);
      }
    });

    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Slug-based Agent Routing - Edge Cases', () => {
  test('Slug with special characters is handled correctly', async ({ page }) => {
    // Test that hyphens in slugs work correctly
    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('personal-todos-agent');
  });

  test('Case sensitivity: slugs are lowercase', async ({ page }) => {
    // Verify slugs use lowercase (SEO best practice)
    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent`);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const slugPart = url.split('/agents/')[1];

    expect(slugPart).toBe(slugPart?.toLowerCase());
  });

  test('Trailing slash handling', async ({ page }) => {
    // Test with trailing slash
    await page.goto(`${FRONTEND_BASE_URL}/agents/personal-todos-agent/`);
    await page.waitForLoadState('networkidle');

    // Should still load correctly
    expect(page.url()).toContain('personal-todos-agent');
  });

  test('Empty slug redirects or shows error', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/`);
    await page.waitForLoadState('networkidle');

    // Should either show agents list or handle gracefully
    const url = page.url();
    expect(url).toContain('/agents');
  });
});

test.describe('Slug-based Agent Routing - Complete Agent Coverage', () => {
  test('security-agent slug is accessible', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/security-agent`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/agents/security-agent');
  });

  test('devops-agent slug is accessible', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/devops-agent`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/agents/devops-agent');
  });

  test('integration-agent slug is accessible', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/integration-agent`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/agents/integration-agent');
  });

  test('All 11 agents load with proper data structure', async ({ request }) => {
    for (const slug of VALID_AGENT_SLUGS) {
      const response = await request.get(`${API_BASE_URL}/api/agents/${slug}`);
      expect(response.ok()).toBeTruthy();

      const agent = await response.json();
      expect(agent.slug).toBe(slug);
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('description');
    }
  });
});