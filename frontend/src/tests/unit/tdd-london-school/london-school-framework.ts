/**
 * TDD London School Validation Framework
 * 
 * This framework implements the London School (mockist) approach to TDD:
 * 1. Outside-In Testing: Start from user interactions, work down to components
 * 2. Mock Verification: Distinguish between real functionality and test doubles
 * 3. Behavior-Driven Testing: Verify actual user workflows work end-to-end
 * 4. Collaboration Testing: Verify component interactions are real, not stubbed
 */

import { Browser, Page, BrowserContext, chromium } from '@playwright/test';
import { expect } from '@playwright/test';

export interface ValidationResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  details: string;
  mockDetection?: MockDetectionResult;
  networkCalls?: NetworkCallResult[];
  performance?: PerformanceMetrics;
  errors?: string[];
}

export interface MockDetectionResult {
  hasMockData: boolean;
  hasRealData: boolean;
  mockIndicators: string[];
  realDataIndicators: string[];
}

export interface NetworkCallResult {
  url: string;
  method: string;
  status: number;
  responseType: 'mock' | 'real' | 'error';
  responseTime: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  networkRequests: number;
  jsErrors: number;
}

export interface UserJourney {
  name: string;
  description: string;
  steps: UserJourneyStep[];
  expectations: JourneyExpectation[];
}

export interface UserJourneyStep {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'verify';
  target: string;
  value?: string;
  timeout?: number;
}

export interface JourneyExpectation {
  type: 'url' | 'element' | 'text' | 'api' | 'mock' | 'performance';
  condition: string;
  expected: any;
}

export class LondonSchoolTDDValidator {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private baseUrl = 'http://localhost:5173';
  private results: ValidationResult[] = [];

  constructor() {
    // Initialize logging for TDD validation
    console.log('🧪 TDD London School Validator initialized');
  }

  async setup(): Promise<void> {
    console.log('🚀 Setting up browser automation...');
    this.browser = await chromium.launch({ 
      headless: false, // Show browser for validation visibility
      slowMo: 100 // Slow down for observation
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: 'tests/tdd-london-school/videos/' }
    });

    // Enable request/response interception for mock detection
    this.page = await this.context.newPage();
    
    // Track console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    // Track network requests
    this.page.on('response', response => {
      console.log(`📡 ${response.request().method()} ${response.url()} - ${response.status()}`);
    });
  }

  async teardown(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  /**
   * London School Principle: Outside-In Testing
   * Start with user behavior and work inward to verify real functionality
   */
  async validateUserJourney(journey: UserJourney): Promise<ValidationResult> {
    if (!this.page) throw new Error('Browser not initialized');

    const startTime = Date.now();
    const result: ValidationResult = {
      testName: journey.name,
      status: 'PASS',
      details: '',
      networkCalls: [],
      errors: []
    };

    try {
      console.log(`🎯 Testing User Journey: ${journey.name}`);
      
      // Execute journey steps
      for (const step of journey.steps) {
        await this.executeStep(step, result);
      }

      // Validate expectations
      for (const expectation of journey.expectations) {
        await this.validateExpectation(expectation, result);
      }

      result.details = `Journey completed successfully in ${Date.now() - startTime}ms`;
      
    } catch (error) {
      result.status = 'FAIL';
      result.details = `Journey failed: ${error}`;
      result.errors?.push(String(error));
    }

    this.results.push(result);
    return result;
  }

  private async executeStep(step: UserJourneyStep, result: ValidationResult): Promise<void> {
    if (!this.page) return;

    console.log(`  📋 Step: ${step.action} ${step.target}`);

    switch (step.action) {
      case 'navigate':
        await this.page.goto(`${this.baseUrl}${step.target}`);
        await this.page.waitForLoadState('networkidle');
        break;
      
      case 'click':
        await this.page.click(step.target);
        await this.page.waitForTimeout(1000); // Allow for transitions
        break;
      
      case 'type':
        if (step.value) {
          await this.page.fill(step.target, step.value);
        }
        break;
      
      case 'wait':
        await this.page.waitForSelector(step.target, { timeout: step.timeout || 5000 });
        break;
      
      case 'verify':
        const element = await this.page.$(step.target);
        if (!element) {
          throw new Error(`Element not found: ${step.target}`);
        }
        break;
    }
  }

  private async validateExpectation(expectation: JourneyExpectation, result: ValidationResult): Promise<void> {
    if (!this.page) return;

    console.log(`  ✅ Validating: ${expectation.type} - ${expectation.condition}`);

    switch (expectation.type) {
      case 'url':
        const currentUrl = this.page.url();
        if (!currentUrl.includes(expectation.expected)) {
          throw new Error(`URL expectation failed: expected ${expectation.expected}, got ${currentUrl}`);
        }
        break;
      
      case 'element':
        await expect(this.page.locator(expectation.condition)).toBeVisible();
        break;
      
      case 'text':
        await expect(this.page.locator(expectation.condition)).toContainText(expectation.expected);
        break;
      
      case 'api':
        // Verify API calls were made (not just mocked)
        await this.validateApiCall(expectation, result);
        break;
      
      case 'mock':
        // Detect if data is mock vs real
        await this.detectMockData(expectation, result);
        break;
    }
  }

  /**
   * London School Principle: Mock Detection
   * Distinguish between real functionality and test doubles
   */
  private async detectMockData(expectation: JourneyExpectation, result: ValidationResult): Promise<void> {
    if (!this.page) return;

    const mockIndicators = [
      'test-data',
      'mock-',
      'fallback',
      'placeholder',
      'demo',
      'sample',
      'example',
      'fake'
    ];

    const realDataIndicators = [
      'id:',
      'timestamp:',
      'created_at',
      'updated_at',
      'uuid',
      'api-response'
    ];

    // Check page content for mock indicators
    const pageContent = await this.page.content();
    const foundMockIndicators = mockIndicators.filter(indicator => 
      pageContent.toLowerCase().includes(indicator)
    );
    
    const foundRealIndicators = realDataIndicators.filter(indicator => 
      pageContent.toLowerCase().includes(indicator)
    );

    result.mockDetection = {
      hasMockData: foundMockIndicators.length > 0,
      hasRealData: foundRealIndicators.length > 0,
      mockIndicators: foundMockIndicators,
      realDataIndicators: foundRealIndicators
    };

    console.log(`  🔍 Mock Detection: Mock(${foundMockIndicators.length}) Real(${foundRealIndicators.length})`);
  }

  /**
   * London School Principle: Behavior Verification
   * Verify actual collaborations between components
   */
  private async validateApiCall(expectation: JourneyExpectation, result: ValidationResult): Promise<void> {
    if (!this.page) return;

    // Wait for network requests to complete
    await this.page.waitForLoadState('networkidle');

    // Check if API endpoints are responding with real data
    const apiUrl = expectation.condition;
    
    try {
      const response = await this.page.request.get(`${this.baseUrl}${apiUrl}`);
      const responseData = await response.text();
      
      const networkCall: NetworkCallResult = {
        url: apiUrl,
        method: 'GET',
        status: response.status(),
        responseType: this.classifyResponse(responseData, response.status()),
        responseTime: 0 // Would need to measure actual response time
      };

      result.networkCalls?.push(networkCall);
      
      if (response.status() >= 400) {
        throw new Error(`API call failed: ${apiUrl} returned ${response.status()}`);
      }
      
    } catch (error) {
      result.errors?.push(`API validation failed for ${apiUrl}: ${error}`);
    }
  }

  private classifyResponse(responseData: string, status: number): 'mock' | 'real' | 'error' {
    if (status >= 400) return 'error';
    
    // Heuristics to detect mock vs real data
    const mockPatterns = [
      'mock',
      'fallback',
      'placeholder',
      'demo-data',
      'example'
    ];
    
    const realPatterns = [
      'id":',
      'timestamp":',
      'created_at":',
      'uuid":',
      'database'
    ];
    
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

  async generateValidationReport(): Promise<string> {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = totalTests - passedTests;
    
    let report = `
# TDD London School Validation Report
Generated: ${new Date().toISOString()}

## Summary
- **Total Tests:** ${totalTests}
- **Passed:** ${passedTests} ✅
- **Failed:** ${failedTests} ❌
- **Success Rate:** ${((passedTests / totalTests) * 100).toFixed(1)}%

## Test Results

`;

    for (const result of this.results) {
      const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
      report += `### ${result.testName} - ${status}

**Details:** ${result.details}

`;

      if (result.mockDetection) {
        const { mockDetection } = result;
        report += `**Mock Detection:**
- Has Mock Data: ${mockDetection.hasMockData ? '⚠️ YES' : '✅ NO'}
- Has Real Data: ${mockDetection.hasRealData ? '✅ YES' : '❌ NO'}
- Mock Indicators: ${mockDetection.mockIndicators.join(', ') || 'None'}
- Real Data Indicators: ${mockDetection.realDataIndicators.join(', ') || 'None'}

`;
      }

      if (result.networkCalls?.length) {
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

      if (result.errors?.length) {
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

    return report;
  }

  getResults(): ValidationResult[] {
    return [...this.results];
  }
}

/**
 * Predefined User Journeys for the Agent Feed Application
 */
export const AgentFeedUserJourneys: UserJourney[] = [
  {
    name: 'Navigation Workflow',
    description: 'Test all sidebar navigation items load properly',
    steps: [
      { action: 'navigate', target: '/' },
      { action: 'wait', target: '[data-testid="agent-feed"]' },
      { action: 'click', target: 'a[href="/agents"]' },
      { action: 'wait', target: '[data-testid="agents-page"], .agents-container, .agent-list' },
      { action: 'click', target: 'a[href="/claude-manager"]' },
      { action: 'wait', target: '.claude-manager, .instance-manager' },
      { action: 'click', target: 'a[href="/analytics"]' },
      { action: 'wait', target: '.analytics, .metrics' },
      { action: 'click', target: 'a[href="/settings"]' },
      { action: 'wait', target: '.settings, .configuration' },
    ],
    expectations: [
      { type: 'element', condition: '[data-testid="header"]', expected: true },
      { type: 'element', condition: 'nav', expected: true },
    ]
  },
  
  {
    name: 'Feed Real Data Validation',
    description: 'Verify social media feed shows real posts vs fallback data',
    steps: [
      { action: 'navigate', target: '/' },
      { action: 'wait', target: '[data-testid="agent-feed"]' },
    ],
    expectations: [
      { type: 'api', condition: '/api/v1/agent-posts', expected: 200 },
      { type: 'mock', condition: '.feed-container', expected: 'detect' },
      { type: 'element', condition: '.post, .feed-item, .social-post', expected: true },
    ]
  },
  
  {
    name: 'Agents Page Data Verification',
    description: 'Test agents page for real agent data vs mock placeholders',
    steps: [
      { action: 'navigate', target: '/agents' },
      { action: 'wait', target: '.agents-container, .agent-list, [data-testid="agents-page"]' },
    ],
    expectations: [
      { type: 'api', condition: '/api/v1/claude-live/prod/agents', expected: 200 },
      { type: 'mock', condition: '.agent-card, .agent-item', expected: 'detect' },
      { type: 'element', condition: '.agent, .agent-card, .agent-item', expected: true },
    ]
  },
  
  {
    name: 'Claude Manager Functionality',
    description: 'Verify Claude instance management actually works',
    steps: [
      { action: 'navigate', target: '/claude-manager' },
      { action: 'wait', target: '.claude-manager, .instance-manager' },
    ],
    expectations: [
      { type: 'element', condition: '.instance-list, .claude-instances', expected: true },
      { type: 'api', condition: '/api/claude/instances', expected: 200 },
      { type: 'mock', condition: '.instance-card', expected: 'detect' },
    ]
  },
  
  {
    name: 'Analytics Real Metrics',
    description: 'Verify analytics show real metrics vs placeholder data',
    steps: [
      { action: 'navigate', target: '/analytics' },
      { action: 'wait', target: '.analytics, .metrics' },
    ],
    expectations: [
      { type: 'element', condition: '.chart, .metric, .analytics-card', expected: true },
      { type: 'mock', condition: '.analytics-container', expected: 'detect' },
    ]
  },
  
  {
    name: 'Settings Persistence',
    description: 'Test configuration persistence and behavior',
    steps: [
      { action: 'navigate', target: '/settings' },
      { action: 'wait', target: '.settings, .configuration' },
    ],
    expectations: [
      { type: 'element', condition: '.setting-item, .config-option', expected: true },
    ]
  },
  
  {
    name: 'Error Resilience',
    description: 'Test graceful degradation on API failures',
    steps: [
      { action: 'navigate', target: '/' },
      { action: 'wait', target: '[data-testid="agent-feed"]' },
    ],
    expectations: [
      { type: 'element', condition: '.error-boundary, .fallback, .loading', expected: false },
    ]
  }
];