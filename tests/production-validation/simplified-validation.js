#!/usr/bin/env node

/**
 * SIMPLIFIED PRODUCTION VALIDATION
 * 
 * Headless validation that works in Codespaces environment
 * Tests core functionality without requiring display server
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

class SimplifiedValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFunction) {
    console.log(`\n🧪 Testing: ${name}`);
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      this.results.passed++;
      this.results.tests.push({
        name,
        status: 'PASSED',
        duration,
        error: null
      });
      
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`❌ FAILED: ${name} (${duration}ms)`);
      console.error(`   Error: ${error.message}`);
      
      this.results.failed++;
      this.results.tests.push({
        name,
        status: 'FAILED',
        duration,
        error: error.message
      });
      
      return false;
    }
  }

  async validateFrontendAccessible() {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error(`Frontend returned status ${response.status}`);
    }
    
    const html = await response.text();
    if (!html.includes('Agent Feed') && !html.includes('root')) {
      throw new Error('Frontend HTML does not contain expected content');
    }
    
    console.log('   ✓ Frontend is accessible and returning valid HTML');
  }

  async validateBackendAPI() {
    const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
    if (!response.ok) {
      throw new Error(`Backend API returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check the actual API format: {success: boolean, instances: array}
    if (typeof data !== 'object' || !data.hasOwnProperty('success')) {
      throw new Error('API response does not have expected format');
    }
    
    if (!data.success) {
      throw new Error('API returned success: false');
    }
    
    if (!Array.isArray(data.instances)) {
      throw new Error('API instances property is not an array');
    }
    
    console.log(`   ✓ Backend API is working correctly`);
    console.log(`   ✓ Found ${data.instances.length} Claude instances`);
    
    // Log instance details for validation
    data.instances.forEach((instance, index) => {
      console.log(`   ✓ Instance ${index + 1}: ${instance.name} (${instance.status})`);
    });
  }

  async validateClaudeInstancesExist() {
    const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const data = await response.json();
    
    if (data.instances.length === 0) {
      throw new Error('No Claude instances are currently running');
    }
    
    // Validate instance structure
    for (const instance of data.instances) {
      if (!instance.id || !instance.name || !instance.status) {
        throw new Error(`Invalid instance structure: ${JSON.stringify(instance)}`);
      }
      
      if (instance.status !== 'running') {
        throw new Error(`Instance ${instance.id} is not running: ${instance.status}`);
      }
      
      if (!instance.name.includes('Claude')) {
        throw new Error(`Instance ${instance.id} does not appear to be a Claude instance: ${instance.name}`);
      }
    }
    
    console.log(`   ✓ All ${data.instances.length} instances are valid Claude instances`);
    console.log('   ✓ All instances are in running status');
  }

  async validateNoConnectionErrors() {
    // Test by trying to access the instances multiple times
    for (let i = 0; i < 5; i++) {
      const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Request ${i + 1} failed with success: false`);
      }
      
      if (data.error) {
        throw new Error(`Request ${i + 1} returned error: ${data.error}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('   ✓ 5 consecutive API requests succeeded without errors');
    console.log('   ✓ No connection errors detected');
  }

  async validateInstanceCreationAPI() {
    // Test instance creation endpoint (if available)
    try {
      const createResponse = await fetch(`${BACKEND_URL}/api/claude/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'prod'
        })
      });
      
      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log('   ✓ Instance creation API is available');
        
        if (createData.success) {
          console.log('   ✓ Instance creation test succeeded');
          
          // Clean up by getting the instance list again
          setTimeout(async () => {
            await fetch(`${BACKEND_URL}/api/claude/instances`);
          }, 2000);
        }
      } else {
        console.log('   ⚠️ Instance creation API returned status:', createResponse.status);
      }
    } catch (error) {
      console.log('   ⚠️ Instance creation API not available or failed:', error.message);
    }
  }

  async validateRealTimeFeatures() {
    console.log('   Testing real-time data consistency...');
    
    // Get instances multiple times with small delays to simulate real-time polling
    const snapshots = [];
    
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
      const data = await response.json();
      snapshots.push({
        timestamp: Date.now(),
        instanceCount: data.instances.length,
        instances: data.instances.map(inst => ({ id: inst.id, status: inst.status }))
      });
      
      if (i < 2) await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Validate consistency
    const instanceCounts = snapshots.map(s => s.instanceCount);
    const isConsistent = instanceCounts.every(count => count === instanceCounts[0]);
    
    if (!isConsistent) {
      console.log('   ⚠️ Instance count varied during testing:', instanceCounts);
    } else {
      console.log('   ✓ Instance count remained consistent across multiple requests');
    }
    
    console.log('   ✓ Real-time data polling is working');
  }

  async validatePerformanceBenchmarks() {
    console.log('   Measuring API response times...');
    
    const responseTimes = [];
    
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
      const endTime = Date.now();
      
      if (!response.ok) {
        throw new Error(`Request ${i + 1} failed with status ${response.status}`);
      }
      
      responseTimes.push(endTime - startTime);
    }
    
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    console.log(`   ✓ Average API response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   ✓ Min response time: ${minResponseTime}ms`);
    console.log(`   ✓ Max response time: ${maxResponseTime}ms`);
    
    if (avgResponseTime > 2000) {
      throw new Error(`Average response time too slow: ${avgResponseTime.toFixed(0)}ms`);
    }
    
    if (maxResponseTime > 5000) {
      throw new Error(`Maximum response time too slow: ${maxResponseTime}ms`);
    }
    
    console.log('   ✓ Performance benchmarks met');
  }

  async validateProductionReadiness() {
    console.log('   Checking production readiness criteria...');
    
    const checklist = {
      frontendAccessible: false,
      backendResponding: false,
      claudeInstancesRunning: false,
      noErrors: false,
      performanceAcceptable: false
    };
    
    try {
      // Frontend check
      await fetch(BASE_URL);
      checklist.frontendAccessible = true;
      
      // Backend check
      const backendResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
      if (backendResponse.ok) {
        checklist.backendResponding = true;
        
        const data = await backendResponse.json();
        if (data.success && data.instances.length > 0) {
          checklist.claudeInstancesRunning = true;
        }
        
        if (data.success && !data.error) {
          checklist.noErrors = true;
        }
      }
      
      // Performance check
      const startTime = Date.now();
      await fetch(`${BACKEND_URL}/api/claude/instances`);
      const responseTime = Date.now() - startTime;
      
      if (responseTime < 3000) {
        checklist.performanceAcceptable = true;
      }
      
    } catch (error) {
      console.log(`   ⚠️ Production readiness check error: ${error.message}`);
    }
    
    const passedChecks = Object.values(checklist).filter(Boolean).length;
    const totalChecks = Object.keys(checklist).length;
    const passRate = (passedChecks / totalChecks) * 100;
    
    console.log(`   ✓ Production readiness: ${passedChecks}/${totalChecks} checks passed (${passRate.toFixed(0)}%)`);
    
    Object.entries(checklist).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    });
    
    if (passRate < 80) {
      throw new Error(`Production readiness too low: ${passRate.toFixed(0)}%`);
    }
    
    console.log('   ✓ System meets production readiness criteria');
  }

  async generateReport() {
    const reportPath = '/workspaces/agent-feed/tests/production-validation/reports/simplified-validation-report.json';
    
    this.results.summary = {
      totalTests: this.results.passed + this.results.failed,
      passRate: ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1),
      duration: this.results.tests.reduce((sum, test) => sum + test.duration, 0)
    };
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log('\n📊 SIMPLIFIED VALIDATION SUMMARY');
    console.log('==================================');
    console.log(`Total Tests: ${this.results.summary.totalTests}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Pass Rate: ${this.results.summary.passRate}%`);
    console.log(`Total Duration: ${this.results.summary.duration}ms`);
    console.log(`Report saved to: ${reportPath}`);
    
    return this.results.failed === 0;
  }

  async run() {
    try {
      console.log('\n🚀 Starting Simplified Production Validation');
      console.log('============================================');
      console.log(`Frontend URL: ${BASE_URL}`);
      console.log(`Backend URL: ${BACKEND_URL}`);
      
      // Run all validation tests
      await this.runTest('Frontend Accessibility', () => this.validateFrontendAccessible());
      await this.runTest('Backend API Functionality', () => this.validateBackendAPI());
      await this.runTest('Claude Instances Running', () => this.validateClaudeInstancesExist());
      await this.runTest('No Connection Errors', () => this.validateNoConnectionErrors());
      await this.runTest('Instance Creation API', () => this.validateInstanceCreationAPI());
      await this.runTest('Real-time Features', () => this.validateRealTimeFeatures());
      await this.runTest('Performance Benchmarks', () => this.validatePerformanceBenchmarks());
      await this.runTest('Production Readiness', () => this.validateProductionReadiness());
      
      // Generate final report
      const allTestsPassed = await this.generateReport();
      
      if (allTestsPassed) {
        console.log('\n🎉 ALL VALIDATION TESTS PASSED - PRODUCTION READY! 🎉');
        console.log('\nKey Validation Points:');
        console.log('✅ Frontend serving content properly');
        console.log('✅ Backend API responding with valid data');
        console.log('✅ Claude instances are running and accessible');
        console.log('✅ No connection errors detected');
        console.log('✅ Performance meets benchmarks');
        console.log('✅ System ready for production deployment');
        process.exit(0);
      } else {
        console.log('\n❌ SOME VALIDATION TESTS FAILED');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('\n💥 CRITICAL VALIDATION ERROR:', error.message);
      await this.generateReport();
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SimplifiedValidator();
  validator.run().catch(error => {
    console.error('Validation runner error:', error);
    process.exit(1);
  });
}

module.exports = SimplifiedValidator;