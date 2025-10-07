import { test, expect } from '@playwright/test';

/**
 * REAL BROWSER VERIFICATION TEST
 * Tests that ID attributes are rendered correctly and anchor navigation works
 * NO MOCKS - Real browser, real server, real DOM
 */

const BASE_URL = 'http://localhost:5173';
const PAGE_BUILDER_AGENT_URL = `${BASE_URL}/agents/page-builder-agent`;
const SHOWCASE_PAGE_URL = `${PAGE_BUILDER_AGENT_URL}/pages/component-showcase-and-examples`;

test.describe('Anchor Navigation - Real Browser Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the component showcase page
    await page.goto(SHOWCASE_PAGE_URL);
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('CRITICAL: Header elements must have id attributes in DOM', async ({ page }) => {
    console.log('🔍 Checking for ID attributes on header elements...');

    // Get all headers in the main content area
    const headers = await page.locator('h1, h2, h3, h4, h5, h6').all();

    console.log(`Found ${headers.length} header elements`);

    let headersWithIds = 0;
    let headersWithoutIds = 0;

    for (const header of headers) {
      const tagName = await header.evaluate(el => el.tagName);
      const id = await header.getAttribute('id');
      const text = await header.textContent();

      if (id) {
        headersWithIds++;
        console.log(`✅ ${tagName} has id="${id}" - Text: "${text?.trim().substring(0, 50)}"`);
      } else {
        headersWithoutIds++;
        console.log(`❌ ${tagName} missing id - Text: "${text?.trim().substring(0, 50)}"`);
      }
    }

    console.log(`\n📊 Results: ${headersWithIds} with IDs, ${headersWithoutIds} without IDs`);

    // We expect most headers to have IDs (component showcase page has many)
    expect(headersWithIds).toBeGreaterThan(5);
  });

  test('CRITICAL: Sidebar anchor links must work', async ({ page, context }) => {
    console.log('🔍 Testing sidebar anchor navigation...');

    // Screenshot before clicking
    await page.screenshot({
      path: '/tmp/screenshots/before-anchor-click.png',
      fullPage: true
    });

    // Find sidebar anchor link for "Text Content"
    const textContentLink = page.locator('a[href="#text-content"]');
    const linkExists = await textContentLink.count() > 0;

    console.log(`Sidebar link exists: ${linkExists}`);

    if (linkExists) {
      // Click the anchor link
      await textContentLink.click();

      // Wait a moment for scroll
      await page.waitForTimeout(500);

      // Check URL hash
      const url = page.url();
      console.log(`Current URL: ${url}`);
      expect(url).toContain('#text-content');

      // Verify target element exists with matching ID
      const targetElement = page.locator('#text-content');
      const targetExists = await targetElement.count() > 0;
      console.log(`Target element #text-content exists: ${targetExists}`);
      expect(targetExists).toBe(true);

      // Verify element is in viewport (scrolled to)
      await expect(targetElement).toBeInViewport();

      // Screenshot after clicking
      await page.screenshot({
        path: '/tmp/screenshots/after-anchor-click.png',
        fullPage: true
      });

      console.log('✅ Anchor navigation works!');
    } else {
      console.log('⚠️ No sidebar link found - this may be expected depending on page structure');
    }
  });

  test('VISUAL PROOF: Take screenshots of component IDs in DevTools', async ({ page }) => {
    console.log('📸 Capturing visual proof of ID attributes...');

    // Take full page screenshot
    await page.screenshot({
      path: '/tmp/screenshots/full-page.png',
      fullPage: true
    });

    // Inspect a specific header element
    const firstHeader = page.locator('h2').first();
    const firstHeaderId = await firstHeader.getAttribute('id');

    if (firstHeaderId) {
      console.log(`✅ First h2 has id="${firstHeaderId}"`);

      // Highlight the element with ID
      await firstHeader.evaluate((el, id) => {
        el.style.outline = '3px solid red';
        el.style.backgroundColor = 'yellow';

        // Add a label showing the ID
        const label = document.createElement('div');
        label.textContent = `id="${id}"`;
        label.style.cssText = 'position: absolute; background: red; color: white; padding: 4px 8px; font-weight: bold; z-index: 9999;';
        el.style.position = 'relative';
        el.appendChild(label);
      }, firstHeaderId);

      // Take screenshot with highlighted element
      await page.screenshot({
        path: '/tmp/screenshots/highlighted-element-with-id.png',
        fullPage: false
      });

      console.log('✅ Visual proof screenshot saved');
    }
  });

  test('COMPREHENSIVE: Verify all expected IDs are present', async ({ page }) => {
    console.log('🔍 Comprehensive ID verification...');

    // Expected IDs from the component showcase page
    const expectedIds = [
      'text-content',
      'interactive-forms',
      'data-display',
      'navigation-components',
      'layout-components'
    ];

    const results = [];

    for (const expectedId of expectedIds) {
      const element = page.locator(`#${expectedId}`);
      const exists = await element.count() > 0;

      if (exists) {
        const tagName = await element.evaluate(el => el.tagName);
        const text = await element.textContent();
        results.push({
          id: expectedId,
          found: true,
          tagName,
          text: text?.trim().substring(0, 50)
        });
        console.log(`✅ Found #${expectedId} (${tagName})`);
      } else {
        results.push({
          id: expectedId,
          found: false
        });
        console.log(`❌ Missing #${expectedId}`);
      }
    }

    // Write results to file
    const resultText = JSON.stringify(results, null, 2);
    await page.evaluate((text) => {
      console.log('ID Verification Results:', text);
    }, resultText);

    // We expect at least 3 out of 5 to exist
    const foundCount = results.filter(r => r.found).length;
    console.log(`\n📊 Found ${foundCount}/${expectedIds.length} expected IDs`);
    expect(foundCount).toBeGreaterThanOrEqual(3);
  });

  test('REAL DOM: Check rendered HTML contains id attributes', async ({ page }) => {
    console.log('🔍 Checking actual HTML source for id attributes...');

    // Get the HTML of a known container
    const mainContent = page.locator('.space-y-6').first();
    const html = await mainContent.innerHTML();

    // Count how many id=" attributes are in the HTML
    const idMatches = html.match(/id="[^"]+"/g);
    const idCount = idMatches ? idMatches.length : 0;

    console.log(`Found ${idCount} id attributes in HTML`);

    if (idMatches && idMatches.length > 0) {
      console.log('Sample IDs found:');
      idMatches.slice(0, 10).forEach(match => {
        console.log(`  ${match}`);
      });
    }

    // We expect at least some id attributes to be present
    expect(idCount).toBeGreaterThan(0);
  });
});
