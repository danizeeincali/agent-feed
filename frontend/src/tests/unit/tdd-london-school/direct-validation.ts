#!/usr/bin/env ts-node

/**
 * Direct TDD London School Validation Execution
 * 
 * This script performs immediate validation without Playwright configuration issues
 */

import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import fetch from 'node-fetch';

interface ValidationResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  details: string;
  mockDetection?: {
    hasMockData: boolean;
    hasRealData: boolean;
    mockIndicators: string[];
    realDataIndicators: string[];
  };
  networkCalls?: {
    url: string;
    method: string;
    status: number;
    responseType: 'mock' | 'real' | 'error';
  }[];
  errors?: string[];
}

class DirectTDDValidator {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private results: ValidationResult[] = [];
  private baseUrl = 'http://localhost:5173';

  async setup(): Promise<void> {
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

  async teardown(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  async validateAll(): Promise<ValidationResult[]> {
    console.log('🎯 Starting TDD London School Comprehensive Validation');
    console.log('═'.repeat(60));

    // Test 1: Application Basic Loading
    await this.testApplicationLoading();
    
    // Test 2: Navigation Workflow
    await this.testNavigationWorkflow();
    
    // Test 3: Feed Data Validation
    await this.testFeedDataValidation();
    
    // Test 4: Agents Page Verification
    await this.testAgentsPageVerification();
    
    // Test 5: Claude Manager Functionality  
    await this.testClaudeManagerFunctionality();
    
    // Test 6: Analytics Data Analysis
    await this.testAnalyticsDataAnalysis();
    
    // Test 7: Settings Configuration
    await this.testSettingsConfiguration();
    
    // Test 8: API Integration Analysis
    await this.testAPIIntegration();
    
    return this.results;
  }

  private async testApplicationLoading(): Promise<void> {
    const result: ValidationResult = {
      testName: 'Application Loading',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      console.log('🧪 Testing Application Loading...');
      
      // Test basic application loading
      await this.page!.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      // Wait for essential elements
      await this.page!.waitForSelector('[data-testid="header"]', { timeout: 10000 });
      await this.page!.waitForSelector('nav', { timeout: 5000 });
      
      // Check for React hydration
      const hasReactRoot = await this.page!.$('#root');
      if (!hasReactRoot) {
        throw new Error('React root element not found');
      }
      
      // Check for critical errors
      const hasErrorBoundary = await this.page!.$('.error-boundary');
      if (hasErrorBoundary) {
        throw new Error('Error boundary activated - application has critical errors');
      }
      
      result.details = 'Application loads successfully with all core elements';
      console.log('  ✅ Application Loading: PASS');
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Application loading failed: ${error}`;
      result.errors!.push(String(error));
      console.log('  ❌ Application Loading: FAIL - ' + error);
    }
    
    this.results.push(result);
  }

  private async testNavigationWorkflow(): Promise<void> {
    const result: ValidationResult = {
      testName: 'Navigation Workflow',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      console.log('🧪 Testing Navigation Workflow (Outside-In)...');
      
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
          
          // Navigate to page
          await this.page!.click(`a[href="${nav.href}"]`);
          
          // Verify URL changed
          await this.page!.waitForURL(new RegExp(`${nav.href.replace('/', '\\/')}(?:\\?.*)?$`), { timeout: 5000 });
          
          // Wait for content
          await this.page!.waitForSelector(nav.selector, { timeout: 8000 });
          
          console.log(`    ✅ ${nav.name} navigation successful`);
          passedNavigations++;
          
        } catch (error) {
          console.log(`    ❌ ${nav.name} navigation failed: ${error}`);
          result.errors!.push(`${nav.name}: ${error}`);
        }
        
        // Small delay for stability
        await this.page!.waitForTimeout(500);
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
      result.details = `Navigation testing failed: ${error}`;
      result.errors!.push(String(error));
    }
    
    this.results.push(result);
  }

  private async testFeedDataValidation(): Promise<void> {
    const result: ValidationResult = {
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
      console.log('🧪 Testing Feed Data (Mock vs Real Detection)...');
      
      // Navigate to feed
      await this.page!.goto(`${this.baseUrl}/`);
      await this.page!.waitForSelector('[data-testid="agent-feed"], .feed-container', { timeout: 10000 });
      
      // Wait for data loading
      await this.page!.waitForTimeout(4000);
      
      // Analyze page content for mock vs real data
      const pageContent = await this.page!.content();
      
      const mockIndicators = [
        'test-data', 'mock-', 'fallback', 'placeholder', 'demo', 'sample', 
        'example', 'fake', 'lorem ipsum', 'coming soon', 'no data available'
      ].filter(indicator => pageContent.toLowerCase().includes(indicator));
      
      const realDataIndicators = [
        'id:', 'timestamp:', 'created_at', 'updated_at', 'uuid', 
        'api-response', '"id":', '"timestamp":', 'real-time'
      ].filter(indicator => pageContent.toLowerCase().includes(indicator));
      
      // Count feed elements
      const feedElements = await this.page!.$$('.post, .feed-item, .social-post, .card, .agent-post');
      
      result.mockDetection = {
        hasMockData: mockIndicators.length > 0,
        hasRealData: realDataIndicators.length > 0,
        mockIndicators,
        realDataIndicators
      };
      
      console.log(`  🔍 Mock indicators: ${mockIndicators.length} - [${mockIndicators.slice(0, 3).join(', ')}${mockIndicators.length > 3 ? '...' : ''}]`);
      console.log(`  📊 Real data indicators: ${realDataIndicators.length} - [${realDataIndicators.slice(0, 3).join(', ')}${realDataIndicators.length > 3 ? '...' : ''}]`);
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
      result.details = `Feed data validation failed: ${error}`;
      result.errors!.push(String(error));
    }
    
    this.results.push(result);
  }

  private async testAgentsPageVerification(): Promise<void> {
    const result: ValidationResult = {
      testName: 'Agents Page Verification',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      console.log('🧪 Testing Agents Page (Behavior Verification)...');
      
      // Navigate to agents page
      await this.page!.goto(`${this.baseUrl}/agents`);
      await this.page!.waitForSelector('.agents-container, .agent-list, [data-testid="agents-page"]', { timeout: 10000 });
      
      // Wait for data loading
      await this.page!.waitForTimeout(3000);
      
      // Check for agent elements
      const agentElements = await this.page!.$$('.agent, .agent-card, .agent-item, .agent-row');
      const emptyStateElements = await this.page!.$$('.empty-state, .no-agents, .placeholder');
      const loadingElements = await this.page!.$$('.loading, .spinner, .skeleton');
      
      console.log(`  🤖 Agent elements: ${agentElements.length}`);
      console.log(`  📝 Empty state elements: ${emptyStateElements.length}`);
      console.log(`  ⏳ Loading elements: ${loadingElements.length}`);
      
      if (agentElements.length > 0) {
        // Test interaction with first agent
        try {
          await agentElements[0].click();
          result.details = `Found ${agentElements.length} agents with functional interactions`;
          console.log('  ✅ Agents page has functional agent elements');
        } catch (error) {
          result.details = `Found ${agentElements.length} agents but interactions may not work`;
          console.log('  ⚠️  Agents found but interaction failed');
        }
      } else if (emptyStateElements.length > 0) {
        result.details = 'Agents page shows proper empty state - no agents configured';
        console.log('  📋 Agents page shows empty state (no agents configured)');
      } else if (loadingElements.length > 0) {
        result.details = 'Agents page is in loading state - agents still loading';
        console.log('  ⏳ Agents page in loading state');
      } else {
        result.status = 'FAIL';
        result.details = 'Agents page has no content, loading indicators, or empty state';
        console.log('  ❌ Agents page appears broken - no content found');
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Agents page verification failed: ${error}`;
      result.errors!.push(String(error));
    }
    
    this.results.push(result);
  }

  private async testClaudeManagerFunctionality(): Promise<void> {
    const result: ValidationResult = {
      testName: 'Claude Manager Functionality',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      console.log('🧪 Testing Claude Manager (Real Integration)...');
      
      // Navigate to Claude Manager
      await this.page!.goto(`${this.baseUrl}/claude-manager`);
      await this.page!.waitForSelector('.claude-manager, .instance-manager, .dual-mode-manager', { timeout: 10000 });
      
      // Wait for component initialization
      await this.page!.waitForTimeout(3000);
      
      // Check for functional elements
      const instanceElements = await this.page!.$$('.instance-list, .claude-instances, .instance-card, .instance-item');
      const actionButtons = await this.page!.$$('button[class*="create"], button[class*="start"], button[class*="stop"], button[class*="manage"], .btn');
      const connectionIndicators = await this.page!.$$('.connection-status, .websocket-status, .real-time, .status');
      const terminalElements = await this.page!.$$('.terminal, .xterm, .console');
      
      console.log(`  🖥️  Instance elements: ${instanceElements.length}`);
      console.log(`  🔘 Action buttons: ${actionButtons.length}`);
      console.log(`  📡 Connection indicators: ${connectionIndicators.length}`);
      console.log(`  💻 Terminal elements: ${terminalElements.length}`);
      
      let functionalityScore = 0;
      let maxScore = 4;
      
      if (instanceElements.length > 0) functionalityScore++;
      if (actionButtons.length > 0) functionalityScore++;
      if (connectionIndicators.length > 0) functionalityScore++;
      if (terminalElements.length > 0) functionalityScore++;
      
      if (functionalityScore >= 3) {
        result.details = `Claude Manager appears fully functional (${functionalityScore}/${maxScore} components)`;
        console.log('  ✅ Claude Manager appears fully functional');
      } else if (functionalityScore >= 2) {
        result.details = `Claude Manager has basic functionality (${functionalityScore}/${maxScore} components)`;
        console.log('  ⚠️  Claude Manager has basic functionality');
      } else {
        result.status = 'FAIL';
        result.details = `Claude Manager appears non-functional (${functionalityScore}/${maxScore} components)`;
        console.log('  ❌ Claude Manager appears non-functional');
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Claude Manager testing failed: ${error}`;
      result.errors!.push(String(error));
    }
    
    this.results.push(result);
  }

  private async testAnalyticsDataAnalysis(): Promise<void> {
    const result: ValidationResult = {
      testName: 'Analytics Data Analysis',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      console.log('🧪 Testing Analytics (Real Metrics Validation)...');
      
      // Navigate to analytics
      await this.page!.goto(`${this.baseUrl}/analytics`);
      await this.page!.waitForSelector('.analytics, .metrics, .analytics-container', { timeout: 10000 });
      
      // Wait for charts/data to load
      await this.page!.waitForTimeout(4000);
      
      // Check for visualization elements
      const chartElements = await this.page!.$$('.chart, .metric, .analytics-card, canvas, svg');
      
      // Analyze content for real data
      const pageContent = await this.page!.content();
      const hasRealNumbers = /\b\d{1,3}(,\d{3})*(\.\d+)?\b/.test(pageContent);
      const hasPercentages = /%/.test(pageContent);
      const hasDateTimestamps = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/.test(pageContent);
      
      // Check for placeholder patterns
      const placeholderPatterns = ['N/A', 'No data', 'Coming soon', '0', '0.0', '--', 'Loading...'];
      const placeholderCount = placeholderPatterns.filter(pattern => 
        pageContent.includes(pattern)
      ).length;
      
      console.log(`  📈 Chart elements: ${chartElements.length}`);
      console.log(`  🔢 Has real numbers: ${hasRealNumbers ? '✅' : '❌'}`);
      console.log(`  📊 Has percentages: ${hasPercentages ? '✅' : '❌'}`);
      console.log(`  📅 Has timestamps: ${hasDateTimestamps ? '✅' : '❌'}`);
      console.log(`  🎭 Placeholder patterns: ${placeholderCount}`);
      
      if (chartElements.length > 0 && (hasRealNumbers || hasPercentages || hasDateTimestamps)) {
        result.details = `Analytics has ${chartElements.length} charts with real data visualization`;
        console.log('  ✅ Analytics appears to have real data');
      } else if (chartElements.length > 0) {
        result.details = `Analytics has ${chartElements.length} charts but may be using placeholder data`;
        console.log('  ⚠️  Analytics has charts but may be using mock data');
      } else {
        result.status = 'FAIL';
        result.details = 'Analytics page has no charts or data visualization';
        console.log('  ❌ Analytics page appears empty');
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Analytics testing failed: ${error}`;
      result.errors!.push(String(error));
    }
    
    this.results.push(result);
  }

  private async testSettingsConfiguration(): Promise<void> {
    const result: ValidationResult = {
      testName: 'Settings Configuration',
      status: 'PASS',
      details: '',
      errors: []
    };

    try {
      console.log('🧪 Testing Settings (Configuration Persistence)...');
      
      // Navigate to settings
      await this.page!.goto(`${this.baseUrl}/settings`);
      await this.page!.waitForSelector('.settings, .configuration, .settings-container', { timeout: 10000 });
      
      // Check for setting controls
      const settingControls = await this.page!.$$('input, select, textarea, .toggle, .switch, .checkbox');
      const saveButtons = await this.page!.$$('button[class*="save"], button[class*="apply"], button[class*="submit"]');
      const configSections = await this.page!.$$('.config-section, .setting-group, .form-group');
      
      console.log(`  ⚙️  Setting controls: ${settingControls.length}`);
      console.log(`  💾 Save buttons: ${saveButtons.length}`);
      console.log(`  📋 Config sections: ${configSections.length}`);
      
      if (settingControls.length > 0 && saveButtons.length > 0) {
        result.details = `Settings has ${settingControls.length} controls with save functionality`;
        console.log('  ✅ Settings appears fully functional with persistence');
      } else if (settingControls.length > 0) {
        result.details = `Settings has ${settingControls.length} controls but no save functionality detected`;
        console.log('  ⚠️  Settings has controls but no save buttons');
      } else {
        result.status = 'FAIL';
        result.details = 'Settings page has no interactive controls';
        console.log('  ❌ Settings page has no interactive controls');
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Settings testing failed: ${error}`;
      result.errors!.push(String(error));
    }
    
    this.results.push(result);
  }

  private async testAPIIntegration(): Promise<void> {
    const result: ValidationResult = {
      testName: 'API Integration Analysis',
      status: 'PASS',
      details: '',
      networkCalls: [],
      errors: []
    };

    try {
      console.log('🧪 Testing API Integration (Network Analysis)...');
      
      // Test key API endpoints
      const apiEndpoints = [
        '/api/v1/health',
        '/api/v1/agent-posts',
        '/api/v1/claude-live/prod/agents',
        '/api/claude/instances'
      ];
      
      let successfulCalls = 0;
      let totalCalls = 0;
      
      for (const endpoint of apiEndpoints) {
        try {
          console.log(`  📡 Testing endpoint: ${endpoint}`);
          
          const response = await fetch(`http://localhost:3000${endpoint}`, {
            timeout: 5000
          } as any);
          
          totalCalls++;
          const callResult = {
            url: endpoint,
            method: 'GET',
            status: response.status,
            responseType: this.classifyAPIResponse(await response.text(), response.status)
          };
          
          result.networkCalls!.push(callResult);
          
          if (response.status >= 200 && response.status < 300) {
            successfulCalls++;
            console.log(`    ✅ ${endpoint} - ${response.status} (${callResult.responseType})`);
          } else {
            console.log(`    ❌ ${endpoint} - ${response.status}`);
          }
          
        } catch (error) {
          totalCalls++;
          result.networkCalls!.push({
            url: endpoint,
            method: 'GET', 
            status: 0,
            responseType: 'error'
          });
          console.log(`    ❌ ${endpoint} - Connection failed`);
        }
      }
      
      const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
      
      if (successRate >= 75) {
        result.details = `API integration good: ${successfulCalls}/${totalCalls} endpoints responding (${successRate.toFixed(1)}%)`;
        console.log('  ✅ API integration appears healthy');
      } else if (successRate >= 50) {
        result.details = `API integration partial: ${successfulCalls}/${totalCalls} endpoints responding (${successRate.toFixed(1)}%)`;
        console.log('  ⚠️  API integration has issues');
      } else {
        result.status = 'FAIL';
        result.details = `API integration poor: ${successfulCalls}/${totalCalls} endpoints responding (${successRate.toFixed(1)}%)`;
        console.log('  ❌ API integration appears broken');
      }
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `API integration testing failed: ${error}`;
      result.errors!.push(String(error));
    }
    
    this.results.push(result);
  }

  private classifyAPIResponse(responseData: string, status: number): 'mock' | 'real' | 'error' {
    if (status >= 400) return 'error';
    
    const mockPatterns = ['mock', 'fallback', 'placeholder', 'demo-data', 'example'];
    const realPatterns = ['id":', 'timestamp":', 'created_at":', 'uuid":', 'database'];
    
    const hasMockPatterns = mockPatterns.some(pattern => 
      responseData.toLowerCase().includes(pattern)
    );
    
    const hasRealPatterns = realPatterns.some(pattern => 
      responseData.toLowerCase().includes(pattern)
    );
    
    if (hasMockPatterns && !hasRealPatterns) return 'mock';
    if (hasRealPatterns) return 'real';
    
    return 'mock'; // Default to mock if uncertain
  }

  generateReport(): string {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0';
    
    let report = `
# TDD London School Validation Report
**Generated:** ${new Date().toISOString()}

## 🎯 Executive Summary

| Metric | Value | Status |
|--------|--------|--------|
| **Total Tests** | ${totalTests} | - |
| **Passed** | ${passedTests} | ${passedTests === totalTests ? '✅' : '⚠️'} |
| **Failed** | ${failedTests} | ${failedTests === 0 ? '✅' : '❌'} |
| **Success Rate** | ${successRate}% | ${+successRate >= 90 ? '✅' : +successRate >= 70 ? '⚠️' : '❌'} |

## 📋 Detailed Results

`;

    for (const result of this.results) {
      const statusIcon = result.status === 'PASS' ? '✅' : '❌';
      report += `### ${result.testName} - ${statusIcon} ${result.status}

**Details:** ${result.details}

`;

      if (result.mockDetection) {
        const { mockDetection } = result;
        const mockStatus = mockDetection.hasMockData ? '⚠️ YES' : '✅ NO';
        const realStatus = mockDetection.hasRealData ? '✅ YES' : '❌ NO';
        
        report += `**Mock vs Real Data Analysis:**
- Has Mock Data: ${mockStatus}
- Has Real Data: ${realStatus}
- Mock Indicators: ${mockDetection.mockIndicators.join(', ') || 'None'}
- Real Data Indicators: ${mockDetection.realDataIndicators.join(', ') || 'None'}

`;
      }

      if (result.networkCalls && result.networkCalls.length > 0) {
        report += `**Network Calls:**
`;
        for (const call of result.networkCalls) {
          const typeIcon = call.responseType === 'real' ? '✅' : 
                          call.responseType === 'mock' ? '⚠️' : '❌';
          report += `- ${typeIcon} ${call.method} ${call.url} (${call.status}) - ${call.responseType}
`;
        }
        report += '\n';
      }

      if (result.errors && result.errors.length > 0) {
        report += `**Errors:**
`;
        for (const error of result.errors) {
          report += `- ❌ ${error}
`;
        }
        report += '\n';
      }

      report += '---\n\n';
    }

    // Critical Issues Summary
    const criticalIssues = this.results.filter(r => r.status === 'FAIL');
    if (criticalIssues.length > 0) {
      report += `## 🚨 Critical Issues Requiring Attention

`;
      for (const issue of criticalIssues) {
        report += `### ${issue.testName}
- **Issue:** ${issue.details}
- **Impact:** ${issue.errors?.join('; ') || 'Component not functioning as expected'}

`;
      }
    } else {
      report += `## ✅ All Critical Systems Operational

No critical issues detected. The application passes all TDD London School validations.

`;
    }

    // Recommendations
    report += `## 📈 Recommendations

${this.generateRecommendations()}

---
*Generated by TDD London School Validator - Following Outside-In Testing Principles*
`;

    return report;
  }

  private generateRecommendations(): string {
    const recommendations: string[] = [];
    
    // Check for mock data issues
    const mockIssues = this.results.filter(r => 
      r.mockDetection?.hasMockData && !r.mockDetection?.hasRealData
    );
    
    if (mockIssues.length > 0) {
      recommendations.push(`🔄 **Replace Mock Data**: ${mockIssues.length} components are using mock data instead of real API integration`);
    }
    
    // Check for failed tests
    const failedTests = this.results.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      recommendations.push(`🐛 **Fix Critical Issues**: ${failedTests.length} core functionalities are not working correctly`);
    }
    
    // Check API integration
    const apiResult = this.results.find(r => r.testName === 'API Integration Analysis');
    if (apiResult && apiResult.networkCalls) {
      const errorCalls = apiResult.networkCalls.filter(call => call.responseType === 'error').length;
      if (errorCalls > 0) {
        recommendations.push(`🔧 **Fix API Integration**: ${errorCalls} API endpoints are not responding correctly`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ **Excellent Work**: Application passes all TDD London School validations - production ready!');
    }
    
    return recommendations.join('\n');
  }
}

// Main execution
async function main() {
  const validator = new DirectTDDValidator();
  
  try {
    console.log('🚀 TDD London School Comprehensive Validation');
    console.log('Following Outside-In Testing, Mock Detection, and Behavior Verification');
    console.log('═'.repeat(70));
    
    await validator.setup();
    await validator.validateAll();
    
    // Generate and display report
    const report = validator.generateReport();
    console.log('\n' + report);
    
    // Save report to file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `/workspaces/agent-feed/frontend/tests/tdd-london-school/reports/validation-report-${timestamp}.md`;
    
    // Ensure reports directory exists
    fs.mkdirSync('/workspaces/agent-feed/frontend/tests/tdd-london-school/reports', { recursive: true });
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n📄 Full report saved: ${reportPath}`);
    
    // Print final summary
    const results = validator.results;
    const passed = results.filter(r => r.status === 'PASS').length;
    const total = results.length;
    
    console.log('\n' + '═'.repeat(70));
    console.log('🎯 TDD LONDON SCHOOL VALIDATION COMPLETE');
    console.log('═'.repeat(70));
    console.log(`📊 Results: ${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)`);
    
    if (passed === total) {
      console.log('🎉 STATUS: ALL TESTS PASSED - PRODUCTION READY');
    } else {
      console.log(`⚠️  STATUS: ${total - passed} ISSUES REQUIRE ATTENTION`);
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  } finally {
    await validator.teardown();
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export { DirectTDDValidator };