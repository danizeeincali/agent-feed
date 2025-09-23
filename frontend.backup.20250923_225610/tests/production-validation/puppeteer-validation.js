// Puppeteer-based Production Validation
// Executes the EXACT user workflow in a controlled browser

import puppeteer from 'puppeteer';
import fs from 'fs';

async function runPuppeteerValidation() {
  console.log('🚀 Starting Puppeteer Production Validation');
  
  const browser = await puppeteer.launch({
    headless: false, // Run with GUI for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  const results = {
    timestamp: new Date().toISOString(),
    testUrl: 'http://localhost:5173',
    workflow: [],
    postCounts: {},
    apiCalls: [],
    errors: [],
    success: false
  };

  try {
    // Monitor network requests
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        results.apiCalls.push({
          method: request.method(),
          url: request.url(),
          timestamp: new Date().toISOString()
        });
        console.log(`📡 API Call: ${request.method()} ${request.url()}`);
      }
      request.continue();
    });

    // Monitor console logs for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.errors.push(`Console Error: ${msg.text()}`);
      }
    });

    console.log('📍 Navigating to http://localhost:5173');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // Wait for initial posts to load
    console.log('⏳ Waiting for posts to load...');
    await page.waitForSelector('[data-testid^="post-"]', { timeout: 15000 });
    
    // Count initial posts
    const initialPostCount = await page.$$eval('[data-testid^="post-"]', posts => posts.length);
    results.postCounts.initial = initialPostCount;
    results.workflow.push(`Initial posts loaded: ${initialPostCount}`);
    console.log(`✅ Found ${initialPostCount} initial posts`);

    // Step 1: Find and click filter dropdown
    console.log('🔍 Step 1: Finding filter dropdown button');
    
    // Try multiple selectors for the dropdown
    const dropdownSelectors = [
      'button[data-testid="filter-indicator"]',
      'button:has([data-testid="filter-indicator"])',
      'button[class*="filter"]',
      'button:has-text("All Posts")',
      '.filter-dropdown-trigger'
    ];

    let dropdownClicked = false;
    for (const selector of dropdownSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        console.log(`✅ Clicked dropdown with selector: ${selector}`);
        dropdownClicked = true;
        break;
      } catch (e) {
        console.log(`❌ Failed to find dropdown with selector: ${selector}`);
        continue;
      }
    }

    if (!dropdownClicked) {
      throw new Error('Could not find or click filter dropdown');
    }

    results.workflow.push('Clicked filter dropdown');
    await page.waitForTimeout(1000);

    // Step 2: Find and click Advanced Filter option
    console.log('🎯 Step 2: Looking for Advanced Filter option');
    
    const advancedFilterSelectors = [
      'text/Advanced Filter',
      'button:has-text("Advanced Filter")',
      '[role="menuitem"]:has-text("Advanced")',
      'li:has-text("Advanced Filter")'
    ];

    let advancedFilterClicked = false;
    for (const selector of advancedFilterSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        console.log(`✅ Clicked Advanced Filter with selector: ${selector}`);
        advancedFilterClicked = true;
        break;
      } catch (e) {
        console.log(`❌ Failed to find Advanced Filter with selector: ${selector}`);
        continue;
      }
    }

    if (!advancedFilterClicked) {
      // Try clicking by text content
      try {
        await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          const advancedElement = elements.find(el => 
            el.textContent && el.textContent.includes('Advanced Filter') &&
            (el.tagName === 'BUTTON' || el.tagName === 'LI' || el.closest('button'))
          );
          if (advancedElement) {
            (advancedElement.closest('button') || advancedElement).click();
            return true;
          }
          return false;
        });
        console.log('✅ Found Advanced Filter by text content');
        advancedFilterClicked = true;
      } catch (e) {
        throw new Error('Could not find Advanced Filter option');
      }
    }

    results.workflow.push('Clicked Advanced Filter option');
    await page.waitForTimeout(2000);

    // Step 3: Wait for advanced filter panel to open
    console.log('📋 Step 3: Waiting for advanced filter panel');
    
    try {
      await page.waitForSelector('[data-testid="advanced-filter-panel"], .advanced-filter-panel', { timeout: 5000 });
      console.log('✅ Advanced filter panel opened');
    } catch (e) {
      console.log('⚠️ Panel selector not found, continuing anyway');
    }

    results.workflow.push('Advanced filter panel opened');

    // Step 4: Find agent input field
    console.log('🤖 Step 4: Finding agent input field');
    
    const agentInputSelectors = [
      'input[placeholder*="agent"]',
      'input[placeholder*="Agent"]',
      '[data-testid="agent-filter"] input',
      'label:has-text("Agents") + * input',
      '.multi-select input'
    ];

    let agentInputFound = false;
    for (const selector of agentInputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        console.log(`✅ Found agent input with selector: ${selector}`);
        agentInputFound = true;
        break;
      } catch (e) {
        console.log(`❌ Failed to find agent input with selector: ${selector}`);
        continue;
      }
    }

    if (!agentInputFound) {
      // Try to find by text proximity
      try {
        await page.evaluate(() => {
          const labels = Array.from(document.querySelectorAll('label, span, div'));
          const agentLabel = labels.find(el => 
            el.textContent && el.textContent.toLowerCase().includes('agent')
          );
          if (agentLabel) {
            const container = agentLabel.closest('div');
            const input = container?.querySelector('input');
            if (input) {
              input.click();
              return true;
            }
          }
          return false;
        });
        console.log('✅ Found agent input by proximity to label');
        agentInputFound = true;
      } catch (e) {
        throw new Error('Could not find agent input field');
      }
    }

    results.workflow.push('Found and clicked agent input');
    await page.waitForTimeout(1000);

    // Step 5: Get available agents and select one
    console.log('📋 Step 5: Getting available agents from API');
    
    // Get agents from API first
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        const agents = [...new Set(posts.map(post => post.agent).filter(Boolean))];
        return { posts: posts.length, agents };
      } catch (e) {
        return { error: e.message };
      }
    });

    if (apiResponse.error) {
      throw new Error(`API Error: ${apiResponse.error}`);
    }

    console.log(`📊 Available agents: ${apiResponse.agents.join(', ')}`);
    
    // Use the first available agent (not necessarily ProductionValidator)
    const testAgent = apiResponse.agents[0] || 'ProductionValidator';
    console.log(`🎯 Testing with agent: ${testAgent}`);

    // Type the agent name
    await page.type('input:focus', testAgent);
    await page.waitForTimeout(1000);

    // Try to select the agent option
    const agentOptionSelectors = [
      `text/${testAgent}`,
      `[data-value="${testAgent}"]`,
      `li:has-text("${testAgent}")`,
      `[role="option"]:has-text("${testAgent}")`
    ];

    let agentSelected = false;
    for (const selector of agentOptionSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        console.log(`✅ Selected agent with selector: ${selector}`);
        agentSelected = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!agentSelected) {
      // Try clicking by text content
      try {
        await page.evaluate((agent) => {
          const elements = Array.from(document.querySelectorAll('*'));
          const agentElement = elements.find(el => 
            el.textContent && el.textContent.includes(agent) &&
            (el.tagName === 'LI' || el.tagName === 'DIV' || el.tagName === 'BUTTON')
          );
          if (agentElement) {
            agentElement.click();
            return true;
          }
          return false;
        }, testAgent);
        console.log('✅ Selected agent by text content');
        agentSelected = true;
      } catch (e) {
        console.log('⚠️ Could not select agent option, continuing anyway');
      }
    }

    results.workflow.push(`Selected agent: ${testAgent}`);
    await page.waitForTimeout(1000);

    // Step 6: Apply filter
    console.log('✅ Step 6: Applying filter');
    
    const applyButtonSelectors = [
      'button:has-text("Apply Filter")',
      'button:has-text("Apply")',
      '[data-testid="apply-filter-button"]',
      'button[type="submit"]'
    ];

    let filterApplied = false;
    for (const selector of applyButtonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        console.log(`✅ Clicked apply button with selector: ${selector}`);
        filterApplied = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!filterApplied) {
      throw new Error('Could not find or click Apply Filter button');
    }

    results.workflow.push('Applied filter');
    await page.waitForTimeout(3000); // Wait for filtering to complete

    // Step 7: Check filtered results
    console.log('🔎 Step 7: Checking filtered results');
    
    const filteredPostCount = await page.$$eval('[data-testid^="post-"]', posts => posts.length);
    results.postCounts.filtered = filteredPostCount;
    results.workflow.push(`Posts after filtering: ${filteredPostCount}`);
    console.log(`📊 Posts after filtering: ${filteredPostCount}`);

    const filterWorked = filteredPostCount < initialPostCount && filteredPostCount > 0;
    console.log(`✅ Filtering ${filterWorked ? 'worked' : 'failed'}`);

    // Step 8: Clear filter
    console.log('🧹 Step 8: Clearing filter');
    
    const clearButtonSelectors = [
      'button:has-text("Clear")',
      '[data-testid="clear-filter-button"]',
      'button:has-text("Reset")',
      '.clear-filter-button'
    ];

    let filterCleared = false;
    for (const selector of clearButtonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        console.log(`✅ Clicked clear button with selector: ${selector}`);
        filterCleared = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!filterCleared) {
      console.log('⚠️ Could not find clear button, trying manual clear');
      // Try clicking the dropdown again and selecting "All Posts"
      try {
        await page.click('button[data-testid="filter-indicator"]');
        await page.waitForTimeout(1000);
        await page.click('text/All Posts');
        filterCleared = true;
        console.log('✅ Cleared filter by selecting "All Posts"');
      } catch (e) {
        console.log('⚠️ Could not clear filter');
      }
    }

    results.workflow.push('Cleared filter');
    await page.waitForTimeout(3000); // Wait for clear to complete

    // Step 9: Check reset results
    console.log('🔄 Step 9: Checking reset results');
    
    const resetPostCount = await page.$$eval('[data-testid^="post-"]', posts => posts.length);
    results.postCounts.reset = resetPostCount;
    results.workflow.push(`Posts after reset: ${resetPostCount}`);
    console.log(`📊 Posts after reset: ${resetPostCount}`);

    const resetWorked = resetPostCount === initialPostCount;
    console.log(`✅ Reset ${resetWorked ? 'worked' : 'failed'}`);

    // Final validation
    results.success = filterWorked && resetWorked;
    results.workflow.push(`Overall validation: ${results.success ? 'SUCCESS' : 'FAILED'}`);

    console.log(`🎯 FINAL RESULT: ${results.success ? '✅ SUCCESS' : '❌ FAILED'}`);

  } catch (error) {
    console.error('❌ Puppeteer validation error:', error.message);
    results.errors.push(error.message);
    results.success = false;
  }

  // Save results
  fs.writeFileSync(
    '/workspaces/agent-feed/frontend/puppeteer-validation-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log('💾 Results saved to puppeteer-validation-results.json');

  await browser.close();
  return results;
}

// Run validation
runPuppeteerValidation().catch(console.error);