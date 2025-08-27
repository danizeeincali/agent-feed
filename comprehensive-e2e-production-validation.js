#!/usr/bin/env node

/**
 * COMPREHENSIVE END-TO-END PRODUCTION VALIDATION
 * 
 * This script validates both Option A (Instance List Refresh) and Option C (Terminal Input Echo)
 * working together seamlessly in the hybrid solution.
 */

const http = require('http');
const { spawn } = require('child_process');
const { EventSource } = require('eventsource');

// Configuration
const API_BASE = 'http://localhost:3000';
const FRONTEND_BASE = 'http://localhost:5173';
const VALIDATION_CONFIG = {
  instanceCreateTimeout: 5000,
  terminalConnectTimeout: 3000,
  inputEchoTimeout: 2000,
  instanceListRefreshTimeout: 1000,
  maxInstancesForTest: 4,
  testInputs: ['Hello World', 'ls -la', 'pwd', 'echo "Testing"']
};

class ProductionValidator {
  constructor() {
    this.results = {
      optionA: { success: false, details: [] },
      optionC: { success: false, details: [] },
      workflow: { success: false, details: [] },
      performance: { success: false, details: [] },
      errors: []
    };
    this.instances = [];
    this.testStartTime = Date.now();
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    if (level === 'ERROR') {
      this.results.errors.push({ timestamp, message });
    }
  }

  async validateAPI() {
    this.log('🔍 VALIDATION: Testing API connectivity and endpoints...');
    
    try {
      // Test health endpoint
      const healthResponse = await this.makeRequest('/health');
      if (!healthResponse.status) throw new Error('Health check failed');
      
      // Test instances endpoint
      const instancesResponse = await this.makeRequest('/api/claude/instances');
      if (!instancesResponse.success) throw new Error('Instances endpoint failed');
      
      this.log('✅ API endpoints are responding correctly');
      return true;
    } catch (error) {
      this.log(`❌ API validation failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async validateOptionA_InstanceListRefresh() {
    this.log('🚀 VALIDATION: Testing Option A - Instance List Refresh Functionality...');
    
    try {
      // Get initial instance count
      const initialResponse = await this.makeRequest('/api/claude/instances');
      const initialCount = initialResponse.instances ? initialResponse.instances.length : 0;
      this.log(`Initial instance count: ${initialCount}`);
      
      // Create new instance
      this.log('Creating new instance...');
      const createResponse = await this.makeRequest('/api/claude/instances', 'POST', {
        command: ['claude'],
        workingDirectory: '/workspaces/agent-feed/prod'
      });
      
      if (!createResponse.success) {
        throw new Error(`Instance creation failed: ${createResponse.error}`);
      }
      
      const newInstanceId = createResponse.instanceId;
      this.instances.push(newInstanceId);
      this.log(`✅ Instance created: ${newInstanceId}`);
      
      // Wait for instance to be ready
      await this.sleep(1000);
      
      // Verify instance appears in list immediately
      const updatedResponse = await this.makeRequest('/api/claude/instances');
      const updatedCount = updatedResponse.instances ? updatedResponse.instances.length : 0;
      
      if (updatedCount !== initialCount + 1) {
        throw new Error(`Instance list not updated: expected ${initialCount + 1}, got ${updatedCount}`);
      }
      
      // Verify the specific instance exists
      const newInstance = updatedResponse.instances.find(i => i.id === newInstanceId);
      if (!newInstance) {
        throw new Error(`New instance ${newInstanceId} not found in list`);
      }
      
      this.results.optionA.success = true;
      this.results.optionA.details.push({
        test: 'Instance Creation and List Refresh',
        status: 'PASS',
        message: `Instance ${newInstanceId.slice(0,8)} created and appeared in list immediately`,
        timing: `${Date.now() - this.testStartTime}ms`
      });
      
      this.log('✅ OPTION A VALIDATION PASSED: Instance list refreshes automatically');
      return true;
      
    } catch (error) {
      this.results.optionA.success = false;
      this.results.optionA.details.push({
        test: 'Instance Creation and List Refresh',
        status: 'FAIL',
        error: error.message,
        timing: `${Date.now() - this.testStartTime}ms`
      });
      
      this.log(`❌ OPTION A VALIDATION FAILED: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async validateOptionC_TerminalInputEcho() {
    this.log('💻 VALIDATION: Testing Option C - Terminal Input Echo Functionality...');
    
    if (this.instances.length === 0) {
      this.log('❌ No instances available for terminal testing', 'ERROR');
      return false;
    }
    
    const instanceId = this.instances[0];
    this.log(`Testing terminal input echo on instance: ${instanceId}`);
    
    try {
      // Test SSE connection for terminal output
      this.log('Establishing SSE connection...');
      const sseUrl = `${API_BASE}/api/claude/instances/${instanceId}/terminal/stream`;
      
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(sseUrl);
        const testInput = 'echo "Test Input Echo"';
        let echoReceived = false;
        let outputReceived = false;
        
        const timeout = setTimeout(() => {
          eventSource.close();
          if (!echoReceived) {
            reject(new Error('Terminal input echo timeout'));
          }
        }, VALIDATION_CONFIG.inputEchoTimeout);
        
        eventSource.onopen = () => {
          this.log('✅ SSE connection established');
          
          // Send terminal input
          this.log(`Sending test input: ${testInput}`);
          this.makeRequest(`/api/claude/instances/${instanceId}/terminal/input`, 'POST', {
            input: testInput + '\n'
          }).then(() => {
            this.log('✅ Input sent successfully');
          }).catch(error => {
            this.log(`❌ Failed to send input: ${error.message}`, 'ERROR');
            reject(error);
          });
        };
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.log(`📤 SSE Message received: ${JSON.stringify(data)}`);
            
            if (data.type === 'input_echo' || (data.output && data.output.includes(testInput))) {
              this.log('✅ TERMINAL INPUT ECHO DETECTED!');
              echoReceived = true;
              
              this.results.optionC.success = true;
              this.results.optionC.details.push({
                test: 'Terminal Input Echo',
                status: 'PASS',
                message: `Input "${testInput}" echoed successfully`,
                timing: `${Date.now() - this.testStartTime}ms`,
                data: data
              });
              
              clearTimeout(timeout);
              eventSource.close();
              resolve(true);
            }
            
            if (data.output) {
              outputReceived = true;
              this.log(`📤 Terminal output: ${data.output.slice(0, 100)}...`);
            }
            
          } catch (parseError) {
            this.log(`❌ Failed to parse SSE message: ${parseError.message}`, 'ERROR');
          }
        };
        
        eventSource.onerror = (error) => {
          this.log(`❌ SSE connection error: ${error}`, 'ERROR');
          clearTimeout(timeout);
          eventSource.close();
          reject(new Error('SSE connection failed'));
        };
      });
      
    } catch (error) {
      this.results.optionC.success = false;
      this.results.optionC.details.push({
        test: 'Terminal Input Echo',
        status: 'FAIL',
        error: error.message,
        timing: `${Date.now() - this.testStartTime}ms`
      });
      
      this.log(`❌ OPTION C VALIDATION FAILED: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async validateCompleteWorkflow() {
    this.log('🔄 VALIDATION: Testing Complete Workflow - Create Instance → List Updates → Terminal Input Works...');
    
    const workflowStartTime = Date.now();
    
    try {
      // Step 1: Create instance and verify it appears in list
      this.log('Step 1: Creating instance...');
      const createResponse = await this.makeRequest('/api/claude/instances', 'POST', {
        command: ['claude', '--dangerously-skip-permissions'],
        workingDirectory: '/workspaces/agent-feed/prod'
      });
      
      if (!createResponse.success) {
        throw new Error('Instance creation failed in workflow test');
      }
      
      const instanceId = createResponse.instanceId;
      this.instances.push(instanceId);
      this.log(`✅ Instance created: ${instanceId}`);
      
      // Step 2: Verify instance appears in list within 500ms
      const listCheckStart = Date.now();
      let instanceFound = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!instanceFound && attempts < maxAttempts) {
        const listResponse = await this.makeRequest('/api/claude/instances');
        instanceFound = listResponse.instances?.some(i => i.id === instanceId);
        
        if (!instanceFound) {
          await this.sleep(100);
          attempts++;
        }
      }
      
      const listCheckTime = Date.now() - listCheckStart;
      
      if (!instanceFound) {
        throw new Error(`Instance not found in list after ${listCheckTime}ms`);
      }
      
      if (listCheckTime > 500) {
        this.log(`⚠️  Warning: Instance appeared in list after ${listCheckTime}ms (target: <500ms)`);
      } else {
        this.log(`✅ Instance appeared in list within ${listCheckTime}ms`);
      }
      
      // Step 3: Test terminal connection and input
      await this.sleep(1000); // Allow instance to fully initialize
      
      this.log('Step 3: Testing terminal input on new instance...');
      const terminalTest = await this.validateTerminalInput(instanceId);
      
      if (!terminalTest) {
        throw new Error('Terminal input test failed in workflow');
      }
      
      const totalWorkflowTime = Date.now() - workflowStartTime;
      
      this.results.workflow.success = true;
      this.results.workflow.details.push({
        test: 'Complete Workflow',
        status: 'PASS',
        message: 'Instance creation → List update → Terminal input all working',
        timings: {
          total: `${totalWorkflowTime}ms`,
          listUpdate: `${listCheckTime}ms`,
          targetListUpdate: '< 500ms'
        }
      });
      
      this.log('✅ COMPLETE WORKFLOW VALIDATION PASSED');
      return true;
      
    } catch (error) {
      this.results.workflow.success = false;
      this.results.workflow.details.push({
        test: 'Complete Workflow',
        status: 'FAIL',
        error: error.message,
        timing: `${Date.now() - workflowStartTime}ms`
      });
      
      this.log(`❌ COMPLETE WORKFLOW VALIDATION FAILED: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async validateTerminalInput(instanceId) {
    this.log(`Testing terminal input for instance: ${instanceId}`);
    
    try {
      const inputResponse = await this.makeRequest(
        `/api/claude/instances/${instanceId}/terminal/input`, 
        'POST', 
        { input: 'echo "Workflow Test"\n' }
      );
      
      if (!inputResponse.success) {
        throw new Error('Failed to send terminal input');
      }
      
      this.log('✅ Terminal input sent successfully');
      return true;
      
    } catch (error) {
      this.log(`❌ Terminal input test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async validateAllInstanceButtons() {
    this.log('🔘 VALIDATION: Testing all 4 instance creation buttons...');
    
    const buttons = [
      { name: '🚀 prod/claude', command: ['claude'], workingDirectory: '/workspaces/agent-feed/prod' },
      { name: '⚡ skip-permissions', command: ['claude', '--dangerously-skip-permissions'], workingDirectory: '/workspaces/agent-feed/prod' },
      { name: '⚡ skip-permissions -c', command: ['claude', '--dangerously-skip-permissions', '-c'], workingDirectory: '/workspaces/agent-feed/prod' },
      { name: '↻ skip-permissions --resume', command: ['claude', '--dangerously-skip-permissions', '--resume'], workingDirectory: '/workspaces/agent-feed/prod' }
    ];
    
    let successCount = 0;
    
    for (const button of buttons) {
      try {
        this.log(`Testing button: ${button.name}`);
        
        const response = await this.makeRequest('/api/claude/instances', 'POST', button);
        
        if (response.success) {
          this.instances.push(response.instanceId);
          this.log(`✅ ${button.name} - Instance created: ${response.instanceId}`);
          successCount++;
          
          // Wait between button tests
          await this.sleep(500);
        } else {
          this.log(`❌ ${button.name} - Failed: ${response.error}`, 'ERROR');
        }
        
      } catch (error) {
        this.log(`❌ ${button.name} - Error: ${error.message}`, 'ERROR');
      }
    }
    
    const success = successCount === buttons.length;
    
    this.results.workflow.details.push({
      test: 'All Instance Buttons',
      status: success ? 'PASS' : 'PARTIAL',
      message: `${successCount}/${buttons.length} buttons working correctly`,
      successRate: `${(successCount/buttons.length*100).toFixed(1)}%`
    });
    
    if (success) {
      this.log(`✅ ALL INSTANCE BUTTONS WORKING: ${successCount}/${buttons.length}`);
    } else {
      this.log(`⚠️ PARTIAL SUCCESS: ${successCount}/${buttons.length} buttons working`);
    }
    
    return success;
  }

  async validatePerformance() {
    this.log('⚡ VALIDATION: Running performance benchmarks...');
    
    try {
      const performanceTests = {
        instanceCreation: [],
        listRefresh: [],
        terminalResponse: []
      };
      
      // Test instance creation performance (3 iterations)
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        const response = await this.makeRequest('/api/claude/instances', 'POST', {
          command: ['claude'],
          workingDirectory: '/workspaces/agent-feed/prod'
        });
        const endTime = Date.now();
        
        if (response.success) {
          const duration = endTime - startTime;
          performanceTests.instanceCreation.push(duration);
          this.instances.push(response.instanceId);
          this.log(`Instance creation ${i+1}: ${duration}ms`);
        }
        
        await this.sleep(1000); // Prevent overwhelming the system
      }
      
      // Calculate averages
      const avgCreation = performanceTests.instanceCreation.reduce((a, b) => a + b, 0) / performanceTests.instanceCreation.length;
      
      const performanceResults = {
        avgInstanceCreation: `${avgCreation.toFixed(0)}ms`,
        targetInstanceCreation: '< 5000ms',
        instanceCreationPassed: avgCreation < 5000
      };
      
      this.results.performance.success = performanceResults.instanceCreationPassed;
      this.results.performance.details.push({
        test: 'Performance Benchmarks',
        status: performanceResults.instanceCreationPassed ? 'PASS' : 'FAIL',
        results: performanceResults
      });
      
      this.log(`📊 Average instance creation time: ${avgCreation.toFixed(0)}ms (target: <5000ms)`);
      
      return performanceResults.instanceCreationPassed;
      
    } catch (error) {
      this.log(`❌ Performance validation failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async cleanupInstances() {
    this.log('🧹 Cleaning up test instances...');
    
    for (const instanceId of this.instances) {
      try {
        await this.makeRequest(`/api/claude/instances/${instanceId}`, 'DELETE');
        this.log(`✅ Cleaned up instance: ${instanceId}`);
      } catch (error) {
        this.log(`⚠️ Failed to cleanup instance ${instanceId}: ${error.message}`);
      }
    }
    
    this.instances = [];
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE}${endpoint}`;
    
    return new Promise((resolve, reject) => {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const req = http.request(url, options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve(response);
          } catch (error) {
            resolve({ success: false, error: 'Invalid JSON response', body });
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateReport() {
    const totalDuration = Date.now() - this.testStartTime;
    const overallSuccess = this.results.optionA.success && 
                          this.results.optionC.success && 
                          this.results.workflow.success;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${totalDuration}ms`,
      overallStatus: overallSuccess ? 'PRODUCTION READY ✅' : 'NEEDS ATTENTION ❌',
      summary: {
        optionA_InstanceListRefresh: this.results.optionA.success ? '✅ PASS' : '❌ FAIL',
        optionC_TerminalInputEcho: this.results.optionC.success ? '✅ PASS' : '❌ FAIL', 
        completeWorkflow: this.results.workflow.success ? '✅ PASS' : '❌ FAIL',
        performance: this.results.performance.success ? '✅ PASS' : '❌ FAIL'
      },
      details: this.results,
      recommendations: this.generateRecommendations(),
      deploymentApproval: overallSuccess ? 'APPROVED FOR VPS DEPLOYMENT' : 'REQUIRES FIXES BEFORE DEPLOYMENT'
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (!this.results.optionA.success) {
      recommendations.push('🔧 Fix instance list refresh functionality - ensure instances appear immediately after creation');
    }
    
    if (!this.results.optionC.success) {
      recommendations.push('🔧 Fix terminal input echo - ensure input commands are echoed back to user interface');
    }
    
    if (!this.results.workflow.success) {
      recommendations.push('🔧 Fix complete workflow integration - ensure all components work together seamlessly');
    }
    
    if (!this.results.performance.success) {
      recommendations.push('⚡ Optimize performance - instance creation should complete within 5 seconds');
    }
    
    if (this.results.errors.length > 0) {
      recommendations.push(`🚨 Address ${this.results.errors.length} errors found during validation`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('🚀 All validations passed - ready for VPS deployment!');
    }
    
    return recommendations;
  }

  async runValidation() {
    this.log('🚀 STARTING COMPREHENSIVE E2E PRODUCTION VALIDATION');
    this.log('=' .repeat(80));
    
    try {
      // Step 1: Validate API
      const apiValid = await this.validateAPI();
      if (!apiValid) {
        throw new Error('API validation failed - cannot proceed with tests');
      }
      
      // Step 2: Validate Option A - Instance List Refresh
      await this.validateOptionA_InstanceListRefresh();
      
      // Step 3: Validate Option C - Terminal Input Echo  
      await this.validateOptionC_TerminalInputEcho();
      
      // Step 4: Validate Complete Workflow
      await this.validateCompleteWorkflow();
      
      // Step 5: Validate All Instance Buttons
      await this.validateAllInstanceButtons();
      
      // Step 6: Validate Performance
      await this.validatePerformance();
      
    } catch (error) {
      this.log(`❌ CRITICAL VALIDATION ERROR: ${error.message}`, 'ERROR');
    } finally {
      // Cleanup
      await this.cleanupInstances();
      
      // Generate and display report
      const report = this.generateReport();
      
      this.log('=' .repeat(80));
      this.log('📊 COMPREHENSIVE VALIDATION REPORT');
      this.log('=' .repeat(80));
      console.log(JSON.stringify(report, null, 2));
      
      this.log('=' .repeat(80));
      this.log(`🏁 VALIDATION COMPLETE: ${report.overallStatus}`);
      this.log(`📋 DEPLOYMENT STATUS: ${report.deploymentApproval}`);
      
      return report;
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ProductionValidator();
  validator.runValidation().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionValidator;