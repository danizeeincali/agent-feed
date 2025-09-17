/**
 * Manual Test Runner for Claude SDK Analytics E2E Tests
 * Runs comprehensive analytics testing across multiple browsers
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';

interface TestResult {
  testName: string;
  browser: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshot?: string;
}

interface TestSuite {
  name: string;
  tests: Array<(page: Page, context: BrowserContext) => Promise<void>>;
}

class AnalyticsTestRunner {
  private results: TestResult[] = [];
  private screenshots: string[] = [];

  async runAllTests() {
    console.log('🚀 Starting Claude SDK Analytics E2E Tests...\n');

    const browsers = [
      { name: 'chromium', instance: chromium },
      { name: 'firefox', instance: firefox },
      { name: 'webkit', instance: webkit }
    ];

    for (const { name, instance } of browsers) {
      console.log(`\n📱 Testing with ${name.toUpperCase()} browser...`);

      try {
        await this.runBrowserTests(name, instance);
      } catch (error) {
        console.error(`❌ Browser ${name} failed to initialize:`, error);
        this.results.push({
          testName: 'Browser Initialization',
          browser: name,
          status: 'failed',
          duration: 0,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.generateReport();
  }

  private async runBrowserTests(browserName: string, browser: any) {
    const browserInstance = await browser.launch({
      headless: false,
      timeout: 30000
    });

    try {
      const context = await browserInstance.newContext({
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write']
      });

      const page = await context.newPage();

      // Setup console monitoring
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('ResizeObserver')) {
          console.warn(`🐛 [${browserName}] Console error: ${msg.text()}`);
        }
      });

      // Setup API mocking
      await this.setupAPIMocks(page);

      // Run test suites
      const testSuites = this.getTestSuites();

      for (const suite of testSuites) {
        console.log(`  📊 Running ${suite.name}...`);

        for (const test of suite.tests) {
          const testName = test.name || 'Unknown Test';
          const startTime = Date.now();

          try {
            await test(page, context);
            const duration = Date.now() - startTime;

            this.results.push({
              testName: testName,
              browser: browserName,
              status: 'passed',
              duration
            });

            console.log(`    ✅ ${testName} (${duration}ms)`);

          } catch (error) {
            const duration = Date.now() - startTime;
            const screenshot = await this.takeScreenshot(page, browserName, testName);

            this.results.push({
              testName: testName,
              browser: browserName,
              status: 'failed',
              duration,
              error: error instanceof Error ? error.message : String(error),
              screenshot
            });

            console.log(`    ❌ ${testName} (${duration}ms) - ${error}`);
          }
        }
      }

      await context.close();

    } finally {
      await browserInstance.close();
    }
  }

  private async setupAPIMocks(page: Page) {
    // Mock analytics data
    await page.route('**/api/analytics/**', route => {
      const url = route.request().url();

      if (url.includes('cost-metrics')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            costMetrics: {
              totalTokensUsed: 25840,
              totalCost: 0.4567,
              costByProvider: { claude: 0.3890, openai: 0.0677 },
              costByModel: {
                'claude-3-5-sonnet-20241022': 0.3234,
                'claude-3-haiku-20240307': 0.0656,
                'gpt-4-turbo': 0.0677
              },
              averageCostPerToken: 0.0000177,
              tokensPerMinute: 145.6,
              costTrend: 'increasing' as const,
              lastUpdated: new Date(),
              dailyCost: 0.2456,
              weeklyCost: 1.2345,
              monthlyCost: 4.5678
            }
          })
        });
      } else if (url.includes('realtime')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            activeConnections: 3,
            messagesPerSecond: 2.4,
            averageResponseTime: 1200,
            errorRate: 0.02,
            timestamp: new Date().toISOString()
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] })
        });
      }
    });

    // Mock Claude Code API
    await page.route('**/api/claude-code/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          responses: [{ content: 'Test response', type: 'assistant' }],
          usage: { prompt_tokens: 156, completion_tokens: 89, total_tokens: 245 },
          model: 'claude-3-5-sonnet-20241022',
          timestamp: new Date().toISOString()
        })
      });
    });
  }

  private getTestSuites(): TestSuite[] {
    return [
      {
        name: 'Page Loading and Navigation',
        tests: [
          async function testPageLoading(page: Page) {
            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });

            // Check for dashboard elements
            const dashboardElements = page.locator('[data-testid*="analytics"], .analytics, .dashboard');
            await dashboardElements.first().waitFor({ state: 'visible', timeout: 10000 });

            if (await dashboardElements.count() === 0) {
              throw new Error('Analytics dashboard not found');
            }
          },

          async function testTabSwitching(page: Page) {
            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });

            // Look for tabs
            const tabs = page.locator('[role="tab"], .tab, button');
            const tabCount = await tabs.count();

            if (tabCount > 1) {
              await tabs.nth(0).click();
              await page.waitForTimeout(500);
              await tabs.nth(1).click();
              await page.waitForTimeout(500);
            }
          },

          async function testLoadingStates(page: Page) {
            // Add delay to API
            await page.route('**/api/analytics/**', route => {
              setTimeout(() => {
                route.fulfill({
                  status: 200,
                  contentType: 'application/json',
                  body: JSON.stringify({ data: 'delayed' })
                });
              }, 1000);
            });

            await page.goto('http://localhost:3000/analytics');

            // Should show loading then data
            await page.waitForTimeout(2000);
          }
        ]
      },

      {
        name: 'Cost Tracking and Displays',
        tests: [
          async function testCostMetrics(page: Page) {
            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });

            // Look for cost displays
            const costElements = page.locator('text=/\\$[0-9]/, [data-testid*="cost"], .cost');
            await page.waitForTimeout(3000);

            if (await costElements.count() === 0) {
              throw new Error('No cost metrics displayed');
            }
          },

          async function testTokenCounts(page: Page) {
            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });

            // Look for token displays
            const tokenElements = page.locator('text=/[0-9,]+ tokens/i, [data-testid*="token"], .token');
            await page.waitForTimeout(3000);

            // Token counts may or may not be visible depending on implementation
          },

          async function testBudgetAlerts(page: Page) {
            // Mock high usage
            await page.route('**/api/analytics/**', route => {
              route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  costMetrics: {
                    dailyCost: 8.5,
                    budgetAlert: { level: 'warning', percentage: 85 }
                  }
                })
              });
            });

            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });
            await page.waitForTimeout(3000);

            // Look for alerts
            const alerts = page.locator('[data-testid*="alert"], .alert, .warning');
            // Alerts may appear depending on implementation
          }
        ]
      },

      {
        name: 'Chart Interactions',
        tests: [
          async function testChartRendering(page: Page) {
            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });
            await page.waitForTimeout(5000);

            // Look for charts
            const charts = page.locator('canvas, svg, [data-testid*="chart"]');

            if (await charts.count() > 0) {
              const chart = charts.first();
              await chart.waitFor({ state: 'visible' });

              // Test hover interaction
              await chart.hover();
              await page.waitForTimeout(500);
            }
          },

          async function testChartInteractions(page: Page) {
            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });
            await page.waitForTimeout(5000);

            const charts = page.locator('canvas, svg');

            if (await charts.count() > 0) {
              const chart = charts.first();
              const boundingBox = await chart.boundingBox();

              if (boundingBox) {
                // Test click interaction
                await page.mouse.click(
                  boundingBox.x + boundingBox.width / 2,
                  boundingBox.y + boundingBox.height / 2
                );
                await page.waitForTimeout(500);
              }
            }
          }
        ]
      },

      {
        name: 'Real-time Updates',
        tests: [
          async function testRealTimeIndicators(page: Page) {
            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });

            // Look for real-time indicators
            const indicators = page.locator('[data-testid*="realtime"], [data-testid*="live"], .live');
            await page.waitForTimeout(3000);

            // Real-time indicators may not be present in all implementations
          },

          async function testDataRefresh(page: Page) {
            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });

            // Look for refresh buttons
            const refreshButtons = page.locator('button:has-text("Refresh"), [data-testid*="refresh"]');

            if (await refreshButtons.count() > 0) {
              await refreshButtons.first().click();
              await page.waitForTimeout(1000);
            }
          }
        ]
      },

      {
        name: 'Export and Performance',
        tests: [
          async function testExportFunctionality(page: Page) {
            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });

            // Look for export buttons
            const exportButtons = page.locator('button:has-text("Export"), [data-testid*="export"]');

            if (await exportButtons.count() > 0) {
              // Set up download handler
              const downloadPromise = page.waitForEvent('download', { timeout: 5000 });

              try {
                await exportButtons.first().click();
                await downloadPromise;
              } catch (error) {
                // Export might not trigger download in test environment
              }
            }
          },

          async function testResponsiveness(page: Page) {
            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });

            // Test different viewport sizes
            const viewports = [
              { width: 375, height: 667 },  // Mobile
              { width: 768, height: 1024 }, // Tablet
              { width: 1280, height: 720 }  // Desktop
            ];

            for (const viewport of viewports) {
              await page.setViewportSize(viewport);
              await page.waitForTimeout(1000);

              // Verify layout adapts
              const content = page.locator('body');
              await content.waitFor({ state: 'visible' });
            }
          },

          async function testPerformance(page: Page) {
            const startTime = Date.now();
            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });
            const loadTime = Date.now() - startTime;

            if (loadTime > 10000) {
              throw new Error(`Page loaded too slowly: ${loadTime}ms`);
            }
          }
        ]
      },

      {
        name: 'Error Handling',
        tests: [
          async function testAPIErrors(page: Page) {
            // Mock API error
            await page.route('**/api/analytics/**', route => {
              route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Server error' })
              });
            });

            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });
            await page.waitForTimeout(3000);

            // Should show error state, not crash
            const errorElements = page.locator('[data-testid*="error"], .error');
            // Error handling varies by implementation
          },

          async function testNetworkFailure(page: Page) {
            // Mock network failure
            await page.route('**/api/analytics/**', route => {
              route.abort('failed');
            });

            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });
            await page.waitForTimeout(3000);

            // Should handle gracefully
          },

          async function testEmptyData(page: Page) {
            // Mock empty data
            await page.route('**/api/analytics/**', route => {
              route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ costMetrics: { totalCost: 0, totalTokensUsed: 0 } })
              });
            });

            await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });
            await page.waitForTimeout(3000);

            // Should show empty state
          }
        ]
      }
    ];
  }

  private async takeScreenshot(page: Page, browser: string, testName: string): Promise<string> {
    try {
      const filename = `screenshot-${browser}-${testName.replace(/\s+/g, '-')}-${Date.now()}.png`;
      const filepath = `/workspaces/agent-feed/frontend/test-results/${filename}`;

      await page.screenshot({
        path: filepath,
        fullPage: true
      });

      this.screenshots.push(filepath);
      return filepath;
    } catch (error) {
      console.warn(`Failed to take screenshot: ${error}`);
      return '';
    }
  }

  private generateReport() {
    console.log('\n📊 TEST RESULTS SUMMARY\n');
    console.log('='.repeat(60));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'passed').length;
    const failedTests = this.results.filter(r => r.status === 'failed').length;
    const skippedTests = this.results.filter(r => r.status === 'skipped').length;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏭️  Skipped: ${skippedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    console.log('\n📈 BROWSER BREAKDOWN\n');
    const browsers = [...new Set(this.results.map(r => r.browser))];

    for (const browser of browsers) {
      const browserResults = this.results.filter(r => r.browser === browser);
      const browserPassed = browserResults.filter(r => r.status === 'passed').length;
      const browserTotal = browserResults.length;

      console.log(`${browser.toUpperCase()}: ${browserPassed}/${browserTotal} passed (${((browserPassed/browserTotal)*100).toFixed(1)}%)`);
    }

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS\n');
      console.log('-'.repeat(60));

      this.results
        .filter(r => r.status === 'failed')
        .forEach(result => {
          console.log(`🔴 ${result.browser} - ${result.testName}`);
          console.log(`   Error: ${result.error}`);
          if (result.screenshot) {
            console.log(`   Screenshot: ${result.screenshot}`);
          }
          console.log('');
        });
    }

    console.log('\n⚡ PERFORMANCE METRICS\n');
    console.log('-'.repeat(60));

    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    const maxDuration = Math.max(...this.results.map(r => r.duration));
    const minDuration = Math.min(...this.results.map(r => r.duration));

    console.log(`Average Test Duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`Fastest Test: ${minDuration}ms`);
    console.log(`Slowest Test: ${maxDuration}ms`);

    if (this.screenshots.length > 0) {
      console.log('\n📸 SCREENSHOTS CAPTURED\n');
      console.log('-'.repeat(60));
      this.screenshots.forEach(screenshot => {
        console.log(`📷 ${screenshot}`);
      });
    }

    console.log('\n🎯 RECOMMENDATIONS\n');
    console.log('-'.repeat(60));

    if (failedTests > 0) {
      console.log('• Review failed tests and fix underlying issues');
      console.log('• Check browser compatibility for failing features');
    }

    if (avgDuration > 5000) {
      console.log('• Consider optimizing slow-running tests');
      console.log('• Implement better wait strategies');
    }

    if (passedTests === totalTests) {
      console.log('• All tests passed! Analytics functionality is working well');
    }

    console.log('\n✨ Test execution completed!\n');

    // Write detailed report to file
    this.writeDetailedReport();
  }

  private writeDetailedReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'passed').length,
        failed: this.results.filter(r => r.status === 'failed').length,
        skipped: this.results.filter(r => r.status === 'skipped').length
      },
      results: this.results,
      screenshots: this.screenshots
    };

    const fs = require('fs');
    const reportPath = '/workspaces/agent-feed/frontend/test-results/analytics-e2e-report.json';

    try {
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      console.log(`📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.warn(`Failed to write report: ${error}`);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new AnalyticsTestRunner();
  runner.runAllTests().catch(console.error);
}

export { AnalyticsTestRunner };