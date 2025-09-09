import { test, expect, Page } from '@playwright/test';

/**
 * PRODUCTION VALIDATION: Mention Integration Deep Analysis
 * 
 * This test suite analyzes the exact differences between working and broken
 * mention implementations to identify root causes and provide fix guidance.
 */

const BASE_URL = 'http://localhost:5173';

async function navigateToApp(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 10000 });
  await page.waitForTimeout(1000);
}

// Helper to extract MentionInput implementation details
async function analyzeMentionInput(page: Page, inputSelector: string, contextName: string) {
  console.log(`\n🔍 Analyzing ${contextName} MentionInput implementation...`);
  
  const input = page.locator(inputSelector).first();
  
  // Check if input exists
  const exists = await input.count() > 0;
  if (!exists) {
    return { 
      contextName, 
      exists: false, 
      error: 'Input not found' 
    };
  }
  
  await input.scrollIntoViewIfNeeded();
  
  // Analyze DOM structure around input
  const parentContainer = input.locator('..');
  const containerClasses = await parentContainer.getAttribute('class') || '';
  const containerTagName = await parentContainer.evaluate(el => el.tagName.toLowerCase());
  
  // Check for wrapper elements that might interfere
  const hasRelativeWrapper = containerClasses.includes('relative');
  const hasOverflowHidden = containerClasses.includes('overflow-hidden');
  const hasZIndexClasses = containerClasses.includes('z-');
  
  // Test mention triggering
  await input.click();
  await input.fill('@');
  await page.waitForTimeout(500);
  
  // Look for mention dropdown
  const debugDropdown = page.locator('[data-testid="mention-debug-dropdown"]');
  const isDropdownVisible = await debugDropdown.isVisible().catch(() => false);
  
  let dropdownPosition = null;
  let dropdownZIndex = null;
  let dropdownClasses = '';
  
  if (isDropdownVisible) {
    const dropdownBox = await debugDropdown.boundingBox();
    dropdownPosition = dropdownBox;
    dropdownZIndex = await debugDropdown.evaluate(el => window.getComputedStyle(el).zIndex);
    dropdownClasses = await debugDropdown.getAttribute('class') || '';
  }
  
  // Check for overlapping elements that might hide dropdown
  const overlappingElements = await page.locator('*').evaluateAll(elements => {
    return elements
      .filter(el => {
        const style = window.getComputedStyle(el);
        return style.position === 'absolute' || style.position === 'fixed' || style.position === 'relative';
      })
      .map(el => ({
        tagName: el.tagName,
        classes: el.className,
        zIndex: window.getComputedStyle(el).zIndex,
        position: window.getComputedStyle(el).position
      }))
      .slice(0, 10); // Limit to prevent huge arrays
  });
  
  return {
    contextName,
    exists: true,
    inputSelector,
    containerTagName,
    containerClasses,
    hasRelativeWrapper,
    hasOverflowHidden,
    hasZIndexClasses,
    isDropdownVisible,
    dropdownPosition,
    dropdownZIndex,
    dropdownClasses,
    overlappingElements: overlappingElements.length
  };
}

test.describe('Mention Integration Root Cause Analysis', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
  });

  test('Analyze working vs broken mention implementations', async ({ page }) => {
    const implementations = [];
    
    // Analyze QuickPost (known working)
    const quickPostAnalysis = await analyzeMentionInput(
      page, 
      'textarea[placeholder*="What\'s your quick update"]', 
      'QuickPost'
    );
    implementations.push(quickPostAnalysis);
    
    // Analyze PostCreator (known working)
    await page.getByTestId('create-post-button').click();
    await page.waitForTimeout(500);
    const postCreatorAnalysis = await analyzeMentionInput(
      page,
      'textarea[placeholder*="Share your insights"]',
      'PostCreator'
    );
    implementations.push(postCreatorAnalysis);
    
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Analyze CommentForm (known broken)
    const commentButtons = page.locator('[data-testid="comment-button"]');
    if (await commentButtons.count() > 0) {
      await commentButtons.first().click();
      await page.waitForTimeout(500);
      const commentFormAnalysis = await analyzeMentionInput(
        page,
        'textarea[placeholder*="Provide technical analysis"]',
        'CommentForm'
      );
      implementations.push(commentFormAnalysis);
    }
    
    // Generate detailed comparison report
    console.log('\n📊 MENTION INTEGRATION COMPARISON REPORT');
    console.log('==========================================');
    
    const workingImplementations = implementations.filter(impl => impl.isDropdownVisible);
    const brokenImplementations = implementations.filter(impl => impl.exists && !impl.isDropdownVisible);
    
    console.log(`\n✅ Working implementations (${workingImplementations.length}):`);
    workingImplementations.forEach(impl => {
      console.log(`  - ${impl.contextName}`);
      console.log(`    Container: ${impl.containerTagName}.${impl.containerClasses}`);
      console.log(`    Dropdown Z-Index: ${impl.dropdownZIndex}`);
      console.log(`    Dropdown Classes: ${impl.dropdownClasses}`);
    });
    
    console.log(`\n❌ Broken implementations (${brokenImplementations.length}):`);
    brokenImplementations.forEach(impl => {
      console.log(`  - ${impl.contextName}`);
      console.log(`    Container: ${impl.containerTagName}.${impl.containerClasses}`);
      console.log(`    Has Relative Wrapper: ${impl.hasRelativeWrapper}`);
      console.log(`    Has Overflow Hidden: ${impl.hasOverflowHidden}`);
      console.log(`    Has Z-Index Classes: ${impl.hasZIndexClasses}`);
      console.log(`    Overlapping Elements: ${impl.overlappingElements}`);
    });
    
    // Identify key differences
    if (workingImplementations.length > 0 && brokenImplementations.length > 0) {
      console.log('\n🔍 KEY DIFFERENCES ANALYSIS:');
      
      const workingExample = workingImplementations[0];
      const brokenExample = brokenImplementations[0];
      
      const differences = [];
      
      if (workingExample.containerClasses !== brokenExample.containerClasses) {
        differences.push(`Container Classes: Working="${workingExample.containerClasses}" vs Broken="${brokenExample.containerClasses}"`);
      }
      
      if (workingExample.hasOverflowHidden !== brokenExample.hasOverflowHidden) {
        differences.push(`Overflow Hidden: Working=${workingExample.hasOverflowHidden} vs Broken=${brokenExample.hasOverflowHidden}`);
      }
      
      if (workingExample.overlappingElements !== brokenExample.overlappingElements) {
        differences.push(`Overlapping Elements: Working=${workingExample.overlappingElements} vs Broken=${brokenExample.overlappingElements}`);
      }
      
      if (differences.length > 0) {
        console.log('  Potential causes:');
        differences.forEach(diff => console.log(`    - ${diff}`));
      } else {
        console.log('  No obvious structural differences found');
        console.log('  Issue may be in component lifecycle or event handling');
      }
    }
    
    // Save analysis to file for review
    const analysisReport = {
      timestamp: new Date().toISOString(),
      implementations,
      workingCount: workingImplementations.length,
      brokenCount: brokenImplementations.length,
      summary: {
        working: workingImplementations.map(impl => impl.contextName),
        broken: brokenImplementations.map(impl => impl.contextName)
      }
    };
    
    await page.evaluate(report => {
      window.mentionAnalysisReport = report;
    }, analysisReport);
    
    // Verify we have implementations to analyze
    expect(implementations.length, 'Should analyze at least one implementation').toBeGreaterThan(0);
    
    // Document success/failure states
    if (brokenImplementations.length > 0) {
      console.log(`\n🚨 REGRESSION DETECTED: ${brokenImplementations.length} broken mention contexts`);
      expect(brokenImplementations.length, 'All mention contexts should work').toBe(0);
    } else {
      console.log('\n🎉 All mention contexts are working correctly!');
    }
  });

  test('Validate DOM hierarchy for mention dropdown rendering', async ({ page }) => {
    // Focus on QuickPost as the known working implementation
    const quickPostInput = page.locator('textarea[placeholder*="What\'s your quick update"]').first();
    await quickPostInput.scrollIntoViewIfNeeded();
    
    // Get the complete DOM hierarchy around the input
    const hierarchyInfo = await quickPostInput.evaluate(input => {
      const elements = [];
      let current = input;
      let depth = 0;
      
      // Walk up the DOM tree
      while (current && depth < 10) {
        elements.push({
          tagName: current.tagName,
          className: current.className,
          position: window.getComputedStyle(current).position,
          zIndex: window.getComputedStyle(current).zIndex,
          overflow: window.getComputedStyle(current).overflow,
          depth
        });
        current = current.parentElement;
        depth++;
      }
      
      return elements;
    });
    
    console.log('\n🏗️  DOM HIERARCHY ANALYSIS (QuickPost - Working):');
    hierarchyInfo.forEach(element => {
      const indent = '  '.repeat(element.depth);
      console.log(`${indent}${element.tagName} (${element.className})`);
      console.log(`${indent}  position: ${element.position}, z-index: ${element.zIndex}, overflow: ${element.overflow}`);
    });
    
    // Test dropdown rendering in this hierarchy
    await quickPostInput.fill('@');
    await page.waitForTimeout(500);
    
    const debugDropdown = page.locator('[data-testid="mention-debug-dropdown"]');
    const isVisible = await debugDropdown.isVisible().catch(() => false);
    
    if (isVisible) {
      const dropdownHierarchy = await debugDropdown.evaluate(dropdown => {
        const elements = [];
        let current = dropdown;
        let depth = 0;
        
        while (current && depth < 5) {
          elements.push({
            tagName: current.tagName,
            className: current.className,
            position: window.getComputedStyle(current).position,
            zIndex: window.getComputedStyle(current).zIndex,
            depth
          });
          current = current.parentElement;
          depth++;
        }
        
        return elements;
      });
      
      console.log('\n📋 DROPDOWN DOM HIERARCHY:');
      dropdownHierarchy.forEach(element => {
        const indent = '  '.repeat(element.depth);
        console.log(`${indent}${element.tagName} (${element.className})`);
        console.log(`${indent}  position: ${element.position}, z-index: ${element.zIndex}`);
      });
    }
    
    expect(isVisible, 'QuickPost mention dropdown should be visible for hierarchy analysis').toBe(true);
  });

  test('Analyze MentionInput component integration patterns', async ({ page }) => {
    // Test if MentionInput is properly imported and used
    const quickPostInput = page.locator('textarea[placeholder*="What\'s your quick update"]').first();
    await quickPostInput.scrollIntoViewIfNeeded();
    
    // Check component props and attributes
    const componentInfo = await quickPostInput.evaluate(input => {
      return {
        tagName: input.tagName,
        type: input.type,
        className: input.className,
        placeholder: input.placeholder,
        hasDataTestId: input.hasAttribute('data-testid'),
        customAttributes: Array.from(input.attributes)
          .filter(attr => attr.name.startsWith('data-'))
          .map(attr => ({ name: attr.name, value: attr.value }))
      };
    });
    
    console.log('\n🔧 MENTION INPUT COMPONENT ANALYSIS:');
    console.log(`  Tag: ${componentInfo.tagName}`);
    console.log(`  Type: ${componentInfo.type}`);
    console.log(`  Placeholder: ${componentInfo.placeholder}`);
    console.log(`  Custom Attributes:`, componentInfo.customAttributes);
    
    // Test event handling
    await quickPostInput.fill('@test');
    
    const events = await page.evaluate(() => {
      return window.mentionInputEvents || [];
    });
    
    console.log(`  Recorded Events: ${events.length}`);
    
    expect(componentInfo.tagName, 'Should be textarea element').toBe('TEXTAREA');
    
    // Verify MentionInput is handling events correctly
    await quickPostInput.fill('@');
    await page.waitForTimeout(500);
    
    const dropdownVisible = await page.locator('[data-testid="mention-debug-dropdown"]').isVisible();
    expect(dropdownVisible, 'MentionInput should respond to @ character').toBe(true);
  });
});