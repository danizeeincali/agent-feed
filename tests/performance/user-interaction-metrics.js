/**
 * User Interaction Performance Metrics
 *
 * Measures click-to-paint metrics and user interaction responsiveness:
 * - First Input Delay (FID)
 * - Interaction to Next Paint (INP)
 * - Click-to-paint latency
 * - Scroll performance
 * - Form interaction performance
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const USER_INTERACTION_THRESHOLDS = {
  firstInputDelay: 100,      // 100ms FID threshold
  interactionToNextPaint: 200, // 200ms INP threshold
  clickToPaint: 150,         // 150ms click-to-paint
  scrollFrameRate: 60,       // 60 FPS scroll performance
  formResponseTime: 100,     // 100ms form input response
  buttonResponseTime: 50,    // 50ms button response
  hoverResponseTime: 30      // 30ms hover response
};

const INTERACTION_TEST_SCENARIOS = [
  {
    name: 'Button Click Responsiveness',
    url: '/',
    interactions: [
      {
        type: 'click',
        selector: 'button:not([disabled])',
        expectedResponse: 'visual_change',
        timeout: 5000
      }
    ]
  },
  {
    name: 'Form Input Performance',
    url: '/settings',
    interactions: [
      {
        type: 'type',
        selector: 'input[type="text"]',
        text: 'performance test input',
        expectedResponse: 'input_value_change'
      },
      {
        type: 'type',
        selector: 'textarea',
        text: 'This is a longer text input to test textarea performance',
        expectedResponse: 'input_value_change'
      }
    ]
  },
  {
    name: 'Navigation Performance',
    url: '/',
    interactions: [
      {
        type: 'click',
        selector: 'a[href="/agents"]',
        expectedResponse: 'navigation',
        timeout: 3000
      },
      {
        type: 'click',
        selector: 'a[href="/feeds"]',
        expectedResponse: 'navigation',
        timeout: 3000
      }
    ]
  },
  {
    name: 'Scroll Performance',
    url: '/feeds',
    interactions: [
      {
        type: 'scroll',
        direction: 'down',
        distance: 'viewport',
        expectedResponse: 'smooth_scroll'
      },
      {
        type: 'scroll',
        direction: 'up',
        distance: 'viewport',
        expectedResponse: 'smooth_scroll'
      }
    ]
  },
  {
    name: 'Hover Interactions',
    url: '/agents',
    interactions: [
      {
        type: 'hover',
        selector: '.agent-card',
        expectedResponse: 'visual_change'
      },
      {
        type: 'hover',
        selector: '.tooltip-trigger',
        expectedResponse: 'tooltip_show'
      }
    ]
  },
  {
    name: 'Modal Interactions',
    url: '/agents',
    interactions: [
      {
        type: 'click',
        selector: '[data-modal-trigger]',
        expectedResponse: 'modal_open'
      },
      {
        type: 'click',
        selector: '[data-modal-close]',
        expectedResponse: 'modal_close'
      }
    ]
  }
];

class UserInteractionMetrics {
  constructor(options = {}) {
    this.options = { ...USER_INTERACTION_THRESHOLDS, ...options };
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  /**
   * Initialize browser with performance monitoring
   */
  async initialize() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--enable-precise-memory-info',
        '--enable-gpu-benchmarking'
      ]
    });

    this.page = await this.browser.newPage();

    // Set viewport for consistent testing
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Enable necessary domains for performance monitoring
    await this.page._client.send('Performance.enable');
    await this.page._client.send('Runtime.enable');
    await this.page._client.send('Page.enable');

    // Inject performance monitoring script
    await this.page.evaluateOnNewDocument(this.getPerformanceMonitoringScript());
  }

  /**
   * Performance monitoring script injection
   */
  getPerformanceMonitoringScript() {
    return `
      window.__interactionMetrics = {
        interactions: [],
        paintTimings: [],
        frameRates: [],

        // Track interaction start
        startInteraction(type, target) {
          const interaction = {
            type,
            target: target.tagName + (target.id ? '#' + target.id : '') + (target.className ? '.' + target.className.split(' ')[0] : ''),
            startTime: performance.now(),
            inputDelay: null,
            paintDelay: null,
            responseTime: null
          };

          this.interactions.push(interaction);
          return this.interactions.length - 1;
        },

        // Track paint after interaction
        recordPaint(interactionIndex) {
          if (this.interactions[interactionIndex]) {
            const interaction = this.interactions[interactionIndex];
            interaction.paintDelay = performance.now() - interaction.startTime;
          }
        },

        // Record frame rate during scrolling
        startFrameRateMonitoring() {
          let frameCount = 0;
          let lastTime = performance.now();
          const frameRates = [];

          const countFrames = () => {
            frameCount++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 1000) {
              const fps = (frameCount * 1000) / (currentTime - lastTime);
              frameRates.push(fps);
              frameCount = 0;
              lastTime = currentTime;
            }

            requestAnimationFrame(countFrames);
          };

          requestAnimationFrame(countFrames);
          return frameRates;
        },

        // Measure First Input Delay
        measureFID() {
          let fidObserver;

          return new Promise((resolve) => {
            if ('PerformanceObserver' in window) {
              fidObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                for (const entry of entries) {
                  if (entry.entryType === 'first-input') {
                    resolve({
                      startTime: entry.startTime,
                      processingStart: entry.processingStart,
                      processingEnd: entry.processingEnd,
                      duration: entry.duration,
                      inputDelay: entry.processingStart - entry.startTime
                    });
                    fidObserver.disconnect();
                    break;
                  }
                }
              });

              fidObserver.observe({ entryTypes: ['first-input'] });
            } else {
              resolve(null);
            }

            // Timeout after 10 seconds
            setTimeout(() => {
              if (fidObserver) fidObserver.disconnect();
              resolve(null);
            }, 10000);
          });
        },

        // Measure Interaction to Next Paint
        measureINP() {
          if (!('PerformanceObserver' in window)) return null;

          const interactions = [];

          const observer = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (entry.entryType === 'event') {
                interactions.push({
                  type: entry.name,
                  startTime: entry.startTime,
                  processingStart: entry.processingStart,
                  processingEnd: entry.processingEnd,
                  duration: entry.duration
                });
              }
            }
          });

          observer.observe({ entryTypes: ['event'] });

          return {
            getINP: () => {
              if (interactions.length === 0) return null;

              // Calculate 98th percentile of interaction durations
              const durations = interactions.map(i => i.duration).sort((a, b) => a - b);
              const p98Index = Math.floor(durations.length * 0.98);
              return durations[p98Index] || durations[durations.length - 1];
            },
            getInteractions: () => interactions
          };
        },

        // Get Core Web Vitals
        getCoreWebVitals() {
          return new Promise((resolve) => {
            const vitals = {
              FCP: null,
              LCP: null,
              FID: null,
              CLS: null
            };

            if ('PerformanceObserver' in window) {
              // First Contentful Paint
              new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                vitals.FCP = entries[entries.length - 1]?.startTime;
              }).observe({ entryTypes: ['paint'] });

              // Largest Contentful Paint
              new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                vitals.LCP = entries[entries.length - 1]?.startTime;
              }).observe({ entryTypes: ['largest-contentful-paint'] });

              // Cumulative Layout Shift
              new PerformanceObserver((entryList) => {
                let clsValue = 0;
                for (const entry of entryList.getEntries()) {
                  if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                  }
                }
                vitals.CLS = clsValue;
              }).observe({ entryTypes: ['layout-shift'] });
            }

            // Wait for measurements to complete
            setTimeout(() => resolve(vitals), 2000);
          });
        }
      };

      // Patch event listeners to track interactions
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (['click', 'keydown', 'touchstart'].includes(type)) {
          const wrappedListener = function(event) {
            const interactionIndex = window.__interactionMetrics.startInteraction(type, event.target);

            // Schedule paint tracking
            requestAnimationFrame(() => {
              window.__interactionMetrics.recordPaint(interactionIndex);
            });

            return listener.apply(this, arguments);
          };

          return originalAddEventListener.call(this, type, wrappedListener, options);
        }

        return originalAddEventListener.call(this, type, listener, options);
      };
    `;
  }

  /**
   * Test a specific interaction scenario
   */
  async testScenario(scenario) {
    console.log(`Testing scenario: ${scenario.name}`);

    await this.page.goto(`http://localhost:3000${scenario.url}`, {
      waitUntil: 'networkidle2'
    });

    // Wait for page to be fully interactive
    await this.page.waitForLoadState('networkidle');

    // Start measuring FID and INP
    const fidPromise = this.page.evaluate(() => window.__interactionMetrics.measureFID());
    const inpTracker = await this.page.evaluate(() => window.__interactionMetrics.measureINP());

    const scenarioResults = {
      name: scenario.name,
      url: scenario.url,
      interactions: [],
      coreWebVitals: null,
      overallScore: 0
    };

    // Execute each interaction
    for (const interaction of scenario.interactions) {
      const interactionResult = await this.executeInteraction(interaction);
      scenarioResults.interactions.push(interactionResult);
    }

    // Get Core Web Vitals
    scenarioResults.coreWebVitals = await this.page.evaluate(() =>
      window.__interactionMetrics.getCoreWebVitals()
    );

    // Wait for FID measurement
    const fidResult = await fidPromise;
    if (fidResult) {
      scenarioResults.coreWebVitals.FID = fidResult.inputDelay;
    }

    // Calculate overall performance score
    scenarioResults.overallScore = this.calculateScenarioScore(scenarioResults);

    this.results.push(scenarioResults);
    return scenarioResults;
  }

  /**
   * Execute a single interaction and measure performance
   */
  async executeInteraction(interaction) {
    const startTime = Date.now();
    let success = false;
    let error = null;
    let metrics = {};

    try {
      switch (interaction.type) {
        case 'click':
          metrics = await this.measureClickPerformance(interaction);
          success = true;
          break;

        case 'type':
          metrics = await this.measureTypingPerformance(interaction);
          success = true;
          break;

        case 'scroll':
          metrics = await this.measureScrollPerformance(interaction);
          success = true;
          break;

        case 'hover':
          metrics = await this.measureHoverPerformance(interaction);
          success = true;
          break;

        default:
          throw new Error(`Unknown interaction type: ${interaction.type}`);
      }
    } catch (err) {
      error = err.message;
      metrics = { error: err.message };
    }

    return {
      type: interaction.type,
      selector: interaction.selector,
      metrics,
      success,
      error,
      duration: Date.now() - startTime
    };
  }

  /**
   * Measure click-to-paint performance
   */
  async measureClickPerformance(interaction) {
    const startTime = performance.now();

    // Start visual monitoring
    const paintPromise = this.page.evaluate(() => {
      return new Promise((resolve) => {
        const startTime = performance.now();

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(performance.now() - startTime);
          });
        });
      });
    });

    // Perform the click
    await this.page.click(interaction.selector);

    const paintTime = await paintPromise;
    const responseTime = performance.now() - startTime;

    // Check for expected response
    let responseDetected = false;
    if (interaction.expectedResponse === 'visual_change') {
      responseDetected = paintTime > 0;
    } else if (interaction.expectedResponse === 'navigation') {
      responseDetected = await this.page.waitForNavigation({ timeout: interaction.timeout || 3000 })
        .then(() => true)
        .catch(() => false);
    }

    return {
      clickToPaint: paintTime,
      responseTime,
      responseDetected,
      withinThreshold: paintTime < this.options.clickToPaint
    };
  }

  /**
   * Measure typing performance and input responsiveness
   */
  async measureTypingPerformance(interaction) {
    const element = await this.page.$(interaction.selector);
    if (!element) {
      throw new Error(`Element not found: ${interaction.selector}`);
    }

    await element.click(); // Focus the element

    const text = interaction.text;
    const charTimings = [];

    // Type each character and measure response time
    for (let i = 0; i < text.length; i++) {
      const startTime = performance.now();

      await this.page.keyboard.type(text[i]);

      // Wait for the character to appear
      const endTime = performance.now();
      charTimings.push(endTime - startTime);

      // Small delay to simulate realistic typing
      if (i < text.length - 1) {
        await this.page.waitForTimeout(50);
      }
    }

    const avgCharTime = charTimings.reduce((sum, time) => sum + time, 0) / charTimings.length;
    const maxCharTime = Math.max(...charTimings);

    return {
      averageCharacterTime: avgCharTime,
      maxCharacterTime: maxCharTime,
      totalTypingTime: charTimings.reduce((sum, time) => sum + time, 0),
      withinThreshold: avgCharTime < this.options.formResponseTime
    };
  }

  /**
   * Measure scroll performance and frame rate
   */
  async measureScrollPerformance(interaction) {
    // Start frame rate monitoring
    await this.page.evaluate(() => {
      window.__scrollFrameRates = [];
      let frameCount = 0;
      let lastTime = performance.now();

      const measureFrames = () => {
        frameCount++;
        const currentTime = performance.now();

        if (currentTime - lastTime >= 100) { // Measure every 100ms
          const fps = (frameCount * 1000) / (currentTime - lastTime);
          window.__scrollFrameRates.push(fps);
          frameCount = 0;
          lastTime = currentTime;
        }

        if (window.__scrollFrameRates.length < 20) { // Monitor for 2 seconds max
          requestAnimationFrame(measureFrames);
        }
      };

      requestAnimationFrame(measureFrames);
    });

    const startTime = performance.now();

    // Perform scroll
    const scrollDistance = interaction.distance === 'viewport'
      ? await this.page.evaluate(() => window.innerHeight)
      : interaction.distance;

    if (interaction.direction === 'down') {
      await this.page.evaluate((distance) => {
        window.scrollBy({ top: distance, behavior: 'smooth' });
      }, scrollDistance);
    } else {
      await this.page.evaluate((distance) => {
        window.scrollBy({ top: -distance, behavior: 'smooth' });
      }, scrollDistance);
    }

    // Wait for scroll to complete
    await this.page.waitForTimeout(1000);

    const scrollTime = performance.now() - startTime;

    // Get frame rate measurements
    const frameRates = await this.page.evaluate(() => window.__scrollFrameRates);
    const avgFrameRate = frameRates.length > 0
      ? frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length
      : 0;

    return {
      scrollDuration: scrollTime,
      averageFrameRate: avgFrameRate,
      minFrameRate: Math.min(...frameRates),
      frameRateConsistency: frameRates.length > 0 ? (Math.min(...frameRates) / Math.max(...frameRates)) : 0,
      withinThreshold: avgFrameRate >= this.options.scrollFrameRate * 0.8 // 80% of target
    };
  }

  /**
   * Measure hover response performance
   */
  async measureHoverPerformance(interaction) {
    const startTime = performance.now();

    // Set up paint monitoring
    const hoverPromise = this.page.evaluate(() => {
      const startTime = performance.now();

      return new Promise((resolve) => {
        const observer = new MutationObserver((mutations) => {
          let hasVisualChange = false;

          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' &&
                (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
              hasVisualChange = true;
            }
          });

          if (hasVisualChange) {
            observer.disconnect();
            resolve(performance.now() - startTime);
          }
        });

        observer.observe(document.body, {
          attributes: true,
          subtree: true,
          attributeFilter: ['class', 'style']
        });

        // Timeout after 1 second
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, 1000);
      });
    });

    // Perform hover
    await this.page.hover(interaction.selector);

    const visualChangeTime = await hoverPromise;
    const totalTime = performance.now() - startTime;

    return {
      hoverResponseTime: visualChangeTime || totalTime,
      totalHoverTime: totalTime,
      visualChangeDetected: visualChangeTime !== null,
      withinThreshold: (visualChangeTime || totalTime) < this.options.hoverResponseTime
    };
  }

  /**
   * Calculate overall performance score for a scenario
   */
  calculateScenarioScore(scenarioResults) {
    let score = 100;
    const penalties = [];

    // Check Core Web Vitals
    const cwv = scenarioResults.coreWebVitals;
    if (cwv) {
      if (cwv.FID && cwv.FID > this.options.firstInputDelay) {
        const penalty = Math.min(20, (cwv.FID / this.options.firstInputDelay - 1) * 50);
        score -= penalty;
        penalties.push({ metric: 'FID', penalty, value: cwv.FID });
      }

      if (cwv.CLS && cwv.CLS > 0.1) {
        const penalty = Math.min(15, cwv.CLS * 150);
        score -= penalty;
        penalties.push({ metric: 'CLS', penalty, value: cwv.CLS });
      }
    }

    // Check interaction performance
    scenarioResults.interactions.forEach((interaction) => {
      if (!interaction.success) {
        score -= 10;
        penalties.push({ metric: interaction.type, penalty: 10, reason: 'failed' });
      } else if (interaction.metrics && !interaction.metrics.withinThreshold) {
        score -= 5;
        penalties.push({ metric: interaction.type, penalty: 5, reason: 'threshold_exceeded' });
      }
    });

    return {
      score: Math.max(0, score),
      penalties
    };
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalScenarios: this.results.length,
        averageScore: this.results.reduce((sum, r) => sum + r.overallScore.score, 0) / this.results.length,
        passedScenarios: this.results.filter(r => r.overallScore.score >= 80).length
      },
      scenarios: this.results,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const allPenalties = this.results.flatMap(r => r.overallScore.penalties);

    // Group penalties by metric
    const penaltyGroups = allPenalties.reduce((groups, penalty) => {
      if (!groups[penalty.metric]) {
        groups[penalty.metric] = [];
      }
      groups[penalty.metric].push(penalty);
      return groups;
    }, {});

    // Generate recommendations based on common issues
    Object.entries(penaltyGroups).forEach(([metric, penalties]) => {
      if (penalties.length >= 2) { // Common issue
        switch (metric) {
          case 'FID':
            recommendations.push({
              priority: 'high',
              metric: 'First Input Delay',
              issue: 'Slow response to user interactions',
              solution: 'Optimize JavaScript execution, reduce main thread blocking time, consider code splitting'
            });
            break;
          case 'click':
            recommendations.push({
              priority: 'medium',
              metric: 'Click Performance',
              issue: 'Slow click-to-paint response',
              solution: 'Optimize click handlers, reduce DOM manipulation, use CSS transforms for animations'
            });
            break;
          case 'scroll':
            recommendations.push({
              priority: 'medium',
              metric: 'Scroll Performance',
              issue: 'Low frame rate during scrolling',
              solution: 'Use will-change CSS property, optimize scroll event handlers, implement virtual scrolling'
            });
            break;
        }
      }
    });

    return recommendations;
  }

  /**
   * Save results to file
   */
  async saveResults(filename = 'user-interaction-results.json') {
    const reportDir = path.join(process.cwd(), 'tests/performance/reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = this.generateReport();
    fs.writeFileSync(path.join(reportDir, filename), JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI interface
async function main() {
  const metrics = new UserInteractionMetrics();

  try {
    await metrics.initialize();

    console.log('Starting user interaction performance tests...');

    // Run all test scenarios
    for (const scenario of INTERACTION_TEST_SCENARIOS) {
      const result = await metrics.testScenario(scenario);
      console.log(`${scenario.name}: Score ${result.overallScore.score}/100`);
    }

    // Generate and save report
    const report = await metrics.saveResults();

    console.log('\nUser Interaction Performance Report');
    console.log('==================================');
    console.log(`Average Score: ${report.summary.averageScore.toFixed(1)}/100`);
    console.log(`Scenarios Passed: ${report.summary.passedScenarios}/${report.summary.totalScenarios}`);

    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}`);
        console.log(`   Solution: ${rec.solution}`);
      });
    }

    // Fail build if average score is below threshold
    const minScore = 80;
    if (report.summary.averageScore < minScore) {
      console.error(`\n❌ User interaction performance below threshold (${minScore})`);
      process.exit(1);
    } else {
      console.log('\n✅ User interaction performance tests passed');
    }

  } catch (error) {
    console.error('User interaction testing failed:', error);
    process.exit(1);
  } finally {
    await metrics.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  UserInteractionMetrics,
  INTERACTION_TEST_SCENARIOS,
  USER_INTERACTION_THRESHOLDS
};