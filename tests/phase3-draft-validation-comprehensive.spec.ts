import { test, expect, Page, BrowserContext } from '@playwright/test';

interface Draft {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Phase 3 - Comprehensive Draft Replication Validation
 * 
 * Critical Test Cases:
 * 1. Draft Creation - single draft verification
 * 2. Draft Edit - no duplication verification  
 * 3. Edge Cases - multiple edits, auto-save, modal operations
 * 4. API Call Monitoring - proper endpoint usage
 * 5. State Management - localStorage consistency
 */

test.describe('Phase 3 - Draft Replication Fix Validation', () => {
  let page: Page;
  let context: BrowserContext;
  
  // Track API calls for validation
  const apiCalls: Array<{method: string, url: string, body?: any, timestamp: number}> = [];
  
  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Clear localStorage before each test
    await page.goto('http://127.0.0.1:5173');
    await page.evaluate(() => localStorage.clear());
    
    // Monitor API calls
    page.on('request', request => {
      if (request.url().includes('/api/')) {
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
    await page.waitForTimeout(1000); // Allow initial render
  });

  test.afterEach(async () => {
    await context.close();
    // Clear API call tracking
    apiCalls.length = 0;
  });

  test('Draft Creation Test - Single Draft Verification', async () => {
    console.log('🧪 Testing Draft Creation - Single Draft Verification');
    
    // Get initial draft count
    const initialDrafts = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored) : [];
    });
    const initialCount = initialDrafts.length;
    console.log(`Initial draft count: ${initialCount}`);
    
    // Clear API call tracking for this test
    apiCalls.length = 0;
    
    // Click "New Draft" button
    await page.click('button:has-text("New Draft")');
    await page.waitForTimeout(500);
    
    // Fill in draft details
    const testTitle = `Test Draft - ${Date.now()}`;
    const testContent = `This is test content for draft validation created at ${new Date().toISOString()}`;
    const testTags = ['test', 'validation', 'draft-fix'];
    
    await page.fill('[data-testid="draft-title"]', testTitle);
    await page.fill('[data-testid="draft-content"]', testContent);
    
    // Add tags
    for (const tag of testTags) {
      await page.fill('[data-testid="draft-tags"]', tag);
      await page.press('[data-testid="draft-tags"]', 'Enter');
      await page.waitForTimeout(200);
    }
    
    // Save draft
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(1000);
    
    // Verify only ONE draft was created
    const finalDrafts = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(finalDrafts.length).toBe(initialCount + 1);
    console.log(`✅ Draft count increased by exactly 1: ${initialCount} -> ${finalDrafts.length}`);
    
    // Verify draft content
    const newDraft = finalDrafts.find((d: Draft) => d.title === testTitle);
    expect(newDraft).toBeTruthy();
    expect(newDraft.content).toBe(testContent);
    expect(newDraft.tags).toEqual(testTags);
    
    // Verify API calls - should be creation, not update
    const createCalls = apiCalls.filter(call => 
      call.method === 'POST' && call.url.includes('/drafts') && !call.url.includes('/drafts/')
    );
    const updateCalls = apiCalls.filter(call => 
      call.method === 'PUT' || (call.method === 'POST' && call.url.includes('/drafts/'))
    );
    
    console.log(`API Calls - Create: ${createCalls.length}, Update: ${updateCalls.length}`);
    expect(createCalls.length).toBeGreaterThanOrEqual(1);
    expect(updateCalls.length).toBe(0);
    
    console.log('✅ Draft Creation Test - PASSED');
  });

  test('Draft Edit Test - No Duplication Verification (CRITICAL)', async () => {
    console.log('🧪 Testing Draft Edit - No Duplication Verification (CRITICAL)');
    
    // First, create a draft to edit
    await page.click('button:has-text("New Draft")');
    await page.waitForTimeout(500);
    
    const originalTitle = `Original Draft - ${Date.now()}`;
    const originalContent = 'Original content for editing test';
    const originalTags = ['original', 'edit-test'];
    
    await page.fill('[data-testid="draft-title"]', originalTitle);
    await page.fill('[data-testid="draft-content"]', originalContent);
    
    for (const tag of originalTags) {
      await page.fill('[data-testid="draft-tags"]', tag);
      await page.press('[data-testid="draft-tags"]', 'Enter');
      await page.waitForTimeout(200);
    }
    
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(1000);
    
    // Get draft count after creation
    const draftsAfterCreate = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored) : [];
    });
    const countAfterCreate = draftsAfterCreate.length;
    console.log(`Drafts after creation: ${countAfterCreate}`);
    
    // Clear API calls to focus on edit operations
    apiCalls.length = 0;
    
    // Find and click "Edit" button for the created draft
    const editButtons = await page.$$('button:has-text("Edit")');
    expect(editButtons.length).toBeGreaterThan(0);
    
    // Click the first edit button (most recent draft)
    await editButtons[editButtons.length - 1].click();
    await page.waitForTimeout(500);
    
    // Modify the draft
    const editedTitle = `${originalTitle} - EDITED`;
    const editedContent = `${originalContent} - This content has been edited`;
    const additionalTag = 'edited';
    
    await page.fill('[data-testid="draft-title"]', editedTitle);
    await page.fill('[data-testid="draft-content"]', editedContent);
    await page.fill('[data-testid="draft-tags"]', additionalTag);
    await page.press('[data-testid="draft-tags"]', 'Enter');
    
    // Save changes
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(1000);
    
    // CRITICAL VALIDATION: Verify NO duplicate draft was created
    const draftsAfterEdit = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(draftsAfterEdit.length).toBe(countAfterCreate);
    console.log(`✅ CRITICAL: Draft count remained same after edit: ${draftsAfterEdit.length}`);
    
    // Verify original draft was updated with changes
    const editedDraft = draftsAfterEdit.find((d: Draft) => d.title === editedTitle);
    expect(editedDraft).toBeTruthy();
    expect(editedDraft.content).toBe(editedContent);
    expect(editedDraft.tags).toContain(additionalTag);
    
    // Verify no draft with original title exists (it should be updated)
    const originalDraft = draftsAfterEdit.find((d: Draft) => d.title === originalTitle);
    expect(originalDraft).toBeFalsy();
    
    // Verify API calls - should be UPDATE, not CREATE
    const updateCalls = apiCalls.filter(call => 
      call.method === 'PUT' || (call.method === 'POST' && call.url.includes('/drafts/'))
    );
    const createCalls = apiCalls.filter(call => 
      call.method === 'POST' && call.url.includes('/drafts') && !call.url.includes('/drafts/')
    );
    
    console.log(`API Calls - Update: ${updateCalls.length}, Create: ${createCalls.length}`);
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    expect(createCalls.length).toBe(0);
    
    console.log('✅ Draft Edit Test - PASSED (No duplication detected)');
  });

  test('Edge Cases - Multiple Edits and Operations', async () => {
    console.log('🧪 Testing Edge Cases - Multiple Edits and Operations');
    
    // Create initial draft
    await page.click('button:has-text("New Draft")');
    await page.waitForTimeout(500);
    
    await page.fill('[data-testid="draft-title"]', 'Edge Case Test Draft');
    await page.fill('[data-testid="draft-content"]', 'Initial content');
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(1000);
    
    const initialCount = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored).length : 0;
    });
    
    // Perform multiple edits in sequence
    for (let i = 1; i <= 3; i++) {
      console.log(`Performing edit #${i}`);
      
      // Find and click edit button
      const editButtons = await page.$$('button:has-text("Edit")');
      await editButtons[editButtons.length - 1].click();
      await page.waitForTimeout(500);
      
      // Make changes
      await page.fill('[data-testid="draft-content"]', `Content after edit ${i}`);
      await page.click('button:has-text("Save Draft")');
      await page.waitForTimeout(1000);
      
      // Verify count remains the same
      const currentCount = await page.evaluate(() => {
        const stored = localStorage.getItem('drafts');
        return stored ? JSON.parse(stored).length : 0;
      });
      
      expect(currentCount).toBe(initialCount);
      console.log(`✅ After edit ${i}: Count remains ${currentCount}`);
    }
    
    // Test modal close and reopen
    const editButtons = await page.$$('button:has-text("Edit")');
    await editButtons[editButtons.length - 1].click();
    await page.waitForTimeout(500);
    
    // Close modal without saving
    await page.press('body', 'Escape');
    await page.waitForTimeout(500);
    
    // Reopen and edit
    const editButtonsAgain = await page.$$('button:has-text("Edit")');
    await editButtonsAgain[editButtonsAgain.length - 1].click();
    await page.waitForTimeout(500);
    
    await page.fill('[data-testid="draft-content"]', 'Final edge case content');
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(1000);
    
    // Final count verification
    const finalCount = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored).length : 0;
    });
    
    expect(finalCount).toBe(initialCount);
    console.log('✅ Edge Cases Test - PASSED');
  });

  test('API Call Monitoring and State Management', async () => {
    console.log('🧪 Testing API Call Monitoring and State Management');
    
    apiCalls.length = 0; // Clear previous calls
    
    // Test create operation
    await page.click('button:has-text("New Draft")');
    await page.waitForTimeout(500);
    
    await page.fill('[data-testid="draft-title"]', 'API Monitoring Test');
    await page.fill('[data-testid="draft-content"]', 'Content for API test');
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(1000);
    
    // Get the created draft ID from localStorage
    const drafts = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored) : [];
    });
    const testDraft = drafts.find((d: Draft) => d.title === 'API Monitoring Test');
    expect(testDraft).toBeTruthy();
    
    const createApiCalls = apiCalls.slice(); // Save create calls
    apiCalls.length = 0; // Clear for edit test
    
    // Test edit operation
    const editButtons = await page.$$('button:has-text("Edit")');
    await editButtons[editButtons.length - 1].click();
    await page.waitForTimeout(500);
    
    await page.fill('[data-testid="draft-content"]', 'Updated content for API test');
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(1000);
    
    const editApiCalls = apiCalls.slice(); // Save edit calls
    
    // Validate API call patterns
    console.log('Create API calls:', createApiCalls.map(c => `${c.method} ${c.url}`));
    console.log('Edit API calls:', editApiCalls.map(c => `${c.method} ${c.url}`));
    
    // Verify create calls don't contain draft ID in URL
    const createCall = createApiCalls.find(call => 
      call.method === 'POST' && call.url.includes('/drafts')
    );
    if (createCall) {
      expect(createCall.url).not.toMatch(/\/drafts\/[a-zA-Z0-9-]+$/);
    }
    
    // Verify edit calls contain draft ID in URL or use PUT method
    const editCall = editApiCalls.find(call => 
      (call.method === 'PUT' || call.url.includes(`/drafts/${testDraft.id}`))
    );
    expect(editCall).toBeTruthy();
    
    // Verify localStorage consistency
    const finalDrafts = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored) : [];
    });
    
    const updatedDraft = finalDrafts.find((d: Draft) => d.id === testDraft.id);
    expect(updatedDraft).toBeTruthy();
    expect(updatedDraft.content).toBe('Updated content for API test');
    expect(updatedDraft.updatedAt).not.toBe(testDraft.createdAt);
    
    console.log('✅ API Call Monitoring and State Management - PASSED');
  });

  test('Comprehensive Integration Test', async () => {
    console.log('🧪 Running Comprehensive Integration Test');
    
    // This test combines all scenarios in a realistic workflow
    
    // Step 1: Create multiple drafts
    const draftData = [
      { title: 'Draft 1', content: 'Content 1', tags: ['tag1'] },
      { title: 'Draft 2', content: 'Content 2', tags: ['tag2'] },
      { title: 'Draft 3', content: 'Content 3', tags: ['tag3'] }
    ];
    
    for (const data of draftData) {
      await page.click('button:has-text("New Draft")');
      await page.waitForTimeout(500);
      
      await page.fill('[data-testid="draft-title"]', data.title);
      await page.fill('[data-testid="draft-content"]', data.content);
      
      for (const tag of data.tags) {
        await page.fill('[data-testid="draft-tags"]', tag);
        await page.press('[data-testid="draft-tags"]', 'Enter');
        await page.waitForTimeout(200);
      }
      
      await page.click('button:has-text("Save Draft")');
      await page.waitForTimeout(1000);
    }
    
    // Verify all drafts were created
    let currentDrafts = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(currentDrafts.length).toBeGreaterThanOrEqual(3);
    const baselineCount = currentDrafts.length;
    
    // Step 2: Edit each draft
    for (let i = 0; i < 3; i++) {
      const editButtons = await page.$$('button:has-text("Edit")');
      await editButtons[i].click();
      await page.waitForTimeout(500);
      
      await page.fill('[data-testid="draft-content"]', `Edited content ${i + 1}`);
      await page.click('button:has-text("Save Draft")');
      await page.waitForTimeout(1000);
      
      // Verify count hasn't changed
      currentDrafts = await page.evaluate(() => {
        const stored = localStorage.getItem('drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      expect(currentDrafts.length).toBe(baselineCount);
    }
    
    // Step 3: Perform rapid operations (stress test)
    const editButtons = await page.$$('button:has-text("Edit")');
    if (editButtons.length > 0) {
      // Rapid edit operations
      await editButtons[0].click();
      await page.waitForTimeout(200);
      await page.fill('[data-testid="draft-content"]', 'Rapid edit 1');
      await page.click('button:has-text("Save Draft")');
      await page.waitForTimeout(300);
      
      const editButtonsAgain = await page.$$('button:has-text("Edit")');
      await editButtonsAgain[0].click();
      await page.waitForTimeout(200);
      await page.fill('[data-testid="draft-content"]', 'Rapid edit 2');
      await page.click('button:has-text("Save Draft")');
      await page.waitForTimeout(300);
    }
    
    // Final verification
    const finalDrafts = await page.evaluate(() => {
      const stored = localStorage.getItem('drafts');
      return stored ? JSON.parse(stored) : [];
    });
    
    expect(finalDrafts.length).toBe(baselineCount);
    
    // Verify all drafts have unique IDs
    const ids = finalDrafts.map((d: Draft) => d.id);
    const uniqueIds = [...new Set(ids)];
    expect(uniqueIds.length).toBe(ids.length);
    
    console.log('✅ Comprehensive Integration Test - PASSED');
    console.log(`Final draft count: ${finalDrafts.length}`);
    console.log('All draft IDs are unique:', uniqueIds.length === ids.length);
  });
});