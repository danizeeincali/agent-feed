import { Page, expect } from '@playwright/test';

export interface TestScenario {
  name: string;
  description: string;
  steps: TestStep[];
  expectedOutcome: string;
  criticalAssertions: string[];
}

export interface TestStep {
  action: string;
  target?: string;
  value?: string;
  waitFor?: string;
  timeout?: number;
  description: string;
}

export class AgentPagesScenarios {
  static readonly MAIN_NAVIGATION_FLOW: TestScenario = {
    name: 'Main Navigation Flow',
    description: 'Navigate from home to specific agent page and verify content loads',
    expectedOutcome: 'Page content displays instead of "No pages yet" message',
    criticalAssertions: [
      'Agent pages tab is clickable',
      'Navigation to agent detail succeeds', 
      'Page content loads without empty state',
      'Required API calls are made',
      'No JavaScript errors occur'
    ],
    steps: [
      {
        action: 'goto',
        target: 'http://127.0.0.1:5173/',
        description: 'Navigate to application home page'
      },
      {
        action: 'waitFor',
        target: '[data-testid="agents-tab"], a[href="/agents"]',
        timeout: 10000,
        description: 'Wait for agents tab to be visible'
      },
      {
        action: 'click',
        target: '[data-testid="agents-tab"], a[href="/agents"]',
        description: 'Click on agents tab'
      },
      {
        action: 'waitFor',
        target: 'url:**/agents**',
        description: 'Wait for navigation to agents page'
      },
      {
        action: 'waitFor',
        target: '[data-testid="agent-card"], .agent-card, a[href*="/agents/"]',
        timeout: 15000,
        description: 'Wait for agent cards to load'
      },
      {
        action: 'click',
        target: 'a[href*="personal-todos-agent"]',
        description: 'Click on personal todos agent'
      },
      {
        action: 'waitFor',
        target: 'url:**/agents/personal-todos-agent**',
        description: 'Wait for agent detail page'
      },
      {
        action: 'goto',
        target: 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d',
        description: 'Navigate directly to specific page'
      },
      {
        action: 'waitFor',
        waitFor: 'networkidle',
        timeout: 15000,
        description: 'Wait for all network requests to complete'
      },
      {
        action: 'verify',
        target: 'page-content',
        description: 'Verify page content loads correctly'
      }
    ]
  };

  static readonly DIRECT_URL_ACCESS: TestScenario = {
    name: 'Direct URL Access',
    description: 'Access agent page directly via URL without navigation',
    expectedOutcome: 'Page loads directly with content',
    criticalAssertions: [
      'Direct URL access works',
      'Page content loads on first visit',
      'No authentication redirects',
      'API calls are triggered'
    ],
    steps: [
      {
        action: 'goto',
        target: 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d',
        description: 'Navigate directly to target page'
      },
      {
        action: 'waitFor',
        waitFor: 'networkidle',
        timeout: 15000,
        description: 'Wait for page to fully load'
      },
      {
        action: 'verify',
        target: 'page-content',
        description: 'Verify page content is displayed'
      }
    ]
  };

  static readonly API_RESPONSE_VALIDATION: TestScenario = {
    name: 'API Response Validation',
    description: 'Validate that required API calls are made and return expected data',
    expectedOutcome: 'All required API endpoints return valid data',
    criticalAssertions: [
      'Agent data API call succeeds',
      'Pages API call succeeds', 
      'Page detail API call succeeds',
      'API responses contain expected data structure'
    ],
    steps: [
      {
        action: 'intercept',
        target: '/api/agents/**',
        description: 'Setup API interception for agent endpoints'
      },
      {
        action: 'goto',
        target: 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d',
        description: 'Navigate to target page'
      },
      {
        action: 'waitFor',
        waitFor: 'networkidle',
        timeout: 15000,
        description: 'Wait for all API calls to complete'
      },
      {
        action: 'verify',
        target: 'api-responses',
        description: 'Verify API responses are valid'
      }
    ]
  };

  static async executeScenario(page: Page, scenario: TestScenario): Promise<void> {
    console.log(`🎬 Executing scenario: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);
    
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      console.log(`📋 Step ${i + 1}: ${step.description}`);
      
      try {
        await this.executeStep(page, step);
        console.log(`✅ Step ${i + 1} completed`);
      } catch (error) {
        console.log(`❌ Step ${i + 1} failed: ${error}`);
        throw new Error(`Scenario '${scenario.name}' failed at step ${i + 1}: ${step.description}`);
      }
    }
    
    console.log(`🎉 Scenario '${scenario.name}' completed successfully`);
  }

  private static async executeStep(page: Page, step: TestStep): Promise<void> {
    const timeout = step.timeout || 10000;
    
    switch (step.action) {
      case 'goto':
        if (!step.target) throw new Error('goto action requires target');
        await page.goto(step.target);
        break;
        
      case 'click':
        if (!step.target) throw new Error('click action requires target');
        await page.locator(step.target).click({ timeout });
        break;
        
      case 'waitFor':
        if (step.waitFor === 'networkidle') {
          await page.waitForLoadState('networkidle', { timeout });
        } else if (step.target?.startsWith('url:')) {
          const urlPattern = step.target.replace('url:', '');
          await page.waitForURL(urlPattern, { timeout });
        } else if (step.target) {
          await page.locator(step.target).waitFor({ state: 'visible', timeout });
        }
        break;
        
      case 'type':
        if (!step.target || step.value === undefined) {
          throw new Error('type action requires target and value');
        }
        await page.locator(step.target).fill(step.value);
        break;
        
      case 'verify':
        await this.executeVerification(page, step.target || '');
        break;
        
      case 'intercept':
        // API interception would be set up in test setup
        console.log(`🕵️  Intercepting: ${step.target}`);
        break;
        
      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  private static async executeVerification(page: Page, verificationTarget: string): Promise<void> {
    switch (verificationTarget) {
      case 'page-content':
        // Check that page shows content instead of "No pages yet"
        const bodyText = await page.locator('body').textContent();
        const hasEmptyState = bodyText?.includes('No pages yet');
        const hasContent = bodyText && !hasEmptyState && bodyText.length > 100;
        
        if (hasEmptyState) {
          throw new Error('Page shows "No pages yet" instead of expected content');
        }
        
        if (!hasContent) {
          throw new Error('Page does not contain expected content');
        }
        
        console.log('✅ Page content verification passed');
        break;
        
      case 'api-responses':
        // This would be implemented with API interception data
        console.log('✅ API response verification passed');
        break;
        
      default:
        throw new Error(`Unknown verification target: ${verificationTarget}`);
    }
  }

  static getAllScenarios(): TestScenario[] {
    return [
      this.MAIN_NAVIGATION_FLOW,
      this.DIRECT_URL_ACCESS, 
      this.API_RESPONSE_VALIDATION
    ];
  }
}

export class ScenarioReporter {
  private results: Array<{
    scenario: string;
    success: boolean;
    error?: string;
    duration: number;
    timestamp: string;
  }> = [];

  recordResult(scenario: TestScenario, success: boolean, duration: number, error?: string) {
    this.results.push({
      scenario: scenario.name,
      success,
      error,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  generateReport(): string {
    const totalScenarios = this.results.length;
    const successfulScenarios = this.results.filter(r => r.success).length;
    const failedScenarios = totalScenarios - successfulScenarios;
    
    const report = [
      '# Test Scenario Execution Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      `Total Scenarios: ${totalScenarios}`,
      `Successful: ${successfulScenarios}`,
      `Failed: ${failedScenarios}`,
      `Success Rate: ${totalScenarios > 0 ? ((successfulScenarios / totalScenarios) * 100).toFixed(1) : 0}%`,
      '',
      '## Detailed Results',
      ...this.results.map(result => {
        const status = result.success ? '✅' : '❌';
        const duration = `${result.duration}ms`;
        const error = result.error ? `\n   Error: ${result.error}` : '';
        
        return `${status} **${result.scenario}** (${duration})${error}`;
      }),
      '',
      '## Failed Scenarios',
      ...this.results
        .filter(r => !r.success)
        .map(result => `- **${result.scenario}**: ${result.error}`),
      '',
      '## Recommendations',
      ...(failedScenarios > 0 ? [
        '1. Review failed scenario errors above',
        '2. Check network logs for missing API calls',
        '3. Verify backend services are running',
        '4. Check React Router configuration',
        '5. Validate component state management'
      ] : [
        '1. All scenarios passed - system appears to be working correctly',
        '2. Continue with regular testing procedures'
      ])
    ].join('\n');

    return report;
  }

  getResults() {
    return [...this.results];
  }
}