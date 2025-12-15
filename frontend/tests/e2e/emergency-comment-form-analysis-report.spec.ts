import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';

test.describe('🚨 EMERGENCY: Comment Form Analysis Report Generator', () => {
  test('Generate comprehensive analysis report', async ({ page }) => {
    console.log('📊 GENERATING COMPREHENSIVE ANALYSIS REPORT...');
    
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    
    const analysis = {
      timestamp: new Date().toISOString(),
      mission: 'Comment Form DOM Investigation',
      findings: {
        replyButtons: [],
        textareas: [],
        forms: [],
        commentElements: [],
        reactComponents: [],
        eventHandlers: [],
        domStructure: null,
        screenshots: [],
        recommendations: []
      }
    };
    
    // 1. Analyze Reply Buttons
    try {
      const replyButtons = await page.$$eval('[class*="reply" i], [id*="reply" i], button:has-text("Reply"), text=Reply', els =>
        els.map((el, index) => ({
          index,
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          textContent: el.textContent,
          dataset: {...el.dataset},
          visible: el.offsetParent !== null,
          clickable: !el.disabled,
          boundingRect: el.getBoundingClientRect(),
          parentClassName: el.parentElement?.className,
          parentId: el.parentElement?.id
        }))
      );
      analysis.findings.replyButtons = replyButtons;
      console.log(`✅ Found ${replyButtons.length} reply buttons`);
    } catch (error) {
      console.log('❌ Error analyzing reply buttons:', error.message);
    }
    
    // 2. Analyze Textareas
    try {
      const textareas = await page.$$eval('textarea', els =>
        els.map((el, index) => ({
          index,
          placeholder: el.placeholder,
          className: el.className,
          id: el.id,
          name: el.name,
          dataset: {...el.dataset},
          visible: el.offsetParent !== null,
          disabled: el.disabled,
          readOnly: el.readOnly,
          value: el.value,
          rows: el.rows,
          cols: el.cols,
          boundingRect: el.getBoundingClientRect(),
          computedStyle: {
            display: getComputedStyle(el).display,
            visibility: getComputedStyle(el).visibility,
            opacity: getComputedStyle(el).opacity
          },
          parentInfo: {
            tagName: el.parentElement?.tagName,
            className: el.parentElement?.className,
            id: el.parentElement?.id
          }
        }))
      );
      analysis.findings.textareas = textareas;
      console.log(`✅ Found ${textareas.length} textareas`);
    } catch (error) {
      console.log('❌ Error analyzing textareas:', error.message);
    }
    
    // 3. Test Interaction Flow
    if (analysis.findings.replyButtons.length > 0) {
      try {
        console.log('🔄 Testing interaction flow...');
        await page.click('text=Reply');
        await page.waitForTimeout(1000);
        
        // Check what happened after click
        const postClickTextareas = await page.$$eval('textarea:visible', els =>
          els.map(el => ({
            placeholder: el.placeholder,
            className: el.className,
            id: el.id,
            focused: document.activeElement === el,
            boundingRect: el.getBoundingClientRect()
          }))
        );
        
        analysis.findings.postClickState = {
          visibleTextareas: postClickTextareas.length,
          textareaDetails: postClickTextareas
        };
        
        // Test input if textarea is available
        if (postClickTextareas.length > 0) {
          const textarea = page.locator('textarea:visible').first();
          await textarea.fill('TEST INPUT');
          const value = await textarea.inputValue();
          
          analysis.findings.inputTest = {
            successful: value === 'TEST INPUT',
            actualValue: value,
            expectedValue: 'TEST INPUT'
          };
        }
        
      } catch (error) {
        analysis.findings.interactionError = error.message;
      }
    }
    
    // 4. Component Analysis
    try {
      const componentAnalysis = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const components = [];
        
        elements.forEach(el => {
          // Look for React components
          const keys = Object.keys(el);
          const reactKey = keys.find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
          
          if (reactKey && el[reactKey]?.type) {
            const fiber = el[reactKey];
            components.push({
              componentName: fiber.type?.name || fiber.type?.displayName || 'Anonymous',
              element: {
                tagName: el.tagName,
                className: el.className,
                id: el.id
              },
              props: Object.keys(fiber.memoizedProps || {}),
              hasCommentRelatedProps: Object.keys(fiber.memoizedProps || {}).some(prop => 
                prop.toLowerCase().includes('comment') || 
                prop.toLowerCase().includes('reply')
              )
            });
          }
        });
        
        return components.filter(comp => 
          comp.componentName.toLowerCase().includes('comment') ||
          comp.componentName.toLowerCase().includes('reply') ||
          comp.componentName.toLowerCase().includes('form') ||
          comp.hasCommentRelatedProps
        );
      });
      
      analysis.findings.reactComponents = componentAnalysis;
      console.log(`✅ Found ${componentAnalysis.length} relevant React components`);
    } catch (error) {
      console.log('❌ Error analyzing React components:', error.message);
    }
    
    // 5. Generate Screenshots
    const screenshots = [
      { name: 'initial-state', path: '/workspaces/agent-feed/frontend/test-results/report-initial-state.png' },
      { name: 'after-reply-click', path: '/workspaces/agent-feed/frontend/test-results/report-after-reply-click.png' }
    ];
    
    await page.screenshot({ path: screenshots[0].path, fullPage: true });
    
    if (analysis.findings.replyButtons.length > 0) {
      try {
        await page.click('text=Reply');
        await page.waitForTimeout(500);
        await page.screenshot({ path: screenshots[1].path, fullPage: true });
      } catch (error) {
        console.log('❌ Error taking post-click screenshot:', error.message);
      }
    }
    
    analysis.findings.screenshots = screenshots;
    
    // 6. Generate Recommendations
    const recommendations = [];
    
    if (analysis.findings.replyButtons.length === 0) {
      recommendations.push({
        priority: 'CRITICAL',
        issue: 'No reply buttons found',
        solution: 'Verify Reply button implementation and selectors'
      });
    }
    
    if (analysis.findings.textareas.length === 0) {
      recommendations.push({
        priority: 'CRITICAL', 
        issue: 'No textareas found',
        solution: 'Verify comment form textarea implementation'
      });
    }
    
    if (analysis.findings.inputTest && !analysis.findings.inputTest.successful) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Textarea input not working properly',
        solution: 'Check event handlers and state management'
      });
    }
    
    if (analysis.findings.reactComponents.length === 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'No comment-related React components detected',
        solution: 'Verify component naming and structure'
      });
    }
    
    analysis.findings.recommendations = recommendations;
    
    // 7. Save Complete Report
    const reportPath = '/workspaces/agent-feed/frontend/test-results/emergency-comment-form-investigation-report.json';
    await fs.writeFile(reportPath, JSON.stringify(analysis, null, 2));
    
    console.log('📋 INVESTIGATION REPORT COMPLETE');
    console.log('📁 Report saved to:', reportPath);
    console.log('🔍 Key Findings:');
    console.log(`   - Reply Buttons: ${analysis.findings.replyButtons.length}`);
    console.log(`   - Textareas: ${analysis.findings.textareas.length}`);
    console.log(`   - React Components: ${analysis.findings.reactComponents.length}`);
    console.log(`   - Recommendations: ${analysis.findings.recommendations.length}`);
    
    // Always pass - this is investigation only
    expect(analysis.findings).toBeDefined();
  });
});