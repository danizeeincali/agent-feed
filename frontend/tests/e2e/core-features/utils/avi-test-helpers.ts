/**
 * Helper utilities for Avi identity testing
 */

import { Page, expect } from '@playwright/test';

export const AVI_CONFIG = {
  displayName: 'Λvi (Amplifying Virtual Intelligence)',
  shortName: 'Λvi',
  systemId: 'system-avi',
  backendUrl: 'http://localhost:3001',
  frontendUrl: 'http://localhost:5173',
};

export interface AviPost {
  id: string;
  content: string;
  userId: string;
  username: string;
  isSystemPost: boolean;
  createdAt: string;
}

export async function createAviPostViaAPI(content: string): Promise<AviPost> {
  const response = await fetch(`${AVI_CONFIG.backendUrl}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      userId: AVI_CONFIG.systemId,
      username: AVI_CONFIG.displayName,
      isSystemPost: true,
      metadata: {
        systemAgent: 'avi',
        displayName: AVI_CONFIG.displayName,
        agentType: 'system',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Avi post: ${response.status} - ${error}`);
  }

  return await response.json();
}

export async function deletePostViaAPI(postId: string): Promise<void> {
  const response = await fetch(`${AVI_CONFIG.backendUrl}/api/posts/${postId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    console.warn(`Failed to delete post ${postId}: ${response.status}`);
  }
}

export async function waitForAviPost(
  page: Page,
  content: string,
  timeout = 15000
): Promise<void> {
  await page.waitForSelector(
    `article:has-text("${content}")`,
    { timeout, state: 'visible' }
  );
}

export async function verifyLambdaSymbol(
  page: Page,
  context: string
): Promise<void> {
  const lambdaElements = page.locator('text=Λvi');
  const count = await lambdaElements.count();

  expect(count, `Lambda symbol (Λvi) should be present in ${context}`).toBeGreaterThan(0);

  const firstElement = lambdaElements.first();
  await expect(firstElement, `Lambda symbol should be visible in ${context}`).toBeVisible();
}

export async function verifyAviDisplayName(
  page: Page,
  context: string
): Promise<void> {
  const fullName = page.locator(`text="${AVI_CONFIG.displayName}"`);
  const shortName = page.locator(`text="${AVI_CONFIG.shortName}"`);

  const fullNameCount = await fullName.count();
  const shortNameCount = await shortName.count();

  expect(
    fullNameCount + shortNameCount,
    `Avi display name should be present in ${context}`
  ).toBeGreaterThan(0);
}

export async function getAviPostCard(
  page: Page,
  content: string
) {
  return page.locator(`article:has-text("${content}")`).first();
}

export async function captureAviElement(
  page: Page,
  selector: string,
  filename: string,
  screenshotDir: string
): Promise<void> {
  const element = page.locator(selector).first();

  if (await element.count() > 0) {
    await element.screenshot({
      path: `${screenshotDir}/${filename}`,
    });
  }
}

export async function verifyNoTextOverflow(
  page: Page,
  selector: string
): Promise<boolean> {
  const element = page.locator(selector).first();

  if (await element.count() === 0) {
    return true;
  }

  const isOverflowing = await element.evaluate((el) => {
    return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
  });

  return !isOverflowing;
}

export async function getElementStyles(
  page: Page,
  selector: string
): Promise<Record<string, string>> {
  const element = page.locator(selector).first();

  return await element.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      color: computed.color,
      backgroundColor: computed.backgroundColor,
    };
  });
}

export async function verifyResponsiveDesign(
  page: Page,
  content: string,
  viewport: { width: number; height: number }
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.waitForLoadState('networkidle');

  const postCard = await getAviPostCard(page, content);
  await expect(postCard).toBeVisible();

  const box = await postCard.boundingBox();
  expect(box, 'Post card should have valid dimensions').not.toBeNull();
  expect(box!.width, 'Post width should be positive').toBeGreaterThan(0);
  expect(box!.height, 'Post height should be positive').toBeGreaterThan(0);

  // Verify no horizontal overflow
  const viewportWidth = viewport.width;
  expect(box!.width, 'Post should not overflow viewport').toBeLessThanOrEqual(viewportWidth);
}

export function generateTestContent(prefix = 'Avi Identity Test'): string {
  return `${prefix} - ${Date.now()} - ${Math.random().toString(36).substring(7)}`;
}

export async function cleanupTestPosts(postIds: string[]): Promise<void> {
  console.log(`Cleaning up ${postIds.length} test posts...`);

  const deletePromises = postIds.map((id) => deletePostViaAPI(id));
  await Promise.allSettled(deletePromises);

  console.log('Test posts cleanup complete');
}

export async function verifyAvatarPresence(
  page: Page,
  postContent: string
): Promise<boolean> {
  const postCard = await getAviPostCard(page, postContent);

  // Check for avatar elements
  const avatarSelectors = [
    'img[alt*="Avi"]',
    'img[alt*="Λvi"]',
    '[data-testid="user-avatar"]',
    '[class*="avatar"]',
    'img[src*="avatar"]',
  ];

  for (const selector of avatarSelectors) {
    const count = await postCard.locator(selector).count();
    if (count > 0) {
      return true;
    }
  }

  // Check for any image or SVG in the post (avatar might not have specific attributes)
  const imageCount = await postCard.locator('img, svg').count();
  return imageCount > 0;
}

export async function verifyAccessibility(
  page: Page,
  content: string
): Promise<void> {
  const postCard = await getAviPostCard(page, content);

  // Check for accessible name
  const accessibleName = await postCard.locator('text=Λvi').first().evaluate((el) => {
    return el.getAttribute('aria-label') || el.textContent || '';
  });

  expect(
    accessibleName.length,
    'Avi element should have accessible content'
  ).toBeGreaterThan(0);
}
