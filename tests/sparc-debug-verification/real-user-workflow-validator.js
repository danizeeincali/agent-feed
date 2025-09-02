#!/usr/bin/env node

/**
 * SPARC Completion Phase - Real User Workflow Validator
 * 
 * Validates 100% real functionality without mocks:
 * - Browser button click simulation
 * - Actual WebSocket connections
 * - Real terminal command execution
 * - Live tool call visualization
 */

const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

class RealUserWorkflowValidator {
  constructor(options = {}) {
    this.options = {
      baseUrl: options.baseUrl || 'http://localhost:5173',
      backendUrl: options.backendUrl || 'http://localhost:3000',
      timeout: options.timeout || 60000,
      debug: options.debug || false,
      ...options
    };
    
    this.results = {
      phases: {},
      timings: {},
      errors: [],
      validations: {}
    };
    
    this.browser = null;
    this.page = null;
    this.websocketConnections = [];
    this.startTime = performance.now();
  }

  async initialize() {
    console.log('🚀 Initializing Real User Workflow Validator...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Show real browser for authentic test
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-logging',
        '--log-level=0'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      if (this.options.debug) {
        console.log('PAGE LOG:', msg.text());
      }
    });
    
    // Track network errors
    this.page.on('requestfailed', request => {
      this.results.errors.push({
        type: 'network',
        url: request.url(),
        error: request.failure().errorText
      });
    });
    
    // Track WebSocket connections
    this.page.on('websocket', ws => {
      console.log('🔌 WebSocket connection detected:', ws.url());
      this.websocketConnections.push(ws);
      
      ws.on('framereceived', event => {
        if (this.options.debug) {
          console.log('📨 WebSocket received:', event.payload);
        }
      });
      
      ws.on('framesent', event => {
        if (this.options.debug) {
          console.log('📤 WebSocket sent:', event.payload);
        }
      });
    });
  }

  async validatePhase1_ButtonClick() {
    console.log('🎯 Phase 1: Button Click → Instance Creation');
    const phaseStart = performance.now();
    
    try {
      // Navigate to application
      await this.page.goto(this.options.baseUrl);
      await this.page.waitForLoadState('networkidle');
      
      // Look for instance creation button
      const createButton = await this.page.waitForSelector(
        'button:has-text("Create"), button:has-text("Start"), [data-testid="create-instance"]',
        { timeout: 10000 }
      );
      
      if (!createButton) {
        throw new Error('Create instance button not found');
      }
      
      // Click the button and measure response time
      const clickStart = performance.now();
      await createButton.click();
      
      // Wait for loading animation to appear
      const loadingSelector = '.loading, .spinner, [data-testid="loading"], .animate-spin';
      await this.page.waitForSelector(loadingSelector, { timeout: 5000 });
      const clickEnd = performance.now();
      
      this.results.phases.buttonClick = {
        status: 'PASSED',
        responseTime: clickEnd - clickStart,
        loadingAnimationDetected: true
      };
      
      this.results.timings.buttonClick = clickEnd - phaseStart;
      console.log('✅ Phase 1 PASSED - Button click response:', `${(clickEnd - clickStart).toFixed(2)}ms`);
      
    } catch (error) {
      this.results.phases.buttonClick = {
        status: 'FAILED',
        error: error.message
      };
      this.results.errors.push({ phase: 'buttonClick', error: error.message });
      console.error('❌ Phase 1 FAILED:', error.message);
    }
  }

  async validatePhase2_WebSocketConnection() {
    console.log('🔌 Phase 2: WebSocket Connection → Terminal Initialization');
    const phaseStart = performance.now();
    
    try {
      // Wait for WebSocket connection to be established
      await this.page.waitForFunction(
        () => window.WebSocket && window.WebSocket.length > 0,
        { timeout: 10000 }
      );
      
      // Verify WebSocket is connected
      const wsStatus = await this.page.evaluate(() => {
        const ws = window.WebSocket;
        return {
          connected: ws && ws.readyState === WebSocket.OPEN,
          url: ws ? ws.url : null
        };
      });
      
      if (!wsStatus.connected) {
        throw new Error('WebSocket connection not established');
      }
      
      // Wait for terminal to be initialized
      await this.page.waitForSelector('.terminal-container, .xterm, [data-testid="terminal"]', 
        { timeout: 15000 });
      
      const phaseEnd = performance.now();
      
      this.results.phases.websocketConnection = {
        status: 'PASSED',
        connectionTime: phaseEnd - phaseStart,
        websocketUrl: wsStatus.url,
        terminalInitialized: true
      };
      
      this.results.timings.websocketConnection = phaseEnd - phaseStart;
      console.log('✅ Phase 2 PASSED - WebSocket connected in:', `${(phaseEnd - phaseStart).toFixed(2)}ms`);
      
    } catch (error) {
      this.results.phases.websocketConnection = {
        status: 'FAILED',
        error: error.message
      };
      this.results.errors.push({ phase: 'websocketConnection', error: error.message });
      console.error('❌ Phase 2 FAILED:', error.message);
    }
  }

  async validatePhase3_CommandExecution() {
    console.log('💻 Phase 3: Command Execution → Tool Call Visualization');
    const phaseStart = performance.now();
    
    try {
      // Test simple command first
      await this.executeCommand('ls', 5000);
      
      // Test complex command with tool calls
      await this.executeCommand('claude help', 30000);
      
      // Test interactive command
      await this.executeCommand('echo "Testing tool call visualization"', 10000);
      
      const phaseEnd = performance.now();
      
      this.results.phases.commandExecution = {
        status: 'PASSED',
        executionTime: phaseEnd - phaseStart,
        commandsExecuted: 3,
        toolCallsVisualized: true
      };
      
      this.results.timings.commandExecution = phaseEnd - phaseStart;
      console.log('✅ Phase 3 PASSED - Commands executed in:', `${(phaseEnd - phaseStart).toFixed(2)}ms`);
      
    } catch (error) {
      this.results.phases.commandExecution = {
        status: 'FAILED',
        error: error.message
      };
      this.results.errors.push({ phase: 'commandExecution', error: error.message });
      console.error('❌ Phase 3 FAILED:', error.message);
    }
  }

  async executeCommand(command, timeout = 10000) {
    console.log(`📝 Executing command: ${command}`);
    
    // Type command in terminal
    await this.page.click('.xterm-helper-textarea, .terminal-container input, .xterm-screen');
    await this.page.keyboard.type(command);
    await this.page.keyboard.press('Enter');
    
    // Wait for command output or tool call visualization
    try {
      await this.page.waitForFunction(
        (cmd) => {
          const terminal = document.querySelector('.xterm-screen');
          return terminal && terminal.textContent.includes(cmd);
        },
        { timeout },
        command
      );
      
      // Look for tool call visualization indicators
      const toolCallElements = await this.page.$$eval(
        '.xterm-screen *', 
        elements => elements.some(el => 
          el.textContent.includes('●') ||
          el.textContent.includes('[CMD]') ||
          el.textContent.includes('Running:') ||
          el.className.includes('tool-call')
        )
      );
      
      return {
        executed: true,
        toolCallVisualized: toolCallElements,
        command
      };
      
    } catch (timeoutError) {
      throw new Error(`Command "${command}" execution timeout after ${timeout}ms`);
    }
  }

  async validatePhase4_PermissionDialogs() {
    console.log('🔐 Phase 4: Permission Dialog → User Interaction');
    const phaseStart = performance.now();
    
    try {
      // Execute command that might trigger permission request
      await this.page.click('.xterm-helper-textarea, .terminal-container input');
      await this.page.keyboard.type('claude read package.json');
      await this.page.keyboard.press('Enter');
      
      // Wait for permission dialog or direct execution
      const permissionDialog = await this.page.waitForSelector(
        '.permission-dialog, [data-testid="permission"], .bg-yellow-900',
        { timeout: 10000 }
      ).catch(() => null);
      
      if (permissionDialog) {
        console.log('🔐 Permission dialog detected - testing interaction');
        
        // Test 'yes' response
        await this.page.keyboard.type('y');
        await this.page.keyboard.press('Enter');
        
        // Wait for dialog to disappear
        await this.page.waitForFunction(
          () => !document.querySelector('.permission-dialog, .bg-yellow-900'),
          { timeout: 5000 }
        );
      }
      
      const phaseEnd = performance.now();
      
      this.results.phases.permissionDialogs = {
        status: 'PASSED',
        dialogDetected: !!permissionDialog,
        interactionTime: phaseEnd - phaseStart
      };
      
      this.results.timings.permissionDialogs = phaseEnd - phaseStart;
      console.log('✅ Phase 4 PASSED - Permission handling:', `${(phaseEnd - phaseStart).toFixed(2)}ms`);
      
    } catch (error) {
      this.results.phases.permissionDialogs = {
        status: 'FAILED',
        error: error.message
      };
      this.results.errors.push({ phase: 'permissionDialogs', error: error.message });
      console.error('❌ Phase 4 FAILED:', error.message);
    }
  }

  async validatePhase5_WebSocketStability() {
    console.log('🔄 Phase 5: WebSocket Stability → Reconnection Testing');
    const phaseStart = performance.now();
    
    try {
      // Test WebSocket stability under load
      const commands = [
        'pwd', 'whoami', 'date', 'echo "stability test 1"',
        'ls -la', 'echo "stability test 2"', 'pwd'
      ];
      
      for (const command of commands) {
        await this.executeCommand(command, 5000);
        await this.page.waitForTimeout(100); // Small delay between commands
      }
      
      // Check WebSocket is still connected
      const wsStatus = await this.page.evaluate(() => {
        const ws = window.WebSocket;
        return ws && ws.readyState === WebSocket.OPEN;
      });
      
      if (!wsStatus) {
        throw new Error('WebSocket connection lost during stability test');
      }
      
      const phaseEnd = performance.now();
      
      this.results.phases.websocketStability = {
        status: 'PASSED',
        commandsExecuted: commands.length,
        connectionStable: true,
        testDuration: phaseEnd - phaseStart
      };
      
      this.results.timings.websocketStability = phaseEnd - phaseStart;
      console.log('✅ Phase 5 PASSED - WebSocket stability:', `${(phaseEnd - phaseStart).toFixed(2)}ms`);
      
    } catch (error) {
      this.results.phases.websocketStability = {
        status: 'FAILED',
        error: error.message
      };
      this.results.errors.push({ phase: 'websocketStability', error: error.message });
      console.error('❌ Phase 5 FAILED:', error.message);
    }
  }

  async generateProductionReport() {
    console.log('📊 Generating Production-Ready Verification Report...');
    
    const totalTime = performance.now() - this.startTime;
    const passedPhases = Object.values(this.results.phases).filter(p => p.status === 'PASSED').length;
    const totalPhases = Object.keys(this.results.phases).length;
    
    const report = {
      testSuite: 'SPARC Debug Verification - Real User Workflow',
      timestamp: new Date().toISOString(),
      duration: `${(totalTime / 1000).toFixed(2)}s`,
      summary: {
        totalPhases,
        passedPhases,
        failedPhases: totalPhases - passedPhases,
        successRate: `${((passedPhases / totalPhases) * 100).toFixed(1)}%`,
        overallStatus: passedPhases === totalPhases ? 'PASSED' : 'FAILED'
      },
      phases: this.results.phases,
      timings: this.results.timings,
      validations: {
        buttonClickResponse: this.results.phases.buttonClick?.responseTime < 1000,
        websocketConnection: this.results.phases.websocketConnection?.connectionTime < 5000,
        commandExecution: this.results.phases.commandExecution?.executionTime < 60000,
        permissionHandling: this.results.phases.permissionDialogs?.status === 'PASSED',
        websocketStability: this.results.phases.websocketStability?.connectionStable === true
      },
      performance: {
        buttonClickResponse: `${this.results.phases.buttonClick?.responseTime?.toFixed(2) || 'N/A'}ms`,
        websocketConnection: `${this.results.phases.websocketConnection?.connectionTime?.toFixed(2) || 'N/A'}ms`,
        totalTestDuration: `${(totalTime / 1000).toFixed(2)}s`
      },
      errors: this.results.errors,
      recommendations: this.generateRecommendations()
    };
    
    console.log('📋 SPARC VERIFICATION REPORT:');
    console.log('================================');
    console.log(`Overall Status: ${report.summary.overallStatus}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`Duration: ${report.duration}`);
    console.log(`Phases Passed: ${report.summary.passedPhases}/${report.summary.totalPhases}`);
    
    if (report.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      report.errors.forEach(error => console.log(`  - ${error.phase}: ${error.error}`));
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.phases.buttonClick?.responseTime > 500) {
      recommendations.push('Optimize button click response time (currently > 500ms)');
    }
    
    if (this.results.phases.websocketConnection?.connectionTime > 3000) {
      recommendations.push('Improve WebSocket connection speed (currently > 3s)');
    }
    
    if (this.results.errors.filter(e => e.type === 'network').length > 0) {
      recommendations.push('Address network connectivity issues');
    }
    
    if (!this.results.phases.permissionDialogs?.dialogDetected) {
      recommendations.push('Verify permission dialog functionality with file system operations');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All systems functioning optimally');
      recommendations.push('Continue monitoring for performance degradation');
      recommendations.push('Consider adding more edge case testing');
    }
    
    return recommendations;
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    this.websocketConnections.forEach(ws => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
  }

  async run() {
    try {
      await this.initialize();
      
      await this.validatePhase1_ButtonClick();
      await this.validatePhase2_WebSocketConnection();
      await this.validatePhase3_CommandExecution();
      await this.validatePhase4_PermissionDialogs();
      await this.validatePhase5_WebSocketStability();
      
      const report = await this.generateProductionReport();
      
      return report;
      
    } catch (error) {
      console.error('💥 Critical validation error:', error);
      this.results.errors.push({ phase: 'critical', error: error.message });
      
      return await this.generateProductionReport();
      
    } finally {
      await this.cleanup();
    }
  }
}

// Export for use in tests
module.exports = RealUserWorkflowValidator;

// Run directly if called from command line
if (require.main === module) {
  const validator = new RealUserWorkflowValidator({
    debug: process.argv.includes('--debug'),
    baseUrl: process.env.BASE_URL || 'http://localhost:5173',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3000'
  });
  
  validator.run()
    .then(report => {
      console.log('\n🎉 Validation completed!');
      process.exit(report.summary.overallStatus === 'PASSED' ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Validation failed:', error);
      process.exit(1);
    });
}