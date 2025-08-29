/**
 * Test Runner Configuration for Claude Instance Lifecycle Tests
 * 
 * This file provides utilities for running the complete lifecycle test suite
 * with proper setup, teardown, and reporting.
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

interface TestRunnerOptions {
  headless?: boolean;
  browser?: string;
  parallel?: boolean;
  retries?: number;
  timeout?: number;
  outputDir?: string;
  reporterOptions?: {
    open?: string;
    host?: string;
    port?: number;
  };
}

interface TestSuite {
  name: string;
  file: string;
  description: string;
  dependencies?: string[];
}

// Define the test suite structure
const testSuites: TestSuite[] = [
  {
    name: 'instance-listing',
    file: '01-instance-listing.lifecycle.spec.ts',
    description: 'Instance listing loads successfully without "Failed to fetch instances" error'
  },
  {
    name: 'instance-creation', 
    file: '02-instance-creation.lifecycle.spec.ts',
    description: 'Instance creation works with corrected endpoints',
    dependencies: ['instance-listing']
  },
  {
    name: 'sse-connection',
    file: '03-sse-connection.lifecycle.spec.ts', 
    description: 'SSE connection establishment after instance creation',
    dependencies: ['instance-creation']
  },
  {
    name: 'terminal-streaming',
    file: '04-terminal-streaming.lifecycle.spec.ts',
    description: 'Real-time terminal streaming functionality',
    dependencies: ['sse-connection']
  },
  {
    name: 'multiple-instances',
    file: '05-multiple-instances.lifecycle.spec.ts',
    description: 'Multiple instance management and concurrent operations',
    dependencies: ['terminal-streaming']
  },
  {
    name: 'error-recovery',
    file: '06-error-recovery.lifecycle.spec.ts',
    description: 'Error recovery and graceful degradation scenarios',
    dependencies: ['multiple-instances']
  }
];

export class LifecycleTestRunner {
  private options: Required<TestRunnerOptions>;
  private testDir: string;

  constructor(options: TestRunnerOptions = {}) {
    this.testDir = path.resolve(__dirname);
    
    this.options = {
      headless: options.headless ?? true,
      browser: options.browser ?? 'chromium',
      parallel: options.parallel ?? false,
      retries: options.retries ?? 1,
      timeout: options.timeout ?? 180000,
      outputDir: options.outputDir ?? path.join(this.testDir, 'test-results'),
      reporterOptions: {
        open: options.reporterOptions?.open ?? 'never',
        host: options.reporterOptions?.host ?? 'localhost',
        port: options.reporterOptions?.port ?? 8080,
        ...options.reporterOptions
      }
    };

    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!existsSync(this.options.outputDir)) {
      mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * Run a specific test suite
   */
  async runSuite(suiteName: string): Promise<boolean> {
    const suite = testSuites.find(s => s.name === suiteName);
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found`);
    }

    console.log(`🚀 Running test suite: ${suite.name}`);
    console.log(`📝 Description: ${suite.description}`);

    const success = await this.runPlaywrightTest(suite.file);
    
    if (success) {
      console.log(`✅ Test suite '${suite.name}' completed successfully`);
    } else {
      console.log(`❌ Test suite '${suite.name}' failed`);
    }

    return success;
  }

  /**
   * Run all test suites in order
   */
  async runAll(): Promise<{ passed: number; failed: number; results: Array<{ suite: string; success: boolean }> }> {
    console.log('🎯 Starting Claude Instance Lifecycle Test Suite');
    console.log('=' .repeat(60));
    
    const results = [];
    let passed = 0;
    let failed = 0;

    for (const suite of testSuites) {
      console.log(`\n📋 Running: ${suite.name} (${suite.description})`);
      
      // Check dependencies
      if (suite.dependencies) {
        const dependencyResults = results.filter(r => 
          suite.dependencies!.includes(r.suite)
        );
        
        const failedDependencies = dependencyResults.filter(r => !r.success);
        if (failedDependencies.length > 0) {
          console.log(`⚠️  Skipping ${suite.name} due to failed dependencies: ${failedDependencies.map(d => d.suite).join(', ')}`);
          results.push({ suite: suite.name, success: false });
          failed++;
          continue;
        }
      }

      const success = await this.runSuite(suite.name);
      results.push({ suite: suite.name, success });
      
      if (success) {
        passed++;
      } else {
        failed++;
      }

      // Add delay between test suites to allow cleanup
      if (suite !== testSuites[testSuites.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    this.printSummary(passed, failed, results);
    return { passed, failed, results };
  }

  /**
   * Run specific test suites by pattern
   */
  async runPattern(pattern: string): Promise<boolean> {
    const matchingSuites = testSuites.filter(suite => 
      suite.name.includes(pattern) || suite.description.toLowerCase().includes(pattern.toLowerCase())
    );

    if (matchingSuites.length === 0) {
      console.log(`❌ No test suites match pattern: ${pattern}`);
      return false;
    }

    console.log(`🎯 Running ${matchingSuites.length} test suites matching pattern: ${pattern}`);
    
    let allPassed = true;
    for (const suite of matchingSuites) {
      const success = await this.runSuite(suite.name);
      if (!success) {
        allPassed = false;
      }
    }

    return allPassed;
  }

  /**
   * Run tests for a specific browser
   */
  async runForBrowser(browser: string): Promise<boolean> {
    const originalBrowser = this.options.browser;
    this.options.browser = browser;

    console.log(`🌐 Running all tests for browser: ${browser}`);
    
    const result = await this.runAll();
    
    this.options.browser = originalBrowser;
    return result.failed === 0;
  }

  /**
   * Run cross-browser tests
   */
  async runCrossBrowser(): Promise<{ [browser: string]: boolean }> {
    const browsers = ['chromium', 'firefox', 'webkit'];
    const results: { [browser: string]: boolean } = {};

    console.log('🔄 Running cross-browser tests');
    console.log('Browsers:', browsers.join(', '));

    for (const browser of browsers) {
      console.log(`\n🌐 Testing with ${browser}...`);
      results[browser] = await this.runForBrowser(browser);
    }

    console.log('\n📊 Cross-browser Test Results:');
    console.log('=' .repeat(40));
    for (const [browser, success] of Object.entries(results)) {
      const status = success ? '✅ PASSED' : '❌ FAILED';
      console.log(`${browser.padEnd(10)} | ${status}`);
    }

    return results;
  }

  private async runPlaywrightTest(testFile: string): Promise<boolean> {
    return new Promise((resolve) => {
      const configFile = path.join(this.testDir, 'instance-lifecycle.config.ts');
      
      const args = [
        'test',
        testFile,
        '--config',
        configFile,
        '--project',
        `${this.options.browser}-instance-lifecycle`,
        '--output-dir',
        this.options.outputDir,
        '--timeout',
        this.options.timeout.toString(),
        '--retries',
        this.options.retries.toString()
      ];

      if (this.options.headless) {
        args.push('--headed');
      }

      if (!this.options.parallel) {
        args.push('--workers', '1');
      }

      // Add reporter options
      args.push('--reporter', 'list,json,html');

      console.log(`🔧 Running: npx playwright ${args.join(' ')}`);

      const process = spawn('npx', ['playwright', ...args], {
        cwd: this.testDir,
        stdio: 'inherit'
      });

      process.on('close', (code) => {
        resolve(code === 0);
      });

      process.on('error', (error) => {
        console.error(`❌ Error running test: ${error.message}`);
        resolve(false);
      });
    });
  }

  private printSummary(passed: number, failed: number, results: Array<{ suite: string; success: boolean }>): void {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Claude Instance Lifecycle Test Suite Complete');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total:  ${passed + failed}`);
    console.log('');

    console.log('📋 Detailed Results:');
    console.log('-'.repeat(40));
    for (const result of results) {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${result.suite.padEnd(20)} | ${status}`);
    }

    console.log('');
    console.log(`📁 Test artifacts saved to: ${this.options.outputDir}`);
    
    const reportPath = path.join(this.options.outputDir, '../playwright-report/instance-lifecycle/index.html');
    if (existsSync(reportPath)) {
      console.log(`📊 HTML report: ${reportPath}`);
    }
  }

  /**
   * Get test suite information
   */
  getSuiteInfo(): TestSuite[] {
    return testSuites.map(suite => ({ ...suite }));
  }

  /**
   * Validate test environment
   */
  async validateEnvironment(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check if Playwright is installed
    try {
      const { spawn } = require('child_process');
      await new Promise((resolve, reject) => {
        const process = spawn('npx', ['playwright', '--version'], { stdio: 'pipe' });
        process.on('close', (code) => code === 0 ? resolve(true) : reject(new Error('Playwright not found')));
        process.on('error', reject);
      });
    } catch (error) {
      issues.push('Playwright is not installed or not accessible');
    }

    // Check if required services are available
    const requiredPorts = [3000, 5173]; // Backend and frontend ports
    
    for (const port of requiredPorts) {
      try {
        const response = await fetch(`http://localhost:${port}/health`);
        if (!response.ok) {
          issues.push(`Service on port ${port} is not responding`);
        }
      } catch (error) {
        issues.push(`Service on port ${port} is not available`);
      }
    }

    // Check test directory structure
    const requiredFiles = testSuites.map(suite => path.join(this.testDir, suite.file));
    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        issues.push(`Test file not found: ${file}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const runner = new LifecycleTestRunner({
    headless: !args.includes('--headed'),
    browser: args.find(arg => arg.startsWith('--browser='))?.split('=')[1] || 'chromium',
    parallel: args.includes('--parallel'),
    retries: parseInt(args.find(arg => arg.startsWith('--retries='))?.split('=')[1] || '1'),
  });

  async function main() {
    console.log('🧪 Claude Instance Lifecycle Test Runner');
    console.log('');

    // Validate environment first
    console.log('🔍 Validating test environment...');
    const validation = await runner.validateEnvironment();
    
    if (!validation.valid) {
      console.log('❌ Environment validation failed:');
      validation.issues.forEach(issue => console.log(`  • ${issue}`));
      process.exit(1);
    }
    
    console.log('✅ Environment validation passed');
    console.log('');

    try {
      let success = false;

      switch (command) {
        case 'all':
          const result = await runner.runAll();
          success = result.failed === 0;
          break;

        case 'suite':
          const suiteName = args[1];
          if (!suiteName) {
            console.log('❌ Please specify a suite name');
            console.log('Available suites:');
            runner.getSuiteInfo().forEach(suite => {
              console.log(`  • ${suite.name}: ${suite.description}`);
            });
            process.exit(1);
          }
          success = await runner.runSuite(suiteName);
          break;

        case 'pattern':
          const pattern = args[1];
          if (!pattern) {
            console.log('❌ Please specify a pattern to match');
            process.exit(1);
          }
          success = await runner.runPattern(pattern);
          break;

        case 'cross-browser':
          const browserResults = await runner.runCrossBrowser();
          success = Object.values(browserResults).every(result => result);
          break;

        case 'info':
          console.log('📋 Available Test Suites:');
          console.log('');
          runner.getSuiteInfo().forEach((suite, index) => {
            console.log(`${index + 1}. ${suite.name}`);
            console.log(`   📝 ${suite.description}`);
            if (suite.dependencies) {
              console.log(`   🔗 Dependencies: ${suite.dependencies.join(', ')}`);
            }
            console.log(`   📄 File: ${suite.file}`);
            console.log('');
          });
          success = true;
          break;

        default:
          console.log('Usage: node test-runner.ts <command> [options]');
          console.log('');
          console.log('Commands:');
          console.log('  all           - Run all test suites');
          console.log('  suite <name>  - Run a specific test suite');
          console.log('  pattern <pat> - Run suites matching pattern');
          console.log('  cross-browser - Run tests across all browsers');
          console.log('  info          - Show available test suites');
          console.log('');
          console.log('Options:');
          console.log('  --headed      - Run in headed mode');
          console.log('  --browser=<>  - Specify browser (chromium, firefox, webkit)');
          console.log('  --parallel    - Run tests in parallel');
          console.log('  --retries=<n> - Number of retries on failure');
          success = true;
          break;
      }

      process.exit(success ? 0 : 1);
    } catch (error) {
      console.error('❌ Test runner error:', error);
      process.exit(1);
    }
  }

  main().catch(console.error);
}