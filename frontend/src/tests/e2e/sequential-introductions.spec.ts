/**
 * Sequential Agent Introductions E2E Test
 * Tests the complete sequential introduction flow for agents
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
  isPhase1Completed,
  clearTestData,
} from './helpers/test-utils';

test.describe('Sequential Agent Introductions', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Setup WebSocket listener for real-time updates
    await setupWebSocketListener(page);

    // Navigate to app
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Setup test user
    const context = await setupTestUser(page);
    console.log('Test user context:', context);

    // Wait for WebSocket connection
    await waitForWebSocket(page);

    // Take initial screenshot
    await takeScreenshotWithMetadata(page, 'sequential-intro', '01-initial-state', {
      context,
    });
  });

  test('Phase 1: User creates first post → get-to-know-you-agent introduces', async () => {
    // Step 1: Create first user post
    await createPost(
      page,
      'Hello! This is my first post. I am excited to get started!',
      'My First Post'
    );

    await takeScreenshotWithMetadata(page, 'sequential-intro', '02-first-post-created', {
      step: 'first-post-created',
    });

    // Step 2: Wait for get-to-know-you-agent to introduce
    await waitForAgentIntroduction(page, 'get-to-know-you-agent', 30000);

    await takeScreenshotWithMetadata(page, 'sequential-intro', '03-get-to-know-you-intro', {
      agent: 'get-to-know-you-agent',
      triggered: 'after-first-post',
    });

    // Step 3: Verify agent introduction post exists
    const agentIntro = page.locator('[data-testid*="get-to-know-you"], text="Get to Know You"').first();
    await expect(agentIntro).toBeVisible();

    // Step 4: Verify introduction content
    const introContent = page.locator('text=/Hi.*I\'m.*Get to Know You/i').first();
    await expect(introContent).toBeVisible();

    // Store results
    await storeInSwarmMemory('sequential-intro/phase1-test', {
      testName: 'Phase 1 Introduction',
      result: 'PASS',
      agent: 'get-to-know-you-agent',
      triggerCondition: 'first-post-created',
      screenshotCount: 3,
    });

    console.log('✅ Phase 1 test completed successfully');
  });

  test('Phase 1 Completion: User answers questions → personal-todos-agent introduces', async () => {
    // Step 1: Complete Phase 1 (answer get-to-know-you questions)
    await completePhase1(page);

    await takeScreenshotWithMetadata(page, 'sequential-intro', '04-phase1-completed', {
      step: 'phase1-completed',
    });

    // Step 2: Verify Phase 1 is marked complete
    const phase1Complete = await isPhase1Completed(page);
    expect(phase1Complete).toBe(true);

    // Step 3: Wait for personal-todos-agent to introduce
    await waitForAgentIntroduction(page, 'personal-todos-agent', 30000);

    await takeScreenshotWithMetadata(page, 'sequential-intro', '05-personal-todos-intro', {
      agent: 'personal-todos-agent',
      triggered: 'after-phase1-complete',
    });

    // Step 4: Verify agent introduction post exists
    const agentIntro = page.locator('[data-testid*="personal-todos"], text="Personal Todos"').first();
    await expect(agentIntro).toBeVisible();

    // Step 5: Verify introduction content includes capabilities
    const capabilitiesText = page.locator('text=/I can help you with/i').first();
    await expect(capabilitiesText).toBeVisible();

    // Store results
    await storeInSwarmMemory('sequential-intro/phase1-completion-test', {
      testName: 'Phase 1 Completion - Personal Todos Introduction',
      result: 'PASS',
      agent: 'personal-todos-agent',
      triggerCondition: 'phase1-completed',
      screenshotCount: 2,
    });

    console.log('✅ Phase 1 Completion test completed successfully');
  });

  test('Engagement Score 3: page-builder-agent introduces with showcase offer', async () => {
    // Step 1: Complete Phase 1
    await completePhase1(page);
    await takeScreenshotWithMetadata(page, 'sequential-intro', '06-pre-engagement-3', {
      step: 'phase1-complete',
    });

    // Step 2: Increase engagement score to 3
    console.log('Increasing engagement score to 3...');

    // Create posts and interactions to reach engagement score 3
    for (let i = 0; i < 3; i++) {
      await createPost(
        page,
        `Post ${i + 1} - Building my knowledge base and tracking progress`,
        `Update ${i + 1}`
      );
      await page.waitForTimeout(2000);

      // Like a post to increase engagement
      const likeButton = page.locator('[data-testid="like-button"]').first();
      if (await likeButton.isVisible()) {
        await likeButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await takeScreenshotWithMetadata(page, 'sequential-intro', '07-engagement-increased', {
      step: 'engagement-actions-performed',
    });

    // Step 3: Wait for page-builder-agent to introduce
    await waitForAgentIntroduction(page, 'page-builder-agent', 45000);

    await takeScreenshotWithMetadata(page, 'sequential-intro', '08-page-builder-intro', {
      agent: 'page-builder-agent',
      triggered: 'engagement-score-3',
    });

    // Step 4: Verify page-builder-agent introduction
    const agentIntro = page.locator('[data-testid*="page-builder"], text="Page Builder"').first();
    await expect(agentIntro).toBeVisible();

    // Step 5: Verify showcase offer is present
    const showcaseOffer = page.locator('text=/show.*showcase/i, text=/create.*page/i').first();
    await expect(showcaseOffer).toBeVisible();

    // Step 6: Verify "Yes, show me!" button exists
    const yesButton = page.locator('button:has-text("Yes"), button:has-text("Show me")').first();
    await expect(yesButton).toBeVisible();

    await takeScreenshotWithMetadata(page, 'sequential-intro', '09-showcase-offer-visible', {
      step: 'showcase-offer-displayed',
      hasYesButton: true,
    });

    // Store results
    await storeInSwarmMemory('sequential-intro/engagement-3-test', {
      testName: 'Engagement Score 3 - Page Builder Introduction',
      result: 'PASS',
      agent: 'page-builder-agent',
      triggerCondition: 'engagement-score-3',
      showcaseOfferPresent: true,
      screenshotCount: 4,
    });

    console.log('✅ Engagement Score 3 test completed successfully');
  });

  test('Engagement Score 5: agent-ideas-agent introduces', async () => {
    // Step 1: Complete Phase 1
    await completePhase1(page);

    // Step 2: Increase engagement score to 5
    console.log('Increasing engagement score to 5...');

    // Create more posts and interactions
    for (let i = 0; i < 5; i++) {
      await createPost(
        page,
        `Advanced post ${i + 1} - Exploring agent capabilities and features`,
        `Advanced Update ${i + 1}`
      );
      await page.waitForTimeout(2000);

      // Add comment to increase engagement
      const commentButton = page.locator('[data-testid="comment-button"]').first();
      if (await commentButton.isVisible()) {
        await commentButton.click();
        await page.waitForTimeout(500);

        const commentInput = page.locator('[data-testid="comment-input"], textarea').first();
        if (await commentInput.isVisible()) {
          await commentInput.fill('Great progress!');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);
        }
      }
    }

    await takeScreenshotWithMetadata(page, 'sequential-intro', '10-engagement-5-reached', {
      step: 'engagement-score-5',
    });

    // Step 3: Wait for agent-ideas-agent to introduce
    await waitForAgentIntroduction(page, 'agent-ideas-agent', 45000);

    await takeScreenshotWithMetadata(page, 'sequential-intro', '11-agent-ideas-intro', {
      agent: 'agent-ideas-agent',
      triggered: 'engagement-score-5',
    });

    // Step 4: Verify agent-ideas-agent introduction
    const agentIntro = page.locator('[data-testid*="agent-ideas"], text="Agent Ideas"').first();
    await expect(agentIntro).toBeVisible();

    // Step 5: Verify agent builder tutorial mention
    const tutorialMention = page.locator('text=/tutorial/i, text=/agent.*builder/i').first();
    await expect(tutorialMention).toBeVisible();

    // Store results
    await storeInSwarmMemory('sequential-intro/engagement-5-test', {
      testName: 'Engagement Score 5 - Agent Ideas Introduction',
      result: 'PASS',
      agent: 'agent-ideas-agent',
      triggerCondition: 'engagement-score-5',
      screenshotCount: 2,
    });

    console.log('✅ Engagement Score 5 test completed successfully');
  });

  test('WebSocket Real-time: Agent introductions appear instantly', async () => {
    // Step 1: Setup WebSocket monitoring
    const socketEvents: any[] = [];

    await page.evaluate(() => {
      const win = window as any;
      if (win.socket) {
        win.socket.onAny((eventName: string, ...args: any[]) => {
          win.socketEvents.push({
            type: eventName,
            data: args,
            timestamp: Date.now(),
          });
        });
      }
    });

    // Step 2: Create a post to trigger introduction
    await createPost(
      page,
      'Testing real-time agent introduction via WebSocket',
      'WebSocket Test'
    );

    await takeScreenshotWithMetadata(page, 'sequential-intro', '12-websocket-post-created', {
      step: 'websocket-test-post',
    });

    // Step 3: Wait for WebSocket event
    await page.waitForTimeout(3000);

    // Step 4: Check for real-time updates
    const events = await page.evaluate(() => {
      const win = window as any;
      return win.socketEvents || [];
    });

    console.log('WebSocket events received:', events);

    // Step 5: Verify at least one new post event was received
    const hasNewPostEvent = events.some((event: any) =>
      ['newPost', 'post:created', 'feed:update'].includes(event.type)
    );

    expect(hasNewPostEvent).toBe(true);

    await takeScreenshotWithMetadata(page, 'sequential-intro', '13-websocket-events-logged', {
      step: 'websocket-events-verified',
      eventCount: events.length,
    });

    // Store results
    await storeInSwarmMemory('sequential-intro/websocket-test', {
      testName: 'WebSocket Real-time Updates',
      result: 'PASS',
      eventsReceived: events.length,
      hasNewPostEvent,
      screenshotCount: 2,
    });

    console.log('✅ WebSocket real-time test completed successfully');
  });

  test.afterEach(async () => {
    // Take final screenshot
    await takeScreenshotWithMetadata(page, 'sequential-intro', 'final-state', {
      step: 'test-completed',
    });
  });
});

test.describe('Sequential Introductions - Full Flow', () => {
  test('Complete sequential introduction flow from Phase 1 to Engagement 5', async ({ page }) => {
    // Setup
    await setupWebSocketListener(page);
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    const context = await setupTestUser(page);
    await waitForWebSocket(page);

    await takeScreenshotWithMetadata(page, 'full-flow', '01-start', { context });

    // Phase 1: First post → get-to-know-you-agent
    await createPost(page, 'Hello! This is my first post.', 'First Post');
    await waitForAgentIntroduction(page, 'get-to-know-you-agent', 30000);
    await takeScreenshotWithMetadata(page, 'full-flow', '02-get-to-know-you', {
      agent: 'get-to-know-you-agent',
    });

    // Phase 1 Complete: personal-todos-agent
    await completePhase1(page);
    await waitForAgentIntroduction(page, 'personal-todos-agent', 30000);
    await takeScreenshotWithMetadata(page, 'full-flow', '03-personal-todos', {
      agent: 'personal-todos-agent',
    });

    // Engagement 3: page-builder-agent
    for (let i = 0; i < 3; i++) {
      await createPost(page, `Engagement post ${i + 1}`, `Update ${i + 1}`);
      await page.waitForTimeout(2000);
    }
    await waitForAgentIntroduction(page, 'page-builder-agent', 45000);
    await takeScreenshotWithMetadata(page, 'full-flow', '04-page-builder', {
      agent: 'page-builder-agent',
    });

    // Engagement 5: agent-ideas-agent
    for (let i = 0; i < 2; i++) {
      await createPost(page, `Advanced post ${i + 1}`, `Advanced ${i + 1}`);
      await page.waitForTimeout(2000);
    }
    await waitForAgentIntroduction(page, 'agent-ideas-agent', 45000);
    await takeScreenshotWithMetadata(page, 'full-flow', '05-agent-ideas', {
      agent: 'agent-ideas-agent',
    });

    // Store complete flow results
    await storeInSwarmMemory('sequential-intro/full-flow-test', {
      testName: 'Complete Sequential Introduction Flow',
      result: 'PASS',
      agentsIntroduced: [
        'get-to-know-you-agent',
        'personal-todos-agent',
        'page-builder-agent',
        'agent-ideas-agent',
      ],
      screenshotCount: 5,
      duration: 'varies',
    });

    console.log('✅ Full flow test completed successfully');
  });
});
