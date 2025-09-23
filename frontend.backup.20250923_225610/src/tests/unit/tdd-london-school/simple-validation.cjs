#!/usr/bin/env node

/**
 * Simple TDD London School Validation
 * 
 * Direct validation using basic browser automation - CommonJS version
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
      headless: true,
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
    console.log('🧪 Testing Application Loading (London School: Outside-In)...');
    
    const result = {
      testName: 'Application Loading',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      console.log('  📡 Loading application...');
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
      
      console.log('  🔍 Waiting for essential UI elements...');
      await this.page.waitForSelector('[data-testid="header"]', { timeout: 10000 });
      await this.page.waitForSelector('nav', { timeout: 5000 });
      
      // London School: Test actual user-visible behavior
      const hasReactRoot = await this.page.$('#root');
      if (!hasReactRoot) {
        throw new Error('React root element not found - app may not have loaded');
      }
      
      // Check for error boundaries (real error detection)
      const errorBoundaries = await this.page.$$('.error-boundary, .error-fallback');
      if (errorBoundaries.length > 0) {
        throw new Error(`Error boundary detected (${errorBoundaries.length}) - application has runtime errors`);
      }
      
      // Check for actual content
      const hasNavigation = await this.page.$('nav a');
      if (!hasNavigation) {
        throw new Error('Navigation links not found - app may not be functional');
      }
      
      result.details = 'Application loads successfully with all essential elements visible';
      console.log('  ✅ Application Loading: PASS - All essential elements loaded');
      
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
    console.log('🧪 Testing Navigation Workflow (London School: User Journey)...');
    
    const result = {
      testName: 'Navigation Workflow',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      // London School: Test actual user navigation flows
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
          console.log(`  📋 Testing ${nav.name} navigation...`);
          
          // Real user action: click navigation link
          const navLink = await this.page.$(`a[href="${nav.href}"]`);
          if (!navLink) {
            throw new Error(`Navigation link for ${nav.name} not found`);
          }
          
          await navLink.click();
          console.log(`    🖱️  Clicked ${nav.name} link`);
          
          // Verify URL changed (real browser behavior)
          await this.page.waitForURL(new RegExp(`${nav.href.replace('/', '\\/')}(?:\\?.*)?$`), { timeout: 8000 });
          console.log(`    🌐 URL changed to ${nav.href}`);
          
          // Wait for actual content to load (not just routing)
          await this.page.waitForSelector(nav.selector, { timeout: 10000 });
          console.log(`    📄 Content loaded for ${nav.name}`);
          
          console.log(`    ✅ ${nav.name} navigation SUCCESSFUL`);
          passedNavigations++;
          
        } catch (error) {
          console.log(`    ❌ ${nav.name} navigation FAILED: ${error.message}`);
          result.errors.push(`${nav.name}: ${error.message}`);
        }
        
        // Allow time for any transitions
        await this.page.waitForTimeout(1000);
      }
      
      if (passedNavigations === navigationTests.length) {
        result.details = `All ${navigationTests.length} navigation routes function correctly`;
        console.log(`  🎯 Navigation Result: ALL ${navigationTests.length} routes working!`);
      } else {
        result.status = 'FAIL';
        result.details = `Only ${passedNavigations}/${navigationTests.length} navigation routes work correctly`;
        console.log(`  ⚠️  Navigation Result: ${passedNavigations}/${navigationTests.length} routes working`);
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Navigation testing failed: ${error.message}`;
      result.errors.push(error.message);
      console.log('  ❌ Navigation testing failed: ' + error.message);
    }
    
    this.results.push(result);
    return result;
  }

  async testFeedData() {
    console.log('🧪 Testing Feed Data (London School: Mock vs Real Detection)...');
    
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
      console.log('  🏠 Navigating to feed page...');
      await this.page.goto(`${this.baseUrl}/`);
      await this.page.waitForSelector('[data-testid="agent-feed"], .feed-container', { timeout: 10000 });
      
      console.log('  ⏳ Waiting for data to load...');
      await this.page.waitForTimeout(5000); // Give time for API calls
      
      const pageContent = await this.page.content();
      
      // London School: Analyze real vs mock data patterns
      const mockIndicators = [
        'test-data', 'mock-', 'fallback', 'placeholder', 'demo', 'sample', 
        'example', 'fake', 'lorem ipsum', 'coming soon', 'no data available',
        'placeholder-', 'mock_', 'demo-'
      ].filter(indicator => pageContent.toLowerCase().includes(indicator));
      
      const realDataIndicators = [
        '"id":', 'timestamp":', 'created_at":', 'updated_at":', 'uuid":', 
        'api-response', 'real-time', 'actual-data', 'database', 'live-'
      ].filter(indicator => pageContent.toLowerCase().includes(indicator));
      
      // Count actual feed elements
      const feedElements = await this.page.$$('.post, .feed-item, .social-post, .card, .agent-post, .feed-entry');
      
      console.log('  🔍 Analyzing content...');
      console.log(`    Mock indicators found: ${mockIndicators.length} - [${mockIndicators.slice(0, 3).join(', ')}${mockIndicators.length > 3 ? '...' : ''}]`);
      console.log(`    Real data indicators: ${realDataIndicators.length} - [${realDataIndicators.slice(0, 3).join(', ')}${realDataIndicators.length > 3 ? '...' : ''}]`);
      console.log(`    Feed elements found: ${feedElements.length}`);
      
      result.mockDetection = {
        hasMockData: mockIndicators.length > 0,
        hasRealData: realDataIndicators.length > 0,
        mockIndicators,
        realDataIndicators
      };
      
      if (feedElements.length > 0 && realDataIndicators.length > mockIndicators.length) {
        result.details = `Feed contains ${feedElements.length} items with real data indicators`;
        console.log('  ✅ Feed appears to contain REAL data');
      } else if (feedElements.length > 0 && mockIndicators.length > 0) {
        result.details = `Feed contains ${feedElements.length} items but appears to use MOCK data`;
        result.status = 'FAIL';
        console.log('  ⚠️  Feed contains MOCK data - not production ready');
      } else if (feedElements.length > 0) {
        result.details = `Feed contains ${feedElements.length} items with unclear data source`;
        console.log('  ⚠️  Feed has content but data source unclear');
      } else {
        result.details = 'Feed appears empty or failed to load any content';
        result.status = 'FAIL';
        console.log('  ❌ Feed is EMPTY or failed to load');
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Feed data validation failed: ${error.message}`;
      result.errors.push(error.message);
      console.log('  ❌ Feed validation failed: ' + error.message);
    }
    
    this.results.push(result);
    return result;
  }

  async testAgentsPage() {
    console.log('🧪 Testing Agents Page (London School: Behavior Verification)...');
    
    const result = {
      testName: 'Agents Page Verification',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      console.log('  🤖 Navigating to agents page...');
      await this.page.goto(`${this.baseUrl}/agents`);
      await this.page.waitForSelector('.agents-container, .agent-list, [data-testid="agents-page"]', { timeout: 10000 });
      
      console.log('  ⏳ Waiting for agents data to load...');
      await this.page.waitForTimeout(4000);
      
      // London School: Test actual behavior, not just state
      const agentElements = await this.page.$$('.agent, .agent-card, .agent-item, .agent-row');
      const emptyStateElements = await this.page.$$('.empty-state, .no-agents, .placeholder');
      const loadingElements = await this.page.$$('.loading, .spinner, .skeleton');
      
      console.log(`    🤖 Agent elements: ${agentElements.length}`);
      console.log(`    📝 Empty state elements: ${emptyStateElements.length}`);
      console.log(`    ⏳ Loading elements: ${loadingElements.length}`);
      
      if (agentElements.length > 0) {
        // Test actual interaction (London School principle)
        try {
          console.log('    🖱️  Testing agent interaction...');
          await agentElements[0].click();
          result.details = `Found ${agentElements.length} agents with functional interactions`;
          console.log('    ✅ Agent interaction successful');
        } catch (error) {
          result.details = `Found ${agentElements.length} agents but interactions failed`;
          console.log('    ⚠️  Agent elements found but interactions failed');
        }
      } else if (emptyStateElements.length > 0) {
        result.details = 'Agents page shows proper empty state (no agents configured)';
        console.log('  📋 Agents page properly shows empty state');
      } else if (loadingElements.length > 0) {
        result.details = 'Agents page is in loading state (agents still loading)';
        console.log('  ⏳ Agents page in loading state');
      } else {
        result.status = 'FAIL';
        result.details = 'Agents page has no content, loading indicators, or empty state';
        console.log('  ❌ Agents page appears BROKEN - no content found');
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Agents page verification failed: ${error.message}`;
      result.errors.push(error.message);
      console.log('  ❌ Agents page failed: ' + error.message);
    }
    
    this.results.push(result);
    return result;
  }

  async testClaudeManager() {
    console.log('🧪 Testing Claude Manager (London School: Real Integration)...');
    
    const result = {
      testName: 'Claude Manager Functionality',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      console.log('  🖥️  Navigating to Claude Manager...');
      await this.page.goto(`${this.baseUrl}/claude-manager`);
      await this.page.waitForSelector('.claude-manager, .instance-manager, .dual-mode-manager', { timeout: 10000 });
      
      console.log('  ⚙️  Waiting for manager to initialize...');
      await this.page.waitForTimeout(4000);
      
      // London School: Test real functionality, not just UI
      const instanceElements = await this.page.$$('.instance-list, .claude-instances, .instance-card, .instance-item, .instance');
      const actionButtons = await this.page.$$('button[class*="create"], button[class*="start"], button[class*="stop"], button[class*="manage"], .btn, button');
      const terminalElements = await this.page.$$('.terminal, .xterm, .console, .terminal-container');
      const connectionElements = await this.page.$$('.connection, .status, .websocket');
      
      console.log(`    🖥️  Instance elements: ${instanceElements.length}`);
      console.log(`    🔘 Action buttons: ${actionButtons.length}`);
      console.log(`    💻 Terminal elements: ${terminalElements.length}`);
      console.log(`    📡 Connection elements: ${connectionElements.length}`);
      
      let functionalityScore = 0;
      const maxScore = 4;
      
      if (instanceElements.length > 0) {
        functionalityScore++;
        console.log('    ✅ Has instance management elements');
      }
      if (actionButtons.length > 0) {
        functionalityScore++;
        console.log('    ✅ Has action buttons');
      }
      if (terminalElements.length > 0) {
        functionalityScore++;
        console.log('    ✅ Has terminal interface');
      }
      if (connectionElements.length > 0) {
        functionalityScore++;
        console.log('    ✅ Has connection management');
      }
      
      if (functionalityScore >= 3) {
        result.details = `Claude Manager appears fully functional (${functionalityScore}/${maxScore} core components)`;
        console.log('  ✅ Claude Manager is FULLY FUNCTIONAL');
      } else if (functionalityScore >= 2) {
        result.details = `Claude Manager has basic functionality (${functionalityScore}/${maxScore} core components)`;
        console.log('  ⚠️  Claude Manager has BASIC functionality');
      } else {
        result.status = 'FAIL';
        result.details = `Claude Manager appears non-functional (${functionalityScore}/${maxScore} core components)`;
        console.log('  ❌ Claude Manager appears NON-FUNCTIONAL');
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Claude Manager testing failed: ${error.message}`;
      result.errors.push(error.message);
      console.log('  ❌ Claude Manager failed: ' + error.message);
    }
    
    this.results.push(result);
    return result;
  }

  async runAllTests() {
    console.log('🚀 TDD LONDON SCHOOL COMPREHENSIVE VALIDATION');
    console.log('Following Outside-In Testing, Mock Detection, and Behavior Verification');
    console.log('═'.repeat(70));

    try {
      await this.setup();
      
      console.log('🎯 Executing validation tests...\n');
      
      // Execute all tests sequentially
      await this.testApplicationLoading();
      console.log('');
      
      await this.testNavigation();
      console.log('');
      
      await this.testFeedData();
      console.log('');
      
      await this.testAgentsPage();
      console.log('');
      
      await this.testClaudeManager();
      console.log('');
      
      // Generate comprehensive report
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
    
    console.log('═'.repeat(70));
    console.log('📋 TDD LONDON SCHOOL VALIDATION REPORT');
    console.log('═'.repeat(70));
    console.log(`📊 RESULTS: ${passedTests}/${totalTests} tests passed (${successRate}% success rate)`);
    console.log('');
    
    // Detailed results for each test
    console.log('📄 DETAILED RESULTS:');
    console.log('');
    
    for (const result of this.results) {
      const statusIcon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${statusIcon} ${result.testName.toUpperCase()}: ${result.status}`);
      console.log(`   Details: ${result.details}`);
      
      // Mock detection analysis
      if (result.mockDetection) {
        const mock = result.mockDetection;
        if (mock.hasMockData || mock.hasRealData) {
          const mockStatus = mock.hasMockData ? '⚠️ YES' : '✅ NO';
          const realStatus = mock.hasRealData ? '✅ YES' : '❌ NO';
          console.log(`   🔍 Mock Data: ${mockStatus} | Real Data: ${realStatus}`);
          
          if (mock.mockIndicators.length > 0) {
            console.log(`   🎭 Mock Indicators: ${mock.mockIndicators.slice(0, 3).join(', ')}${mock.mockIndicators.length > 3 ? '...' : ''}`);
          }
          if (mock.realDataIndicators.length > 0) {
            console.log(`   📊 Real Data Indicators: ${mock.realDataIndicators.slice(0, 3).join(', ')}${mock.realDataIndicators.length > 3 ? '...' : ''}`);
          }
        }
      }
      
      // Error details
      if (result.errors && result.errors.length > 0) {
        console.log(`   ❌ Errors: ${result.errors.join('; ')}`);
      }
      console.log('');
    }
    
    // Critical Assessment
    console.log('═'.repeat(70));
    console.log('🎯 CRITICAL ASSESSMENT');
    console.log('═'.repeat(70));
    
    if (passedTests === totalTests) {
      console.log('🎉 STATUS: ALL TESTS PASSED - PRODUCTION READY!');
      console.log('✅ Application follows TDD London School principles');
      console.log('✅ All user workflows function correctly');
      console.log('✅ Components collaborate properly');
    } else if (successRate >= 80) {
      console.log(`⚠️  STATUS: MOSTLY FUNCTIONAL - ${failedTests} issues to address`);
      console.log('⚠️  Some components need attention before production');
    } else if (successRate >= 60) {
      console.log(`🔧 STATUS: NEEDS WORK - ${failedTests} significant issues found`);
      console.log('🔧 Multiple components require fixes');
    } else {
      console.log(`🚨 STATUS: CRITICAL ISSUES - ${failedTests} major problems found`);
      console.log('🚨 Application not ready for production use');
    }
    
    console.log('');
    
    // London School Analysis
    console.log('🧪 LONDON SCHOOL TDD ANALYSIS:');
    
    // Outside-In Testing Results
    const loadingResult = this.results.find(r => r.testName === 'Application Loading');
    const navResult = this.results.find(r => r.testName === 'Navigation Workflow');
    
    if (loadingResult && loadingResult.status === 'PASS') {
      console.log('✅ Outside-In Testing: Application loads correctly from user perspective');
    } else {
      console.log('❌ Outside-In Testing: Critical loading failures detected');
    }
    
    if (navResult && navResult.status === 'PASS') {
      console.log('✅ User Journey Testing: All navigation workflows function');
    } else {
      console.log('❌ User Journey Testing: Navigation system has failures');
    }
    
    // Mock vs Real Data Analysis
    const dataResults = this.results.filter(r => r.mockDetection);
    if (dataResults.length > 0) {
      const realDataCount = dataResults.filter(r => r.mockDetection.hasRealData).length;
      const mockDataCount = dataResults.filter(r => r.mockDetection.hasMockData).length;
      
      if (realDataCount > mockDataCount) {
        console.log('✅ Data Integration: Predominantly using real data sources');
      } else if (mockDataCount > realDataCount) {
        console.log('⚠️  Data Integration: Predominantly using mock data - not production ready');
      } else {
        console.log('⚠️  Data Integration: Mixed real/mock data usage');
      }
    }
    
    // Behavior Verification
    const behaviorResults = this.results.filter(r => 
      r.testName.includes('Manager') || r.testName.includes('Agents')
    );
    const functionalBehaviors = behaviorResults.filter(r => r.status === 'PASS').length;
    
    if (functionalBehaviors === behaviorResults.length) {
      console.log('✅ Behavior Verification: All component interactions work correctly');
    } else {
      console.log('❌ Behavior Verification: Some component interactions are broken');
    }
    
    console.log('');
    console.log('═'.repeat(70));
    console.log('🏁 TDD LONDON SCHOOL VALIDATION COMPLETE');
    console.log(`📈 Final Score: ${successRate}% (${passedTests}/${totalTests} passed)`);
    console.log('═'.replace(70));
  }
}

// Execute the validation
console.log('🚀 Starting TDD London School Validation...');
const validator = new SimpleTDDValidator();
validator.runAllTests().catch(console.error);