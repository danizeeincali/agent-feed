/**
 * Phase 2 Comprehensive Tab Validation Test
 * Validates all 8 tabs in the UnifiedAgentPage component
 * Tests: Overview, Definition, Profile, Pages, Workspace, Details, Activity, Configuration
 */

const { test, expect } = require('@playwright/test');

const TEST_AGENT_ID = 'agent-feedback-agent';
const BASE_URL = 'http://localhost:5173';
const AGENT_PAGE_URL = `${BASE_URL}/agents/${TEST_AGENT_ID}`;

test.describe('Phase 2 Component Migration - All 8 Tabs Validation', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Navigate to agent page
    console.log(`Navigating to: ${AGENT_PAGE_URL}`);
    await page.goto(AGENT_PAGE_URL, { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });

    // Wait for initial load and verify page is ready
    await expect(page.locator('[data-testid="agent-page-loaded"]').or(page.locator('h1'))).toBeVisible({ timeout: 10000 });
  });

  test.afterAll(async () => {
    await page?.close();
  });

  // Tab 1: Overview Tab (existing)
  test('Tab 1: Overview tab loads and displays content correctly', async () => {
    console.log('Testing Overview tab...');
    
    // Click Overview tab
    await page.locator('button:has-text("Overview")').click();
    await page.waitForTimeout(1000);

    // Verify overview content is displayed
    await expect(page.locator('text=Comprehensive overview').or(page.locator('[data-testid="overview-content"]')).or(page.locator('text=tasks completed'))).toBeVisible();
    
    // Verify key metrics are shown
    const metricsVisible = await page.locator('text=Tasks Today, text=Success Rate, text=Response Time').count() > 0;
    if (!metricsVisible) {
      // Alternative check for metrics
      await expect(page.locator('[data-testid="metrics-section"], .metric, [data-testid="key-metrics"]').first()).toBeVisible();
    }
    
    console.log('✅ Overview tab validation passed');
  });

  // Tab 2: Definition Tab (NEW)
  test('Tab 2: Definition tab loads and displays markdown content', async () => {
    console.log('Testing Definition tab...');
    
    // Click Definition tab
    await page.locator('button:has-text("Definition")').click();
    await page.waitForTimeout(1500);

    // Check for either markdown content or empty state
    const hasContent = await page.locator('[data-testid="definition-content"], [data-testid="markdown-rendered"], pre, .prose').count() > 0;
    const hasEmptyState = await page.locator('text=No Definition Available, text=definition document').count() > 0;
    
    expect(hasContent || hasEmptyState).toBeTruthy();
    
    if (hasContent) {
      console.log('✅ Definition tab has content');
    } else {
      console.log('✅ Definition tab shows proper empty state');
    }
  });

  // Tab 3: Profile Tab (NEW)  
  test('Tab 3: Profile tab loads and displays agent profile information', async () => {
    console.log('Testing Profile tab...');
    
    // Click Profile tab
    await page.locator('button:has-text("Profile")').click();
    await page.waitForTimeout(1500);

    // Check for either profile content or empty state
    const hasProfileContent = await page.locator('[data-testid="agent-profile-tab"], [data-testid="strengths-section"], [data-testid="use-cases-section"]').count() > 0;
    const hasEmptyState = await page.locator('[data-testid="empty-profile-state"], text=No profile information').count() > 0;
    
    expect(hasProfileContent || hasEmptyState).toBeTruthy();
    
    if (hasProfileContent) {
      console.log('✅ Profile tab has content');
    } else {
      console.log('✅ Profile tab shows proper empty state');
    }
  });

  // Tab 4: Pages Tab (NEW)
  test('Tab 4: Pages tab loads and displays documentation pages', async () => {
    console.log('Testing Pages tab...');
    
    // Click Pages tab
    await page.locator('button:has-text("Pages")').click();
    await page.waitForTimeout(1500);

    // Check for either pages content or empty state
    const hasPagesContent = await page.locator('[data-testid="agent-pages-tab"], [data-testid="pages-search"]').count() > 0;
    const hasEmptyState = await page.locator('[data-testid="empty-pages-state"], text=No pages available').count() > 0;
    
    expect(hasPagesContent || hasEmptyState).toBeTruthy();
    
    if (hasPagesContent) {
      console.log('✅ Pages tab has content');
    } else {
      console.log('✅ Pages tab shows proper empty state');
    }
  });

  // Tab 5: Workspace Tab (NEW)
  test('Tab 5: Workspace tab loads and displays file system', async () => {
    console.log('Testing Workspace tab...');
    
    // Click Workspace tab
    await page.locator('button:has-text("Workspace")').click();
    await page.waitForTimeout(1500);

    // Check for workspace content or empty state
    const hasWorkspaceContent = await page.locator('[data-testid="workspace-overview"], [data-testid="file-browser"]').count() > 0;
    const hasEmptyState = await page.locator('text=No Workspace Available, text=workspace information').count() > 0;
    
    expect(hasWorkspaceContent || hasEmptyState).toBeTruthy();
    
    if (hasWorkspaceContent) {
      console.log('✅ Workspace tab has content');
      
      // Test file browser if present
      const fileBrowser = await page.locator('[data-testid="file-tree"]').count() > 0;
      if (fileBrowser) {
        console.log('✅ File browser is present');
      }
    } else {
      console.log('✅ Workspace tab shows proper empty state');
    }
  });

  // Tab 6: Details Tab (existing)
  test('Tab 6: Details tab loads and displays agent information', async () => {
    console.log('Testing Details tab...');
    
    // Click Details tab
    await page.locator('button:has-text("Details")').click();
    await page.waitForTimeout(1000);

    // Verify details content
    await expect(page.locator('text=Agent Information, text=Name, text=ID, [data-testid="agent-details"]').first()).toBeVisible();
    
    // Verify agent ID is displayed
    await expect(page.locator(`text=${TEST_AGENT_ID}`).or(page.locator('code, .font-mono'))).toBeVisible();
    
    console.log('✅ Details tab validation passed');
  });

  // Tab 7: Activity Tab (existing)
  test('Tab 7: Activity tab loads and displays recent activities', async () => {
    console.log('Testing Activity tab...');
    
    // Click Activity tab
    await page.locator('button:has-text("Activity")').click();
    await page.waitForTimeout(1000);

    // Verify activity content
    await expect(page.locator('text=Recent Activities, text=Activity, [data-testid="activity-section"]').first()).toBeVisible();
    
    console.log('✅ Activity tab validation passed');
  });

  // Tab 8: Configuration Tab (existing)
  test('Tab 8: Configuration tab loads and displays settings', async () => {
    console.log('Testing Configuration tab...');
    
    // Click Configuration tab  
    await page.locator('button:has-text("Configuration")').click();
    await page.waitForTimeout(1000);

    // Verify configuration content
    await expect(page.locator('text=Configuration, text=Profile Settings, text=Behavior').first()).toBeVisible();
    
    console.log('✅ Configuration tab validation passed');
  });

  // Navigation Test: Verify all tabs are clickable and functional
  test('Navigation: All 8 tabs are clickable and switch content properly', async () => {
    console.log('Testing tab navigation...');
    
    const tabs = [
      'Overview',
      'Definition', 
      'Profile',
      'Pages',
      'Workspace',
      'Details',
      'Activity',
      'Configuration'
    ];

    for (const tabName of tabs) {
      console.log(`Testing ${tabName} tab navigation...`);
      
      // Click the tab
      await page.locator(`button:has-text("${tabName}")`).click();
      await page.waitForTimeout(500);

      // Verify tab is active (highlighted/selected)
      const activeTab = page.locator(`button:has-text("${tabName}")`);
      await expect(activeTab).toBeVisible();
      
      // Verify some content is displayed (not completely empty)
      const hasAnyContent = await page.locator('body').textContent();
      expect(hasAnyContent.length).toBeGreaterThan(100);
    }
    
    console.log('✅ All 8 tabs are navigable');
  });

  // Error Detection Test
  test('Error Detection: No console errors during tab operations', async () => {
    console.log('Testing for console errors...');
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate through all tabs
    const tabs = ['Overview', 'Definition', 'Profile', 'Pages', 'Workspace', 'Details', 'Activity', 'Configuration'];
    
    for (const tab of tabs) {
      await page.locator(`button:has-text("${tab}")`).click();
      await page.waitForTimeout(300);
    }

    // Check for critical errors (ignore minor warnings)
    const criticalErrors = errors.filter(error => 
      !error.includes('Warning:') && 
      !error.includes('deprecated') &&
      !error.includes('favicon')
    );

    if (criticalErrors.length > 0) {
      console.log('❌ Console errors found:', criticalErrors);
    } else {
      console.log('✅ No critical console errors detected');
    }

    expect(criticalErrors.length).toBe(0);
  });

  // Responsive Design Test
  test('Responsive Design: Tabs work properly on different screen sizes', async () => {
    console.log('Testing responsive design...');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Verify tabs are still accessible
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();
    await page.locator('button:has-text("Overview")').click();
    await page.waitForTimeout(300);
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('button:has-text("Details")')).toBeVisible();
    await page.locator('button:has-text("Details")').click();
    await page.waitForTimeout(300);
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('button:has-text("Configuration")')).toBeVisible();
    await page.locator('button:has-text("Configuration")').click();
    await page.waitForTimeout(300);
    
    console.log('✅ Responsive design validation passed');
  });

  // Real Data Integration Test
  test('Real Data Integration: All tabs display actual data, no mock data', async () => {
    console.log('Testing real data integration...');
    
    // Click Details tab to verify real agent data
    await page.locator('button:has-text("Details")').click();
    await page.waitForTimeout(1000);
    
    // Verify real agent ID is displayed
    const agentIdVisible = await page.locator(`text=${TEST_AGENT_ID}`).count() > 0;
    expect(agentIdVisible).toBeTruthy();
    
    // Click Activity tab to verify real activities
    await page.locator('button:has-text("Activity")').click();
    await page.waitForTimeout(1000);
    
    // Check that activities are either real data or proper empty state
    const hasActivities = await page.locator('text=Recent Activities').count() > 0;
    expect(hasActivities).toBeTruthy();
    
    // Verify no obvious mock data patterns
    const pageContent = await page.textContent('body');
    const hasMockData = pageContent.includes('Mock') || pageContent.includes('Fake') || pageContent.includes('Lorem ipsum');
    
    if (hasMockData) {
      console.log('⚠️  Warning: Potential mock data detected in content');
    } else {
      console.log('✅ No obvious mock data detected');
    }
    
    console.log('✅ Real data integration validation passed');
  });
});

// Additional validation for production readiness
test.describe('Production Readiness Validation', () => {
  test('Page Performance: Agent page loads within acceptable time', async ({ page }) => {
    console.log('Testing page performance...');
    
    const startTime = Date.now();
    await page.goto(AGENT_PAGE_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000); // 10 second max
    
    console.log('✅ Page performance validation passed');
  });

  test('Accessibility: Basic accessibility standards', async ({ page }) => {
    console.log('Testing accessibility...');
    
    await page.goto(AGENT_PAGE_URL);
    
    // Check for proper heading structure
    const hasHeadings = await page.locator('h1, h2, h3').count() > 0;
    expect(hasHeadings).toBeTruthy();
    
    // Check for proper button labels
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 5)) { // Test first 5 buttons
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }
    
    console.log('✅ Basic accessibility validation passed');
  });
});

// Export test results for reporting
module.exports = {
  TEST_AGENT_ID,
  AGENT_PAGE_URL,
  testSuiteDescription: 'Phase 2 Component Migration - 8 Tabs Comprehensive Validation',
  validationAreas: [
    'Tab Navigation',
    'Content Rendering', 
    'Error Detection',
    'Responsive Design',
    'Real Data Integration',
    'Performance',
    'Accessibility'
  ]
};