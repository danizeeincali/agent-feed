#!/usr/bin/env node
/**
 * Dual System Integration Test
 * Tests the complete dual Claude Code system including communication protocols
 */

const ClaudeInstanceLauncher = require('./claude-instance-launcher');
const DualInstanceManager = require('./DualInstanceManager');
const { spawn } = require('child_process');

class DualSystemTest {
  constructor() {
    this.launcher = new ClaudeInstanceLauncher();
    this.dualManager = new DualInstanceManager();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Starting Dual System Integration Tests...\n');
    
    try {
      await this.test('System Initialization', () => this.testInitialization());
      await this.test('Configuration Loading', () => this.testConfigurationLoading());
      await this.test('Workspace Isolation', () => this.testWorkspaceIsolation());
      await this.test('Communication Setup', () => this.testCommunicationSetup());
      await this.test('Dev to Prod Handoff', () => this.testDevToProdHandoff());
      await this.test('Prod to Dev Request', () => this.testProdToDevRequest());
      await this.test('User Confirmation Gate', () => this.testUserConfirmationGate());
      await this.test('Instance Launcher', () => this.testInstanceLauncher());
      
      this.printTestSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    }
  }

  async test(name, testFunction) {
    console.log(`🔬 Testing: ${name}`);
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      this.testResults.push({ name, status: 'PASS', duration });
      console.log(`✅ ${name} - PASSED (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({ name, status: 'FAIL', duration, error: error.message });
      console.error(`❌ ${name} - FAILED (${duration}ms):`);
      console.error(`   ${error.message}\n`);
      throw error;
    }
  }

  async testInitialization() {
    await this.launcher.initialize();
    await this.dualManager.initialize();
    
    if (!this.dualManager.isInitialized) {
      throw new Error('Dual Instance Manager failed to initialize');
    }
  }

  async testConfigurationLoading() {
    const fs = require('fs').promises;
    
    // Test dev config
    const devConfigPath = '/workspaces/agent-feed/.claude/dev/config.json';
    const devConfig = JSON.parse(await fs.readFile(devConfigPath, 'utf8'));
    
    if (devConfig.instance.type !== 'development') {
      throw new Error('Dev config type mismatch');
    }
    
    if (!devConfig.workspace.restricted_paths.includes('/workspaces/agent-feed/agent_workspace/')) {
      throw new Error('Dev config missing agent_workspace restriction');
    }
    
    // Test prod config
    const prodConfigPath = '/workspaces/agent-feed/.claude/prod/config.json';
    const prodConfig = JSON.parse(await fs.readFile(prodConfigPath, 'utf8'));
    
    if (prodConfig.instance.type !== 'production') {
      throw new Error('Prod config type mismatch');
    }
    
    if (prodConfig.workspace.root !== '/workspaces/agent-feed/agent_workspace/') {
      throw new Error('Prod config workspace root mismatch');
    }
    
    console.log('   ✓ Dev config loaded and validated');
    console.log('   ✓ Prod config loaded and validated');
  }

  async testWorkspaceIsolation() {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Test agent workspace structure
    const agentWorkspace = '/workspaces/agent-feed/agent_workspace';
    const subdirs = ['agents', 'shared', 'data', 'logs'];
    
    for (const subdir of subdirs) {
      const dirPath = path.join(agentWorkspace, subdir);
      try {
        await fs.access(dirPath);
        console.log(`   ✓ ${subdir}/ directory exists`);
      } catch (error) {
        throw new Error(`Missing required directory: ${subdir}/`);
      }
    }
    
    // Test communication directory
    try {
      await fs.access('/tmp/claude-communication');
      console.log('   ✓ Communication directory exists');
    } catch (error) {
      throw new Error('Communication directory not found');
    }
  }

  async testCommunicationSetup() {
    const status = this.dualManager.getStatus();
    
    if (!status.devConfig || !status.prodConfig) {
      throw new Error('Configuration not loaded properly');
    }
    
    console.log('   ✓ Dual manager configurations loaded');
    console.log(`   ✓ Message sequence: ${status.messageSequence}`);
    console.log(`   ✓ Pending confirmations: ${status.pendingConfirmations}`);
  }

  async testDevToProdHandoff() {
    const messageId = await this.dualManager.sendDevToProduction(
      'Deploy customer service agent',
      { priority: 'high', agent: 'customer-service-v1' }
    );
    
    if (!messageId) {
      throw new Error('Failed to generate message ID');
    }
    
    console.log(`   ✓ Dev→Prod handoff message created: ${messageId}`);
    
    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const history = this.dualManager.getMessageHistory(5);
    const handoffMessage = history.find(msg => msg.id === messageId);
    
    if (!handoffMessage) {
      throw new Error('Handoff message not found in history');
    }
    
    if (handoffMessage.security.requiresConfirmation) {
      throw new Error('Dev→Prod handoff should not require confirmation');
    }
    
    console.log('   ✓ Handoff message processed correctly');
  }

  async testProdToDevRequest() {
    const messageId = await this.dualManager.sendProductionToDev(
      'update_frontend_component',
      'Need to fix bug in customer service interface',
      { component: 'CustomerServiceDashboard', bug: 'infinite loading spinner' }
    );
    
    if (!messageId) {
      throw new Error('Failed to generate request message ID');
    }
    
    console.log(`   ✓ Prod→Dev request message created: ${messageId}`);
    
    const pending = this.dualManager.getPendingConfirmations();
    const pendingRequest = pending.find(p => p.message.id === messageId);
    
    if (!pendingRequest) {
      throw new Error('Request not found in pending confirmations');
    }
    
    if (!pendingRequest.message.security.requiresConfirmation) {
      throw new Error('Prod→Dev request should require confirmation');
    }
    
    console.log('   ✓ Request properly added to pending confirmations');
  }

  async testUserConfirmationGate() {
    // First create a prod→dev request
    const messageId = await this.dualManager.sendProductionToDev(
      'debug_websocket_issue',
      'Token analytics WebSocket still failing',
      { issue: 'connection_timeout', component: 'TokenCostAnalytics' }
    );
    
    // Test approval
    const response = await this.dualManager.handleUserConfirmation(
      messageId,
      true,
      'Approved: Critical bug fix needed'
    );
    
    if (!response.approved) {
      throw new Error('Confirmation response not marked as approved');
    }
    
    console.log(`   ✓ User confirmation processed: ${response.id}`);
    
    // Test that message was removed from pending
    const pendingAfter = this.dualManager.getPendingConfirmations();
    const stillPending = pendingAfter.find(p => p.message.id === messageId);
    
    if (stillPending) {
      throw new Error('Confirmed message still in pending list');
    }
    
    console.log('   ✓ Confirmed message removed from pending list');
    
    // Test denial
    const messageId2 = await this.dualManager.sendProductionToDev(
      'unnecessary_refactor',
      'Want to rewrite everything in TypeScript'
    );
    
    const response2 = await this.dualManager.handleUserConfirmation(
      messageId2,
      false,
      'Denied: Not a priority right now'
    );
    
    if (response2.approved) {
      throw new Error('Denial response incorrectly marked as approved');
    }
    
    console.log('   ✓ User denial processed correctly');
  }

  async testInstanceLauncher() {
    // Test configuration loading with correct path names
    const devConfig = await this.launcher.loadInstanceConfig('dev');
    const prodConfig = await this.launcher.loadInstanceConfig('prod');
    
    if (devConfig.instance.type !== 'development') {
      throw new Error('Dev config type mismatch in launcher');
    }
    
    if (prodConfig.instance.type !== 'production') {
      throw new Error('Prod config type mismatch in launcher');
    }
    
    console.log('   ✓ Instance launcher configuration loading works');
    
    // Test development instance registration (current Claude Code)
    await this.launcher.launchInstance('dev');
    const devInstance = this.launcher.instances.get('dev');
    
    if (!devInstance.isCurrent) {
      throw new Error('Development instance should be marked as current');
    }
    
    if (devInstance.pid !== process.pid) {
      throw new Error('Development instance should use current process PID');
    }
    
    console.log('   ✓ Development instance registered as current Claude Code');
    
    // Test status method
    const status = this.launcher.getStatus();
    if (!status.timestamp || !status.instances || !status.communication) {
      throw new Error('Status method returning incomplete data');
    }
    
    if (!status.instances.dev) {
      throw new Error('Development instance not found in status');
    }
    
    console.log('   ✓ Instance launcher status method works');
    console.log(`   ✓ Current instance PID: ${status.instances.dev.pid}`);
  }

  printTestSummary() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const totalTime = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`📈 Success rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! Dual system is ready for deployment.');
    } else {
      console.log('\n💥 Some tests failed. Review the errors above.');
    }
    
    console.log('\nDetailed Results:');
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.name} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }
}

// CLI interface
if (require.main === module) {
  const tester = new DualSystemTest();
  
  async function main() {
    try {
      await tester.runAllTests();
      process.exit(0);
    } catch (error) {
      console.error('\n💥 Test suite failed');
      process.exit(1);
    }
  }
  
  main();
}

module.exports = DualSystemTest;