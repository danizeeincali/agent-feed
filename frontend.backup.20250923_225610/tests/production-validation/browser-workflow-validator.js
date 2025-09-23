// Browser-Based Production Validation for Advanced Filter
// Executes EXACT user workflow in real browser environment

async function validateAdvancedFilterWorkflow() {
  console.log('🚀 Starting Advanced Filter Production Validation');
  console.log('📍 Target URL: http://localhost:5173');
  
  const results = {
    timestamp: new Date().toISOString(),
    workflow: [],
    postCounts: {},
    apiCalls: [],
    errors: [],
    success: false
  };
  
  try {
    // Monitor network requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0];
      if (typeof url === 'string' && url.includes('/api/')) {
        results.apiCalls.push({
          method: args[1]?.method || 'GET',
          url: url,
          timestamp: new Date().toISOString()
        });
        console.log(`📡 API Call: ${args[1]?.method || 'GET'} ${url}`);
      }
      return originalFetch.apply(window, args);
    };

    // Step 1: Verify initial state
    console.log('📊 Step 1: Counting initial posts');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for posts to load
    
    const initialPosts = document.querySelectorAll('[data-testid^="post-"]');
    results.postCounts.initial = initialPosts.length;
    results.workflow.push(`Initial posts loaded: ${initialPosts.length}`);
    console.log(`✅ Found ${initialPosts.length} initial posts`);
    
    if (initialPosts.length === 0) {
      throw new Error('No posts found on initial load');
    }

    // Step 2: Find and click the main filter dropdown
    console.log('🔍 Step 2: Finding main filter dropdown');
    
    const dropdownSelectors = [
      '[data-testid="filter-dropdown-trigger"]',
      'button[data-testid="filter-indicator"]',
      'button:has([data-testid="filter-indicator"])',
      'button:has-text("All Posts")',
      '.filter-dropdown-trigger',
      'button[class*="filter"]'
    ];
    
    let dropdownButton = null;
    for (const selector of dropdownSelectors) {
      try {
        dropdownButton = document.querySelector(selector);
        if (dropdownButton) {
          console.log(`✅ Found dropdown with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!dropdownButton) {
      // Look for any button that might be the filter trigger
      const allButtons = document.querySelectorAll('button');
      for (const btn of allButtons) {
        if (btn.textContent.includes('All Posts') || 
            btn.textContent.includes('Filter') || 
            btn.querySelector('[data-testid="filter-indicator"]')) {
          dropdownButton = btn;
          console.log('✅ Found dropdown button by content matching');
          break;
        }
      }
    }
    
    if (!dropdownButton) {
      throw new Error('Could not find main filter dropdown button');
    }
    
    dropdownButton.click();
    results.workflow.push('Clicked main filter dropdown');
    console.log('✅ Clicked main filter dropdown');
    
    // Wait for dropdown to open
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Find and select "Advanced Filter" option
    console.log('🎯 Step 3: Finding Advanced Filter option');
    
    const advancedFilterSelectors = [
      '[data-testid="advanced-filter-option"]',
      'button:has-text("Advanced Filter")',
      'li:has-text("Advanced Filter")',
      '[role="menuitem"]:has-text("Advanced")',
      'button:contains("Advanced")'
    ];
    
    let advancedFilterOption = null;
    for (const selector of advancedFilterSelectors) {
      try {
        advancedFilterOption = document.querySelector(selector);
        if (advancedFilterOption) {
          console.log(`✅ Found advanced filter with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!advancedFilterOption) {
      // Look for any element containing "Advanced" text
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent && el.textContent.includes('Advanced Filter')) {
          advancedFilterOption = el.closest('button') || el.closest('li') || el;
          console.log('✅ Found advanced filter by text content');
          break;
        }
      }
    }
    
    if (!advancedFilterOption) {
      throw new Error('Could not find Advanced Filter option');
    }
    
    advancedFilterOption.click();
    results.workflow.push('Selected Advanced Filter option');
    console.log('✅ Selected Advanced Filter option');
    
    // Wait for advanced filter panel to open
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Find advanced filter panel
    console.log('📋 Step 4: Verifying advanced filter panel opened');
    
    const panelSelectors = [
      '[data-testid="advanced-filter-panel"]',
      '.advanced-filter-panel',
      '[class*="advanced-filter"]',
      'div:has-text("Advanced Filter")'
    ];
    
    let panel = null;
    for (const selector of panelSelectors) {
      try {
        panel = document.querySelector(selector);
        if (panel && panel.offsetParent !== null) { // Check if visible
          console.log(`✅ Found visible panel with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!panel) {
      throw new Error('Advanced filter panel did not open');
    }
    
    results.workflow.push('Advanced filter panel opened');

    // Step 5: Find agent multi-select input
    console.log('🤖 Step 5: Finding agent multi-select');
    
    const agentInputSelectors = [
      '[data-testid="agent-filter"] input',
      'input[placeholder*="agent" i]',
      'input[placeholder*="Agent"]',
      '.agent-filter input',
      '[class*="multi-select"] input',
      'label:has-text("Agents") + * input',
      'label:contains("Agents") ~ * input'
    ];
    
    let agentInput = null;
    for (const selector of agentInputSelectors) {
      try {
        agentInput = document.querySelector(selector);
        if (agentInput) {
          console.log(`✅ Found agent input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!agentInput) {
      // Look for any input near agent-related text
      const labels = document.querySelectorAll('label, span, div');
      for (const label of labels) {
        if (label.textContent && label.textContent.toLowerCase().includes('agent')) {
          const container = label.closest('div');
          if (container) {
            agentInput = container.querySelector('input');
            if (agentInput) {
              console.log('✅ Found agent input by proximity to label');
              break;
            }
          }
        }
      }
    }
    
    if (!agentInput) {
      throw new Error('Could not find agent multi-select input');
    }
    
    // Click the agent input to open dropdown
    agentInput.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Type to search for ProductionValidator
    agentInput.value = 'ProductionValidator';
    agentInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.workflow.push('Typed "ProductionValidator" in agent input');
    console.log('✅ Typed "ProductionValidator" in agent input');

    // Step 6: Select ProductionValidator option
    console.log('🎯 Step 6: Selecting ProductionValidator');
    
    const optionSelectors = [
      '[data-testid="agent-option-ProductionValidator"]',
      '[data-value="ProductionValidator"]',
      'li:has-text("ProductionValidator")',
      '[role="option"]:has-text("ProductionValidator")',
      'div:has-text("ProductionValidator")'
    ];
    
    let productionValidatorOption = null;
    for (const selector of optionSelectors) {
      try {
        productionValidatorOption = document.querySelector(selector);
        if (productionValidatorOption) {
          console.log(`✅ Found ProductionValidator option with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!productionValidatorOption) {
      // Look for any element containing ProductionValidator text
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent && el.textContent.includes('ProductionValidator') && 
            (el.tagName === 'LI' || el.tagName === 'DIV' || el.tagName === 'BUTTON')) {
          productionValidatorOption = el;
          console.log('✅ Found ProductionValidator by text search');
          break;
        }
      }
    }
    
    if (!productionValidatorOption) {
      throw new Error('Could not find ProductionValidator option');
    }
    
    productionValidatorOption.click();
    results.workflow.push('Selected ProductionValidator agent');
    console.log('✅ Selected ProductionValidator agent');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 7: Find and click Apply Filter button
    console.log('✅ Step 7: Finding Apply Filter button');
    
    const applyButtonSelectors = [
      '[data-testid="apply-filter-button"]',
      'button:has-text("Apply Filter")',
      'button:has-text("Apply")',
      '.apply-filter-button',
      '[class*="apply"]'
    ];
    
    let applyButton = null;
    for (const selector of applyButtonSelectors) {
      try {
        applyButton = document.querySelector(selector);
        if (applyButton && !applyButton.disabled) {
          console.log(`✅ Found apply button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!applyButton) {
      // Look for any button with "Apply" text
      const allButtons = document.querySelectorAll('button');
      for (const btn of allButtons) {
        if (btn.textContent.includes('Apply') && !btn.disabled) {
          applyButton = btn;
          console.log('✅ Found apply button by text content');
          break;
        }
      }
    }
    
    if (!applyButton) {
      throw new Error('Could not find Apply Filter button');
    }
    
    applyButton.click();
    results.workflow.push('Clicked Apply Filter button');
    console.log('✅ Clicked Apply Filter button');
    
    // Wait for filter to be applied
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 8: Verify filtering worked
    console.log('🔎 Step 8: Verifying filter results');
    
    const filteredPosts = document.querySelectorAll('[data-testid^="post-"]');
    results.postCounts.filtered = filteredPosts.length;
    results.workflow.push(`Posts after filtering: ${filteredPosts.length}`);
    console.log(`📊 Posts after filtering: ${filteredPosts.length}`);
    
    // Check if filtering actually worked (should be fewer posts)
    const filterWorked = filteredPosts.length < initialPosts.length && filteredPosts.length > 0;
    results.workflow.push(`Filtering worked: ${filterWorked}`);
    console.log(`✅ Filtering ${filterWorked ? 'worked' : 'failed'}`);
    
    // Check visible agents
    const visibleAgentElements = document.querySelectorAll('[data-testid^="post-"] [data-testid="post-agent"], [data-testid^="post-"] .post-agent, [data-testid^="post-"] [class*="agent"]');
    const visibleAgents = Array.from(visibleAgentElements).map(el => el.textContent.trim());
    results.workflow.push(`Visible agents: ${visibleAgents.join(', ')}`);
    console.log(`👀 Visible agents: ${visibleAgents.join(', ')}`);

    // Step 9: Find and click Clear button
    console.log('🧹 Step 9: Finding Clear button');
    
    const clearButtonSelectors = [
      '[data-testid="clear-filter-button"]',
      'button:has-text("Clear")',
      '.clear-filter-button',
      '[class*="clear"]',
      'button:has-text("Reset")'
    ];
    
    let clearButton = null;
    for (const selector of clearButtonSelectors) {
      try {
        clearButton = document.querySelector(selector);
        if (clearButton) {
          console.log(`✅ Found clear button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!clearButton) {
      // Look for any button with "Clear" or "Reset" text
      const allButtons = document.querySelectorAll('button');
      for (const btn of allButtons) {
        if ((btn.textContent.includes('Clear') || btn.textContent.includes('Reset')) && btn.offsetParent !== null) {
          clearButton = btn;
          console.log('✅ Found clear button by text content');
          break;
        }
      }
    }
    
    if (!clearButton) {
      throw new Error('Could not find Clear button');
    }
    
    clearButton.click();
    results.workflow.push('Clicked Clear button');
    console.log('✅ Clicked Clear button');
    
    // Wait for clear to be applied
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 10: Verify all posts return
    console.log('🔄 Step 10: Verifying reset worked');
    
    const resetPosts = document.querySelectorAll('[data-testid^="post-"]');
    results.postCounts.reset = resetPosts.length;
    results.workflow.push(`Posts after reset: ${resetPosts.length}`);
    console.log(`📊 Posts after reset: ${resetPosts.length}`);
    
    // Check if reset worked (should be back to original count)
    const resetWorked = resetPosts.length === initialPosts.length;
    results.workflow.push(`Reset worked: ${resetWorked}`);
    console.log(`✅ Reset ${resetWorked ? 'worked' : 'failed'}`);
    
    // Overall success
    results.success = filterWorked && resetWorked;
    results.workflow.push(`Overall validation: ${results.success ? 'SUCCESS' : 'FAILED'}`);
    
    console.log(`🎯 FINAL RESULT: ${results.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    // Restore original fetch
    window.fetch = originalFetch;
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    results.errors.push(error.message);
    results.success = false;
  }
  
  // Display comprehensive results
  console.log('📊 COMPREHENSIVE VALIDATION RESULTS:');
  console.log('=====================================');
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`Success: ${results.success}`);
  console.log('');
  console.log('Post Counts:');
  console.log(`  Initial: ${results.postCounts.initial}`);
  console.log(`  Filtered: ${results.postCounts.filtered}`);
  console.log(`  Reset: ${results.postCounts.reset}`);
  console.log('');
  console.log('Workflow Steps:');
  results.workflow.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  console.log('');
  console.log('API Calls:');
  results.apiCalls.forEach(call => console.log(`  ${call.method} ${call.url} at ${call.timestamp}`));
  console.log('');
  if (results.errors.length > 0) {
    console.log('Errors:');
    results.errors.forEach(error => console.log(`  ❌ ${error}`));
  }
  console.log('=====================================');
  
  // Save results to window for external access
  window.validationResults = results;
  
  return results;
}

// Auto-execute validation when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(validateAdvancedFilterWorkflow, 3000);
  });
} else {
  setTimeout(validateAdvancedFilterWorkflow, 3000);
}

// Export for external use
window.validateAdvancedFilterWorkflow = validateAdvancedFilterWorkflow;