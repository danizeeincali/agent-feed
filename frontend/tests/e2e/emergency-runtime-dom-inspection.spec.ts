import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * 🚨 EMERGENCY RUNTIME DOM INSPECTION
 * 
 * This test suite provides definitive evidence of actual runtime state
 * comparing working /mention-demo vs broken production components
 */

interface DOMInspectionResult {
  url: string;
  timestamp: string;
  domStructure: any;
  eventHandlers: any;
  computedStyles: any;
  javascriptErrors: string[];
  mentionInputElements: any[];
  interactionResults: any;
}

// Helper function to extract all mention-related elements and their properties
async function inspectMentionElements(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    const mentionElements = [];
    
    // Find all potential mention input elements
    const textareas = document.querySelectorAll('textarea');
    const inputs = document.querySelectorAll('input[type="text"]');
    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
    
    [...textareas, ...inputs, ...contentEditables].forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      
      mentionElements.push({
        type: element.tagName.toLowerCase(),
        index,
        id: element.id || null,
        className: element.className || null,
        placeholder: (element as any).placeholder || null,
        value: (element as any).value || element.textContent || '',
        visible: rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden',
        position: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        styles: {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          zIndex: computedStyle.zIndex,
          position: computedStyle.position
        },
        eventListeners: {
          // Check for common event types
          onclick: element.onclick !== null,
          onkeydown: element.onkeydown !== null,
          onkeyup: element.onkeyup !== null,
          oninput: element.oninput !== null,
          onchange: element.onchange !== null,
          onfocus: element.onfocus !== null,
          onblur: element.onblur !== null
        },
        parentChain: (() => {
          const chain = [];
          let parent = element.parentElement;
          let depth = 0;
          while (parent && depth < 5) {
            chain.push({
              tagName: parent.tagName,
              className: parent.className || null,
              id: parent.id || null
            });
            parent = parent.parentElement;
            depth++;
          }
          return chain;
        })(),
        nextSibling: element.nextElementSibling ? {
          tagName: element.nextElementSibling.tagName,
          className: element.nextElementSibling.className || null,
          id: element.nextElementSibling.id || null
        } : null
      });
    });

    // Also look for mention dropdown elements
    const dropdowns = document.querySelectorAll('[class*="mention"], [class*="dropdown"], [class*="suggestion"], [id*="mention"]');
    dropdowns.forEach((dropdown, index) => {
      const rect = dropdown.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(dropdown);
      
      mentionElements.push({
        type: 'dropdown',
        index,
        tagName: dropdown.tagName.toLowerCase(),
        id: dropdown.id || null,
        className: dropdown.className || null,
        textContent: dropdown.textContent?.substring(0, 100) || '',
        visible: rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden',
        position: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        styles: {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          zIndex: computedStyle.zIndex,
          position: computedStyle.position
        }
      });
    });

    return mentionElements;
  });
}

// Helper to test @ typing interaction
async function testMentionTyping(page: Page, elementSelector: string): Promise<any> {
  try {
    await page.click(elementSelector);
    await page.waitForTimeout(100);
    
    // Type @ and capture immediate response
    await page.type(elementSelector, '@');
    await page.waitForTimeout(500); // Wait for any dropdowns
    
    const afterAtTyping = await page.evaluate(() => {
      // Check for dropdowns or suggestion elements
      const dropdowns = document.querySelectorAll('[class*="mention"], [class*="dropdown"], [class*="suggestion"]');
      const visibleDropdowns = Array.from(dropdowns).filter(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      return {
        dropdownsFound: dropdowns.length,
        visibleDropdowns: visibleDropdowns.length,
        dropdownContents: visibleDropdowns.map(el => ({
          className: el.className,
          textContent: el.textContent?.substring(0, 200),
          position: el.getBoundingClientRect()
        }))
      };
    });
    
    // Type a few characters to test filtering
    await page.type(elementSelector, 'tes');
    await page.waitForTimeout(500);
    
    const afterFiltering = await page.evaluate(() => {
      const dropdowns = document.querySelectorAll('[class*="mention"], [class*="dropdown"], [class*="suggestion"]');
      const visibleDropdowns = Array.from(dropdowns).filter(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      return {
        dropdownsFound: dropdowns.length,
        visibleDropdowns: visibleDropdowns.length,
        dropdownContents: visibleDropdowns.map(el => ({
          className: el.className,
          textContent: el.textContent?.substring(0, 200),
          position: el.getBoundingClientRect()
        }))
      };
    });
    
    // Clear the input
    await page.fill(elementSelector, '');
    
    return {
      success: true,
      afterAtTyping,
      afterFiltering
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Capture JavaScript errors
async function captureJavaScriptErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });
  
  return errors;
}

test.describe('🚨 EMERGENCY: Runtime DOM Inspection', () => {
  let jsErrors: string[] = [];
  
  test.beforeEach(async ({ page }) => {
    jsErrors = await captureJavaScriptErrors(page);
  });

  test('PHASE 1: Working Reference Analysis (/mention-demo)', async ({ page }) => {
    const results: DOMInspectionResult = {
      url: 'http://localhost:5173/mention-demo',
      timestamp: new Date().toISOString(),
      domStructure: null,
      eventHandlers: null,
      computedStyles: null,
      javascriptErrors: [],
      mentionInputElements: [],
      interactionResults: null
    };

    console.log('🔍 PHASE 1: Analyzing working /mention-demo...');
    
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Ensure all components are mounted
    
    // Take screenshot for evidence
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/runtime-evidence-mention-demo.png', 
      fullPage: true 
    });
    
    // Inspect all mention-related elements
    results.mentionInputElements = await inspectMentionElements(page);
    
    // Test @ typing interaction on first visible input
    const visibleInputs = results.mentionInputElements.filter(el => el.visible && el.type !== 'dropdown');
    if (visibleInputs.length > 0) {
      console.log(`🎯 Testing @ interaction on ${visibleInputs[0].type} element`);
      
      // Try to find a specific selector for the first visible input
      let selector = '';
      if (visibleInputs[0].id) {
        selector = `#${visibleInputs[0].id}`;
      } else if (visibleInputs[0].type === 'textarea') {
        selector = 'textarea';
      } else {
        selector = 'input[type="text"]';
      }
      
      results.interactionResults = await testMentionTyping(page, selector);
      
      // Take screenshot after interaction
      await page.screenshot({ 
        path: '/workspaces/agent-feed/frontend/test-results/runtime-evidence-mention-demo-after-typing.png', 
        fullPage: true 
      });
    }
    
    results.javascriptErrors = jsErrors;
    
    // Write detailed results
    const evidenceFile = '/workspaces/agent-feed/frontend/test-results/DOM_INSPECTION_MENTION_DEMO.json';
    fs.writeFileSync(evidenceFile, JSON.stringify(results, null, 2));
    
    console.log('✅ PHASE 1 Complete: Working reference analyzed');
    console.log(`📊 Found ${results.mentionInputElements.length} mention-related elements`);
    console.log(`🎯 Interaction result: ${results.interactionResults?.success ? 'SUCCESS' : 'FAILED'}`);
  });

  test('PHASE 2: Production PostCreator Analysis', async ({ page }) => {
    const results: DOMInspectionResult = {
      url: 'http://localhost:5173/',
      timestamp: new Date().toISOString(),
      domStructure: null,
      eventHandlers: null,
      computedStyles: null,
      javascriptErrors: [],
      mentionInputElements: [],
      interactionResults: null
    };

    console.log('🔍 PHASE 2: Analyzing production PostCreator...');
    
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/runtime-evidence-production-initial.png', 
      fullPage: true 
    });
    
    // Click "Start a post..." to open PostCreator
    try {
      await page.click('text=Start a post...');
      await page.waitForTimeout(1000);
      
      // Take screenshot after opening PostCreator
      await page.screenshot({ 
        path: '/workspaces/agent-feed/frontend/test-results/runtime-evidence-production-postcreator-open.png', 
        fullPage: true 
      });
    } catch (error) {
      console.log(`⚠️ Could not click "Start a post...": ${error.message}`);
    }
    
    // Inspect all mention-related elements
    results.mentionInputElements = await inspectMentionElements(page);
    
    // Test @ typing interaction on available inputs
    const visibleInputs = results.mentionInputElements.filter(el => el.visible && el.type !== 'dropdown');
    if (visibleInputs.length > 0) {
      console.log(`🎯 Testing @ interaction on production ${visibleInputs[0].type} element`);
      
      let selector = '';
      if (visibleInputs[0].id) {
        selector = `#${visibleInputs[0].id}`;
      } else if (visibleInputs[0].type === 'textarea') {
        selector = 'textarea';
      } else {
        selector = 'input[type="text"]';
      }
      
      results.interactionResults = await testMentionTyping(page, selector);
      
      // Take screenshot after interaction
      await page.screenshot({ 
        path: '/workspaces/agent-feed/frontend/test-results/runtime-evidence-production-after-typing.png', 
        fullPage: true 
      });
    }
    
    results.javascriptErrors = jsErrors;
    
    // Write detailed results
    const evidenceFile = '/workspaces/agent-feed/frontend/test-results/DOM_INSPECTION_PRODUCTION.json';
    fs.writeFileSync(evidenceFile, JSON.stringify(results, null, 2));
    
    console.log('✅ PHASE 2 Complete: Production analyzed');
    console.log(`📊 Found ${results.mentionInputElements.length} mention-related elements`);
    console.log(`🎯 Interaction result: ${results.interactionResults?.success ? 'SUCCESS' : 'FAILED'}`);
  });

  test('PHASE 3: CommentForm Analysis', async ({ page }) => {
    const results: DOMInspectionResult = {
      url: 'http://localhost:5173/ (comments)',
      timestamp: new Date().toISOString(),
      domStructure: null,
      eventHandlers: null,
      computedStyles: null,
      javascriptErrors: [],
      mentionInputElements: [],
      interactionResults: null
    };

    console.log('🔍 PHASE 3: Analyzing CommentForm components...');
    
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for comment forms or reply buttons
    try {
      // Try to find and click a reply button or comment input
      const replyButton = page.locator('text=Reply').first();
      if (await replyButton.count() > 0) {
        await replyButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log(`⚠️ Could not interact with comment form: ${error.message}`);
    }
    
    // Take screenshot of comment state
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/runtime-evidence-comments.png', 
      fullPage: true 
    });
    
    // Inspect comment-related mention elements
    results.mentionInputElements = await inspectMentionElements(page);
    
    // Test @ typing in comment inputs
    const commentInputs = results.mentionInputElements.filter(el => 
      el.visible && 
      el.type !== 'dropdown' && 
      (el.placeholder?.toLowerCase().includes('comment') || 
       el.placeholder?.toLowerCase().includes('reply') ||
       el.className?.toLowerCase().includes('comment'))
    );
    
    if (commentInputs.length > 0) {
      console.log(`🎯 Testing @ interaction on comment input`);
      
      let selector = '';
      if (commentInputs[0].id) {
        selector = `#${commentInputs[0].id}`;
      } else if (commentInputs[0].type === 'textarea') {
        selector = 'textarea';
      } else {
        selector = 'input[type="text"]';
      }
      
      results.interactionResults = await testMentionTyping(page, selector);
    }
    
    results.javascriptErrors = jsErrors;
    
    // Write detailed results
    const evidenceFile = '/workspaces/agent-feed/frontend/test-results/DOM_INSPECTION_COMMENTS.json';
    fs.writeFileSync(evidenceFile, JSON.stringify(results, null, 2));
    
    console.log('✅ PHASE 3 Complete: Comments analyzed');
    console.log(`📊 Found ${results.mentionInputElements.length} mention-related elements`);
  });

  test('PHASE 4: Generate Runtime Comparison Report', async ({ page }) => {
    console.log('🔍 PHASE 4: Generating comprehensive runtime comparison report...');
    
    // Read all inspection results
    const demoResults = JSON.parse(fs.readFileSync('/workspaces/agent-feed/frontend/test-results/DOM_INSPECTION_MENTION_DEMO.json', 'utf8'));
    const productionResults = JSON.parse(fs.readFileSync('/workspaces/agent-feed/frontend/test-results/DOM_INSPECTION_PRODUCTION.json', 'utf8'));
    const commentsResults = JSON.parse(fs.readFileSync('/workspaces/agent-feed/frontend/test-results/DOM_INSPECTION_COMMENTS.json', 'utf8'));
    
    const comparisonReport = {
      timestamp: new Date().toISOString(),
      summary: {
        demoWorking: demoResults.interactionResults?.success || false,
        productionWorking: productionResults.interactionResults?.success || false,
        commentsWorking: commentsResults.interactionResults?.success || false
      },
      elementCounts: {
        demo: demoResults.mentionInputElements.length,
        production: productionResults.mentionInputElements.length,
        comments: commentsResults.mentionInputElements.length
      },
      visibilityAnalysis: {
        demo: demoResults.mentionInputElements.filter(el => el.visible).length,
        production: productionResults.mentionInputElements.filter(el => el.visible).length,
        comments: commentsResults.mentionInputElements.filter(el => el.visible).length
      },
      dropdownAnalysis: {
        demo: {
          afterAtTyping: demoResults.interactionResults?.afterAtTyping || null,
          afterFiltering: demoResults.interactionResults?.afterFiltering || null
        },
        production: {
          afterAtTyping: productionResults.interactionResults?.afterAtTyping || null,
          afterFiltering: productionResults.interactionResults?.afterFiltering || null
        },
        comments: {
          afterAtTyping: commentsResults.interactionResults?.afterAtTyping || null,
          afterFiltering: commentsResults.interactionResults?.afterFiltering || null
        }
      },
      criticalFindings: [],
      evidenceFiles: [
        'runtime-evidence-mention-demo.png',
        'runtime-evidence-mention-demo-after-typing.png',
        'runtime-evidence-production-initial.png',
        'runtime-evidence-production-postcreator-open.png',
        'runtime-evidence-production-after-typing.png',
        'runtime-evidence-comments.png',
        'DOM_INSPECTION_MENTION_DEMO.json',
        'DOM_INSPECTION_PRODUCTION.json',
        'DOM_INSPECTION_COMMENTS.json'
      ]
    };
    
    // Analyze critical findings
    if (comparisonReport.summary.demoWorking && !comparisonReport.summary.productionWorking) {
      comparisonReport.criticalFindings.push('CRITICAL: Demo works but production fails - component implementation differs');
    }
    
    if (comparisonReport.elementCounts.demo !== comparisonReport.elementCounts.production) {
      comparisonReport.criticalFindings.push(`Element count mismatch: Demo has ${comparisonReport.elementCounts.demo}, Production has ${comparisonReport.elementCounts.production}`);
    }
    
    if (comparisonReport.visibilityAnalysis.demo > comparisonReport.visibilityAnalysis.production) {
      comparisonReport.criticalFindings.push('Visibility issue: Production has fewer visible mention elements than demo');
    }
    
    // Write final report
    const reportFile = '/workspaces/agent-feed/frontend/test-results/RUNTIME_COMPARISON_REPORT.json';
    fs.writeFileSync(reportFile, JSON.stringify(comparisonReport, null, 2));
    
    console.log('✅ PHASE 4 Complete: Runtime comparison report generated');
    console.log(`🚨 Critical findings: ${comparisonReport.criticalFindings.length}`);
    comparisonReport.criticalFindings.forEach(finding => console.log(`   - ${finding}`));
    
    // Fail the test if production is broken but demo works
    if (comparisonReport.summary.demoWorking && !comparisonReport.summary.productionWorking) {
      throw new Error('Production mention system is broken while demo works - requires immediate fix');
    }
  });
});