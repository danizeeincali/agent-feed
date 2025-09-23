/**
 * Global Test Setup for Avi DM Test Suite
 * Configures test environment and performance monitoring
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up Avi DM Test Suite - London School TDD');
  
  // Record test suite start time
  global.__TEST_SUITE_START__ = performance.now();
  
  // Create test results directory
  const testResultsDir = path.join(__dirname, '../../test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }
  
  // Setup test metrics collection
  global.__TEST_METRICS__ = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    coverage: {},
    performance: {
      slowTests: [],
      fastTests: [],
      memoryUsage: []
    }
  };
  
  // Configure test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TZ = 'UTC';
  process.env.CI = process.env.CI || 'false';
  
  // Mock timers for consistent testing
  jest.useFakeTimers('modern');
  
  // Set up performance monitoring
  const originalTest = global.test;
  global.test = (name, fn, timeout) => {
    return originalTest(name, async () => {
      const testStart = performance.now();
      const memStart = process.memoryUsage();
      
      try {
        await fn();
        global.__TEST_METRICS__.passedTests++;
        
        const testEnd = performance.now();
        const duration = testEnd - testStart;
        
        if (duration > 1000) {
          global.__TEST_METRICS__.performance.slowTests.push({
            name,
            duration
          });
        } else if (duration < 100) {
          global.__TEST_METRICS__.performance.fastTests.push({
            name,
            duration
          });
        }
        
        // Memory usage tracking
        const memEnd = process.memoryUsage();
        global.__TEST_METRICS__.performance.memoryUsage.push({
          test: name,
          heapUsed: memEnd.heapUsed - memStart.heapUsed,
          external: memEnd.external - memStart.external
        });
        
      } catch (error) {
        global.__TEST_METRICS__.failedTests++;
        throw error;
      }
      
      global.__TEST_METRICS__.totalTests++;
    }, timeout);
  };
  
  // Log test environment info
  console.log('📊 Test Environment Configuration:');
  console.log(`   Node Version: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Memory Available: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`);
  console.log(`   CPU Cores: ${require('os').cpus().length}`);
  console.log(`   CI Environment: ${process.env.CI}`);
  
  console.log('✅ Global setup completed\n');
};
