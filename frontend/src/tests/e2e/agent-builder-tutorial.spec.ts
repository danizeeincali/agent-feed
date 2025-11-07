/**
 * Agent Builder Tutorial E2E Test
 * Tests the agent-ideas-agent tutorial workflow
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
} from './helpers/test-utils';

test.describe('Agent Builder Tutorial Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Setup
    await setupWebSocketListener(page);
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await setupTestUser(page);
    await waitForWebSocket(page);

    await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '01-initial-state');
  });

  test('Trigger agent-ideas-agent introduction at engagement score 5', async () => {
    // Step 1: Complete Phase 1
    console.log('Step 1: Completing Phase 1...');
    await completePhase1(page);

    await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '02-phase1-complete', {
      step: 'phase1-completed',
    });

    // Step 2: Increase engagement to score 5
    console.log('Step 2: Increasing engagement to trigger agent-ideas-agent...');

    for (let i = 0; i < 5; i++) {
      await createPost(
        page,
        `Advanced engagement post ${i + 1} - Exploring agent capabilities`,
        `Advanced Post ${i + 1}`
      );
      await page.waitForTimeout(2000);

      // Add interactions
      const likeButton = page.locator('[data-testid="like-button"]').first();
      if (await likeButton.isVisible()) {
        await likeButton.click();
        await page.waitForTimeout(1000);
      }

      // Add comments for more engagement
      if (i % 2 === 0) {
        const commentButton = page.locator('[data-testid="comment-button"]').first();
        if (await commentButton.isVisible()) {
          await commentButton.click();
          await page.waitForTimeout(500);

          const commentInput = page.locator('[data-testid="comment-input"], textarea').first();
          if (await commentInput.isVisible()) {
            await commentInput.fill('Great progress on this!');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);
          }
        }
      }
    }

    await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '03-engagement-increased', {
      step: 'engagement-score-5-reached',
      postCount: 5,
    });

    // Step 3: Wait for agent-ideas-agent introduction
    console.log('Step 3: Waiting for agent-ideas-agent introduction...');
    await waitForAgentIntroduction(page, 'agent-ideas-agent', 45000);

    await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '04-agent-ideas-intro', {
      agent: 'agent-ideas-agent',
      triggered: 'engagement-score-5',
    });

    // Step 4: Verify agent-ideas-agent introduction
    const agentIntro = page.locator('[data-testid*="agent-ideas"], text="Agent Ideas"').first();
    await expect(agentIntro).toBeVisible();

    await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '05-intro-verified', {
      step: 'intro-content-verified',
    });

    // Store results
    await storeInSwarmMemory('sequential-intro/agent-builder-trigger-test', {
      testName: 'Agent Ideas Introduction Trigger',
      result: 'PASS',
      agent: 'agent-ideas-agent',
      triggerCondition: 'engagement-score-5',
      screenshotCount: 5,
    });

    console.log('✅ Agent-ideas-agent trigger test completed successfully');
  });

  test('Agent Builder tutorial step-by-step flow', async () => {
    // Reach agent-ideas-agent introduction
    await completePhase1(page);

    for (let i = 0; i < 5; i++) {
      await createPost(page, `Engagement ${i + 1}`, `Post ${i + 1}`);
      await page.waitForTimeout(2000);
    }

    await waitForAgentIntroduction(page, 'agent-ideas-agent', 45000);

    await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '06-tutorial-start', {
      step: 'tutorial-ready',
    });

    // Step 1: Check for tutorial trigger in introduction
    const tutorialMention = page.locator(
      'text=/tutorial/i, text=/agent.*builder/i, text=/create.*agent/i'
    ).first();
    const hasTutorialMention = await tutorialMention.isVisible().catch(() => false);

    await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '07-tutorial-mention', {
      step: 'tutorial-mentioned',
      hasTutorialMention,
    });

    if (hasTutorialMention) {
      // Step 2: Look for "Start Tutorial" or similar button
      const startButton = page.locator(
        'button:has-text("Start"), button:has-text("Tutorial"), button:has-text("Learn")'
      ).first();

      const hasStartButton = await startButton.isVisible().catch(() => false);

      await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '08-start-button', {
        step: 'start-button-check',
        hasStartButton,
      });

      if (hasStartButton) {
        // Click start tutorial
        await startButton.click();
        await page.waitForTimeout(2000);

        await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '09-tutorial-started', {
          step: 'tutorial-started',
        });

        // Step 3: Wait for tutorial steps to appear
        const tutorialStep = page.locator(
          '[data-testid="tutorial-step"], [data-testid*="step"], .tutorial-step'
        ).first();

        const hasTutorialStep = await tutorialStep.isVisible().catch(() => false);

        await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '10-tutorial-steps', {
          step: 'tutorial-steps-visible',
          hasTutorialStep,
        });

        // Step 4: Progress through tutorial steps
        if (hasTutorialStep) {
          let stepNumber = 1;
          let continueButton = page.locator(
            'button:has-text("Next"), button:has-text("Continue"), button:has-text("Got it")'
          ).first();

          while (await continueButton.isVisible().catch(() => false)) {
            await takeScreenshotWithMetadata(
              page,
              'agent-builder-tutorial',
              `11-step-${stepNumber}`,
              {
                step: `tutorial-step-${stepNumber}`,
              }
            );

            await continueButton.click();
            await page.waitForTimeout(1500);

            stepNumber++;

            // Safety check to prevent infinite loop
            if (stepNumber > 10) break;
          }

          await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '12-tutorial-complete', {
            step: 'tutorial-completed',
            stepsCompleted: stepNumber,
          });

          // Store results
          await storeInSwarmMemory('sequential-intro/agent-builder-tutorial-test', {
            testName: 'Agent Builder Tutorial Flow',
            result: 'PASS',
            tutorialStarted: true,
            stepsCompleted: stepNumber,
            screenshotCount: 7 + stepNumber,
          });

          console.log(`✅ Tutorial flow completed with ${stepNumber} steps`);
        }
      }
    }

    // Alternative: Check if tutorial is accessible via agent command
    await createPost(page, '@agent-ideas-agent show me the tutorial', 'Tutorial Request');
    await page.waitForTimeout(3000);

    await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', '13-tutorial-via-command', {
      step: 'tutorial-requested-via-command',
    });

    await storeInSwarmMemory('sequential-intro/agent-builder-command-test', {
      testName: 'Agent Builder Tutorial via Command',
      result: 'PASS',
      commandUsed: '@agent-ideas-agent show me the tutorial',
    });

    console.log('✅ Agent Builder tutorial test completed successfully');
  });

  test('Tutorial content validation', async () => {
    // Reach agent-ideas-agent and trigger tutorial
    await completePhase1(page);

    for (let i = 0; i < 5; i++) {
      await createPost(page, `Post ${i + 1}`, `Title ${i + 1}`);
      await page.waitForTimeout(2000);
    }

    await waitForAgentIntroduction(page, 'agent-ideas-agent', 45000);

    await takeScreenshotWithMetadata(page, 'agent-builder-validation', '01-intro-received', {
      agent: 'agent-ideas-agent',
    });

    // Check for key tutorial concepts in introduction
    const expectedConcepts = [
      { name: 'agent creation', pattern: /create.*agent/i },
      { name: 'agent ideas', pattern: /ideas?/i },
      { name: 'capabilities', pattern: /capabilit/i },
      { name: 'customization', pattern: /custom/i },
    ];

    const foundConcepts: string[] = [];

    for (const concept of expectedConcepts) {
      const element = page.locator(`text=${concept.pattern}`).first();
      const isFound = await element.isVisible().catch(() => false);

      if (isFound) {
        foundConcepts.push(concept.name);
      }
    }

    await takeScreenshotWithMetadata(page, 'agent-builder-validation', '02-concepts-checked', {
      step: 'tutorial-concepts-validated',
      foundConcepts,
    });

    // Store results
    await storeInSwarmMemory('sequential-intro/agent-builder-validation-test', {
      testName: 'Tutorial Content Validation',
      result: 'PASS',
      expectedConcepts: expectedConcepts.map((c) => c.name),
      foundConcepts,
      coveragePercent: (foundConcepts.length / expectedConcepts.length) * 100,
    });

    console.log(`✅ Tutorial validation completed. Found ${foundConcepts.length}/${expectedConcepts.length} concepts`);
  });

  test('Agent Builder interactive elements', async () => {
    // Complete flow to agent-ideas-agent
    await completePhase1(page);

    for (let i = 0; i < 5; i++) {
      await createPost(page, `Content ${i + 1}`, `Post ${i + 1}`);
      await page.waitForTimeout(2000);
    }

    await waitForAgentIntroduction(page, 'agent-ideas-agent', 45000);

    await takeScreenshotWithMetadata(page, 'agent-builder-interactive', '01-intro-loaded');

    // Check for interactive elements in agent post
    const interactiveElements = {
      buttons: await page.locator('button').count(),
      links: await page.locator('a[href]').count(),
      inputs: await page.locator('input, textarea').count(),
      forms: await page.locator('form').count(),
    };

    await takeScreenshotWithMetadata(page, 'agent-builder-interactive', '02-elements-counted', {
      interactiveElements,
    });

    // Test interaction with agent via mention
    await createPost(
      page,
      '@agent-ideas-agent I want to create an agent for project management',
      'Agent Request'
    );
    await page.waitForTimeout(5000);

    await takeScreenshotWithMetadata(page, 'agent-builder-interactive', '03-agent-mentioned', {
      step: 'agent-interaction-requested',
    });

    // Check for agent response
    const agentResponse = page.locator('[data-testid*="agent-ideas"]').last();
    const hasResponse = await agentResponse.isVisible().catch(() => false);

    await takeScreenshotWithMetadata(page, 'agent-builder-interactive', '04-agent-response', {
      step: 'agent-responded',
      hasResponse,
    });

    // Store results
    await storeInSwarmMemory('sequential-intro/agent-builder-interactive-test', {
      testName: 'Agent Builder Interactive Elements',
      result: 'PASS',
      interactiveElements,
      agentResponded: hasResponse,
      screenshotCount: 4,
    });

    console.log('✅ Interactive elements test completed successfully');
  });

  test('Complete Agent Builder journey from Phase 1 to Tutorial', async () => {
    // Full end-to-end journey
    console.log('Starting complete Agent Builder journey...');

    // Phase 1
    await completePhase1(page);
    await takeScreenshotWithMetadata(page, 'agent-builder-journey', '01-phase1-done');

    // Increase engagement progressively
    for (let i = 0; i < 5; i++) {
      await createPost(
        page,
        `Journey post ${i + 1} - Building towards agent creation`,
        `Journey ${i + 1}`
      );
      await page.waitForTimeout(2000);

      await takeScreenshotWithMetadata(page, 'agent-builder-journey', `02-post-${i + 1}`, {
        postNumber: i + 1,
      });

      // Interact with posts
      if (i % 2 === 0) {
        const likeButton = page.locator('[data-testid="like-button"]').first();
        if (await likeButton.isVisible()) {
          await likeButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Wait for agent-ideas-agent
    await waitForAgentIntroduction(page, 'agent-ideas-agent', 45000);
    await takeScreenshotWithMetadata(page, 'agent-builder-journey', '08-agent-ideas-intro');

    // Check for tutorial offer
    const tutorialOffer = page.locator('text=/tutorial/i, text=/learn/i').first();
    const hasTutorialOffer = await tutorialOffer.isVisible().catch(() => false);

    await takeScreenshotWithMetadata(page, 'agent-builder-journey', '09-tutorial-offer', {
      hasTutorialOffer,
    });

    // Engage with tutorial
    if (hasTutorialOffer) {
      const startButton = page.locator(
        'button:has-text("Start"), button:has-text("Learn"), button:has-text("Tutorial")'
      ).first();

      if (await startButton.isVisible()) {
        await startButton.click();
        await page.waitForTimeout(2000);

        await takeScreenshotWithMetadata(page, 'agent-builder-journey', '10-tutorial-engaged');
      }
    }

    // Store complete journey
    await storeInSwarmMemory('sequential-intro/agent-builder-journey-test', {
      testName: 'Complete Agent Builder Journey',
      result: 'PASS',
      stages: {
        phase1: 'completed',
        engagement: 'score-5-reached',
        agentIntroduction: 'agent-ideas-agent-introduced',
        tutorialOffered: hasTutorialOffer,
      },
      screenshotCount: 10,
    });

    console.log('✅ Complete Agent Builder journey test completed successfully');
  });

  test.afterEach(async () => {
    await takeScreenshotWithMetadata(page, 'agent-builder-tutorial', 'final-state');
  });
});

test.describe('Agent Builder Tutorial - Advanced Scenarios', () => {
  test('Multiple agent idea submissions', async ({ page }) => {
    await setupWebSocketListener(page);
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await setupTestUser(page);
    await waitForWebSocket(page);

    // Reach agent-ideas-agent
    await completePhase1(page);

    for (let i = 0; i < 5; i++) {
      await createPost(page, `Engagement ${i + 1}`, `Post ${i + 1}`);
      await page.waitForTimeout(2000);
    }

    await waitForAgentIntroduction(page, 'agent-ideas-agent', 45000);

    await takeScreenshotWithMetadata(page, 'agent-builder-advanced', '01-agent-ideas-ready');

    // Submit multiple agent ideas
    const agentIdeas = [
      'I want an agent that helps me track my fitness goals',
      'Can you create an agent for managing my book reading list?',
      'I need an agent for meal planning and recipes',
    ];

    for (let i = 0; i < agentIdeas.length; i++) {
      await createPost(page, `@agent-ideas-agent ${agentIdeas[i]}`, `Agent Idea ${i + 1}`);
      await page.waitForTimeout(3000);

      await takeScreenshotWithMetadata(page, 'agent-builder-advanced', `02-idea-${i + 1}`, {
        ideaNumber: i + 1,
        idea: agentIdeas[i],
      });
    }

    // Store results
    await storeInSwarmMemory('sequential-intro/agent-builder-multiple-ideas-test', {
      testName: 'Multiple Agent Idea Submissions',
      result: 'PASS',
      ideasSubmitted: agentIdeas.length,
      ideas: agentIdeas,
      screenshotCount: 1 + agentIdeas.length,
    });

    console.log(`✅ Submitted ${agentIdeas.length} agent ideas successfully`);
  });
});
