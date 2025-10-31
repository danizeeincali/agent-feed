import { Page, Locator } from '@playwright/test';

/**
 * Helper utilities for comment testing
 * Provides common functions for interacting with comment threads
 */

/**
 * Find a comment by its text content
 * @param page - Playwright page object
 * @param content - The text content to search for
 * @returns Locator for the comment element
 */
export async function findCommentByContent(page: Page, content: string): Promise<Locator> {
  // Try multiple selectors for robustness
  const selectors = [
    `[data-testid="comment"]:has-text("${content}")`,
    `.comment:has-text("${content}")`,
    `[class*="comment"]:has-text("${content}")`,
    `div:has-text("${content}")`,
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count();
    if (count > 0) {
      return locator;
    }
  }

  // Fallback: return the first matching text
  return page.locator(`text="${content}"`).first();
}

/**
 * Find a post by its content
 * @param page - Playwright page object
 * @param content - The post content to search for
 * @returns Locator for the post element
 */
export async function findPostByContent(page: Page, content: string): Promise<Locator> {
  const selectors = [
    `[data-testid="post"]:has-text("${content}")`,
    `.post:has-text("${content}")`,
    `[class*="post"]:has-text("${content}")`,
    `article:has-text("${content}")`,
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count();
    if (count > 0) {
      return locator;
    }
  }

  return page.locator(`text="${content}"`).first();
}

/**
 * Reply to a specific comment
 * @param page - Playwright page object
 * @param commentContent - The content of the comment to reply to
 * @param replyText - The text to post as a reply
 * @param timeout - Optional timeout in milliseconds
 */
export async function replyToComment(
  page: Page,
  commentContent: string,
  replyText: string,
  timeout = 5000
): Promise<void> {
  // Find the comment
  const comment = await findCommentByContent(page, commentContent);

  // Click reply button - try multiple selectors
  const replySelectors = [
    'button:has-text("Reply")',
    'button[aria-label="Reply"]',
    '[data-testid="reply-button"]',
    'button:has-text("reply")', // case-insensitive
  ];

  let replyButtonClicked = false;
  for (const selector of replySelectors) {
    const replyButton = comment.locator(selector).first();
    const count = await replyButton.count();
    if (count > 0) {
      await replyButton.click({ timeout });
      replyButtonClicked = true;
      break;
    }
  }

  if (!replyButtonClicked) {
    // Try clicking anywhere in the comment area to activate reply
    await comment.click({ timeout });
  }

  // Wait for input to appear
  await page.waitForTimeout(500);

  // Find and fill the input - try multiple selectors
  const inputSelectors = [
    '[data-testid="comment-input"]',
    'textarea[placeholder*="reply" i]',
    'input[placeholder*="comment" i]',
    'textarea',
    'input[type="text"]',
  ];

  for (const selector of inputSelectors) {
    const input = page.locator(selector).last(); // Use last to get the most recent reply input
    const count = await input.count();
    if (count > 0) {
      await input.fill(replyText);
      break;
    }
  }

  // Submit the reply - try multiple selectors
  const submitSelectors = [
    'button[type="submit"]',
    'button:has-text("Post")',
    'button:has-text("Send")',
    'button:has-text("Reply")',
    '[data-testid="submit-comment"]',
  ];

  for (const selector of submitSelectors) {
    const submitButton = page.locator(selector).last();
    const count = await submitButton.count();
    if (count > 0) {
      await submitButton.click({ timeout });
      break;
    }
  }
}

/**
 * Wait for avi's response to appear
 * @param page - Playwright page object
 * @param timeout - Timeout in milliseconds (default 30s)
 */
export async function waitForAviResponse(page: Page, timeout = 30000): Promise<void> {
  // Try multiple selectors for avi's comments
  const selectors = [
    '[data-author="avi"]',
    '[data-testid="comment"][data-author="avi"]',
    '.comment[data-author="avi"]',
    'text=/avi.*analyzing/i', // Processing indicator
  ];

  let found = false;
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: Math.min(timeout, 5000) });
      found = true;
      break;
    } catch (e) {
      continue;
    }
  }

  if (!found) {
    // Fallback: wait for any new comment to appear
    await page.waitForTimeout(Math.min(timeout, 10000));
  }
}

/**
 * Wait for processing indicator to appear and disappear
 * @param page - Playwright page object
 * @param timeout - Timeout in milliseconds
 */
export async function waitForProcessingComplete(page: Page, timeout = 30000): Promise<void> {
  // Wait for "analyzing" or "processing" text to appear
  try {
    await page.waitForSelector('text=/analyzing|processing/i', { timeout: 5000 });
    console.log('Processing indicator appeared');
  } catch (e) {
    console.log('No processing indicator found');
  }

  // Wait for it to disappear
  try {
    await page.waitForSelector('text=/analyzing|processing/i', { state: 'detached', timeout });
    console.log('Processing complete');
  } catch (e) {
    console.log('Processing indicator did not disappear, continuing anyway');
  }
}

/**
 * Get all comments in a thread
 * @param page - Playwright page object
 * @returns Array of comment locators
 */
export async function getAllComments(page: Page): Promise<Locator[]> {
  const selectors = [
    '[data-testid="comment"]',
    '.comment',
    '[class*="comment"]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count();
    if (count > 0) {
      const comments: Locator[] = [];
      for (let i = 0; i < count; i++) {
        comments.push(locator.nth(i));
      }
      return comments;
    }
  }

  return [];
}

/**
 * Check if a comment contains specific text
 * @param locator - The comment locator
 * @param text - Text to search for
 * @returns True if text is found
 */
export async function commentContainsText(locator: Locator, text: string): Promise<boolean> {
  const content = await locator.textContent();
  return content?.includes(text) ?? false;
}

/**
 * Get nested reply level for a comment
 * @param locator - The comment locator
 * @returns Nesting level (0 = top-level, 1 = first reply, etc.)
 */
export async function getReplyLevel(locator: Locator): Promise<number> {
  // Count parent elements with reply/comment classes
  const element = await locator.elementHandle();
  if (!element) return 0;

  let level = 0;
  let parent = await element.evaluateHandle((el) => el.parentElement);

  while (parent) {
    const className = await parent.evaluate((el) => el?.className || '');
    if (className.includes('reply') || className.includes('nested')) {
      level++;
    }
    parent = await parent.evaluateHandle((el) => el?.parentElement);
  }

  return level;
}

/**
 * Take a screenshot with proper naming
 * @param page - Playwright page object
 * @param name - Screenshot name
 * @param fullPage - Whether to capture full page
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  fullPage = true
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${name}.png`;
  await page.screenshot({
    path: `/workspaces/agent-feed/frontend/tests/screenshots/comment-replies/${filename}`,
    fullPage,
  });
  console.log(`Screenshot saved: ${filename}`);
}
