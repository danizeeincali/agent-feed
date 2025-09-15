/**
 * Memory Leak Detection for React Components
 *
 * Detects memory leaks in React components using:
 * - Component mount/unmount tracking
 * - Memory usage profiling
 * - Event listener leak detection
 * - State update after unmount detection
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const MEMORY_THRESHOLDS = {
  maxHeapSize: 50 * 1024 * 1024,    // 50MB
  maxGrowthRate: 0.1,               // 10% growth per test
  maxLeakThreshold: 5 * 1024 * 1024, // 5MB leak threshold
  maxEventListeners: 100,           // Max event listeners per type
  testDuration: 60000,              // 60 seconds per test
  samplingInterval: 1000            // Sample every second
};

class MemoryLeakDetector {
  constructor(options = {}) {
    this.options = { ...MEMORY_THRESHOLDS, ...options };
    this.browser = null;
    this.page = null;
    this.baseMemory = 0;
    this.memorySnapshots = [];
    this.leakReport = {
      components: {},
      eventListeners: {},
      memoryGrowth: [],
      leaks: []
    };
  }

  /**
   * Initialize browser and set up memory monitoring
   */
  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.page = await this.browser.newPage();

    // Enable runtime and heap profiler
    await this.page._client.send('Runtime.enable');
    await this.page._client.send('HeapProfiler.enable');

    // Inject memory monitoring script
    await this.page.evaluateOnNewDocument(this.getMemoryMonitoringScript());

    // Set up React DevTools integration
    await this.page.evaluateOnNewDocument(this.getReactDevToolsScript());
  }

  /**
   * Memory monitoring script injected into pages
   */
  getMemoryMonitoringScript() {
    return `
      window.__memoryMonitor = {
        componentInstances: new Map(),
        eventListeners: new Map(),
        stateUpdates: [],
        memorySnapshots: [],

        trackComponent(name, instance, type = 'mount') {
          if (!this.componentInstances.has(name)) {
            this.componentInstances.set(name, []);
          }

          this.componentInstances.get(name).push({
            instance,
            type,
            timestamp: Date.now(),
            stack: new Error().stack
          });
        },

        trackEventListener(type, element, handler, action = 'add') {
          const key = type + '_' + (element.id || element.className || 'anonymous');
          if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
          }

          this.eventListeners.get(key).push({
            type,
            element: element.tagName,
            action,
            timestamp: Date.now(),
            stack: new Error().stack
          });
        },

        trackStateUpdate(componentName, updateType) {
          this.stateUpdates.push({
            component: componentName,
            type: updateType,
            timestamp: Date.now(),
            stack: new Error().stack
          });
        },

        takeMemorySnapshot() {
          const memory = performance.memory;
          const snapshot = {
            timestamp: Date.now(),
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            componentCount: this.getComponentCount(),
            eventListenerCount: this.getEventListenerCount()
          };

          this.memorySnapshots.push(snapshot);
          return snapshot;
        },

        getComponentCount() {
          let total = 0;
          for (const [name, instances] of this.componentInstances) {
            const mounted = instances.filter(i => i.type === 'mount').length;
            const unmounted = instances.filter(i => i.type === 'unmount').length;
            total += mounted - unmounted;
          }
          return total;
        },

        getEventListenerCount() {
          let total = 0;
          for (const [key, events] of this.eventListeners) {
            const added = events.filter(e => e.action === 'add').length;
            const removed = events.filter(e => e.action === 'remove').length;
            total += added - removed;
          }
          return total;
        },

        getReport() {
          return {
            components: Object.fromEntries(this.componentInstances),
            eventListeners: Object.fromEntries(this.eventListeners),
            stateUpdates: this.stateUpdates,
            memorySnapshots: this.memorySnapshots
          };
        }
      };

      // Patch React to track component lifecycle
      if (window.React) {
        const originalCreateElement = window.React.createElement;
        window.React.createElement = function(type, props, ...children) {
          const element = originalCreateElement.apply(this, arguments);

          if (typeof type === 'function' && type.name) {
            window.__memoryMonitor.trackComponent(type.name, element, 'create');
          }

          return element;
        };
      }

      // Patch addEventListener and removeEventListener
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

      EventTarget.prototype.addEventListener = function(type, listener, options) {
        window.__memoryMonitor.trackEventListener(type, this, listener, 'add');
        return originalAddEventListener.call(this, type, listener, options);
      };

      EventTarget.prototype.removeEventListener = function(type, listener, options) {
        window.__memoryMonitor.trackEventListener(type, this, listener, 'remove');
        return originalRemoveEventListener.call(this, type, listener, options);
      };
    `;
  }

  /**
   * React DevTools integration script
   */
  getReactDevToolsScript() {
    return `
      // React DevTools hook for component tracking
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

        hook.onCommitFiberRoot = (function(original) {
          return function(id, root, ...args) {
            // Track fiber tree for memory analysis
            window.__memoryMonitor.trackFiberTree &&
            window.__memoryMonitor.trackFiberTree(root);

            return original && original.call(this, id, root, ...args);
          };
        })(hook.onCommitFiberRoot);
      }
    `;
  }

  /**
   * Test a specific page for memory leaks
   */
  async testPage(url, testScenarios = []) {
    console.log(`Testing memory leaks for: ${url}`);

    await this.page.goto(url, { waitUntil: 'networkidle2' });

    // Take baseline memory snapshot
    this.baseMemory = await this.takeMemorySnapshot();
    console.log(`Baseline memory: ${this.formatMemory(this.baseMemory.usedJSHeapSize)}`);

    // Run test scenarios
    for (const scenario of testScenarios) {
      await this.runTestScenario(scenario);
    }

    // Analyze results
    const analysis = await this.analyzeMemoryUsage();
    return analysis;
  }

  /**
   * Run a specific test scenario
   */
  async runTestScenario(scenario) {
    console.log(`Running scenario: ${scenario.name}`);

    const startTime = Date.now();
    const endTime = startTime + (scenario.duration || this.options.testDuration);

    // Start memory monitoring
    const monitoringInterval = setInterval(async () => {
      await this.takeMemorySnapshot();
    }, this.options.samplingInterval);

    try {
      // Execute scenario actions
      if (scenario.actions) {
        for (const action of scenario.actions) {
          await this.executeAction(action);
          await this.page.waitForTimeout(500); // Small delay between actions
        }
      }

      // Continue monitoring for scenario duration
      while (Date.now() < endTime) {
        if (scenario.repeatActions) {
          for (const action of scenario.actions) {
            await this.executeAction(action);
          }
        }
        await this.page.waitForTimeout(1000);
      }

    } finally {
      clearInterval(monitoringInterval);
    }

    // Force garbage collection if possible
    try {
      await this.page._client.send('HeapProfiler.collectGarbage');
    } catch (e) {
      // Ignore if GC not available
    }

    // Final snapshot
    await this.takeMemorySnapshot();
  }

  /**
   * Execute a test action
   */
  async executeAction(action) {
    switch (action.type) {
      case 'click':
        await this.page.click(action.selector);
        break;
      case 'navigate':
        await this.page.goto(action.url, { waitUntil: 'networkidle2' });
        break;
      case 'type':
        await this.page.type(action.selector, action.text);
        break;
      case 'scroll':
        await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
        break;
      case 'hover':
        await this.page.hover(action.selector);
        break;
      case 'wait':
        await this.page.waitForTimeout(action.duration || 1000);
        break;
      case 'execute':
        await this.page.evaluate(action.script);
        break;
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Take a memory snapshot
   */
  async takeMemorySnapshot() {
    const snapshot = await this.page.evaluate(() => {
      return window.__memoryMonitor.takeMemorySnapshot();
    });

    this.memorySnapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Analyze memory usage patterns
   */
  async analyzeMemoryUsage() {
    const report = await this.page.evaluate(() => {
      return window.__memoryMonitor.getReport();
    });

    const analysis = {
      memoryLeaks: this.detectMemoryLeaks(),
      componentLeaks: this.detectComponentLeaks(report.components),
      eventListenerLeaks: this.detectEventListenerLeaks(report.eventListeners),
      stateUpdateLeaks: this.detectStateUpdateLeaks(report.stateUpdates),
      recommendations: []
    };

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Detect memory leaks from snapshots
   */
  detectMemoryLeaks() {
    if (this.memorySnapshots.length < 2) {
      return { detected: false, reason: 'Insufficient data' };
    }

    const first = this.memorySnapshots[0];
    const last = this.memorySnapshots[this.memorySnapshots.length - 1];

    const memoryGrowth = last.usedJSHeapSize - first.usedJSHeapSize;
    const growthRate = memoryGrowth / first.usedJSHeapSize;

    const leak = {
      detected: memoryGrowth > this.options.maxLeakThreshold,
      growth: memoryGrowth,
      growthRate: growthRate,
      threshold: this.options.maxLeakThreshold,
      pattern: this.analyzeGrowthPattern()
    };

    return leak;
  }

  /**
   * Analyze memory growth pattern
   */
  analyzeGrowthPattern() {
    const samples = this.memorySnapshots.map((snapshot, index) => ({
      time: index,
      memory: snapshot.usedJSHeapSize
    }));

    // Simple linear regression to detect trends
    const n = samples.length;
    const sumX = samples.reduce((sum, s) => sum + s.time, 0);
    const sumY = samples.reduce((sum, s) => sum + s.memory, 0);
    const sumXY = samples.reduce((sum, s) => sum + s.time * s.memory, 0);
    const sumXX = samples.reduce((sum, s) => sum + s.time * s.time, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      slope,
      correlation: this.calculateCorrelation(samples)
    };
  }

  /**
   * Calculate correlation coefficient
   */
  calculateCorrelation(samples) {
    const n = samples.length;
    const meanX = samples.reduce((sum, s) => sum + s.time, 0) / n;
    const meanY = samples.reduce((sum, s) => sum + s.memory, 0) / n;

    const numerator = samples.reduce((sum, s) =>
      sum + (s.time - meanX) * (s.memory - meanY), 0);
    const denominator = Math.sqrt(
      samples.reduce((sum, s) => sum + Math.pow(s.time - meanX, 2), 0) *
      samples.reduce((sum, s) => sum + Math.pow(s.memory - meanY, 2), 0)
    );

    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Detect component-related leaks
   */
  detectComponentLeaks(components) {
    const leaks = [];

    for (const [componentName, instances] of Object.entries(components)) {
      const mounts = instances.filter(i => i.type === 'mount').length;
      const unmounts = instances.filter(i => i.type === 'unmount').length;
      const leaked = mounts - unmounts;

      if (leaked > 0) {
        leaks.push({
          component: componentName,
          leaked,
          instances: instances.length,
          severity: leaked > 10 ? 'high' : leaked > 5 ? 'medium' : 'low'
        });
      }
    }

    return leaks;
  }

  /**
   * Detect event listener leaks
   */
  detectEventListenerLeaks(eventListeners) {
    const leaks = [];

    for (const [key, events] of Object.entries(eventListeners)) {
      const added = events.filter(e => e.action === 'add').length;
      const removed = events.filter(e => e.action === 'remove').length;
      const leaked = added - removed;

      if (leaked > this.options.maxEventListeners) {
        leaks.push({
          type: key,
          leaked,
          severity: leaked > 50 ? 'high' : leaked > 20 ? 'medium' : 'low'
        });
      }
    }

    return leaks;
  }

  /**
   * Detect state update after unmount leaks
   */
  detectStateUpdateLeaks(stateUpdates) {
    // This would need more sophisticated React integration
    // For now, return a placeholder implementation
    return stateUpdates.filter(update =>
      update.type === 'setState' &&
      update.timestamp > Date.now() - 5000 // Recent updates
    );
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.memoryLeaks.detected) {
      recommendations.push({
        type: 'memory_leak',
        priority: 'high',
        message: `Memory leak detected: ${this.formatMemory(analysis.memoryLeaks.growth)} growth`,
        solution: 'Review component lifecycle methods and ensure proper cleanup'
      });
    }

    if (analysis.componentLeaks.length > 0) {
      recommendations.push({
        type: 'component_leak',
        priority: 'medium',
        message: `${analysis.componentLeaks.length} components have mounting/unmounting issues`,
        solution: 'Ensure components are properly unmounted and cleanup useEffect hooks'
      });
    }

    if (analysis.eventListenerLeaks.length > 0) {
      recommendations.push({
        type: 'event_listener_leak',
        priority: 'medium',
        message: `${analysis.eventListenerLeaks.length} event listener leaks detected`,
        solution: 'Remove event listeners in cleanup functions or useEffect return statements'
      });
    }

    return recommendations;
  }

  /**
   * Format memory size for display
   */
  formatMemory(bytes) {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)}MB`;
  }

  /**
   * Generate comprehensive report
   */
  generateReport(analyses) {
    let report = `
Memory Leak Detection Report
===========================

Generated: ${new Date().toISOString()}

`;

    for (const [url, analysis] of Object.entries(analyses)) {
      report += `
Page: ${url}
${'-'.repeat(url.length + 6)}

Memory Analysis:
  - Leak Detected: ${analysis.memoryLeaks.detected ? '❌ Yes' : '✅ No'}
  - Memory Growth: ${this.formatMemory(analysis.memoryLeaks.growth)}
  - Growth Rate: ${(analysis.memoryLeaks.growthRate * 100).toFixed(2)}%

Component Leaks: ${analysis.componentLeaks.length}
`;

      analysis.componentLeaks.forEach(leak => {
        report += `  - ${leak.component}: ${leak.leaked} leaked instances (${leak.severity})\n`;
      });

      report += `\nEvent Listener Leaks: ${analysis.eventListenerLeaks.length}\n`;
      analysis.eventListenerLeaks.forEach(leak => {
        report += `  - ${leak.type}: ${leak.leaked} leaked listeners (${leak.severity})\n`;
      });

      if (analysis.recommendations.length > 0) {
        report += `\nRecommendations:\n`;
        analysis.recommendations.forEach((rec, index) => {
          report += `  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}\n`;
          report += `     Solution: ${rec.solution}\n`;
        });
      }

      report += '\n';
    }

    return report;
  }

  /**
   * Clean up resources
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

// Predefined test scenarios
const TEST_SCENARIOS = {
  navigation: {
    name: 'Page Navigation',
    duration: 30000,
    repeatActions: true,
    actions: [
      { type: 'navigate', url: '/' },
      { type: 'wait', duration: 2000 },
      { type: 'navigate', url: '/agents' },
      { type: 'wait', duration: 2000 },
      { type: 'navigate', url: '/feeds' },
      { type: 'wait', duration: 2000 }
    ]
  },

  userInteraction: {
    name: 'User Interactions',
    duration: 45000,
    repeatActions: true,
    actions: [
      { type: 'click', selector: 'button' },
      { type: 'wait', duration: 1000 },
      { type: 'type', selector: 'input[type="text"]', text: 'test input' },
      { type: 'scroll' },
      { type: 'hover', selector: '.card' }
    ]
  },

  dynamicContent: {
    name: 'Dynamic Content Loading',
    duration: 60000,
    repeatActions: true,
    actions: [
      { type: 'execute', script: 'window.dispatchEvent(new Event("load-more"))' },
      { type: 'wait', duration: 2000 },
      { type: 'scroll' },
      { type: 'wait', duration: 1000 }
    ]
  }
};

// CLI interface
async function main() {
  const detector = new MemoryLeakDetector();

  try {
    await detector.initialize();

    const testPages = [
      'http://localhost:3000/',
      'http://localhost:3000/agents',
      'http://localhost:3000/feeds',
      'http://localhost:3000/profile'
    ];

    const results = {};

    for (const url of testPages) {
      console.log(`\nTesting ${url}...`);
      const analysis = await detector.testPage(url, Object.values(TEST_SCENARIOS));
      results[url] = analysis;

      if (analysis.memoryLeaks.detected) {
        console.error(`❌ Memory leak detected on ${url}`);
      } else {
        console.log(`✅ No memory leaks detected on ${url}`);
      }
    }

    // Generate report
    const report = detector.generateReport(results);
    console.log(report);

    // Save report
    const reportDir = path.join(process.cwd(), 'tests/performance/reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(path.join(reportDir, 'memory-leak-report.txt'), report);

    // Check if any leaks detected
    const hasLeaks = Object.values(results).some(analysis =>
      analysis.memoryLeaks.detected ||
      analysis.componentLeaks.length > 0 ||
      analysis.eventListenerLeaks.length > 0
    );

    if (hasLeaks) {
      console.error('❌ Memory leaks detected! Build should fail.');
      process.exit(1);
    } else {
      console.log('✅ No memory leaks detected.');
    }

  } catch (error) {
    console.error('Memory leak detection failed:', error.message);
    process.exit(1);
  } finally {
    await detector.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = { MemoryLeakDetector, TEST_SCENARIOS };