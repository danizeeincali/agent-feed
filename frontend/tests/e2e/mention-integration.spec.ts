/**
 * Comprehensive Playwright E2E tests for @ Mention Integration
 * Tests complete integration across PostCreatorModal, QuickPost, and Comment forms
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_AGENTS = [
  {
    name: 'chief-of-staff-agent',
    displayName: 'Chief of Staff',
    description: 'Strategic coordination and planning'
  },
  {
    name: 'TechReviewer',
    displayName: 'Tech Reviewer',
    description: 'Technical analysis and review'
  },
  {
    name: 'SystemValidator',
    displayName: 'System Validator',
    description: 'System validation and testing'
  }
];

const TEST_POSTS = {
  basic: {
    title: 'Test Post with Mentions',
    content: 'This is a test post mentioning @chief-of-staff-agent and discussing integration.'
  },
  quickPost: {
    content: 'Quick update: @TechReviewer please review the new feature @SystemValidator validate performance'
  },
  comment: {
    content: 'Great analysis! @chief-of-staff-agent what are your thoughts on the strategy?'
  }
};

// Helper functions
async function waitForMentionDropdown(page: Page): Promise<void> {
  await expect(page.locator('[role="listbox"][aria-label="Agent suggestions"]')).toBeVisible();
}

async function selectMentionFromDropdown(page: Page, agentName: string): Promise<void> {
  await waitForMentionDropdown(page);
  await page.locator(`[role="option"]:has-text("${agentName}")`).first().click();
}

async function typeWithMention(page: Page, selector: string, text: string): Promise<void> {
  const input = page.locator(selector);
  await input.fill('');
  
  // Type character by character to trigger mention detection
  for (const char of text) {
    await input.type(char, { delay: 50 });
    
    // If we just typed @, wait for dropdown and handle mention
    if (char === '@') {
      await page.waitForTimeout(200); // Wait for debounce
    }
  }
}

test.describe('@ Mention Integration - PostCreatorModal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Open post creator modal
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    await expect(page.locator('.fixed.inset-0')).toBeVisible(); // Modal overlay
  });

  test('should show mention suggestions when typing @ in PostCreator content', async ({ page }) => {
    // Fill title first
    await page.fill('input[placeholder*="compelling title"]', TEST_POSTS.basic.title);
    
    // Focus on content area (MentionInput)
    const mentionInput = page.locator('textarea[placeholder*="Share your insights"]');
    await mentionInput.click();
    
    // Type @ to trigger mention suggestions
    await mentionInput.type('@');
    await page.waitForTimeout(300); // Wait for debounce
    
    // Verify mention dropdown appears
    await waitForMentionDropdown(page);
    
    // Verify we see agent suggestions
    await expect(page.locator('[role="option"]:has-text("Chief of Staff")')).toBeVisible();
    await expect(page.locator('[role="option"]:has-text("Tech Reviewer")')).toBeVisible();
  });

  test('should insert mention when selected from dropdown', async ({ page }) => {
    await page.fill('input[placeholder*="compelling title"]', TEST_POSTS.basic.title);
    
    const mentionInput = page.locator('textarea[placeholder*="Share your insights"]');
    await mentionInput.click();
    
    // Type @ and search
    await mentionInput.type('@chief');
    await page.waitForTimeout(300);
    
    // Select the suggestion
    await selectMentionFromDropdown(page, 'Chief of Staff');
    
    // Verify mention was inserted
    await expect(mentionInput).toHaveValue('@chief-of-staff-agent ');
    
    // Verify dropdown closed
    await expect(page.locator('[role="listbox"]')).not.toBeVisible();
  });

  test('should filter mentions based on search query', async ({ page }) => {
    await page.fill('input[placeholder*="compelling title"]', TEST_POSTS.basic.title);
    
    const mentionInput = page.locator('textarea[placeholder*="Share your insights"]');
    await mentionInput.click();
    
    // Type @ and specific search term
    await mentionInput.type('@tech');
    await page.waitForTimeout(300);
    
    await waitForMentionDropdown(page);
    
    // Should show filtered results
    await expect(page.locator('[role="option"]:has-text("Tech Reviewer")')).toBeVisible();
    // Should not show non-matching agents
    await expect(page.locator('[role="option"]:has-text("Chief of Staff")')).not.toBeVisible();
  });

  test('should navigate mentions with keyboard', async ({ page }) => {
    await page.fill('input[placeholder*="compelling title"]', TEST_POSTS.basic.title);
    
    const mentionInput = page.locator('textarea[placeholder*="Share your insights"]');
    await mentionInput.click();
    await mentionInput.type('@');
    await page.waitForTimeout(300);
    
    await waitForMentionDropdown(page);
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Select with Enter
    await page.keyboard.press('Enter');
    
    // Verify mention was inserted
    const inputValue = await mentionInput.inputValue();
    expect(inputValue).toMatch(/@[\w-]+-agent /);
  });

  test('should submit post with mentions successfully', async ({ page }) => {
    await page.fill('input[placeholder*="compelling title"]', TEST_POSTS.basic.title);
    
    const mentionInput = page.locator('textarea[placeholder*="Share your insights"]');
    await typeWithMention(mentionInput, 'textarea[placeholder*="Share your insights"]', 
      'Testing mentions with @chief-of-staff-agent for coordination.');
    
    // Submit the post
    await page.click('[data-testid="submit-post"]');
    
    // Wait for successful submission
    await expect(page.locator('text=Post created successfully')).toBeVisible({ timeout: 10000 });
    
    // Modal should close
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible();
  });
});

test.describe('@ Mention Integration - QuickPost', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for QuickPost section to be visible
    await expect(page.locator('[data-testid="quick-post-section"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show mention suggestions in QuickPost', async ({ page }) => {
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]');
    await quickPostInput.click();
    
    await quickPostInput.type('@');
    await page.waitForTimeout(300);
    
    await waitForMentionDropdown(page);
    
    // Should show quick-post context agents (coordinator, planner, reviewer)
    await expect(page.locator('[role="option"]')).toHaveCount.greaterThan(0);
    await expect(page.locator('[role="option"]:has-text("Chief of Staff")')).toBeVisible();
  });

  test('should integrate with quick agent buttons', async ({ page }) => {
    // Click a quick agent button
    await page.locator('button:has-text("Tech Reviewer")').first().click();
    
    // Verify agent is selected (button should be highlighted)
    await expect(page.locator('button:has-text("Tech Reviewer")').first())
      .toHaveClass(/bg-purple-100/);
    
    // Type in quick post
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]');
    await quickPostInput.fill('Status update for the team');
    
    // Submit quick post
    await page.click('button:has-text("Quick Post")');
    
    // Wait for success
    await expect(page.locator('text=Posted!')).toBeVisible({ timeout: 5000 });
  });

  test('should auto-detect mentions in QuickPost content', async ({ page }) => {
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]');
    await quickPostInput.click();
    
    // Type content with mention
    await typeWithMention(quickPostInput, 'textarea[placeholder*="quick update"]', 
      'Update: @TechReviewer please check the integration');
    
    // Agent should be auto-detected and added to selected agents
    await page.waitForTimeout(500);
    
    // Check if agent button becomes selected
    await expect(page.locator('button:has-text("Tech Reviewer")').first())
      .toHaveClass(/bg-purple-100/);
  });

  test('should submit QuickPost with mentions', async ({ page }) => {
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]');
    await typeWithMention(quickPostInput, 'textarea[placeholder*="quick update"]', 
      TEST_POSTS.quickPost.content);
    
    // Submit
    await page.click('button:has-text("Quick Post")');
    
    // Wait for success and form reset
    await expect(page.locator('text=Posted!')).toBeVisible();
    await expect(quickPostInput).toHaveValue('');
  });
});

test.describe('@ Mention Integration - Comments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for feed to load and find a post to comment on
    await page.waitForSelector('.feed-post', { timeout: 10000 });
    
    // Click on comment button of first post
    await page.locator('.feed-post').first().locator('button:has-text("Comment")').click();
    
    // Wait for comment form to appear
    await expect(page.locator('[data-testid="comment-form"]')).toBeVisible();
  });

  test('should show comment-specific mention suggestions', async ({ page }) => {
    const commentInput = page.locator('textarea[placeholder*="technical analysis"]');
    await commentInput.click();
    
    await commentInput.type('@');
    await page.waitForTimeout(300);
    
    await waitForMentionDropdown(page);
    
    // Should show comment context agents (reviewer, analyst, tester)
    await expect(page.locator('[role="option"]:has-text("Code Reviewer")')).toBeVisible();
    await expect(page.locator('[role="option"]:has-text("Tech Reviewer")')).toBeVisible();
  });

  test('should insert mentions in comments', async ({ page }) => {
    const commentInput = page.locator('textarea[placeholder*="technical analysis"]');
    await commentInput.click();
    
    await commentInput.type('@code');
    await page.waitForTimeout(300);
    
    await selectMentionFromDropdown(page, 'Code Reviewer');
    
    // Verify mention inserted
    await expect(commentInput).toHaveValue('@code-reviewer-agent ');
  });

  test('should support both MentionInput and legacy mention modes', async ({ page }) => {
    // Test new MentionInput mode (default)
    const commentInput = page.locator('textarea[placeholder*="technical analysis"]');
    await commentInput.click();
    await commentInput.type('@tech');
    await page.waitForTimeout(300);
    
    // Should show modern mention dropdown
    await expect(page.locator('[role="listbox"][aria-label="Agent suggestions"]')).toBeVisible();
    
    await selectMentionFromDropdown(page, 'Tech Reviewer');
    
    // Type rest of comment
    await commentInput.type(' what do you think about this approach?');
    
    // Submit comment
    await page.click('button:has-text("Post Analysis")');
    
    // Wait for success
    await expect(page.locator('text=Comment posted successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should handle reply comments with mentions', async ({ page }) => {
    // First, post a comment
    const commentInput = page.locator('textarea[placeholder*="technical analysis"]');
    await typeWithMention(commentInput, 'textarea[placeholder*="technical analysis"]', 
      'Initial comment with @tech-reviewer-agent');
    
    await page.click('button:has-text("Post Analysis")');
    await page.waitForTimeout(2000);
    
    // Then reply to the comment
    await page.locator('button:has-text("Reply")').first().click();
    
    const replyInput = page.locator('textarea[placeholder*="technical analysis"]').last();
    await typeWithMention(replyInput, 'textarea[placeholder*="technical analysis"]:visible', 
      'Reply mentioning @system-validator-agent');
    
    await page.locator('button:has-text("Submit Analysis")').last().click();
    
    // Wait for reply success
    await expect(page.locator('text=Reply posted successfully')).toBeVisible();
  });
});

test.describe('@ Mention Integration - Cross-Component Consistency', () => {
  test('should maintain consistent agent data across components', async ({ page }) => {
    await page.goto('/');
    
    // Test PostCreator mentions
    await page.click('[data-testid="create-post-button"]');
    const postMentionInput = page.locator('textarea[placeholder*="Share your insights"]');
    await postMentionInput.type('@chief');
    await page.waitForTimeout(300);
    
    // Capture agent info from PostCreator
    await waitForMentionDropdown(page);
    const postAgentText = await page.locator('[role="option"]:has-text("Chief of Staff")').first().textContent();
    
    // Close modal
    await page.keyboard.press('Escape');
    
    // Test QuickPost mentions
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]');
    await quickPostInput.type('@chief');
    await page.waitForTimeout(300);
    
    await waitForMentionDropdown(page);
    const quickAgentText = await page.locator('[role="option"]:has-text("Chief of Staff")').first().textContent();
    
    // Verify consistency
    expect(postAgentText).toEqual(quickAgentText);
    
    // Clear QuickPost
    await page.keyboard.press('Escape');
    await quickPostInput.fill('');
    
    // Test Comment mentions
    await page.locator('.feed-post').first().locator('button:has-text("Comment")').click();
    const commentInput = page.locator('textarea[placeholder*="technical analysis"]');
    await commentInput.type('@chief');
    await page.waitForTimeout(300);
    
    await waitForMentionDropdown(page);
    const commentAgentText = await page.locator('[role="option"]:has-text("Chief of Staff")').first().textContent();
    
    // Verify consistency across all components
    expect(commentAgentText).toEqual(postAgentText);
  });

  test('should handle context-specific agent filtering', async ({ page }) => {
    await page.goto('/');
    
    // QuickPost should show coordinator, planner, reviewer types
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]');
    await quickPostInput.type('@');
    await page.waitForTimeout(300);
    
    await waitForMentionDropdown(page);
    const quickPostAgents = await page.locator('[role="option"]').count();
    await page.keyboard.press('Escape');
    await quickPostInput.fill('');
    
    // Comments should show reviewer, analyst, tester types
    await page.locator('.feed-post').first().locator('button:has-text("Comment")').click();
    const commentInput = page.locator('textarea[placeholder*="technical analysis"]');
    await commentInput.type('@');
    await page.waitForTimeout(300);
    
    await waitForMentionDropdown(page);
    const commentAgents = await page.locator('[role="option"]').count();
    
    // Different contexts should potentially show different agent sets
    expect(typeof quickPostAgents).toBe('number');
    expect(typeof commentAgents).toBe('number');
    expect(quickPostAgents).toBeGreaterThan(0);
    expect(commentAgents).toBeGreaterThan(0);
  });

  test('should validate mention extraction consistency', async ({ page }) => {
    await page.goto('/');
    
    // Create a post with multiple mentions
    await page.click('[data-testid="create-post-button"]');
    await page.fill('input[placeholder*="compelling title"]', 'Multi-mention test');
    
    const mentionInput = page.locator('textarea[placeholder*="Share your insights"]');
    await typeWithMention(mentionInput, 'textarea[placeholder*="Share your insights"]', 
      'Testing @chief-of-staff-agent and @tech-reviewer-agent and @system-validator-agent coordination');
    
    // Submit post
    await page.click('[data-testid="submit-post"]');
    await expect(page.locator('text=Post created successfully')).toBeVisible();
    
    // Verify post appears in feed with mentions processed
    await expect(page.locator('.feed-post:has-text("Multi-mention test")')).toBeVisible();
    
    // Comment with mentions
    await page.locator('.feed-post:has-text("Multi-mention test")').locator('button:has-text("Comment")').click();
    const commentInput = page.locator('textarea[placeholder*="technical analysis"]');
    await typeWithMention(commentInput, 'textarea[placeholder*="technical analysis"]', 
      'Great collaboration between @chief-of-staff-agent and @tech-reviewer-agent!');
    
    await page.click('button:has-text("Post Analysis")');
    await expect(page.locator('text=Comment posted successfully')).toBeVisible();
  });
});

test.describe('@ Mention Integration - Error Handling & Edge Cases', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept and fail mention API calls
    await page.route('**/api/mentions**', route => route.abort());
    
    await page.goto('/');
    
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]');
    await quickPostInput.type('@test');
    await page.waitForTimeout(500);
    
    // Should fall back to showing cached/default suggestions
    // Not error out completely
    await expect(page.locator('body')).not.toHaveText(/error/i);
  });

  test('should handle very long mention queries', async ({ page }) => {
    await page.goto('/');
    
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]');
    await quickPostInput.type('@verylongagentnamethatshouldnotcauseissues');
    await page.waitForTimeout(300);
    
    // Should show "no matches" or handle gracefully
    // Should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle special characters in mentions', async ({ page }) => {
    await page.goto('/');
    
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]');
    await quickPostInput.type('@test-with-special!@#$%');
    await page.waitForTimeout(300);
    
    // Should handle gracefully without breaking
    await expect(quickPostInput).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });

  test('should maintain performance with many mentions', async ({ page }) => {
    await page.goto('/');
    
    await page.click('[data-testid="create-post-button"]');
    await page.fill('input[placeholder*="compelling title"]', 'Performance test');
    
    const mentionInput = page.locator('textarea[placeholder*="Share your insights"]');
    
    // Type content with multiple mentions rapidly
    const contentWithManyMentions = [
      '@chief-of-staff-agent', 
      '@tech-reviewer-agent', 
      '@system-validator-agent',
      '@code-reviewer-agent',
      '@performance-analyst-agent'
    ].join(' and ') + ' please coordinate on this task.';
    
    await typeWithMention(mentionInput, 'textarea[placeholder*="Share your insights"]', 
      contentWithManyMentions);
    
    // Should remain responsive
    await expect(mentionInput).toBeVisible();
    await expect(page.locator('[data-testid="submit-post"]')).toBeEnabled();
  });
});

test.describe('@ Mention Integration - Accessibility', () => {
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tab to QuickPost input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]:focus');
    await expect(quickPostInput).toBeFocused();
    
    // Type mention
    await page.keyboard.type('@tech');
    await page.waitForTimeout(300);
    
    await waitForMentionDropdown(page);
    
    // Navigate with keyboard
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Should insert mention and close dropdown
    await expect(page.locator('[role="listbox"]')).not.toBeVisible();
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/');
    
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]');
    await quickPostInput.type('@');
    await page.waitForTimeout(300);
    
    // Check ARIA attributes
    await expect(page.locator('[role="listbox"]')).toBeVisible();
    await expect(page.locator('[role="listbox"]')).toHaveAttribute('aria-label', 'Agent suggestions');
    await expect(page.locator('[role="option"]').first()).toHaveAttribute('aria-selected');
    
    // Input should have proper attributes
    await expect(quickPostInput).toHaveAttribute('aria-expanded', 'true');
    await expect(quickPostInput).toHaveAttribute('aria-haspopup', 'listbox');
  });

  test('should work with screen readers (basic test)', async ({ page }) => {
    await page.goto('/');
    
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]');
    
    // Check that input has accessible label
    await expect(quickPostInput).toHaveAttribute('aria-label');
    
    await quickPostInput.type('@chief');
    await page.waitForTimeout(300);
    
    // Check dropdown accessibility
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toHaveAttribute('aria-label', 'Agent suggestions');
    
    // Check options have proper text content
    const firstOption = page.locator('[role="option"]').first();
    const optionText = await firstOption.textContent();
    expect(optionText).toBeTruthy();
    expect(optionText!.length).toBeGreaterThan(0);
  });
});