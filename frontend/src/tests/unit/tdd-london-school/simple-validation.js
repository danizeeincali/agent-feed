#!/usr/bin/env node

/**
 * Simple TDD London School Validation
 * 
 * Direct validation using basic browser automation
 */

const { chromium } = require('@playwright/test');

class SimpleTDDValidator {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.baseUrl = 'http://localhost:5173';
    this.results = [];
  }

  async setup() {
    console.log('🚀 Setting up TDD London School Validator...');
    
    this.browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    this.page = await this.context.newPage();
    
    // Set up logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
  }

  async teardown() {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  async testApplicationLoading() {
    console.log('🧪 Testing Application Loading...');
    
    const result = {
      testName: 'Application Loading',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle', timeout: 15000 });
      
      // Wait for essential elements
      await this.page.waitForSelector('[data-testid="header"]', { timeout: 10000 });
      await this.page.waitForSelector('nav', { timeout: 5000 });
      
      // Check for React root
      const hasReactRoot = await this.page.$('#root');
      if (!hasReactRoot) {
        throw new Error('React root element not found');
      }
      
      // Check for error boundaries
      const hasErrorBoundary = await this.page.$('.error-boundary');
      if (hasErrorBoundary) {
        throw new Error('Error boundary activated');
      }
      
      result.details = 'Application loads successfully with all core elements';
      console.log('  ✅ Application Loading: PASS');
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Application loading failed: ${error.message}`;
      result.errors.push(error.message);
      console.log('  ❌ Application Loading: FAIL - ' + error.message);
    }
    
    this.results.push(result);
    return result;
  }

  async testNavigation() {
    console.log('🧪 Testing Navigation Workflow...');
    
    const result = {
      testName: 'Navigation Workflow',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      const navigationTests = [
        { name: 'Feed', href: '/', selector: '[data-testid="agent-feed"], .feed-container, .social-feed' },
        { name: 'Agents', href: '/agents', selector: '.agents-container, .agent-list, [data-testid="agents-page"]' },
        { name: 'Claude Manager', href: '/claude-manager', selector: '.claude-manager, .instance-manager, .dual-mode-manager' },
        { name: 'Analytics', href: '/analytics', selector: '.analytics, .metrics, .analytics-container' },
        { name: 'Settings', href: '/settings', selector: '.settings, .configuration, .settings-container' }
      ];

      let passedNavigations = 0;
      
      for (const nav of navigationTests) {
        try {
          console.log(`  📋 Testing ${nav.name}...`);
          
          // Navigate
          await this.page.click(`a[href="${nav.href}"]`);
          await this.page.waitForURL(new RegExp(`${nav.href.replace('/', '\\/')}(?:\\?.*)?$`), { timeout: 5000 });
          await this.page.waitForSelector(nav.selector, { timeout: 8000 });
          
          console.log(`    ✅ ${nav.name} navigation successful`);
          passedNavigations++;
          
        } catch (error) {
          console.log(`    ❌ ${nav.name} navigation failed: ${error.message}`);
          result.errors.push(`${nav.name}: ${error.message}`);
        }
        
        await this.page.waitForTimeout(500);
      }
      
      if (passedNavigations === navigationTests.length) {
        result.details = `All ${navigationTests.length} navigation routes work correctly`;
      } else {
        result.status = 'FAIL';
        result.details = `Only ${passedNavigations}/${navigationTests.length} navigation routes work correctly`;
      }
      
      console.log(`  📊 Navigation Result: ${passedNavigations}/${navigationTests.length} routes working`);
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Navigation testing failed: ${error.message}`;
      result.errors.push(error.message);
    }
    
    this.results.push(result);
    return result;
  }

  async testFeedData() {
    console.log('🧪 Testing Feed Data...');
    
    const result = {
      testName: 'Feed Data Validation',
      status: 'PASS',
      details: '',
      mockDetection: {
        hasMockData: false,
        hasRealData: false,
        mockIndicators: [],
        realDataIndicators: []
      },
      errors: []
    };

    try {
      await this.page.goto(`${this.baseUrl}/`);
      await this.page.waitForSelector('[data-testid="agent-feed"], .feed-container', { timeout: 10000 });
      await this.page.waitForTimeout(4000);
      
      const pageContent = await this.page.content();
      
      const mockIndicators = [
        'test-data', 'mock-', 'fallback', 'placeholder', 'demo', 'sample', 
        'example', 'fake', 'lorem ipsum', 'coming soon', 'no data available'
      ].filter(indicator => pageContent.toLowerCase().includes(indicator));
      
      const realDataIndicators = [
        'id:', 'timestamp:', 'created_at', 'updated_at', 'uuid', 
        'api-response', '"id":', '"timestamp":', 'real-time'
      ].filter(indicator => pageContent.toLowerCase().includes(indicator));
      
      const feedElements = await this.page.$$('.post, .feed-item, .social-post, .card, .agent-post');
      
      result.mockDetection = {
        hasMockData: mockIndicators.length > 0,
        hasRealData: realDataIndicators.length > 0,
        mockIndicators,
        realDataIndicators
      };
      
      console.log(`  🔍 Mock indicators: ${mockIndicators.length}`);
      console.log(`  📊 Real data indicators: ${realDataIndicators.length}`);
      console.log(`  📝 Feed elements found: ${feedElements.length}`);
      
      if (feedElements.length > 0 && realDataIndicators.length > 0) {
        result.details = `Feed contains ${feedElements.length} items with real data indicators`;
      } else if (feedElements.length > 0) {
        result.details = `Feed contains ${feedElements.length} items but appears to use mock data`;
        result.status = 'FAIL';
      } else {
        result.details = 'Feed appears empty or failed to load content';
        result.status = 'FAIL';
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Feed data validation failed: ${error.message}`;
      result.errors.push(error.message);
    }
    
    this.results.push(result);
    return result;
  }

  async testAgentsPage() {
    console.log('🧪 Testing Agents Page...');
    
    const result = {
      testName: 'Agents Page Verification',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      await this.page.goto(`${this.baseUrl}/agents`);
      await this.page.waitForSelector('.agents-container, .agent-list, [data-testid="agents-page"]', { timeout: 10000 });
      await this.page.waitForTimeout(3000);
      
      const agentElements = await this.page.$$('.agent, .agent-card, .agent-item, .agent-row');
      const emptyStateElements = await this.page.$$('.empty-state, .no-agents, .placeholder');
      const loadingElements = await this.page.$$('.loading, .spinner, .skeleton');
      
      console.log(`  🤖 Agent elements: ${agentElements.length}`);
      console.log(`  📝 Empty state elements: ${emptyStateElements.length}`);
      console.log(`  ⏳ Loading elements: ${loadingElements.length}`);
      
      if (agentElements.length > 0) {
        result.details = `Found ${agentElements.length} agents`;
        console.log('  ✅ Agents page has agent elements');
      } else if (emptyStateElements.length > 0) {
        result.details = 'Agents page shows proper empty state';
        console.log('  📋 Agents page shows empty state');
      } else if (loadingElements.length > 0) {
        result.details = 'Agents page is in loading state';
        console.log('  ⏳ Agents page in loading state');
      } else {
        result.status = 'FAIL';
        result.details = 'Agents page has no content';
        console.log('  ❌ Agents page appears broken');
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Agents page verification failed: ${error.message}`;
      result.errors.push(error.message);
    }
    
    this.results.push(result);
    return result;
  }

  async testClaudeManager() {
    console.log('🧪 Testing Claude Manager...');
    
    const result = {
      testName: 'Claude Manager Functionality',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      await this.page.goto(`${this.baseUrl}/claude-manager`);
      await this.page.waitForSelector('.claude-manager, .instance-manager, .dual-mode-manager', { timeout: 10000 });
      await this.page.waitForTimeout(3000);
      
      const instanceElements = await this.page.$$('.instance-list, .claude-instances, .instance-card, .instance-item');
      const actionButtons = await this.page.$$('button[class*="create"], button[class*="start"], button[class*="stop"], button[class*="manage"], .btn');
      const terminalElements = await this.page.$$('.terminal, .xterm, .console');
      
      console.log(`  🖥️  Instance elements: ${instanceElements.length}`);
      console.log(`  🔘 Action buttons: ${actionButtons.length}`);
      console.log(`  💻 Terminal elements: ${terminalElements.length}`);
      
      const functionalityScore = (instanceElements.length > 0 ? 1 : 0) + 
                                 (actionButtons.length > 0 ? 1 : 0) + 
                                 (terminalElements.length > 0 ? 1 : 0);
      
      if (functionalityScore >= 2) {
        result.details = `Claude Manager appears functional (${functionalityScore}/3 components)`;
        console.log('  ✅ Claude Manager appears functional');
      } else {
        result.status = 'FAIL';
        result.details = `Claude Manager appears non-functional (${functionalityScore}/3 components)`;
        console.log('  ❌ Claude Manager appears non-functional');
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Claude Manager testing failed: ${error.message}`;
      result.errors.push(error.message);
    }
    
    this.results.push(result);
    return result;
  }

  async runAllTests() {
    console.log('🎯 Starting TDD London School Comprehensive Validation');
    console.log('═'.repeat(60));

    try {
      await this.setup();
      
      // Run all tests
      await this.testApplicationLoading();
      await this.testNavigation();
      await this.testFeedData();
      await this.testAgentsPage();
      await this.testClaudeManager();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
    } finally {
      await this.teardown();
    }
  }

  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0';
    
    console.log('\n' + '═'.repeat(70));
    console.log('📋 TDD LONDON SCHOOL VALIDATION REPORT');
    console.log('═'.repeat(70));
    console.log(`📊 Results: ${passedTests}/${totalTests} tests passed (${successRate}%)`);
    console.log('');
    
    // Detailed results
    for (const result of this.results) {
      const statusIcon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${statusIcon} ${result.testName}: ${result.status}`);
      console.log(`   ${result.details}`);
      
      if (result.mockDetection) {
        const { mockDetection } = result.mockDetection;
        if (mockDetection && (mockDetection.hasMockData || mockDetection.hasRealData)) {
          console.log(`   🔍 Mock Data: ${mockDetection.hasMockData ? 'YES' : 'NO'} | Real Data: ${mockDetection.hasRealData ? 'YES' : 'NO'}`);
        }
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log(`   ❌ Errors: ${result.errors.join('; ')}`);
      }
      console.log('');
    }
    
    // Summary
    console.log('═'.repeat(70));
    console.log('🎯 FINAL ASSESSMENT');
    console.log('═'.repeat(70));
    
    if (passedTests === totalTests) {
      console.log('🎉 STATUS: ALL TESTS PASSED - PRODUCTION READY!');
    } else if (successRate >= 70) {
      console.log(`⚠️  STATUS: MOSTLY FUNCTIONAL - ${failedTests} issues to address`);
    } else {
      console.log(`🚨 STATUS: CRITICAL ISSUES - ${failedTests} major problems found`);
    }
    
    // Key findings
    console.log('\n📋 KEY FINDINGS:');
    
    // Check for mock data usage
    const mockDataResults = this.results.filter(r => 
      r.mockDetection && r.mockDetection.hasMockData && !r.mockDetection.hasRealData
    );
    if (mockDataResults.length > 0) {
      console.log(`⚠️  ${mockDataResults.length} components using mock data instead of real API integration`);
    }
    
    // Check for navigation issues
    const navResult = this.results.find(r => r.testName === 'Navigation Workflow');
    if (navResult && navResult.status === 'FAIL') {
      console.log('❌ Navigation system has critical failures');
    }
    
    // Check for loading issues
    const loadResult = this.results.find(r => r.testName === 'Application Loading');
    if (loadResult && loadResult.status === 'FAIL') {
      console.log('🚨 Application has critical loading failures');
    } else {
      console.log('✅ Application core loading works correctly');
    }
    
    console.log('═'.repeat(70));
  }
}

// Execute
const validator = new SimpleTDDValidator();
validator.runAllTests().catch(console.error);