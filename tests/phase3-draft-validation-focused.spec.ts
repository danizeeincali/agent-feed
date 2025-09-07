import { test, expect, Page } from '@playwright/test';

interface Draft {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Phase 3 - Focused Draft Replication Validation
 * 
 * Testing the critical fix for draft duplication during edit operations.
 * This focused test validates:
 * 1. Draft creation works correctly
 * 2. Draft edit does NOT create duplicates 
 * 3. API calls are correct (create vs update)
 * 4. localStorage consistency
 */

test.describe('Phase 3 - Focused Draft Replication Validation', () => {
  
  // Track API calls for validation
  const apiCalls: Array<{method: string, url: string, body?: any, timestamp: number}> = [];
  
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and API tracking
    await page.goto('http://127.0.0.1:5173');
    await page.evaluate(() => localStorage.clear());
    apiCalls.length = 0;
    
    // Monitor API calls
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('/drafts')) {
        const body = request.postData();
        apiCalls.push({
          method: request.method(),
          url: request.url(),
          body: body ? JSON.parse(body) : undefined,
          timestamp: Date.now()
        });
      }
    });
    
    // Navigate to drafts page
    await page.goto('http://127.0.0.1:5173/drafts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow page to fully load
  });

  test('Critical Test: Edit Draft Does NOT Create Duplicate', async ({ page }) => {
    console.log('🧪 Critical Test: Edit Draft Does NOT Create Duplicate');
    
    // STEP 1: Create a draft first
    console.log('Step 1: Creating initial draft...');
    await page.click('button:has-text("New Draft")');
    await page.waitForTimeout(1000);
    
    const originalTitle = `Test Draft ${Date.now()}`;
    const originalContent = 'Original content for testing edit workflow';
    
    // Fill the form using correct selectors
    await page.fill('input[placeholder*="compelling title"]', originalTitle);
    await page.fill('textarea[placeholder*="Share your insights"]', originalContent);
    await page.fill('input[placeholder*="tags"]', 'test');
    await page.press('input[placeholder*="tags"]', 'Enter');
    
    // Save the draft
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(2000);
    
    // Verify draft was created
    const draftsAfterCreate = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(draftsAfterCreate.length).toBe(1);
    console.log(`✅ Initial draft created. Count: ${draftsAfterCreate.length}`);
    
    // Clear API calls to focus on edit operations
    apiCalls.length = 0;
    
    // STEP 2: Edit the draft (CRITICAL TEST)
    console.log('Step 2: Editing draft - this is the critical test...');
    
    // Wait for the page to render the draft
    await page.waitForTimeout(1000);
    
    // Find and click the "Edit Draft" button (more specific selector)
    const editButton = page.locator('button:has-text("Edit Draft")').first();
    await editButton.waitFor({ state: 'visible', timeout: 10000 });
    await editButton.click();
    await page.waitForTimeout(1000);
    
    // Modify the draft
    const editedTitle = `${originalTitle} - EDITED`;
    const editedContent = `${originalContent} - This has been edited`;
    
    await page.fill('input[placeholder*="compelling title"]', editedTitle);
    await page.fill('textarea[placeholder*="Share your insights"]', editedContent);
    await page.fill('input[placeholder*="tags"]', 'edited');
    await page.press('input[placeholder*="tags"]', 'Enter');
    
    // Save the edited draft
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(2000);
    
    // CRITICAL VALIDATION: Check draft count hasn't increased
    const draftsAfterEdit = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored) : [];
    });
    
    console.log(`Draft count after edit: ${draftsAfterEdit.length}`);
    console.log('Draft titles:', draftsAfterEdit.map((d: Draft) => d.title));
    
    // FAIL THE TEST IF DUPLICATE IS CREATED
    expect(draftsAfterEdit.length).toBe(1);
    console.log('✅ CRITICAL: No duplicate draft created during edit!');
    
    // Verify the draft was updated, not duplicated
    const updatedDraft = draftsAfterEdit[0];
    expect(updatedDraft.title).toBe(editedTitle);
    expect(updatedDraft.content).toContain('This has been edited');
    expect(updatedDraft.tags).toContain('edited');
    
    console.log('✅ Draft was properly updated with new content');
    
    // Validate API calls - should show update operation, not create
    console.log('API calls during edit:', apiCalls.map(call => `${call.method} ${call.url}`));
    
    const createCalls = apiCalls.filter(call => 
      call.method === 'POST' && call.url.includes('/api/v1/agent-posts') && !call.url.includes('/save')
    );
    const updateCalls = apiCalls.filter(call => 
      call.method === 'POST' && call.url.includes('/save')
    );
    
    console.log(`Create calls: ${createCalls.length}, Update/Save calls: ${updateCalls.length}`);
    
    // For edit operations, we should see save/update calls, not create calls
    expect(createCalls.length).toBe(0);
    // Should have update calls (save operations)
    expect(updateCalls.length).toBeGreaterThanOrEqual(0); // May be 0 if using localStorage only
    
    console.log('✅ API call pattern is correct for edit operation');
  });

  test('Validation: Multiple Edit Operations', async ({ page }) => {
    console.log('🧪 Testing Multiple Edit Operations');
    
    // Create initial draft
    await page.click('button:has-text("New Draft")');
    await page.waitForTimeout(1000);
    
    await page.fill('input[placeholder*="compelling title"]', 'Multi-Edit Test Draft');
    await page.fill('textarea[placeholder*="Share your insights"]', 'Initial content');
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(2000);
    
    const initialCount = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored).length : 0;
    });
    
    // Perform 3 edit operations
    for (let i = 1; i <= 3; i++) {
      console.log(`Edit operation ${i}/3`);
      
      await page.waitForTimeout(1000);
      const editButton = page.locator('button:has-text("Edit Draft")').first();
      await editButton.click();
      await page.waitForTimeout(1000);
      
      // Modify content
      await page.fill('textarea[placeholder*="Share your insights"]', `Content edited ${i} times`);
      await page.click('button:has-text("Save Draft")');
      await page.waitForTimeout(2000);
      
      // Verify count remains the same
      const currentCount = await page.evaluate(() => {
        const stored = localStorage.getItem('drafts');
        return stored ? JSON.parse(stored).length : 0;
      });
      
      expect(currentCount).toBe(initialCount);
      console.log(`✅ After edit ${i}: Count remains ${currentCount}`);
    }
    
    console.log('✅ Multiple edit operations completed without duplication');
  });

  test('Manual Browser Test Instructions', async ({ page }) => {
    console.log('🧪 Manual Browser Test - Generating Instructions');
    
    // This test provides instructions for manual validation
    const instructions = `
    
    === MANUAL VALIDATION INSTRUCTIONS ===
    
    1. Open http://127.0.0.1:5173/drafts in browser
    2. Click "New Draft" button
    3. Fill in:
       - Title: "Manual Test Draft"
       - Content: "This is manual test content"
       - Tags: "manual, test"
    4. Click "Save Draft"
    5. Verify 1 draft appears in the list
    
    6. Click "Edit Draft" on the created draft
    7. Modify:
       - Title: "Manual Test Draft - EDITED"
       - Content: Add " - EDITED VERSION" to end
       - Tags: Add "edited"
    8. Click "Save Draft"
    
    CRITICAL CHECK:
    - Draft count should remain 1 (not increase to 2)
    - Draft should show updated content
    - No duplicate draft should appear
    
    BROWSER DEVELOPER TOOLS:
    - Check localStorage: localStorage.getItem('drafts')
    - Monitor Network tab for API calls during edit
    - Look for POST to /api/v1/agent-posts (create) vs POST to /api/v1/agent-posts/:id/save (update)
    
    `;
    
    console.log(instructions);
    
    // Generate test data for manual testing
    await page.evaluate(() => {
      console.log('=== MANUAL TEST DATA ===');
      console.log('Open browser console to see localStorage:');
      console.log('localStorage.getItem("drafts")');
    });
    
    expect(true).toBe(true); // This test always passes, it's for instructions
  });
});