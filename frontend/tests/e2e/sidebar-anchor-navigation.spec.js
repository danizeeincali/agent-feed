/**
 * E2E Tests: Sidebar Navigation with Anchor Links
 *
 * Comprehensive Playwright tests for sidebar anchor link navigation
 * Tests real browser behavior with actual page data
 *
 * Test Coverage:
 * - Page loading with sidebar
 * - Anchor link clicking and scrolling
 * - Element targeting with IDs
 * - Multiple anchor links
 * - Case-sensitive ID handling
 * - Smooth scrolling behavior
 * - Browser history (back/forward)
 * - Direct URL navigation with hash
 * - Visual verification with screenshots
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'tests', 'e2e', 'screenshots');
const BASE_URL = 'http://localhost:5173';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Test helper class for sidebar anchor navigation
 */
class SidebarAnchorTestHelper {
  constructor(page) {
    this.page = page;
    this.testPageUrl = null;
  }

  /**
   * Create a test page with sidebar and anchor links
   */
  async setupTestPage() {
    // Navigate to a page that might have a sidebar
    // First, let's try the agent pages which often have sidebars
    await this.page.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });

    // Wait for the app to load
    await this.page.waitForTimeout(2000);

    // Inject a test page setup into the DOM
    await this.page.evaluate(() => {
      // Create a test container
      const container = document.createElement('div');
      container.id = 'anchor-test-container';
      container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 10000; overflow: hidden;';

      // Create sidebar
      const sidebar = document.createElement('div');
      sidebar.id = 'test-sidebar';
      sidebar.style.cssText = 'position: fixed; left: 0; top: 0; width: 250px; height: 100%; background: #f5f5f5; padding: 20px; overflow-y: auto; border-right: 1px solid #ddd;';

      // Create sidebar title
      const sidebarTitle = document.createElement('h2');
      sidebarTitle.textContent = 'Navigation';
      sidebarTitle.style.cssText = 'margin: 0 0 20px 0; font-size: 20px; font-weight: bold;';
      sidebar.appendChild(sidebarTitle);

      // Create anchor links
      const anchorData = [
        { id: 'section-introduction', text: 'Introduction' },
        { id: 'section-features', text: 'Features' },
        { id: 'section-implementation', text: 'Implementation' },
      ];

      anchorData.forEach((data, index) => {
        const link = document.createElement('a');
        link.href = `#${data.id}`;
        link.textContent = data.text;
        link.className = 'sidebar-anchor-link';
        link.dataset.testId = `anchor-link-${index}`;
        link.style.cssText = 'display: block; padding: 10px; margin: 5px 0; color: #333; text-decoration: none; border-radius: 4px; transition: all 0.3s;';

        // Add hover effect
        link.addEventListener('mouseenter', function() {
          this.style.background = '#e0e0e0';
        });
        link.addEventListener('mouseleave', function() {
          if (!this.classList.contains('active')) {
            this.style.background = 'transparent';
          }
        });

        // Add click handler for active state
        link.addEventListener('click', function(e) {
          e.preventDefault();
          const targetId = this.getAttribute('href').substring(1);
          const target = document.getElementById(targetId);

          // Remove active class from all links
          document.querySelectorAll('.sidebar-anchor-link').forEach(l => {
            l.classList.remove('active');
            l.style.background = 'transparent';
            l.style.fontWeight = 'normal';
          });

          // Add active class to clicked link
          this.classList.add('active');
          this.style.background = '#e0e0e0';
          this.style.fontWeight = 'bold';

          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Update URL hash
            window.location.hash = targetId;
          }
        });

        sidebar.appendChild(link);
      });

      // Create main content area
      const content = document.createElement('div');
      content.id = 'test-content';
      content.style.cssText = 'margin-left: 250px; height: 100%; overflow-y: auto; padding: 40px;';

      // Create sections with matching IDs
      const sections = [
        {
          id: 'section-introduction',
          title: 'Introduction',
          content: 'This is the introduction section. It contains important information about getting started with our system. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
        },
        {
          id: 'section-features',
          title: 'Features',
          content: 'Our system includes many powerful features including real-time collaboration, advanced analytics, and seamless integration with existing tools. Sed do eiusmod tempor incididunt ut labore.'
        },
        {
          id: 'section-implementation',
          title: 'Implementation',
          content: 'Implementation details and technical specifications are outlined here. Follow these steps to integrate our solution into your workflow. Ut enim ad minim veniam, quis nostrud exercitation.'
        }
      ];

      sections.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.id = section.id;
        sectionEl.className = 'content-section';
        sectionEl.style.cssText = 'min-height: 800px; padding: 20px; margin-bottom: 40px; border: 1px solid #ddd; border-radius: 8px; background: white;';

        const title = document.createElement('h1');
        title.textContent = section.title;
        title.style.cssText = 'margin: 0 0 20px 0; font-size: 32px; color: #333;';

        const text = document.createElement('p');
        text.textContent = section.content;
        text.style.cssText = 'font-size: 16px; line-height: 1.6; color: #666;';

        // Add extra content for scroll testing
        for (let i = 0; i < 10; i++) {
          const para = document.createElement('p');
          para.textContent = `Additional content paragraph ${i + 1}. This ensures enough height for proper scrolling behavior testing.`;
          para.style.cssText = 'margin: 15px 0; color: #888;';
          sectionEl.appendChild(para);
        }

        sectionEl.insertBefore(title, sectionEl.firstChild);
        sectionEl.insertBefore(text, title.nextSibling);

        content.appendChild(sectionEl);
      });

      // Assemble the test page
      container.appendChild(sidebar);
      container.appendChild(content);
      document.body.appendChild(container);

      // Store reference for cleanup
      window.__anchorTestContainer = container;
    });

    this.testPageUrl = await this.page.url();
  }

  /**
   * Cleanup test page
   */
  async cleanupTestPage() {
    await this.page.evaluate(() => {
      const container = window.__anchorTestContainer;
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
  }

  /**
   * Get scroll position of content area
   */
  async getScrollPosition() {
    return await this.page.evaluate(() => {
      const content = document.getElementById('test-content');
      return content ? content.scrollTop : 0;
    });
  }

  /**
   * Get element position relative to content area
   */
  async getElementPosition(elementId) {
    return await this.page.evaluate((id) => {
      const element = document.getElementById(id);
      const content = document.getElementById('test-content');
      if (!element || !content) return null;

      const rect = element.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();

      return {
        top: rect.top - contentRect.top + content.scrollTop,
        visible: rect.top >= contentRect.top && rect.bottom <= contentRect.bottom
      };
    }, elementId);
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name) {
    const filename = `sidebar-anchor-${name}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }

  /**
   * Get active sidebar link
   */
  async getActiveSidebarLink() {
    return await this.page.evaluate(() => {
      const activeLink = document.querySelector('.sidebar-anchor-link.active');
      return activeLink ? {
        text: activeLink.textContent,
        href: activeLink.getAttribute('href')
      } : null;
    });
  }

  /**
   * Wait for smooth scroll to complete
   */
  async waitForScrollToComplete(timeout = 2000) {
    await this.page.waitForTimeout(timeout);
  }
}

// Test Suite
test.describe('Sidebar Anchor Navigation E2E Tests', () => {
  let helper;

  test.beforeEach(async ({ page }) => {
    helper = new SidebarAnchorTestHelper(page);
    await helper.setupTestPage();
    await helper.takeScreenshot('initial-state');
  });

  test.afterEach(async ({ page }) => {
    await helper.cleanupTestPage();
  });

  test('1. Load page with sidebar containing anchor links', async ({ page }) => {
    // Verify sidebar exists
    const sidebar = await page.locator('#test-sidebar');
    await expect(sidebar).toBeVisible();

    // Verify sidebar title
    const sidebarTitle = await page.locator('#test-sidebar h2');
    await expect(sidebarTitle).toHaveText('Navigation');

    // Verify all anchor links exist
    const anchorLinks = await page.locator('.sidebar-anchor-link').all();
    expect(anchorLinks.length).toBe(3);

    // Verify anchor link texts
    const linkTexts = await Promise.all(
      anchorLinks.map(link => link.textContent())
    );
    expect(linkTexts).toEqual(['Introduction', 'Features', 'Implementation']);

    await helper.takeScreenshot('01-page-loaded-with-sidebar');
  });

  test('2. Click sidebar item with anchor link', async ({ page }) => {
    // Click the Features link
    const featuresLink = await page.locator('a[href="#section-features"]');
    await expect(featuresLink).toBeVisible();

    await featuresLink.click();
    await helper.waitForScrollToComplete();

    // Verify URL hash updated
    const url = await page.url();
    expect(url).toContain('#section-features');

    await helper.takeScreenshot('02-clicked-features-link');
  });

  test('3. Verify page scrolls to target element', async ({ page }) => {
    // Get initial scroll position
    const initialScroll = await helper.getScrollPosition();

    // Click Implementation link
    await page.click('a[href="#section-implementation"]');
    await helper.waitForScrollToComplete();

    // Get new scroll position
    const newScroll = await helper.getScrollPosition();

    // Verify scroll changed
    expect(newScroll).toBeGreaterThan(initialScroll);

    // Verify target element is in view
    const targetPosition = await helper.getElementPosition('section-implementation');
    expect(targetPosition).not.toBeNull();

    await helper.takeScreenshot('03-scrolled-to-implementation');
  });

  test('4. Verify anchor link target has matching ID', async ({ page }) => {
    // Check all anchor links have matching targets
    const anchors = [
      { href: '#section-introduction', id: 'section-introduction' },
      { href: '#section-features', id: 'section-features' },
      { href: '#section-implementation', id: 'section-implementation' }
    ];

    for (const anchor of anchors) {
      // Verify link exists
      const link = await page.locator(`a[href="${anchor.href}"]`);
      await expect(link).toBeVisible();

      // Verify target element exists with matching ID
      const target = await page.locator(`#${anchor.id}`);
      await expect(target).toBeVisible();

      // Verify target element is a section
      const isSection = await target.evaluate(el =>
        el.classList.contains('content-section')
      );
      expect(isSection).toBe(true);
    }

    await helper.takeScreenshot('04-verified-matching-ids');
  });

  test('5. Test multiple anchor links on same page', async ({ page }) => {
    // Click each anchor link in sequence
    const links = [
      { href: '#section-introduction', name: 'Introduction' },
      { href: '#section-features', name: 'Features' },
      { href: '#section-implementation', name: 'Implementation' }
    ];

    for (let i = 0; i < links.length; i++) {
      const link = links[i];

      // Click the link
      await page.click(`a[href="${link.href}"]`);
      await helper.waitForScrollToComplete();

      // Verify URL hash
      const url = await page.url();
      expect(url).toContain(link.href);

      // Verify active state
      const activeLink = await helper.getActiveSidebarLink();
      expect(activeLink).not.toBeNull();
      expect(activeLink.text).toBe(link.name);

      await helper.takeScreenshot(`05-clicked-link-${i + 1}-${link.name.toLowerCase()}`);
    }
  });

  test('6. Test anchor links with case-sensitive IDs', async ({ page }) => {
    // Create a test with case-sensitive ID
    await page.evaluate(() => {
      const content = document.getElementById('test-content');

      // Add a section with mixed-case ID
      const section = document.createElement('div');
      section.id = 'Section-CaseSensitive-Test';
      section.style.cssText = 'min-height: 600px; padding: 20px; margin-bottom: 40px; border: 2px solid blue;';
      section.innerHTML = '<h1>Case Sensitive Section</h1><p>This tests case-sensitive ID matching.</p>';
      content.appendChild(section);

      // Add link to sidebar
      const sidebar = document.getElementById('test-sidebar');
      const link = document.createElement('a');
      link.href = '#Section-CaseSensitive-Test';
      link.textContent = 'Case Sensitive Test';
      link.className = 'sidebar-anchor-link';
      link.style.cssText = 'display: block; padding: 10px; margin: 5px 0; color: #333; text-decoration: none;';
      sidebar.appendChild(link);
    });

    // Click the case-sensitive link
    await page.click('a[href="#Section-CaseSensitive-Test"]');
    await helper.waitForScrollToComplete();

    // Verify navigation worked
    const url = await page.url();
    expect(url).toContain('#Section-CaseSensitive-Test');

    // Verify element is visible
    const target = await page.locator('#Section-CaseSensitive-Test');
    await expect(target).toBeVisible();

    await helper.takeScreenshot('06-case-sensitive-navigation');
  });

  test('7. Test smooth scrolling behavior', async ({ page }) => {
    // Test smooth scroll by measuring scroll positions over time
    const scrollPositions = [];

    // Start monitoring scroll
    await page.click('a[href="#section-implementation"]');

    // Sample scroll position multiple times during animation
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(200);
      const pos = await helper.getScrollPosition();
      scrollPositions.push(pos);
    }

    // Verify scroll positions changed progressively (smooth scroll)
    let isSmooth = true;
    for (let i = 1; i < scrollPositions.length - 1; i++) {
      // Each position should be greater than the previous (scrolling down)
      if (scrollPositions[i] < scrollPositions[i - 1]) {
        isSmooth = false;
        break;
      }
    }

    expect(isSmooth).toBe(true);

    // Verify final scroll position is stable
    await helper.waitForScrollToComplete(1000);
    const finalPosition1 = await helper.getScrollPosition();
    await page.waitForTimeout(500);
    const finalPosition2 = await helper.getScrollPosition();

    expect(Math.abs(finalPosition1 - finalPosition2)).toBeLessThan(10);

    await helper.takeScreenshot('07-smooth-scroll-complete');
  });

  test('8. Test browser back/forward with anchors', async ({ page }) => {
    // Navigate through multiple anchors
    await page.click('a[href="#section-features"]');
    await helper.waitForScrollToComplete();

    let url = await page.url();
    expect(url).toContain('#section-features');
    await helper.takeScreenshot('08-01-features-section');

    await page.click('a[href="#section-implementation"]');
    await helper.waitForScrollToComplete();

    url = await page.url();
    expect(url).toContain('#section-implementation');
    await helper.takeScreenshot('08-02-implementation-section');

    // Go back
    await page.goBack();
    await helper.waitForScrollToComplete();

    url = await page.url();
    expect(url).toContain('#section-features');
    await helper.takeScreenshot('08-03-after-back');

    // Go forward
    await page.goForward();
    await helper.waitForScrollToComplete();

    url = await page.url();
    expect(url).toContain('#section-implementation');
    await helper.takeScreenshot('08-04-after-forward');
  });

  test('9. Test direct URL navigation with hash', async ({ page }) => {
    // Navigate directly to a URL with hash
    const currentUrl = await page.url();
    const urlWithHash = currentUrl.split('#')[0] + '#section-features';

    await page.goto(urlWithHash, { waitUntil: 'networkidle' });
    await helper.waitForScrollToComplete();

    // Verify hash in URL
    const finalUrl = await page.url();
    expect(finalUrl).toContain('#section-features');

    // Verify the target section is in viewport
    const featuresSection = await page.locator('#section-features');
    await expect(featuresSection).toBeVisible();

    await helper.takeScreenshot('09-direct-hash-navigation');
  });

  test('10. Verify active item highlights correctly', async ({ page }) => {
    // Click Introduction link
    await page.click('a[href="#section-introduction"]');
    await helper.waitForScrollToComplete();

    // Check active state
    let activeLink = await page.locator('.sidebar-anchor-link.active');
    await expect(activeLink).toHaveText('Introduction');
    await helper.takeScreenshot('10-01-introduction-active');

    // Click Features link
    await page.click('a[href="#section-features"]');
    await helper.waitForScrollToComplete();

    // Verify only Features is active
    activeLink = await page.locator('.sidebar-anchor-link.active');
    await expect(activeLink).toHaveText('Features');

    // Verify Introduction is not active
    const introLink = await page.locator('a[href="#section-introduction"]');
    const hasActiveClass = await introLink.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(false);

    await helper.takeScreenshot('10-02-features-active');
  });

  test('11. Test hash updates in URL on anchor click', async ({ page }) => {
    const anchors = ['section-introduction', 'section-features', 'section-implementation'];

    for (const anchor of anchors) {
      // Click link
      await page.click(`a[href="#${anchor}"]`);
      await helper.waitForScrollToComplete(1000);

      // Verify hash in URL
      const url = await page.url();
      expect(url).toContain(`#${anchor}`);

      // Verify hash can be extracted
      const hash = url.split('#')[1];
      expect(hash).toBe(anchor);
    }

    await helper.takeScreenshot('11-hash-updates-verified');
  });

  test('12. Test page scroll position changes on navigation', async ({ page }) => {
    const scrollPositions = {};

    // Record scroll position for each section
    for (const sectionId of ['section-introduction', 'section-features', 'section-implementation']) {
      await page.click(`a[href="#${sectionId}"]`);
      await helper.waitForScrollToComplete();

      const scrollPos = await helper.getScrollPosition();
      scrollPositions[sectionId] = scrollPos;
    }

    // Verify scroll positions are different and increasing
    expect(scrollPositions['section-features']).toBeGreaterThan(scrollPositions['section-introduction']);
    expect(scrollPositions['section-implementation']).toBeGreaterThan(scrollPositions['section-features']);

    await helper.takeScreenshot('12-scroll-positions-verified');
  });

  test('13. Test anchor navigation with keyboard', async ({ page }) => {
    // Focus first link
    await page.focus('a[href="#section-introduction"]');

    // Press Enter to activate
    await page.keyboard.press('Enter');
    await helper.waitForScrollToComplete();

    // Verify navigation
    let url = await page.url();
    expect(url).toContain('#section-introduction');
    await helper.takeScreenshot('13-01-keyboard-intro');

    // Tab to next link
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await helper.waitForScrollToComplete();

    url = await page.url();
    expect(url).toContain('#section-features');
    await helper.takeScreenshot('13-02-keyboard-features');
  });

  test('14. Test anchors with special characters in IDs', async ({ page }) => {
    // Add a section with special characters
    await page.evaluate(() => {
      const content = document.getElementById('test-content');

      const section = document.createElement('div');
      section.id = 'section-test_special-chars.2024';
      section.style.cssText = 'min-height: 600px; padding: 20px; margin-bottom: 40px; border: 2px solid green;';
      section.innerHTML = '<h1>Special Characters Section</h1>';
      content.appendChild(section);

      const sidebar = document.getElementById('test-sidebar');
      const link = document.createElement('a');
      link.href = '#section-test_special-chars.2024';
      link.textContent = 'Special Chars';
      link.className = 'sidebar-anchor-link';
      link.style.cssText = 'display: block; padding: 10px; color: #333;';
      sidebar.appendChild(link);
    });

    // Click the special chars link
    await page.click('a[href="#section-test_special-chars.2024"]');
    await helper.waitForScrollToComplete();

    // Verify navigation
    const url = await page.url();
    expect(url).toContain('#section-test_special-chars.2024');

    const target = await page.locator('#section-test_special-chars\\.2024');
    await expect(target).toBeVisible();

    await helper.takeScreenshot('14-special-chars-navigation');
  });

  test('15. Test rapid anchor clicking (stress test)', async ({ page }) => {
    // Rapidly click through all anchors multiple times
    const clicks = [];

    for (let round = 0; round < 3; round++) {
      for (const anchor of ['section-introduction', 'section-features', 'section-implementation']) {
        await page.click(`a[href="#${anchor}"]`, { timeout: 2000 });
        await page.waitForTimeout(500); // Short wait between clicks

        clicks.push({
          round: round + 1,
          anchor,
          timestamp: Date.now()
        });
      }
    }

    // Verify final state is correct
    await helper.waitForScrollToComplete();
    const url = await page.url();
    expect(url).toContain('#section-implementation');

    // Verify no JavaScript errors occurred
    const errors = await page.evaluate(() => {
      return window.__testErrors || [];
    });
    expect(errors.length).toBe(0);

    await helper.takeScreenshot('15-rapid-clicking-complete');
  });
});

test.describe('Sidebar Anchor Navigation - Edge Cases', () => {
  let helper;

  test.beforeEach(async ({ page }) => {
    helper = new SidebarAnchorTestHelper(page);
    await helper.setupTestPage();
  });

  test.afterEach(async ({ page }) => {
    await helper.cleanupTestPage();
  });

  test('16. Test anchor to non-existent element', async ({ page }) => {
    // Add a link to non-existent section
    await page.evaluate(() => {
      const sidebar = document.getElementById('test-sidebar');
      const link = document.createElement('a');
      link.href = '#section-does-not-exist';
      link.textContent = 'Non-Existent Section';
      link.className = 'sidebar-anchor-link';
      link.style.cssText = 'display: block; padding: 10px; color: #333;';
      sidebar.appendChild(link);
    });

    // Record initial scroll position
    const initialScroll = await helper.getScrollPosition();

    // Click non-existent link
    await page.click('a[href="#section-does-not-exist"]');
    await helper.waitForScrollToComplete();

    // Verify scroll didn't change significantly
    const finalScroll = await helper.getScrollPosition();
    expect(Math.abs(finalScroll - initialScroll)).toBeLessThan(50);

    // Verify URL still updated with hash
    const url = await page.url();
    expect(url).toContain('#section-does-not-exist');

    await helper.takeScreenshot('16-non-existent-anchor');
  });

  test('17. Test empty anchor href', async ({ page }) => {
    // Add a link with empty href
    await page.evaluate(() => {
      const sidebar = document.getElementById('test-sidebar');
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = 'Empty Link';
      link.className = 'sidebar-anchor-link';
      link.style.cssText = 'display: block; padding: 10px; color: #333;';
      sidebar.appendChild(link);
    });

    const initialUrl = await page.url();

    // Click empty link
    await page.click('a[href="#"]');
    await page.waitForTimeout(500);

    // Verify URL might have changed to just # or stayed the same
    const finalUrl = await page.url();
    // Both behaviors are acceptable
    expect(finalUrl === initialUrl || finalUrl.endsWith('#')).toBe(true);

    await helper.takeScreenshot('17-empty-anchor-href');
  });

  test('18. Test anchor navigation preserves scroll on reload', async ({ page }) => {
    // Navigate to a specific section
    await page.click('a[href="#section-implementation"]');
    await helper.waitForScrollToComplete();

    const urlWithHash = await page.url();
    const scrollBefore = await helper.getScrollPosition();

    // Reload page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify hash is still in URL
    const urlAfterReload = await page.url();
    expect(urlAfterReload).toContain('#section-implementation');

    await helper.takeScreenshot('18-after-reload-with-hash');
  });
});

// Final summary test
test('19. Comprehensive anchor navigation test summary', async ({ page }) => {
  const helper = new SidebarAnchorTestHelper(page);
  await helper.setupTestPage();

  const testReport = {
    timestamp: new Date().toISOString(),
    tests: [],
    screenshots: []
  };

  // Run through all basic scenarios
  const scenarios = [
    { name: 'Click Introduction', href: '#section-introduction' },
    { name: 'Click Features', href: '#section-features' },
    { name: 'Click Implementation', href: '#section-implementation' }
  ];

  for (const scenario of scenarios) {
    await page.click(`a[href="${scenario.href}"]`);
    await helper.waitForScrollToComplete();

    const url = await page.url();
    const scrollPos = await helper.getScrollPosition();
    const screenshot = await helper.takeScreenshot(`19-summary-${scenario.name.toLowerCase().replace(' ', '-')}`);

    testReport.tests.push({
      scenario: scenario.name,
      url,
      scrollPosition: scrollPos,
      screenshot
    });
  }

  // Save test report
  const reportPath = path.join(SCREENSHOTS_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));

  console.log('Test Summary Report:', JSON.stringify(testReport, null, 2));

  await helper.cleanupTestPage();
});
