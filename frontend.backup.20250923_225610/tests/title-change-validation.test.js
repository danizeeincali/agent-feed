import { test, expect } from '@playwright/test';

test.describe('Title Change Validation', () => {
  test('Enhanced Agent Manager should display "Agents" as title', async ({ page }) => {
    console.log('🔍 Validating title change from "Enhanced Agent Manager" to "Agents"...');
    
    // Navigate to agents page (updated route)
    await page.goto('http://127.0.0.1:3001/agents');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Should not be a white screen
    const hasContent = await page.locator('body').evaluate(body => {
      return body.textContent.trim().length > 100;
    });
    expect(hasContent).toBe(true);
    console.log('✅ Page has content (not white screen)');
    
    // Should have the new title "Agents" (not "Enhanced Agent Manager")
    const newTitle = await page.locator('h1:has-text("Agents")').count();
    expect(newTitle).toBeGreaterThanOrEqual(1);
    console.log('✅ New title "Agents" found');
    
    // Should NOT have the old title
    const oldTitle = await page.locator('h1:has-text("Enhanced Agent Manager")').count();
    expect(oldTitle).toBe(0);
    console.log('✅ Old title "Enhanced Agent Manager" removed');
    
    // Should still have three tabs functioning
    const tabs = await page.locator('button[role="tab"]').count();
    expect(tabs).toBe(3);
    console.log('✅ Three tabs still present');
    
    // Should have Production, Development, Unified tabs
    const prodTab = await page.locator('button[role="tab"]:has-text("Production")').count();
    const devTab = await page.locator('button[role="tab"]:has-text("Development")').count();
    const unifiedTab = await page.locator('button[role="tab"]:has-text("Unified")').count();
    
    expect(prodTab).toBe(1);
    expect(devTab).toBe(1);
    expect(unifiedTab).toBe(1);
    console.log('✅ All three tabs (Production, Development, Unified) present');
    
    // Test tab functionality still works
    await page.click('button[role="tab"]:has-text("Development")');
    await page.waitForTimeout(500);
    
    const devTabSelected = await page.locator('button[role="tab"]:has-text("Development")').getAttribute('aria-selected');
    expect(devTabSelected).toBe('true');
    console.log('✅ Tab switching still functional');
    
    // Take screenshot with new title
    await page.screenshot({ path: 'test-results/agents-title-updated.png', fullPage: true });
    console.log('📸 Screenshot saved showing updated title');
    
    console.log('🎉 Title change validation PASSED!');
  });
  
  test('Navigation should show single "Agents" link', async ({ page }) => {
    console.log('🧭 Validating navigation changes...');
    
    // Go to home page
    await page.goto('http://127.0.0.1:3001/');
    await page.waitForTimeout(1000);
    
    // Should have single "Agents" link (not "Agent Manager" or "Enhanced Agents")
    const agentsLink = await page.locator('a[href="/agents"]').count();
    expect(agentsLink).toBe(1);
    console.log('✅ "Agents" navigation link found');
    
    // Should NOT have old links
    const oldAgentManagerLink = await page.locator('a[href="/agent-manager"]').count();
    const oldEnhancedAgentsLink = await page.locator('a[href="/agents-enhanced"]').count();
    
    expect(oldAgentManagerLink).toBe(0);
    expect(oldEnhancedAgentsLink).toBe(0);
    console.log('✅ Old navigation links removed');
    
    // Click the new Agents link
    await page.click('a[href="/agents"]');
    await page.waitForTimeout(2000);
    
    // Should navigate to /agents route
    expect(page.url()).toContain('/agents');
    console.log('✅ Navigation to /agents route works');
    
    // Should load Enhanced Agent Manager with new title
    const title = await page.locator('h1:has-text("Agents")').count();
    expect(title).toBeGreaterThanOrEqual(1);
    console.log('✅ Enhanced Agent Manager loads with new title');
    
    // Should show description about managing agents
    const description = await page.locator('text=Manage agents').count();
    expect(description).toBeGreaterThanOrEqual(1);
    console.log('✅ Component description present');
    
    console.log('🎉 Navigation validation PASSED!');
  });
});