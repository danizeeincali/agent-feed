import { test, expect } from '@playwright/test';

test.describe('Draft Manager', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the drafts page
    await page.goto('http://localhost:5174/drafts');
  });

  test('should display draft manager with empty state', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if draft manager loads
    await expect(page.locator('h1')).toContainText('Draft Manager');
    
    // Should show empty state initially (no drafts in localStorage)
    await expect(page.locator('text=No drafts yet')).toBeVisible();
    
    // Should have "Create First Draft" button
    await expect(page.getByText('Create First Draft')).toBeVisible();
  });

  test('should create a new draft', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click "New Draft" button
    await page.click('text=New Draft');

    // Should show the post creator form
    await expect(page.locator('h2')).toContainText('Create New Draft');

    // Fill out the form
    await page.fill('input[placeholder*="title"]', 'Test Draft Title');
    await page.fill('input[placeholder*="hook"]', 'This is a test hook');
    await page.fill('textarea[placeholder*="Share your insights"]', 'This is test content for the draft.');

    // Add tags
    await page.fill('input[placeholder*="Add tags"]', 'test,draft');
    await page.press('input[placeholder*="Add tags"]', 'Enter');

    // Save the draft
    await page.click('text=Save Draft');

    // Wait a moment for auto-save
    await page.waitForTimeout(1000);

    // Should show draft saved indicator
    await expect(page.locator('text=Draft saved')).toBeVisible();
  });

  test('should navigate between PostCreator and Draft Manager', async ({ page }) => {
    // Start at the feed page
    await page.goto('http://localhost:5174/');
    await page.waitForLoadState('networkidle');

    // Should have "View Drafts" button in PostCreator
    const viewDraftsButton = page.locator('text=View Drafts');
    await expect(viewDraftsButton).toBeVisible();

    // Click "View Drafts" to navigate to draft manager
    await viewDraftsButton.click();

    // Should be on drafts page
    await expect(page).toHaveURL(/.*\/drafts/);
    await expect(page.locator('h1')).toContainText('Draft Manager');
  });

  test('should handle localStorage persistence', async ({ page, context }) => {
    await page.waitForLoadState('networkidle');

    // Add some test data to localStorage
    await page.evaluate(() => {
      const testDrafts = [
        {
          id: 'test-draft-1',
          userId: 'current-user',
          title: 'Test Draft 1',
          hook: 'Test hook',
          content: 'Test content for persistence',
          tags: ['test', 'persistence'],
          agentMentions: [],
          templateId: null,
          metadata: {
            wordCount: 4,
            readingTime: 1,
            businessImpact: 5
          },
          status: 'draft',
          version: 1,
          parentVersionId: null,
          collaborators: [],
          isShared: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastModifiedBy: 'current-user',
          scheduledFor: null,
          publishedPostId: null
        }
      ];
      localStorage.setItem('agent-feed-drafts', JSON.stringify(testDrafts));
    });

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should now show the draft
    await expect(page.locator('text=Test Draft 1')).toBeVisible();
    await expect(page.locator('text=Test content for persistence')).toBeVisible();

    // Should show stats
    await expect(page.locator('text=1', { exact: false })).toBeVisible(); // Total drafts count
  });

  test('should filter and sort drafts', async ({ page }) => {
    // Add test data with multiple drafts
    await page.evaluate(() => {
      const testDrafts = [
        {
          id: 'draft-1',
          userId: 'current-user',
          title: 'Alpha Draft',
          hook: 'First hook',
          content: 'Alpha content',
          tags: ['alpha', 'test'],
          agentMentions: [],
          templateId: null,
          metadata: { wordCount: 2, readingTime: 1 },
          status: 'draft',
          version: 1,
          collaborators: [],
          isShared: false,
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-01').toISOString(),
          lastModifiedBy: 'current-user'
        },
        {
          id: 'draft-2',
          userId: 'current-user',
          title: 'Beta Draft',
          hook: 'Second hook',
          content: 'Beta content published',
          tags: ['beta', 'published'],
          agentMentions: [],
          templateId: null,
          metadata: { wordCount: 3, readingTime: 1 },
          status: 'published',
          version: 1,
          collaborators: [],
          isShared: false,
          createdAt: new Date('2024-01-02').toISOString(),
          updatedAt: new Date('2024-01-02').toISOString(),
          lastModifiedBy: 'current-user'
        }
      ];
      localStorage.setItem('agent-feed-drafts', JSON.stringify(testDrafts));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show both drafts initially
    await expect(page.locator('text=Alpha Draft')).toBeVisible();
    await expect(page.locator('text=Beta Draft')).toBeVisible();

    // Test search functionality
    await page.fill('input[placeholder*="Search drafts"]', 'Alpha');
    await page.waitForTimeout(500);
    
    // Should only show Alpha draft
    await expect(page.locator('text=Alpha Draft')).toBeVisible();
    await expect(page.locator('text=Beta Draft')).not.toBeVisible();

    // Clear search
    await page.fill('input[placeholder*="Search drafts"]', '');
    await page.waitForTimeout(500);

    // Should show both again
    await expect(page.locator('text=Alpha Draft')).toBeVisible();
    await expect(page.locator('text=Beta Draft')).toBeVisible();

    // Test sorting
    await page.selectOption('select', 'title-asc');
    
    // Check order (Alpha should come before Beta)
    const draftTitles = await page.locator('.grid > div h3').allTextContents();
    expect(draftTitles[0]).toBe('Alpha Draft');
    expect(draftTitles[1]).toBe('Beta Draft');
  });

  test('should delete drafts', async ({ page }) => {
    // Add a test draft
    await page.evaluate(() => {
      const testDrafts = [{
        id: 'draft-to-delete',
        userId: 'current-user',
        title: 'Draft to Delete',
        hook: 'Will be deleted',
        content: 'This draft will be deleted in test',
        tags: ['delete', 'test'],
        agentMentions: [],
        templateId: null,
        metadata: { wordCount: 7, readingTime: 1 },
        status: 'draft',
        version: 1,
        collaborators: [],
        isShared: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastModifiedBy: 'current-user'
      }];
      localStorage.setItem('agent-feed-drafts', JSON.stringify(testDrafts));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show the draft
    await expect(page.locator('text=Draft to Delete')).toBeVisible();

    // Click delete button (trash icon)
    await page.click('[title="Delete draft"]');

    // Handle confirmation dialog
    await page.on('dialog', dialog => dialog.accept());
    
    await page.waitForTimeout(500);

    // Should show empty state
    await expect(page.locator('text=No drafts yet')).toBeVisible();
    await expect(page.locator('text=Draft to Delete')).not.toBeVisible();
  });
});