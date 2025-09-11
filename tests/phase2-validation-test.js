/**
 * Phase 2 Production Validation Test Suite
 * Validates all 8 tabs are working in UnifiedAgentPage
 * Tests real data integration and component stability
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class Phase2ValidationTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 2 - UnifiedAgentPage with 8 Tabs',
      passed: 0,
      failed: 0,
      errors: [],
      tabValidation: {
        overview: { status: 'pending', errors: [] },
        definition: { status: 'pending', errors: [] },
        profile: { status: 'pending', errors: [] },
        pages: { status: 'pending', errors: [] },
        workspace: { status: 'pending', errors: [] },
        details: { status: 'pending', errors: [] },
        activity: { status: 'pending', errors: [] },
        configuration: { status: 'pending', errors: [] }
      },
      dataIntegration: { status: 'pending', errors: [] },
      stability: { status: 'pending', errors: [] }
    };
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Phase 2 Production Validation...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      this.page = await this.browser.newPage();
      
      // Set viewport
      await this.page.setViewport({ width: 1280, height: 800 });
      
      // Enable console logging
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          this.results.errors.push(`Console Error: ${msg.text()}`);
        }
      });
      
      // Handle page errors
      this.page.on('pageerror', error => {
        this.results.errors.push(`Page Error: ${error.message}`);
      });
      
      console.log('✅ Browser initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      this.results.errors.push(`Initialization failed: ${error.message}`);
      return false;
    }
  }

  async testBackendConnectivity() {
    try {
      console.log('🔍 Testing backend connectivity...');
      const response = await fetch('http://localhost:3000/api/health');
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      const health = await response.json();
      console.log('✅ Backend connectivity verified');
      return true;
    } catch (error) {
      console.error('❌ Backend connectivity failed:', error);
      this.results.errors.push(`Backend connectivity: ${error.message}`);
      return false;
    }
  }

  async loadAgentPage() {
    try {
      console.log('🌐 Loading UnifiedAgentPage...');
      
      // Navigate to agent page
      const agentUrl = 'http://localhost:5173/agents/agent-feed-back-agent';
      await this.page.goto(agentUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait for page to load completely
      await this.page.waitForSelector('[data-testid="unified-agent-page"], .min-h-screen', { timeout: 10000 });
      
      // Check for loading indicators
      const loadingIndicator = await this.page.$('.animate-spin, [data-testid="loading"]');
      if (loadingIndicator) {
        console.log('⏳ Waiting for loading to complete...');
        await this.page.waitForFunction(
          () => !document.querySelector('.animate-spin, [data-testid="loading"]'),
          { timeout: 15000 }
        );
      }
      
      console.log('✅ UnifiedAgentPage loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load UnifiedAgentPage:', error);
      this.results.errors.push(`Page load failed: ${error.message}`);
      return false;
    }
  }

  async validateTab(tabName, tabId) {
    try {
      console.log(`🔍 Validating ${tabName} tab...`);
      
      // Click the tab
      const tabSelector = `button[data-tab="${tabId}"], button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`;
      const alternativeSelector = `button:nth-child(${this.getTabIndex(tabId) + 1})`;
      
      let tabButton = await this.page.$(tabSelector);
      if (!tabButton) {
        // Try alternative selector
        const tabButtons = await this.page.$$('.flex.space-x-8 button, nav button, [role="tablist"] button');
        tabButton = tabButtons[this.getTabIndex(tabId)];
      }
      
      if (!tabButton) {
        throw new Error(`Tab button not found for ${tabName}`);
      }
      
      await tabButton.click();
      await this.page.waitForTimeout(1000); // Wait for tab switch animation
      
      // Validate tab-specific content
      const validationResult = await this.validateTabContent(tabName, tabId);
      
      if (validationResult.success) {
        this.results.tabValidation[tabId].status = 'passed';
        this.results.passed++;
        console.log(`✅ ${tabName} tab validation passed`);
      } else {
        this.results.tabValidation[tabId].status = 'failed';
        this.results.tabValidation[tabId].errors = validationResult.errors;
        this.results.failed++;
        console.log(`❌ ${tabName} tab validation failed:`, validationResult.errors);
      }
      
      return validationResult.success;
    } catch (error) {
      console.error(`❌ ${tabName} tab validation error:`, error);
      this.results.tabValidation[tabId].status = 'failed';
      this.results.tabValidation[tabId].errors.push(error.message);
      this.results.failed++;
      return false;
    }
  }

  getTabIndex(tabId) {
    const tabOrder = ['overview', 'definition', 'profile', 'pages', 'filesystem', 'details', 'activity', 'configuration'];
    return tabOrder.indexOf(tabId);
  }

  async validateTabContent(tabName, tabId) {
    const errors = [];
    
    try {
      switch (tabId) {
        case 'overview':
          // Check for hero section and metrics
          const heroSection = await this.page.$('.bg-gradient-to-r, [data-testid="hero-section"]');
          const metricsGrid = await this.page.$('.grid.grid-cols-2, [data-testid="metrics-grid"]');
          
          if (!heroSection) errors.push('Hero section not found');
          if (!metricsGrid) errors.push('Metrics grid not found');
          break;
          
        case 'definition':
          // Check for AgentDefinitionTab content
          const definitionContent = await this.page.$('[data-testid="definition-content"], .prose');
          const tableOfContents = await this.page.$('[data-testid="table-of-contents"]');
          
          if (!definitionContent) errors.push('Definition content not found');
          break;
          
        case 'profile':
          // Check for AgentProfileTab content
          const strengthsSection = await this.page.$('[data-testid="strengths-section"], [aria-label="Strengths list"]');
          const useCasesSection = await this.page.$('[data-testid="use-cases-section"], [aria-label="Use cases list"]');
          const limitationsSection = await this.page.$('[data-testid="limitations-section"], .limitations-section');
          
          if (!strengthsSection) errors.push('Strengths section not found');
          if (!useCasesSection) errors.push('Use cases section not found');
          if (!limitationsSection) errors.push('Limitations section not found');
          break;
          
        case 'pages':
          // Check for AgentPagesTab content
          const pagesSearch = await this.page.$('[data-testid="pages-search"]');
          const pagesList = await this.page.$('[data-testid="agent-pages-tab"], [aria-label="Pages list"]');
          
          if (!pagesSearch) errors.push('Pages search not found');
          if (!pagesList) errors.push('Pages list not found');
          break;
          
        case 'filesystem':
          // Check for AgentFileSystemTab content
          const workspaceOverview = await this.page.$('[data-testid="workspace-overview"]');
          const fileBrowser = await this.page.$('[data-testid="file-browser"]');
          const fileTree = await this.page.$('[data-testid="file-tree"]');
          
          if (!workspaceOverview) errors.push('Workspace overview not found');
          if (!fileBrowser) errors.push('File browser not found');
          if (!fileTree) errors.push('File tree not found');
          break;
          
        case 'details':
          // Check for existing details content
          const agentInfo = await this.page.$('h3:has-text("Agent Information"), [data-testid="agent-info"]');
          const capabilities = await this.page.$('h3:has-text("Capabilities"), [data-testid="capabilities"]');
          
          if (!agentInfo) errors.push('Agent information not found');
          if (!capabilities) errors.push('Capabilities section not found');
          break;
          
        case 'activity':
          // Check for existing activity content
          const recentActivities = await this.page.$('h3:has-text("Recent Activities"), [data-testid="recent-activities"]');
          const postsSection = await this.page.$('h3:has-text("Posts"), [data-testid="posts-section"]');
          
          if (!recentActivities) errors.push('Recent activities not found');
          break;
          
        case 'configuration':
          // Check for existing configuration content
          const profileConfig = await this.page.$('h3:has-text("Profile Settings"), [data-testid="profile-config"]');
          const behaviorConfig = await this.page.$('h3:has-text("Behavior Settings"), [data-testid="behavior-config"]');
          
          if (!profileConfig) errors.push('Profile configuration not found');
          if (!behaviorConfig) errors.push('Behavior configuration not found');
          break;
      }
      
      return { success: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Content validation error: ${error.message}`);
      return { success: false, errors };
    }
  }

  async testDataIntegration() {
    try {
      console.log('🔍 Testing real data integration...');
      
      // Check if agent data is loaded from API
      const agentData = await this.page.evaluate(() => {
        // Try to find agent name/title in DOM
        const title = document.querySelector('h1, [data-testid="agent-name"], .text-xl');
        const status = document.querySelector('[data-testid="agent-status"], .badge, .status');
        
        return {
          hasTitle: !!title,
          titleText: title?.textContent || '',
          hasStatus: !!status,
          statusText: status?.textContent || ''
        };
      });
      
      if (!agentData.hasTitle || agentData.titleText.trim() === '') {
        throw new Error('Agent title/name not found or empty');
      }
      
      if (!agentData.hasStatus) {
        console.warn('⚠️ Agent status not clearly identified');
      }
      
      this.results.dataIntegration.status = 'passed';
      console.log('✅ Data integration validation passed');
      return true;
    } catch (error) {
      console.error('❌ Data integration failed:', error);
      this.results.dataIntegration.status = 'failed';
      this.results.dataIntegration.errors.push(error.message);
      return false;
    }
  }

  async testStability() {
    try {
      console.log('🔍 Testing application stability...');
      
      // Test rapid tab switching
      const tabIds = ['overview', 'definition', 'profile', 'pages', 'filesystem', 'details', 'activity', 'configuration'];
      
      for (let i = 0; i < 2; i++) { // Switch through tabs twice
        for (const tabId of tabIds) {
          const tabIndex = this.getTabIndex(tabId);
          const tabButtons = await this.page.$$('.flex.space-x-8 button, nav button, [role="tablist"] button');
          
          if (tabButtons[tabIndex]) {
            await tabButtons[tabIndex].click();
            await this.page.waitForTimeout(200); // Brief wait between switches
          }
        }
      }
      
      // Check for JavaScript errors after rapid switching
      const consoleErrors = this.results.errors.filter(error => error.includes('Console Error'));
      const pageErrors = this.results.errors.filter(error => error.includes('Page Error'));
      
      if (consoleErrors.length > 2 || pageErrors.length > 0) {
        throw new Error(`Too many errors detected: ${consoleErrors.length} console errors, ${pageErrors.length} page errors`);
      }
      
      this.results.stability.status = 'passed';
      console.log('✅ Stability testing passed');
      return true;
    } catch (error) {
      console.error('❌ Stability testing failed:', error);
      this.results.stability.status = 'failed';
      this.results.stability.errors.push(error.message);
      return false;
    }
  }

  async runFullValidation() {
    console.log('🎯 Starting Phase 2 Production Validation...\n');
    
    // Initialize browser
    if (!await this.initialize()) {
      return this.generateReport();
    }
    
    // Test backend connectivity
    if (!await this.testBackendConnectivity()) {
      await this.cleanup();
      return this.generateReport();
    }
    
    // Load the agent page
    if (!await this.loadAgentPage()) {
      await this.cleanup();
      return this.generateReport();
    }
    
    // Validate all 8 tabs
    const tabs = [
      { name: 'Overview', id: 'overview' },
      { name: 'Definition', id: 'definition' },
      { name: 'Profile', id: 'profile' },
      { name: 'Pages', id: 'pages' },
      { name: 'Workspace', id: 'filesystem' },
      { name: 'Details', id: 'details' },
      { name: 'Activity', id: 'activity' },
      { name: 'Configuration', id: 'configuration' }
    ];
    
    for (const tab of tabs) {
      await this.validateTab(tab.name, tab.id);
    }
    
    // Test data integration
    await this.testDataIntegration();
    
    // Test stability
    await this.testStability();
    
    await this.cleanup();
    return this.generateReport();
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  generateReport() {
    const totalTests = 10; // 8 tabs + data integration + stability
    const successRate = ((this.results.passed / totalTests) * 100).toFixed(1);
    
    const report = {
      ...this.results,
      summary: {
        totalTests,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: `${successRate}%`,
        status: this.results.failed === 0 ? 'PASSED' : 'FAILED'
      }
    };
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'phase2-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Console summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 PHASE 2 VALIDATION RESULTS');
    console.log('='.repeat(80));
    console.log(`Status: ${report.summary.status}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`Tests Passed: ${report.summary.passed}/${report.summary.totalTests}`);
    
    if (report.summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      Object.entries(this.results.tabValidation).forEach(([tabId, result]) => {
        if (result.status === 'failed') {
          console.log(`  - ${tabId.charAt(0).toUpperCase() + tabId.slice(1)} Tab: ${result.errors.join(', ')}`);
        }
      });
      
      if (this.results.dataIntegration.status === 'failed') {
        console.log(`  - Data Integration: ${this.results.dataIntegration.errors.join(', ')}`);
      }
      
      if (this.results.stability.status === 'failed') {
        console.log(`  - Stability: ${this.results.stability.errors.join(', ')}`);
      }
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n⚠️ Additional Errors:');
      this.results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n📁 Detailed report saved to:', reportPath);
    console.log('='.repeat(80));
    
    return report;
  }
}

// Run validation if called directly
if (require.main === module) {
  const tester = new Phase2ValidationTester();
  tester.runFullValidation()
    .then(report => {
      process.exit(report.summary.status === 'PASSED' ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = Phase2ValidationTester;