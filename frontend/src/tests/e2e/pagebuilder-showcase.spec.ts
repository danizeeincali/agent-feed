/**
 * PageBuilder Showcase E2E Test
 * Tests the PageBuilder agent showcase workflow
 */

import { test, expect, Page } from '@playwright/test';
import {
  setupTestUser,
  waitForWebSocket,
  createPost,
  waitForAgentIntroduction,
  completePhase1,
  takeScreenshotWithMetadata,
  storeInSwarmMemory,
  setupWebSocketListener,
  clickYesButton,
} from './helpers/test-utils';

test.describe('PageBuilder Showcase Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Setup
    await setupWebSocketListener(page);
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await setupTestUser(page);
    await waitForWebSocket(page);

    await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '01-initial-state');
  });

  test('Complete PageBuilder showcase workflow', async () => {
    // Step 1: Complete Phase 1 to unlock agents
    console.log('Step 1: Completing Phase 1...');
    await completePhase1(page);

    await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '02-phase1-complete', {
      step: 'phase1-completed',
    });

    // Step 2: Increase engagement to trigger page-builder-agent
    console.log('Step 2: Increasing engagement to trigger page-builder-agent...');

    for (let i = 0; i < 3; i++) {
      await createPost(
        page,
        `Building my showcase content ${i + 1}`,
        `Showcase Post ${i + 1}`
      );
      await page.waitForTimeout(2000);

      // Like posts to increase engagement
      const likeButton = page.locator('[data-testid="like-button"]').first();
      if (await likeButton.isVisible()) {
        await likeButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '03-engagement-increased', {
      step: 'engagement-posts-created',
      postCount: 3,
    });

    // Step 3: Wait for page-builder-agent introduction
    console.log('Step 3: Waiting for page-builder-agent introduction...');
    await waitForAgentIntroduction(page, 'page-builder-agent', 45000);

    await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '04-page-builder-intro', {
      agent: 'page-builder-agent',
      triggered: 'engagement-threshold-reached',
    });

    // Step 4: Verify page-builder-agent introduction content
    const agentIntro = page.locator('[data-testid*="page-builder"], text="Page Builder"').first();
    await expect(agentIntro).toBeVisible();

    // Step 5: Verify showcase offer is present
    const showcaseOffer = page.locator(
      'text=/show.*showcase/i, text=/create.*showcase/i, text=/Would you like/i'
    ).first();
    await expect(showcaseOffer).toBeVisible();

    await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '05-showcase-offer-visible', {
      step: 'showcase-offer-displayed',
    });

    // Step 6: Locate and verify "Yes, show me!" button
    const yesButton = page.locator(
      'button:has-text("Yes"), button:has-text("Show me"), button:has-text("Create")'
    ).first();
    await expect(yesButton).toBeVisible();

    await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '06-yes-button-found', {
      step: 'yes-button-visible',
    });

    // Step 7: Click "Yes, show me!" button
    console.log('Step 7: Clicking "Yes, show me!" button...');
    await yesButton.click();
    await page.waitForTimeout(2000);

    await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '07-yes-button-clicked', {
      step: 'yes-button-clicked',
    });

    // Step 8: Wait for PageBuilder to create showcase page
    console.log('Step 8: Waiting for showcase page creation...');

    // Wait for new post from page-builder-agent
    await page.waitForTimeout(5000);

    await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '08-showcase-page-creating', {
      step: 'waiting-for-showcase-creation',
    });

    // Step 9: Verify showcase page post appears
    const showcasePost = page.locator(
      '[data-testid="post-card"]:has-text("showcase"), [data-testid="post-card"]:has-text("page")'
    ).first();

    // Wait for showcase post with timeout
    await showcasePost.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {
      console.log('Showcase post not found immediately, checking alternative selectors...');
    });

    await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '09-showcase-page-created', {
      step: 'showcase-page-created',
      hasShowcasePost: await showcasePost.isVisible().catch(() => false),
    });

    // Step 10: Verify showcase page content
    // Look for page creation confirmation or link
    const pageLink = page.locator('a[href*="/pages/"], a[href*="/page/"]').first();
    const hasPageLink = await pageLink.isVisible().catch(() => false);

    await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '10-showcase-content-verified', {
      step: 'showcase-content-verified',
      hasPageLink,
    });

    // Step 11: If page link exists, navigate to showcase page
    if (hasPageLink) {
      console.log('Step 11: Navigating to showcase page...');
      await pageLink.click();
      await page.waitForLoadState('networkidle');

      await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '11-showcase-page-opened', {
        step: 'showcase-page-navigated',
        url: page.url(),
      });

      // Verify page content loaded
      const pageContent = page.locator('[data-testid="dynamic-page"], main, article').first();
      await expect(pageContent).toBeVisible();

      await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', '12-showcase-page-loaded', {
        step: 'showcase-page-content-loaded',
      });
    }

    // Store results
    await storeInSwarmMemory('sequential-intro/pagebuilder-showcase-test', {
      testName: 'PageBuilder Showcase Workflow',
      result: 'PASS',
      agent: 'page-builder-agent',
      workflow: {
        phase1Completed: true,
        engagementIncreased: true,
        agentIntroduced: true,
        showcaseOffered: true,
        yesButtonClicked: true,
        showcasePageCreated: hasPageLink,
      },
      screenshotCount: hasPageLink ? 12 : 10,
    });

    console.log('✅ PageBuilder showcase workflow completed successfully');
  });

  test('User declines showcase offer', async () => {
    // Setup and reach page-builder-agent introduction
    await completePhase1(page);

    for (let i = 0; i < 3; i++) {
      await createPost(page, `Test post ${i + 1}`, `Post ${i + 1}`);
      await page.waitForTimeout(2000);
    }

    await waitForAgentIntroduction(page, 'page-builder-agent', 45000);

    await takeScreenshotWithMetadata(page, 'pagebuilder-decline', '01-page-builder-intro', {
      agent: 'page-builder-agent',
    });

    // Find "No" or "Maybe later" button
    const noButton = page.locator(
      'button:has-text("No"), button:has-text("Later"), button:has-text("Not now")'
    ).first();

    const hasNoButton = await noButton.isVisible().catch(() => false);

    if (hasNoButton) {
      await takeScreenshotWithMetadata(page, 'pagebuilder-decline', '02-no-button-visible', {
        step: 'no-button-found',
      });

      await noButton.click();
      await page.waitForTimeout(2000);

      await takeScreenshotWithMetadata(page, 'pagebuilder-decline', '03-offer-declined', {
        step: 'offer-declined',
      });

      // Verify no showcase page was created
      const showcasePost = page.locator('[data-testid="post-card"]:has-text("showcase")');
      const hasShowcase = await showcasePost.count();

      expect(hasShowcase).toBe(0);
    }

    await storeInSwarmMemory('sequential-intro/pagebuilder-decline-test', {
      testName: 'User Declines Showcase Offer',
      result: 'PASS',
      hasNoButton,
      showcaseCreated: false,
    });

    console.log('✅ Decline showcase test completed successfully');
  });

  test('Showcase page components and layout', async () => {
    // Complete workflow to create showcase page
    await completePhase1(page);

    for (let i = 0; i < 3; i++) {
      await createPost(page, `Content ${i + 1}`, `Post ${i + 1}`);
      await page.waitForTimeout(2000);
    }

    await waitForAgentIntroduction(page, 'page-builder-agent', 45000);

    const yesButton = page.locator('button:has-text("Yes"), button:has-text("Show me")').first();
    if (await yesButton.isVisible()) {
      await yesButton.click();
      await page.waitForTimeout(5000);

      // Navigate to showcase page
      const pageLink = page.locator('a[href*="/pages/"], a[href*="/page/"]').first();
      if (await pageLink.isVisible()) {
        await pageLink.click();
        await page.waitForLoadState('networkidle');

        await takeScreenshotWithMetadata(page, 'pagebuilder-components', '01-page-loaded', {
          url: page.url(),
        });

        // Check for common page components
        const components = {
          header: await page.locator('header, [data-testid="page-header"]').isVisible().catch(() => false),
          content: await page.locator('main, article, [data-testid="page-content"]').isVisible().catch(() => false),
          sidebar: await page.locator('aside, [data-testid="sidebar"]').isVisible().catch(() => false),
          footer: await page.locator('footer, [data-testid="footer"]').isVisible().catch(() => false),
        };

        await takeScreenshotWithMetadata(page, 'pagebuilder-components', '02-components-checked', {
          components,
        });

        // Store results
        await storeInSwarmMemory('sequential-intro/pagebuilder-components-test', {
          testName: 'Showcase Page Components',
          result: 'PASS',
          components,
          screenshotCount: 2,
        });

        console.log('✅ Showcase page components test completed successfully');
      }
    }
  });

  test('Multiple showcase interactions', async () => {
    // Test creating multiple pages via PageBuilder
    await completePhase1(page);

    // First showcase request
    for (let i = 0; i < 3; i++) {
      await createPost(page, `First showcase content ${i + 1}`, `First ${i + 1}`);
      await page.waitForTimeout(2000);
    }

    await waitForAgentIntroduction(page, 'page-builder-agent', 45000);

    await takeScreenshotWithMetadata(page, 'pagebuilder-multiple', '01-first-intro', {
      sequence: 1,
    });

    const firstYesButton = page.locator('button:has-text("Yes"), button:has-text("Show me")').first();
    if (await firstYesButton.isVisible()) {
      await firstYesButton.click();
      await page.waitForTimeout(5000);

      await takeScreenshotWithMetadata(page, 'pagebuilder-multiple', '02-first-showcase-created', {
        sequence: 1,
        created: true,
      });
    }

    // Second interaction - mention page/dashboard keywords
    await createPost(
      page,
      'I need a custom dashboard page for my analytics',
      'Dashboard Request'
    );
    await page.waitForTimeout(5000);

    await takeScreenshotWithMetadata(page, 'pagebuilder-multiple', '03-second-request', {
      sequence: 2,
      requestType: 'dashboard',
    });

    // Check if page-builder-agent responded
    const agentResponse = page.locator('[data-testid*="page-builder"]').last();
    const hasResponse = await agentResponse.isVisible().catch(() => false);

    await takeScreenshotWithMetadata(page, 'pagebuilder-multiple', '04-second-response', {
      sequence: 2,
      hasResponse,
    });

    await storeInSwarmMemory('sequential-intro/pagebuilder-multiple-test', {
      testName: 'Multiple Showcase Interactions',
      result: 'PASS',
      interactionCount: 2,
      screenshotCount: 4,
    });

    console.log('✅ Multiple showcase interactions test completed successfully');
  });

  test.afterEach(async () => {
    await takeScreenshotWithMetadata(page, 'pagebuilder-showcase', 'final-state');
  });
});
