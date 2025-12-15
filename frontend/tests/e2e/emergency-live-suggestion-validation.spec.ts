import { test, expect, Page } from '@playwright/test';

test.describe('EMERGENCY: Live Suggestion Loading Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('CRITICAL: Reproduce "Suggestions: 0" bug in live system', async () => {
    console.log('🚨 EMERGENCY VALIDATION: Testing @ mention suggestion loading');
    
    // Navigate to mention demo (only partially working location)
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Look for mention input field
    const mentionInput = await page.locator('input[placeholder*="mention"], textarea[placeholder*="mention"], .mention-input').first();
    
    if (await mentionInput.isVisible()) {
      console.log('✅ Found mention input field');
      
      // Clear and focus on input
      await mentionInput.clear();
      await mentionInput.focus();
      
      // Type @ to trigger suggestions
      await mentionInput.type('@');
      await page.waitForTimeout(1000);
      
      // Capture console logs
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      });
      
      // Wait for suggestions to potentially load
      await page.waitForTimeout(2000);
      
      // Check for "Suggestions: 0" text in UI
      const suggestionsText = await page.textContent('body');
      const hasSuggestionsZero = suggestionsText?.includes('Suggestions: 0');
      
      console.log('🔍 Suggestion Loading Results:');
      console.log('- Has "Suggestions: 0":', hasSuggestionsZero);
      console.log('- Console logs:', consoleLogs);
      
      // Test direct MentionService access
      const serviceTestResults = await page.evaluate(async () => {
        try {
          // Access MentionService from window if available
          const mentionService = (window as any).MentionService;
          if (!mentionService) {
            return { error: 'MentionService not available on window' };
          }
          
          const allAgents = await mentionService.getAllAgents();
          const searchResults = await mentionService.searchMentions('');
          const quickMentions = await mentionService.getQuickMentions('post');
          
          return {
            allAgents: allAgents?.length || 0,
            searchResults: searchResults?.length || 0,
            quickMentions: quickMentions?.length || 0
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      console.log('🧪 Direct Service Test Results:', serviceTestResults);
      
      // Document the failure
      expect.soft(hasSuggestionsZero).toBeFalsy(); // Should NOT show "Suggestions: 0"
    } else {
      console.log('❌ No mention input field found');
    }
  });

  test('CRITICAL: Test MentionService methods directly in browser console', async () => {
    console.log('🔬 Direct MentionService Testing');
    
    // Inject MentionService for direct testing
    const directTestResults = await page.evaluate(async () => {
      try {
        // Try to import and test MentionService directly
        const results = {
          serviceAvailable: false,
          getAllAgentsResult: null,
          searchMentionsResult: null,
          quickMentionsResult: null,
          errors: []
        };
        
        // Check if MentionService is available globally
        if ((window as any).MentionService) {
          results.serviceAvailable = true;
          const service = (window as any).MentionService;
          
          try {
            results.getAllAgentsResult = await service.getAllAgents();
          } catch (e) {
            results.errors.push(`getAllAgents: ${e.message}`);
          }
          
          try {
            results.searchMentionsResult = await service.searchMentions('');
          } catch (e) {
            results.errors.push(`searchMentions: ${e.message}`);
          }
          
          try {
            results.quickMentionsResult = await service.getQuickMentions('post');
          } catch (e) {
            results.errors.push(`getQuickMentions: ${e.message}`);
          }
        }
        
        return results;
      } catch (error) {
        return { error: `Global error: ${error.message}` };
      }
    });
    
    console.log('🧪 Direct Service Test Results:', JSON.stringify(directTestResults, null, 2));
  });

  test('CRITICAL: Monitor suggestion loading pipeline step-by-step', async () => {
    console.log('🔍 Pipeline Monitoring');
    
    // Monitor network requests
    const networkRequests: any[] = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    });
    
    page.on('response', response => {
      console.log(`Response: ${response.status()} ${response.url()}`);
    });
    
    // Monitor console for specific debug messages
    const debugLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Query:') || text.includes('Suggestions:') || text.includes('MentionService')) {
        debugLogs.push(text);
      }
    });
    
    // Find and interact with mention input
    const mentionInputs = await page.locator('input, textarea').all();
    
    for (const input of mentionInputs) {
      const placeholder = await input.getAttribute('placeholder');
      if (placeholder && (placeholder.includes('mention') || placeholder.includes('@'))) {
        console.log(`Testing input with placeholder: ${placeholder}`);
        
        await input.clear();
        await input.focus();
        await input.type('@');
        await page.waitForTimeout(1500);
        
        // Try typing a character after @
        await input.type('a');
        await page.waitForTimeout(1500);
        
        console.log('Debug logs during this input:', debugLogs);
        break;
      }
    }
    
    console.log('Network requests made:', networkRequests.length);
    console.log('Debug logs captured:', debugLogs);
  });

  test('CRITICAL: Capture exact "Query: \'\' | Suggestions: 0" scenario', async () => {
    console.log('📋 Exact Scenario Capture');
    
    const scenarioLogs: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      scenarioLogs.push(`[${msg.type()}] ${text}`);
    });
    
    // Test multiple input scenarios
    const scenarios = [
      { description: 'Empty @ trigger', input: '@' },
      { description: 'Single character after @', input: '@a' },
      { description: 'Clear and retry', input: '' }
    ];
    
    for (const scenario of scenarios) {
      console.log(`Testing scenario: ${scenario.description}`);
      
      const input = await page.locator('input, textarea').first();
      await input.clear();
      await input.focus();
      
      if (scenario.input) {
        await input.type(scenario.input);
      }
      
      await page.waitForTimeout(2000);
      
      // Capture the current state
      const pageText = await page.textContent('body');
      const hasQueryEmpty = pageText?.includes("Query: ''");
      const hasSuggestionsZero = pageText?.includes('Suggestions: 0');
      
      console.log(`Scenario "${scenario.description}" results:`);
      console.log(`- Query empty: ${hasQueryEmpty}`);
      console.log(`- Suggestions zero: ${hasSuggestionsZero}`);
      console.log(`- Recent logs:`, scenarioLogs.slice(-5));
    }
    
    console.log('All scenario logs:', scenarioLogs);
  });
});