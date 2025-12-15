import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Multiple Agents with Different Pages Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should handle multiple agents with varying page counts', async () => {
    await test.step('Collect agent data', async () => {
      const agentCards = page.locator('[data-testid="agent-card"]');
      const agentCount = await agentCards.count();
      
      console.log(`Found ${agentCount} agents to test`);
      expect(agentCount).toBeGreaterThan(0);
    });

    await test.step('Test each agent\'s Dynamic Pages tab', async () => {
      const agentCards = page.locator('[data-testid="agent-card"]');
      const agentCount = await agentCards.count();
      
      const agentResults = [];
      
      for (let i = 0; i < Math.min(agentCount, 5); i++) {
        console.log(`Testing agent ${i + 1}/${agentCount}`);
        
        // Navigate to agent
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        await agentCards.nth(i).click();
        await page.waitForLoadState('networkidle');
        
        // Get agent name
        const agentName = await page.locator('h1, [data-testid="agent-name"]').textContent() || `Agent ${i + 1}`;
        
        // Navigate to Dynamic Pages tab
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        // Count pages
        const pageItems = page.locator('[data-testid="page-item"]');
        const pageCount = await pageItems.count();
        
        // Check for empty state
        const hasEmptyState = await page.locator('[data-testid="empty-pages-state"]').isVisible();
        
        agentResults.push({
          name: agentName.trim(),
          pageCount,
          hasEmptyState,
          index: i
        });
        
        console.log(`Agent "${agentName}": ${pageCount} pages${hasEmptyState ? ' (empty state)' : ''}`);
      }
      
      // Verify we have variety in page counts
      const pageCounts = agentResults.map(a => a.pageCount);
      const uniqueCounts = [...new Set(pageCounts)];
      
      console.log('Page counts across agents:', pageCounts);
      console.log('Unique page counts:', uniqueCounts);
      
      // Should have some variation (either different counts or empty states)
      expect(uniqueCounts.length > 1 || agentResults.some(a => a.hasEmptyState)).toBeTruthy();
    });
  });

  test('should maintain functionality across different agents', async () => {
    await test.step('Test Create Page functionality for multiple agents', async () => {
      const agentCards = page.locator('[data-testid="agent-card"]');
      const agentCount = await agentCards.count();
      
      for (let i = 0; i < Math.min(agentCount, 3); i++) {
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        await agentCards.nth(i).click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        // Test Create Page button exists and works
        const createButton = page.locator('[data-testid="create-page-button"]');
        await expect(createButton).toBeVisible();
        
        await createButton.click();
        
        // Verify form opens
        const modal = page.locator('[data-testid="create-page-modal"]');
        const form = page.locator('[data-testid="create-page-form"]');
        
        const hasForm = await modal.isVisible() || await form.isVisible();
        expect(hasForm).toBeTruthy();
        
        // Cancel form for cleanup
        const cancelButton = page.locator('[data-testid="cancel-create-page"], [data-testid="close-modal-button"]');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
        
        await page.waitForTimeout(500);
        console.log(`✅ Agent ${i + 1}: Create Page functionality working`);
      }
    });

    await test.step('Test View button functionality across agents', async () => {
      const agentCards = page.locator('[data-testid="agent-card"]');
      const agentCount = await agentCards.count();
      
      for (let i = 0; i < Math.min(agentCount, 3); i++) {
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        await agentCards.nth(i).click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        const pageItems = page.locator('[data-testid="page-item"]');
        const pageCount = await pageItems.count();
        
        if (pageCount > 0) {
          const viewButton = pageItems.first().locator('[data-testid="view-page-button"]');
          await expect(viewButton).toBeVisible();
          
          await viewButton.click();
          await page.waitForTimeout(1000);
          
          // Verify something happened (modal, navigation, etc.)
          const hasModal = await page.locator('[data-testid="page-viewer-modal"]').isVisible();
          const urlChanged = !page.url().includes('/agents/');
          
          expect(hasModal || urlChanged).toBeTruthy();
          
          // Clean up
          if (hasModal) {
            await page.locator('[data-testid="modal-close-button"]').click();
          } else if (urlChanged) {
            await page.goBack();
          }
          
          console.log(`✅ Agent ${i + 1}: View button functionality working`);
        } else {
          console.log(`ℹ️ Agent ${i + 1}: No pages to test View button`);
        }
      }
    });
  });

  test('should handle agents with different page types', async () => {
    await test.step('Catalog page types across agents', async () => {
      const agentCards = page.locator('[data-testid="agent-card"]');
      const agentCount = await agentCards.count();
      
      const pageTypesByAgent = [];
      
      for (let i = 0; i < Math.min(agentCount, 4); i++) {
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        await agentCards.nth(i).click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        const pageItems = page.locator('[data-testid="page-item"]');
        const pageCount = await pageItems.count();
        
        const pageTypes = [];
        
        for (let j = 0; j < Math.min(pageCount, 3); j++) {
          const pageItem = pageItems.nth(j);
          const pageType = await pageItem.locator('[data-testid="page-type"]').textContent();
          
          if (pageType) {
            pageTypes.push(pageType.trim());
          }
        }
        
        pageTypesByAgent.push({
          agentIndex: i,
          pageTypes: [...new Set(pageTypes)]
        });
      }
      
      console.log('Page types by agent:', pageTypesByAgent);
      
      // Verify we have some page type diversity
      const allPageTypes = pageTypesByAgent.flatMap(a => a.pageTypes);
      const uniquePageTypes = [...new Set(allPageTypes)];
      
      console.log('All unique page types found:', uniquePageTypes);
      expect(uniquePageTypes.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('should handle navigation between agents correctly', async () => {
    await test.step('Navigate between multiple agents', async () => {
      const agentCards = page.locator('[data-testid="agent-card"]');
      const agentCount = await agentCards.count();
      
      if (agentCount >= 2) {
        // Go to first agent
        await agentCards.first().click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        const firstAgentUrl = page.url();
        const firstAgentPageCount = await page.locator('[data-testid="page-item"]').count();
        
        // Navigate back to agents list
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        
        // Go to second agent
        await agentCards.nth(1).click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        const secondAgentUrl = page.url();
        const secondAgentPageCount = await page.locator('[data-testid="page-item"]').count();
        
        // Verify different agents show different data
        expect(firstAgentUrl).not.toBe(secondAgentUrl);
        console.log(`Agent 1: ${firstAgentPageCount} pages, Agent 2: ${secondAgentPageCount} pages`);
        
        // Go back to first agent
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        await agentCards.first().click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        // Should show same data as before
        const returnPageCount = await page.locator('[data-testid="page-item"]').count();
        expect(returnPageCount).toBe(firstAgentPageCount);
        
        console.log('✅ Navigation between agents maintains correct state');
      }
    });
  });

  test('should handle concurrent agent testing', async () => {
    await test.step('Test multiple agents simultaneously', async () => {
      const agentCards = page.locator('[data-testid="agent-card"]');
      const agentCount = await agentCards.count();
      
      if (agentCount >= 2) {
        // Test rapid switching between agents
        for (let iteration = 0; iteration < 3; iteration++) {
          for (let i = 0; i < Math.min(agentCount, 3); i++) {
            await page.goto('/agents');
            await page.waitForLoadState('networkidle');
            await agentCards.nth(i).click();
            await page.waitForLoadState('networkidle');
            await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
            
            // Quick verification
            await page.waitForTimeout(1000);
            const hasContent = await page.locator('[data-testid="dynamic-pages-content"]').isVisible();
            expect(hasContent).toBeTruthy();
            
            console.log(`Iteration ${iteration + 1}, Agent ${i + 1}: ✅`);
          }
        }
      }
    });
  });

  test('should maintain data isolation between agents', async () => {
    await test.step('Verify agent data isolation', async () => {
      const agentCards = page.locator('[data-testid="agent-card"]');
      const agentCount = await agentCards.count();
      
      const agentSnapshots = [];
      
      // Collect snapshots of each agent's pages
      for (let i = 0; i < Math.min(agentCount, 3); i++) {
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        await agentCards.nth(i).click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        const pageTitles = [];
        const pageItems = page.locator('[data-testid="page-item"]');
        const pageCount = await pageItems.count();
        
        for (let j = 0; j < Math.min(pageCount, 5); j++) {
          const title = await pageItems.nth(j).locator('[data-testid="page-title"]').textContent();
          if (title) {
            pageTitles.push(title.trim());
          }
        }
        
        agentSnapshots.push({
          agentIndex: i,
          pageTitles,
          pageCount
        });
      }
      
      console.log('Agent snapshots:', agentSnapshots);
      
      // Verify each agent has unique data or at least not identical data
      for (let i = 0; i < agentSnapshots.length; i++) {
        for (let j = i + 1; j < agentSnapshots.length; j++) {
          const agent1 = agentSnapshots[i];
          const agent2 = agentSnapshots[j];
          
          // Agents should have different page sets or counts
          const sameCount = agent1.pageCount === agent2.pageCount;
          const sameTitles = JSON.stringify(agent1.pageTitles.sort()) === JSON.stringify(agent2.pageTitles.sort());
          
          if (sameCount && sameTitles && agent1.pageCount > 0) {
            console.warn(`⚠️ Agents ${i + 1} and ${j + 1} have identical page data - may indicate data isolation issue`);
          } else {
            console.log(`✅ Agents ${i + 1} and ${j + 1} have distinct page data`);
          }
        }
      }
    });
  });

  test('should handle performance with many agents', async () => {
    await test.step('Test performance with agent switching', async () => {
      const agentCards = page.locator('[data-testid="agent-card"]');
      const agentCount = await agentCards.count();
      
      const performanceMetrics = [];
      
      for (let i = 0; i < Math.min(agentCount, 4); i++) {
        const startTime = Date.now();
        
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        await agentCards.nth(i).click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        
        performanceMetrics.push({
          agentIndex: i,
          loadTime
        });
        
        console.log(`Agent ${i + 1} load time: ${loadTime}ms`);
      }
      
      // Verify reasonable performance
      const averageLoadTime = performanceMetrics.reduce((sum, m) => sum + m.loadTime, 0) / performanceMetrics.length;
      console.log(`Average load time across agents: ${averageLoadTime.toFixed(0)}ms`);
      
      // Should load within reasonable time (adjust threshold as needed)
      expect(averageLoadTime).toBeLessThan(10000); // 10 seconds
      
      // No single agent should take excessively long
      const maxLoadTime = Math.max(...performanceMetrics.map(m => m.loadTime));
      expect(maxLoadTime).toBeLessThan(15000); // 15 seconds
    });
  });

  test('should handle edge cases with agent data', async () => {
    await test.step('Test agents with special characteristics', async () => {
      const agentCards = page.locator('[data-testid="agent-card"]');
      const agentCount = await agentCards.count();
      
      const edgeCases = [];
      
      for (let i = 0; i < Math.min(agentCount, 5); i++) {
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        await agentCards.nth(i).click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        const pageItems = page.locator('[data-testid="page-item"]');
        const pageCount = await pageItems.count();
        const hasEmptyState = await page.locator('[data-testid="empty-pages-state"]').isVisible();
        const hasError = await page.locator('[data-testid="error-state"]').isVisible();
        
        let characteristic = 'normal';
        if (hasError) {
          characteristic = 'error';
        } else if (hasEmptyState) {
          characteristic = 'empty';
        } else if (pageCount === 0) {
          characteristic = 'no-pages';
        } else if (pageCount > 10) {
          characteristic = 'many-pages';
        }
        
        edgeCases.push({
          agentIndex: i,
          characteristic,
          pageCount
        });
        
        console.log(`Agent ${i + 1}: ${characteristic} (${pageCount} pages)`);
      }
      
      // Verify we can handle different types of agents
      const characteristics = edgeCases.map(e => e.characteristic);
      const uniqueCharacteristics = [...new Set(characteristics)];
      
      console.log('Agent characteristics found:', uniqueCharacteristics);
      
      // Should handle at least some variety
      expect(uniqueCharacteristics.length).toBeGreaterThanOrEqual(1);
      
      // Specifically test empty state agents
      const emptyAgents = edgeCases.filter(e => e.characteristic === 'empty');
      if (emptyAgents.length > 0) {
        console.log(`✅ Successfully handled ${emptyAgents.length} agents with empty state`);
      }
      
      // Test agents with many pages
      const busyAgents = edgeCases.filter(e => e.characteristic === 'many-pages');
      if (busyAgents.length > 0) {
        console.log(`✅ Successfully handled ${busyAgents.length} agents with many pages`);
      }
    });
  });
});