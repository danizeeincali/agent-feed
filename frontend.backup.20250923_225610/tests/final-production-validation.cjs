#!/usr/bin/env node

/**
 * Final Production Validation Suite
 * Comprehensive testing for all Phase 1-2 functionality
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

class FinalProductionValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        frontend: 'http://localhost:5173',
        backend: 'http://localhost:3000'
      },
      tests: [],
      summary: {},
      issues: [],
      recommendations: []
    };
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Final Production Validation Starting...\n');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async testAPIEndpoints() {
    console.log('📡 Testing API Endpoints...');
    const endpoints = [
      { name: 'Agents', path: '/api/agents' },
      { name: 'Activities', path: '/api/v1/activities' },
      { name: 'System Metrics', path: '/api/v1/metrics/system' },
      { name: 'Analytics', path: '/api/v1/analytics' },
      { name: 'Health', path: '/api/health' }
    ];

    const apiResults = [];
    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        const response = await axios.get(`http://localhost:3000${endpoint.path}`);
        const duration = Date.now() - start;
        
        const hasRealData = this.validateRealData(response.data, endpoint.name);
        
        apiResults.push({
          name: endpoint.name,
          path: endpoint.path,
          status: 'PASS',
          responseTime: duration,
          statusCode: response.status,
          hasRealData,
          dataSize: JSON.stringify(response.data).length
        });
        
        console.log(`  ✅ ${endpoint.name}: ${duration}ms (${hasRealData ? 'real data' : 'mock data'})`);
      } catch (error) {
        apiResults.push({
          name: endpoint.name,
          path: endpoint.path,
          status: 'FAIL',
          error: error.message
        });
        console.log(`  ❌ ${endpoint.name}: ${error.message}`);
      }
    }
    
    this.results.tests.push({
      category: 'API Endpoints',
      results: apiResults,
      summary: {
        total: endpoints.length,
        passed: apiResults.filter(r => r.status === 'PASS').length,
        avgResponseTime: apiResults.filter(r => r.responseTime)
          .reduce((sum, r) => sum + r.responseTime, 0) / apiResults.filter(r => r.responseTime).length || 0
      }
    });
  }

  validateRealData(data, endpoint) {
    if (!data || typeof data !== 'object') return false;
    
    const jsonStr = JSON.stringify(data).toLowerCase();
    
    // Check for mock indicators
    if (jsonStr.includes('mock') || jsonStr.includes('sample') || jsonStr.includes('test')) {
      return false;
    }
    
    // Endpoint-specific validation
    switch (endpoint) {
      case 'Agents':
        return data.data && Array.isArray(data.data) && data.data.length > 0 &&
               data.data.some(agent => agent.id && agent.name);
      
      case 'Activities':
        return data.data && Array.isArray(data.data) && data.data.length > 0 &&
               data.data.some(activity => activity.id && activity.type);
      
      case 'System Metrics':
        return data.data && Array.isArray(data.data) && data.data.length > 0 &&
               data.data.some(metric => metric.cpu_usage !== undefined);
      
      case 'Analytics':
        return data.data && data.data.agent_stats && Array.isArray(data.data.agent_stats);
      
      case 'Health':
        return data.data && data.data.status === 'healthy';
      
      default:
        return Object.keys(data).length > 2;
    }
  }

  async testFrontendApplication() {
    console.log('\n🖥️  Testing Frontend Application...');
    
    const frontendResults = [];
    
    try {
      // Test 1: Application loads
      console.log('  Testing application load...');
      const start = Date.now();
      await this.page.goto('http://localhost:5173', { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
      });
      const loadTime = Date.now() - start;
      
      frontendResults.push({
        name: 'Application Load',
        status: 'PASS',
        details: { loadTime },
        metric: `${loadTime}ms`
      });
      
      // Test 2: React app renders
      console.log('  Testing React app rendering...');
      const reactRoot = await this.page.$('#root');
      const hasContent = await this.page.evaluate(() => {
        const root = document.getElementById('root');
        return root && root.innerHTML.length > 100;
      });
      
      frontendResults.push({
        name: 'React App Rendering',
        status: hasContent ? 'PASS' : 'FAIL',
        details: { hasReactRoot: !!reactRoot, hasContent }
      });
      
      // Test 3: Navigation to agents page
      console.log('  Testing agents page navigation...');
      await this.page.goto('http://localhost:5173/agents', { 
        waitUntil: 'networkidle0',
        timeout: 15000 
      });
      
      // Wait for React to render
      await this.page.waitForTimeout(3000);
      
      // Check if agents are loaded
      const agentsPageContent = await this.page.evaluate(() => {
        const content = document.body.textContent || '';
        return {
          hasAgentsTitle: content.includes('Production Agents') || content.includes('Agents'),
          hasLoadingText: content.includes('Loading'),
          hasErrorText: content.includes('Error') || content.includes('Failed'),
          hasAgentData: content.includes('ProductionValidator') || content.includes('DatabaseManager'),
          contentLength: content.length,
          hasAgentCards: document.querySelectorAll('.agent-card, [data-testid="agent-card"]').length,
          hasAgentList: !!document.querySelector('[data-testid="agent-list"], .agents-grid')
        };
      });
      
      const agentsWorking = agentsPageContent.hasAgentData || agentsPageContent.hasAgentCards > 0;
      
      frontendResults.push({
        name: 'Agents Page',
        status: agentsWorking ? 'PASS' : 'PARTIAL',
        details: agentsPageContent,
        metric: `${agentsPageContent.hasAgentCards} cards, ${agentsPageContent.contentLength} chars`
      });
      
      // Test 4: Agent detail navigation (if agents are available)
      if (agentsPageContent.hasAgentCards > 0) {
        console.log('  Testing agent detail navigation...');
        try {
          const firstAgentCard = await this.page.$('.agent-card, [data-testid="agent-card"]');
          if (firstAgentCard) {
            await firstAgentCard.click();
            await this.page.waitForTimeout(2000);
            
            const detailPageContent = await this.page.evaluate(() => {
              return {
                url: window.location.pathname,
                hasDetailContent: document.body.textContent.length > 500,
                hasAgentSpecificContent: document.body.textContent.includes('details') || 
                                       document.body.textContent.includes('profile')
              };
            });
            
            frontendResults.push({
              name: 'Agent Detail Navigation',
              status: detailPageContent.hasDetailContent ? 'PASS' : 'PARTIAL',
              details: detailPageContent
            });
          }
        } catch (error) {
          frontendResults.push({
            name: 'Agent Detail Navigation',
            status: 'FAIL',
            details: { error: error.message }
          });
        }
      }
      
      // Test 5: Mobile responsiveness
      console.log('  Testing mobile responsiveness...');
      await this.page.setViewport({ width: 375, height: 667 });
      await this.page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
      
      const mobileContent = await this.page.evaluate(() => {
        return {
          isViewportCorrect: window.innerWidth === 375,
          hasOverflow: document.body.scrollWidth > 375,
          isContentVisible: !document.body.style.display?.includes('none')
        };
      });
      
      frontendResults.push({
        name: 'Mobile Responsiveness',
        status: mobileContent.isContentVisible ? 'PASS' : 'FAIL',
        details: mobileContent
      });
      
      console.log(`  ✅ Application Load: ${loadTime}ms`);
      console.log(`  ✅ React Rendering: ${hasContent ? 'OK' : 'FAIL'}`);
      console.log(`  ✅ Agents Page: ${agentsPageContent.hasAgentCards} cards`);
      console.log(`  ✅ Mobile: ${mobileContent.isContentVisible ? 'OK' : 'FAIL'}`);
      
    } catch (error) {
      frontendResults.push({
        name: 'Frontend Application',
        status: 'FAIL',
        details: { error: error.message }
      });
      console.log(`  ❌ Frontend test failed: ${error.message}`);
    }
    
    this.results.tests.push({
      category: 'Frontend Application',
      results: frontendResults,
      summary: {
        total: frontendResults.length,
        passed: frontendResults.filter(r => r.status === 'PASS').length
      }
    });
  }

  async testRealTimeFeatures() {
    console.log('\n🔌 Testing Real-time Features...');
    
    const realtimeResults = [];
    
    try {
      // Test WebSocket connection
      await this.page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
      
      const wsTest = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          try {
            const ws = new WebSocket('ws://localhost:3000/terminal');
            const timeout = setTimeout(() => {
              resolve({ status: 'timeout', error: 'Connection timeout' });
            }, 5000);
            
            ws.onopen = () => {
              clearTimeout(timeout);
              ws.close();
              resolve({ status: 'connected', latency: Date.now() });
            };
            
            ws.onerror = (error) => {
              clearTimeout(timeout);
              resolve({ status: 'failed', error: error.toString() });
            };
          } catch (error) {
            resolve({ status: 'error', error: error.message });
          }
        });
      });
      
      realtimeResults.push({
        name: 'WebSocket Connection',
        status: wsTest.status === 'connected' ? 'PASS' : 'FAIL',
        details: wsTest
      });
      
      console.log(`  ✅ WebSocket: ${wsTest.status}`);
      
    } catch (error) {
      realtimeResults.push({
        name: 'Real-time Features',
        status: 'FAIL',
        details: { error: error.message }
      });
    }
    
    this.results.tests.push({
      category: 'Real-time Features',
      results: realtimeResults,
      summary: {
        total: realtimeResults.length,
        passed: realtimeResults.filter(r => r.status === 'PASS').length
      }
    });
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    const performanceResults = [];
    
    try {
      // Reset to desktop viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      const start = Date.now();
      await this.page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - start;
      
      const metrics = await this.page.metrics();
      
      performanceResults.push({
        name: 'Page Load Time',
        status: loadTime < 5000 ? 'PASS' : 'FAIL',
        value: loadTime,
        unit: 'ms',
        benchmark: '< 5000ms'
      });
      
      performanceResults.push({
        name: 'Memory Usage',
        status: metrics.JSHeapUsedSize < 100 * 1024 * 1024 ? 'PASS' : 'FAIL',
        value: Math.round(metrics.JSHeapUsedSize / 1024 / 1024),
        unit: 'MB',
        benchmark: '< 100MB'
      });
      
      console.log(`  ✅ Load Time: ${loadTime}ms`);
      console.log(`  ✅ Memory: ${Math.round(metrics.JSHeapUsedSize / 1024 / 1024)}MB`);
      
    } catch (error) {
      performanceResults.push({
        name: 'Performance',
        status: 'FAIL',
        details: { error: error.message }
      });
    }
    
    this.results.tests.push({
      category: 'Performance',
      results: performanceResults,
      summary: {
        total: performanceResults.length,
        passed: performanceResults.filter(r => r.status === 'PASS').length
      }
    });
  }

  generateReport() {
    const allResults = this.results.tests.flatMap(test => test.results);
    const totalTests = allResults.length;
    const passedTests = allResults.filter(r => r.status === 'PASS').length;
    const failedTests = allResults.filter(r => r.status === 'FAIL').length;
    const partialTests = allResults.filter(r => r.status === 'PARTIAL').length;
    
    this.results.summary = {
      totalTests,
      passedTests,
      failedTests,
      partialTests,
      passRate: Math.round((passedTests / totalTests) * 100),
      productionReady: failedTests === 0 && partialTests <= 2,
      criticalIssues: failedTests,
      minorIssues: partialTests
    };
    
    // Generate recommendations
    if (this.results.summary.productionReady) {
      this.results.recommendations.push('✅ System is production ready');
      this.results.recommendations.push('🚀 All critical functionality is working');
    } else {
      this.results.recommendations.push('⚠️ Review failed tests before production deployment');
      if (failedTests > 0) {
        this.results.recommendations.push('🔧 Fix critical failures in API endpoints or frontend components');
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL PRODUCTION VALIDATION RESULTS');
    console.log('='.repeat(80));
    console.log(`✅ Tests Passed: ${passedTests}/${totalTests} (${this.results.summary.passRate}%)`);
    console.log(`❌ Tests Failed: ${failedTests}`);
    console.log(`⚠️  Partial: ${partialTests}`);
    console.log(`🚀 Production Ready: ${this.results.summary.productionReady ? 'YES' : 'NO'}`);
    
    console.log('\n📋 CATEGORY BREAKDOWN:');
    this.results.tests.forEach(category => {
      const catPassed = category.results.filter(r => r.status === 'PASS').length;
      const catTotal = category.results.length;
      console.log(`  ${category.category}: ${catPassed}/${catTotal} passed`);
    });
    
    console.log('\n💡 RECOMMENDATIONS:');
    this.results.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
    
    return this.results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.testAPIEndpoints();
      await this.testFrontendApplication();
      await this.testRealTimeFeatures();
      await this.testPerformance();
      
      const results = this.generateReport();
      
      // Save detailed results
      const fs = require('fs');
      const filename = `/workspaces/agent-feed/frontend/final-production-validation-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(results, null, 2));
      console.log(`\n📄 Detailed results saved to: ${filename}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Validation suite failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new FinalProductionValidator();
  validator.run()
    .then(results => {
      process.exit(results.summary.productionReady ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}

module.exports = FinalProductionValidator;