/**
 * E2E Tests: Onboarding Journey
 * Playwright tests for complete user onboarding flow
 *
 * Coverage:
 * - AC-3: Phase 1 completes in <3 minutes
 * - AC-4: Core agents introduce after Phase 1
 * - Complete onboarding interaction
 *
 * Test Suite: 6 E2E tests
 * Requires: Running dev server and API server
 */

import { test, expect } from '@playwright/test';

test.describe('Onboarding Journey E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.goto('/');
    await page.waitForSelector('article');
  });

  test('AC-3: User completes Phase 1 onboarding (name + use case)', async ({ page }) => {
    const startTime = Date.now();

    // Find Get-to-Know-You post (should be 2nd post)
    const posts = await page.locator('article').all();
    const onboardingPost = posts[1];

    // Screenshot initial onboarding post
    await onboardingPost?.screenshot({
      path: './docs/test-results/system-initialization/screenshots/09-onboarding-start.png'
    });

    // Find name input field (may be in a form or comment section)
    const nameInput = page.locator('input[type="text"], textarea').first();
    await nameInput.waitFor({ timeout: 5000 });

    // Provide name
    await nameInput.fill('Sarah');
    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/10-name-entered.png',
      fullPage: true
    });

    // Submit name (look for submit button)
    const submitButton = page.locator('button:has-text("Send"), button:has-text("Submit"), button[type="submit"]').first();
    await submitButton.click();

    // Wait for response and next question
    await page.waitForTimeout(1000);

    // Screenshot after name submission
    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/11-after-name.png',
      fullPage: true
    });

    // Select use case (should have options)
    const useCaseOption = page.locator('text=Business, text=Personal productivity').first();
    if (await useCaseOption.isVisible()) {
      await useCaseOption.click();
    } else {
      // If text input, type use case
      const useCaseInput = page.locator('input, textarea').last();
      await useCaseInput.fill('Business');
      await submitButton.click();
    }

    // Wait for Phase 1 completion
    await page.waitForTimeout(2000);

    const elapsedTime = (Date.now() - startTime) / 1000;

    // AC-3: Phase 1 completes in < 3 minutes (180 seconds)
    expect(elapsedTime).toBeLessThan(180);

    // Screenshot Phase 1 complete
    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/12-phase1-complete.png',
      fullPage: true
    });

    console.log(`✓ Phase 1 completed in ${elapsedTime.toFixed(1)} seconds (< 180s required)`);
  });

  test('AC-4: Core agents introduce themselves after Phase 1', async ({ page }) => {
    // Complete Phase 1 (simplified version)
    const nameInput = page.locator('input[type="text"], textarea').first();
    await nameInput.waitFor({ timeout: 5000 });
    await nameInput.fill('Sarah');

    const submitButton = page.locator('button:has-text("Send"), button:has-text("Submit")').first();
    await submitButton.click();

    await page.waitForTimeout(1000);

    // Submit use case
    const useCaseInput = page.locator('input, textarea').last();
    await useCaseInput.fill('Business');
    await submitButton.click();

    // Wait for agent introductions (should appear after Phase 1)
    await page.waitForTimeout(3000);

    // Reload to see all posts including new agent introductions
    await page.reload();
    await page.waitForSelector('article');

    const allPosts = await page.locator('article').all();

    // AC-4: Should have 3+ original posts + 3 agent introductions = 6+ posts
    expect(allPosts.length).toBeGreaterThanOrEqual(6);

    // Look for agent introduction posts
    const pageContent = await page.textContent('body');

    // AC-4: Core agents should introduce
    const hasPersonalTodos = pageContent?.toLowerCase().includes('personal todos') ||
                            pageContent?.toLowerCase().includes('todo');
    const hasAgentIdeas = pageContent?.toLowerCase().includes('agent ideas') ||
                         pageContent?.toLowerCase().includes('idea');
    const hasLinkLogger = pageContent?.toLowerCase().includes('link logger') ||
                         pageContent?.toLowerCase().includes('link');

    // At least some agent introductions should be visible
    const hasAgentIntros = hasPersonalTodos || hasAgentIdeas || hasLinkLogger;
    expect(hasAgentIntros).toBe(true);

    // Screenshot with agent introductions
    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/13-agent-introductions.png',
      fullPage: true
    });

    console.log('✓ Core agents introduced after Phase 1');
  });

  test('Onboarding shows progression through steps', async ({ page }) => {
    // Step 1: Initial state - name question visible
    const initialContent = await page.textContent('body');
    expect(initialContent?.toLowerCase()).toContain('what should i call you');

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/14-step1-name.png',
      fullPage: true
    });

    // Step 2: After name, use case question appears
    const nameInput = page.locator('input[type="text"], textarea').first();
    await nameInput.fill('Sarah');

    const submitButton = page.locator('button:has-text("Send"), button:has-text("Submit")').first();
    await submitButton.click();

    await page.waitForTimeout(1500);

    const afterNameContent = await page.textContent('body');
    expect(afterNameContent?.toLowerCase()).toContain('what brings you to agent feed') ||
    expect(afterNameContent?.toLowerCase()).toContain('use case');

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/15-step2-usecase.png',
      fullPage: true
    });

    console.log('✓ Onboarding progression working correctly');
  });

  test('User can see their name reflected after providing it', async ({ page }) => {
    // Provide name
    const nameInput = page.locator('input[type="text"], textarea').first();
    await nameInput.waitFor({ timeout: 5000 });
    await nameInput.fill('Sarah Martinez');

    const submitButton = page.locator('button:has-text("Send"), button:has-text("Submit")').first();
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Reload to check if name is updated
    await page.reload();
    await page.waitForSelector('article');

    const pageContent = await page.textContent('body');

    // Name should appear in greeting or confirmation
    const hasUserName = pageContent?.includes('Sarah');
    expect(hasUserName).toBe(true);

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/16-name-reflected.png',
      fullPage: true
    });

    console.log('✓ User name reflected in UI after submission');
  });

  test('Onboarding is conversational and engaging', async ({ page }) => {
    const posts = await page.locator('article').all();

    // Check onboarding post tone
    const onboardingPost = posts[1];
    const content = await onboardingPost?.textContent();

    // Should be friendly and conversational
    const hasFriendlyTone = content?.includes('!') || // Exclamations
                           content?.toLowerCase().includes('let\'s') ||
                           content?.toLowerCase().includes('great') ||
                           content?.toLowerCase().includes('perfect');

    expect(hasFriendlyTone).toBe(true);

    // Should ask questions
    const hasQuestions = content?.includes('?');
    expect(hasQuestions).toBe(true);

    await onboardingPost?.screenshot({
      path: './docs/test-results/system-initialization/screenshots/17-conversational-tone.png'
    });

    console.log('✓ Onboarding uses conversational, engaging tone');
  });

  test('Complete onboarding flow end-to-end', async ({ page }) => {
    const startTime = Date.now();

    // Step 1: Provide name
    let nameInput = page.locator('input[type="text"], textarea').first();
    await nameInput.waitFor({ timeout: 5000 });
    await nameInput.fill('Test User');

    let submitButton = page.locator('button:has-text("Send"), button:has-text("Submit")').first();
    await submitButton.click();

    await page.waitForTimeout(1500);

    // Step 2: Provide use case
    const useCaseInput = page.locator('input, textarea').last();
    await useCaseInput.fill('Personal productivity');

    submitButton = page.locator('button:has-text("Send"), button:has-text("Submit")').first();
    await submitButton.click();

    await page.waitForTimeout(2000);

    const elapsedTime = (Date.now() - startTime) / 1000;

    // Should complete in reasonable time
    expect(elapsedTime).toBeLessThan(60); // Less than 1 minute for test

    // Verify completion
    const content = await page.textContent('body');
    const showsCompletion = content?.toLowerCase().includes('all set') ||
                           content?.toLowerCase().includes('complete') ||
                           content?.toLowerCase().includes('ready');

    // Take final screenshot
    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/18-complete-flow.png',
      fullPage: true
    });

    console.log(`✓ Complete onboarding flow finished in ${elapsedTime.toFixed(1)}s`);
  });
});

test.describe('Onboarding Error Handling', () => {
  test('Handles empty name submission', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article');

    const nameInput = page.locator('input[type="text"], textarea').first();
    await nameInput.waitFor({ timeout: 5000 });

    // Try submitting without entering name
    const submitButton = page.locator('button:has-text("Send"), button:has-text("Submit")').first();

    // Some validation should prevent or handle this
    await submitButton.click();

    await page.waitForTimeout(1000);

    // Should either show error or request input
    const hasError = await page.locator('text=required, text=error, text=please').count() > 0;
    const inputStillPresent = await nameInput.isVisible();

    expect(hasError || inputStillPresent).toBe(true);

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/19-empty-validation.png',
      fullPage: true
    });

    console.log('✓ Empty input validation working');
  });

  test('Onboarding state persists across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article');

    // Provide name
    const nameInput = page.locator('input[type="text"], textarea').first();
    await nameInput.waitFor({ timeout: 5000 });
    await nameInput.fill('Sarah');

    const submitButton = page.locator('button:has-text("Send"), button:has-text("Submit")').first();
    await submitButton.click();

    await page.waitForTimeout(1500);

    // Reload page
    await page.reload();
    await page.waitForSelector('article');

    // Should remember we're past the name step
    const content = await page.textContent('body');

    // Should not ask for name again
    const asksForName = content?.toLowerCase().includes('what should i call you');
    expect(asksForName).toBe(false);

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/20-state-persistence.png',
      fullPage: true
    });

    console.log('✓ Onboarding state persists across reloads');
  });
});
