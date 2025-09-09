import { test, expect, Page } from '@playwright/test';

test.describe('EMERGENCY: Live Mention System Validation (FIXED)', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.waitForLoadState('networkidle');
  });

  test('CRITICAL: Test @ mention system on /mention-demo page', async () => {
    console.log('🚨 EMERGENCY VALIDATION: Testing /mention-demo page');
    
    // Navigate to the correct mention demo page
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give time for React to load
    
    // Wait for page to load and look for mention components
    try {
      // Look for any input fields on the mention demo page
      const inputs = await page.locator('input, textarea').all();
      console.log(`Found ${inputs.length} input fields on mention-demo page`);
      
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const placeholder = await input.getAttribute('placeholder');
        const isVisible = await input.isVisible();
        
        console.log(`Input ${i}: placeholder="${placeholder}", visible=${isVisible}`);
        
        if (isVisible && placeholder && (placeholder.includes('@') || placeholder.includes('mention'))) {
          console.log(`✅ Found mention input: "${placeholder}"`);
          
          // Clear and focus
          await input.clear();
          await input.focus();
          
          // Test @ input
          await input.type('@');
          await page.waitForTimeout(2000);
          
          // Check for suggestion UI elements
          const pageContent = await page.textContent('body');
          console.log('Page content after @ input (first 500 chars):', pageContent?.slice(0, 500));
          
          // Look for suggestion elements
          const suggestionElements = await page.locator('[data-testid*="suggestion"], .suggestion, [class*="suggestion"]').count();
          console.log(`Found ${suggestionElements} suggestion elements`);
          
          // Test different characters after @
          await input.type('a');
          await page.waitForTimeout(1000);
          
          const updatedContent = await page.textContent('body');
          console.log('Updated content after @a:', updatedContent?.slice(0, 500));
          
          break;
        }
      }
    } catch (error) {
      console.error('Error testing mention demo:', error);
    }
  });

  test('CRITICAL: Direct MentionService testing via browser console', async () => {
    console.log('🔬 Direct MentionService Browser Test');
    
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Test MentionService directly in browser
    const serviceTestResults = await page.evaluate(async () => {
      try {
        // Try to import MentionService
        console.log('🧪 Browser Test: Attempting to import MentionService...');
        
        // First, try to access it from window
        if ((window as any).MentionService) {
          console.log('✅ MentionService found on window');
          const service = (window as any).MentionService;
          
          const getAllResult = await service.getAllAgents();
          const searchResult = await service.searchMentions('');
          const quickResult = await service.getQuickMentions('post');
          
          return {
            source: 'window',
            getAllAgents: getAllResult?.length || 0,
            searchMentions: searchResult?.length || 0,
            quickMentions: quickResult?.length || 0,
            getAllData: getAllResult?.slice(0, 3).map((a: any) => ({ id: a.id, name: a.name, displayName: a.displayName }))
          };
        }
        
        // Try to import dynamically
        console.log('🔄 Browser Test: Dynamic import attempt...');
        const { MentionService } = await import('/src/services/MentionService.ts');
        
        if (MentionService) {
          console.log('✅ MentionService imported successfully');
          
          const getAllResult = await MentionService.getAllAgents();
          const searchResult = await MentionService.searchMentions('');
          const quickResult = await MentionService.getQuickMentions('post');
          
          // Expose for future tests
          (window as any).MentionService = MentionService;
          
          return {
            source: 'import',
            getAllAgents: getAllResult?.length || 0,
            searchMentions: searchResult?.length || 0,
            quickMentions: quickResult?.length || 0,
            getAllData: getAllResult?.slice(0, 3).map((a: any) => ({ id: a.id, name: a.name, displayName: a.displayName })),
            searchData: searchResult?.slice(0, 3).map((a: any) => ({ id: a.id, name: a.name, displayName: a.displayName })),
            quickData: quickResult?.slice(0, 3).map((a: any) => ({ id: a.id, name: a.name, displayName: a.displayName }))
          };
        }
        
        return { error: 'MentionService not accessible' };
      } catch (error) {
        console.error('🚨 Browser Test Error:', error);
        return { error: error.message, stack: error.stack };
      }
    });
    
    console.log('🧪 Direct Service Test Results:', JSON.stringify(serviceTestResults, null, 2));
    
    // Validate results
    if (serviceTestResults.error) {
      console.error('❌ MentionService test failed:', serviceTestResults.error);
    } else {
      console.log('✅ MentionService test results:');
      console.log(`- getAllAgents: ${serviceTestResults.getAllAgents} agents`);
      console.log(`- searchMentions: ${serviceTestResults.searchMentions} results`);
      console.log(`- quickMentions: ${serviceTestResults.quickMentions} results`);
      
      if (serviceTestResults.searchMentions === 0) {
        console.error('🚨 CRITICAL: searchMentions returned 0 results for empty query!');
      }
    }
  });

  test('CRITICAL: Test suggestion loading in working components', async () => {
    console.log('📋 Testing suggestion loading in components');
    
    // Test mention-demo page
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Monitor console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('MentionService') || text.includes('suggestions') || text.includes('Query:')) {
        consoleLogs.push(`[${msg.type()}] ${text}`);
      }
    });
    
    // Look for any mention-related components
    const mentionComponents = await page.locator('[data-testid*="mention"], [class*="mention"], [id*="mention"]').count();
    console.log(`Found ${mentionComponents} mention-related elements`);
    
    // Try to find and interact with inputs
    const allInputs = await page.locator('input, textarea').all();
    
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      const isVisible = await input.isVisible();
      
      if (isVisible) {
        console.log(`Testing input ${i}`);
        
        await input.clear();
        await input.focus();
        await input.type('@');
        await page.waitForTimeout(1500);
        
        // Check console logs for this interaction
        const recentLogs = consoleLogs.slice(-5);
        console.log(`Logs after @ input ${i}:`, recentLogs);
        
        // Look for "Suggestions: 0" pattern
        const bodyText = await page.textContent('body');
        const hasSuggestionsZero = bodyText?.includes('Suggestions: 0') || bodyText?.includes('suggestions: 0');
        
        if (hasSuggestionsZero) {
          console.error(`🚨 FOUND "Suggestions: 0" on input ${i}!`);
        }
        
        // Clear for next test
        await input.clear();
      }
    }
    
    console.log('All console logs captured:', consoleLogs);
  });

  test('CRITICAL: Test posting interface mention system', async () => {
    console.log('📝 Testing posting interface mention system');
    
    // Test the posting interface page
    await page.goto('http://localhost:5173/posting');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Monitor console for mention-related activity
    const mentionLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('mention') || text.includes('@') || text.includes('suggestion')) {
        mentionLogs.push(`[${msg.type()}] ${text}`);
      }
    });
    
    // Look for textarea or input fields in posting interface
    const postingInputs = await page.locator('textarea, input[type="text"]').all();
    console.log(`Found ${postingInputs.length} inputs in posting interface`);
    
    for (let i = 0; i < postingInputs.length; i++) {
      const input = postingInputs[i];
      const isVisible = await input.isVisible();
      
      if (isVisible) {
        const placeholder = await input.getAttribute('placeholder');
        console.log(`Testing posting input ${i} with placeholder: "${placeholder}"`);
        
        await input.clear();
        await input.focus();
        await input.type('@');
        await page.waitForTimeout(2000);
        
        // Check for suggestion appearance
        const suggestionCount = await page.locator('[data-testid*="suggestion"], .suggestion-item, [class*="suggestion"]').count();
        console.log(`Suggestions visible after @: ${suggestionCount}`);
        
        // Test with character after @
        await input.type('c');
        await page.waitForTimeout(1500);
        
        const updatedSuggestionCount = await page.locator('[data-testid*="suggestion"], .suggestion-item, [class*="suggestion"]').count();
        console.log(`Suggestions visible after @c: ${updatedSuggestionCount}`);
        
        await input.clear();
      }
    }
    
    console.log('Posting interface mention logs:', mentionLogs);
  });
});