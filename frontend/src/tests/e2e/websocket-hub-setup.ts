/**
 * WebSocket Hub E2E Test Setup
 * Global setup and teardown for comprehensive WebSocket testing
 */

import { chromium, FullConfig } from '@playwright/test';
import { MockServerManager, LoadTestRunner } from './utils/websocket-test-helpers';
import path from 'path';
import fs from 'fs/promises';

// Global test configuration
export const WEBSOCKET_TEST_CONFIG = {
  // Server ports
  PORTS: {
    FRONTEND: 3001,
    BACKEND: 3000,
    HUB: 8080,
    PROD_CLAUDE: 8081,
    DEV_CLAUDE: 8082,
    TEST_WEBSOCKET: 8090
  },
  
  // Test timeouts
  TIMEOUTS: {
    CONNECTION: 10000,
    MESSAGE: 5000,
    SETUP: 30000,
    TEST: 60000
  },
  
  // Performance thresholds
  PERFORMANCE: {
    MAX_LATENCY: 1000, // 1 second
    MAX_CONNECTION_TIME: 5000, // 5 seconds
    MIN_THROUGHPUT: 10, // messages per second
    MAX_ERROR_RATE: 0.05 // 5%
  },
  
  // Load test parameters
  LOAD_TEST: {
    LIGHT: { clients: 5, messagesPerClient: 10 },
    MEDIUM: { clients: 20, messagesPerClient: 25 },
    HEAVY: { clients: 50, messagesPerClient: 50 }
  }
};

// Global state
let serverManager: MockServerManager;
let testResults: any = {};

/**
 * Global setup function for WebSocket Hub E2E tests
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Starting WebSocket Hub E2E Test Setup...\n');
  
  try {
    // Initialize server manager
    serverManager = new MockServerManager();
    
    // Start mock servers
    console.log('📡 Starting mock servers...');
    
    await Promise.all([
      startMockServer('prod-claude', WEBSOCKET_TEST_CONFIG.PORTS.PROD_CLAUDE, {
        type: 'claude',
        latency: 100,
        errorRate: 0.01
      }),
      
      startMockServer('dev-claude', WEBSOCKET_TEST_CONFIG.PORTS.DEV_CLAUDE, {
        type: 'claude',
        latency: 150,
        errorRate: 0.02
      }),
      
      startMockServer('hub', WEBSOCKET_TEST_CONFIG.PORTS.HUB, {
        type: 'hub',
        latency: 50,
        errorRate: 0.005
      })
    ]);
    
    console.log('✅ Mock servers started successfully');
    
    // Verify backend server is running
    await verifyServerHealth();
    
    // Create test data directory
    await setupTestDataDirectory();
    
    // Run baseline performance tests
    await runBaselineTests();
    
    console.log('🎯 WebSocket Hub E2E Test Setup Complete!\n');
    
    return { serverManager, testResults };
    
  } catch (error) {
    console.error('❌ WebSocket Hub E2E Test Setup Failed:', error);
    throw error;
  }
}

/**
 * Global teardown function
 */
async function globalTeardown() {
  console.log('\n🧹 Starting WebSocket Hub E2E Test Cleanup...\n');
  
  try {
    // Stop all mock servers
    if (serverManager) {
      console.log('🛑 Stopping mock servers...');
      serverManager.stopAllServers();
    }
    
    // Generate test report
    await generateTestReport();
    
    // Cleanup test data
    await cleanupTestData();
    
    console.log('✅ WebSocket Hub E2E Test Cleanup Complete!\n');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

/**
 * Start a mock server with retry logic
 */
async function startMockServer(name: string, port: number, config: any): Promise<void> {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await serverManager.startServer(name, port, config);
      console.log(`✅ ${name} server started on port ${port}`);
      return;
    } catch (error) {
      retries++;
      console.warn(`⚠️ Failed to start ${name} server (attempt ${retries}/${maxRetries}):`, error.message);
      
      if (retries >= maxRetries) {
        throw new Error(`Failed to start ${name} server after ${maxRetries} attempts`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

/**
 * Verify backend server health
 */
async function verifyServerHealth(): Promise<void> {
  console.log('🏥 Verifying backend server health...');
  
  try {
    // Create a browser instance for health check
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Check backend health endpoint
    const response = await page.request.get(`http://localhost:${WEBSOCKET_TEST_CONFIG.PORTS.BACKEND}/health`);
    
    if (!response.ok()) {
      throw new Error(`Backend server health check failed: ${response.status()}`);
    }
    
    const healthData = await response.json();
    console.log('💚 Backend server is healthy:', healthData.status);
    
    // Check frontend accessibility
    await page.goto(`http://localhost:${WEBSOCKET_TEST_CONFIG.PORTS.FRONTEND}`);
    await page.waitForLoadState('networkidle');
    
    console.log('💚 Frontend server is accessible');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Server health check failed:', error);
    throw error;
  }
}

/**
 * Setup test data directory
 */
async function setupTestDataDirectory(): Promise<void> {
  const testDataDir = path.join(process.cwd(), 'test-results', 'websocket-hub-e2e');
  
  try {
    await fs.mkdir(testDataDir, { recursive: true });
    
    // Create subdirectories
    await Promise.all([
      fs.mkdir(path.join(testDataDir, 'performance'), { recursive: true }),
      fs.mkdir(path.join(testDataDir, 'security'), { recursive: true }),
      fs.mkdir(path.join(testDataDir, 'load-tests'), { recursive: true }),
      fs.mkdir(path.join(testDataDir, 'screenshots'), { recursive: true })
    ]);
    
    console.log('📁 Test data directory created:', testDataDir);
  } catch (error) {
    console.error('Failed to create test data directory:', error);
  }
}

/**
 * Run baseline performance tests
 */
async function runBaselineTests(): Promise<void> {
  console.log('📊 Running baseline performance tests...');
  
  try {
    const loadTestRunner = new LoadTestRunner();
    
    // Light load test for baseline
    const baselineResults = await loadTestRunner.runLoadTest({
      url: `ws://localhost:${WEBSOCKET_TEST_CONFIG.PORTS.HUB}`,
      clientCount: 3,
      messagesPerClient: 5,
      messageType: 'baseline_test'
    });
    
    testResults.baseline = {
      ...baselineResults,
      timestamp: new Date().toISOString()
    };
    
    console.log('📈 Baseline performance results:', {
      throughput: `${baselineResults.throughput.toFixed(2)} msg/sec`,
      averageLatency: `${baselineResults.averageLatency.toFixed(2)}ms`,
      errorRate: `${(baselineResults.errorRate * 100).toFixed(2)}%`
    });
    
  } catch (error) {
    console.warn('⚠️ Baseline performance test failed:', error.message);
    testResults.baseline = { error: error.message };
  }
}

/**
 * Generate comprehensive test report
 */
async function generateTestReport(): Promise<void> {
  console.log('📝 Generating test report...');
  
  try {
    const reportPath = path.join(process.cwd(), 'test-results', 'websocket-hub-e2e', 'test-report.json');
    
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - (testResults.startTime || Date.now()),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      },
      configuration: WEBSOCKET_TEST_CONFIG,
      results: testResults,
      servers: {
        'prod-claude': serverManager?.getServerConfig('prod-claude'),
        'dev-claude': serverManager?.getServerConfig('dev-claude'),
        'hub': serverManager?.getServerConfig('hub')
      }
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log('📄 Test report generated:', reportPath);
    
    // Generate markdown report
    const markdownReport = generateMarkdownReport(report);
    const markdownPath = path.join(process.cwd(), 'test-results', 'websocket-hub-e2e', 'test-report.md');
    await fs.writeFile(markdownPath, markdownReport);
    console.log('📄 Markdown report generated:', markdownPath);
    
  } catch (error) {
    console.error('Failed to generate test report:', error);
  }
}

/**
 * Generate markdown test report
 */
function generateMarkdownReport(report: any): string {
  return `# WebSocket Hub E2E Test Report

## Test Summary
- **Timestamp**: ${report.summary.timestamp}
- **Duration**: ${(report.summary.duration / 1000).toFixed(2)}s
- **Environment**: ${report.summary.environment.platform} ${report.summary.environment.arch}
- **Node Version**: ${report.summary.environment.nodeVersion}

## Configuration
- **Frontend Port**: ${report.configuration.PORTS.FRONTEND}
- **Backend Port**: ${report.configuration.PORTS.BACKEND}
- **Hub Port**: ${report.configuration.PORTS.HUB}
- **Prod Claude Port**: ${report.configuration.PORTS.PROD_CLAUDE}
- **Dev Claude Port**: ${report.configuration.PORTS.DEV_CLAUDE}

## Performance Thresholds
- **Max Latency**: ${report.configuration.PERFORMANCE.MAX_LATENCY}ms
- **Max Connection Time**: ${report.configuration.PERFORMANCE.MAX_CONNECTION_TIME}ms
- **Min Throughput**: ${report.configuration.PERFORMANCE.MIN_THROUGHPUT} msg/sec
- **Max Error Rate**: ${(report.configuration.PERFORMANCE.MAX_ERROR_RATE * 100)}%

## Baseline Test Results
${report.results.baseline ? `
- **Throughput**: ${report.results.baseline.throughput?.toFixed(2)} msg/sec
- **Average Latency**: ${report.results.baseline.averageLatency?.toFixed(2)}ms
- **Error Rate**: ${(report.results.baseline.errorRate * 100)?.toFixed(2)}%
- **Success Rate**: ${((report.results.baseline.successfulMessages / report.results.baseline.totalMessages) * 100)?.toFixed(2)}%
` : 'Baseline tests failed or not completed'}

## Server Configuration
### Prod Claude Instance
- **Port**: ${report.servers['prod-claude']?.port}
- **Type**: ${report.servers['prod-claude']?.type}
- **Latency**: ${report.servers['prod-claude']?.latency}ms
- **Error Rate**: ${(report.servers['prod-claude']?.errorRate * 100)}%

### Dev Claude Instance
- **Port**: ${report.servers['dev-claude']?.port}
- **Type**: ${report.servers['dev-claude']?.type}
- **Latency**: ${report.servers['dev-claude']?.latency}ms
- **Error Rate**: ${(report.servers['dev-claude']?.errorRate * 100)}%

### Hub Instance
- **Port**: ${report.servers['hub']?.port}
- **Type**: ${report.servers['hub']?.type}
- **Latency**: ${report.servers['hub']?.latency}ms
- **Error Rate**: ${(report.servers['hub']?.errorRate * 100)}%

---
*Generated automatically by WebSocket Hub E2E Test Suite*
`;
}

/**
 * Cleanup test data
 */
async function cleanupTestData(): Promise<void> {
  try {
    // Keep test results but clean up temporary files
    const tempDir = path.join(process.cwd(), 'temp');
    
    try {
      await fs.rmdir(tempDir, { recursive: true });
      console.log('🗑️ Temporary files cleaned up');
    } catch (error) {
      // Directory might not exist, that's fine
    }
  } catch (error) {
    console.warn('⚠️ Cleanup warning:', error.message);
  }
}

// Export setup and teardown functions
export { globalSetup, globalTeardown };
export default globalSetup;