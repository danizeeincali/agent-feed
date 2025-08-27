#!/usr/bin/env node

/**
 * Debug Claude CLI - Test script to understand Claude CLI behavior
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class ClaudeCLIDebugger {
  constructor() {
    this.results = {
      basic: null,
      help: null,
      version: null,
      echo: null,
      workdir: null,
      tty: null,
      env: null,
      path: null,
      auth: null
    };
    this.logFile = path.join(__dirname, 'claude-cli-debug.log');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logFile, logMessage);
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      this.log(`Running: ${command}`);
      
      exec(command, {
        timeout: 10000,
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env }
      }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        const result = {
          command,
          error: error ? error.message : null,
          exitCode: error ? error.code : 0,
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          duration,
          cwd: options.cwd || process.cwd()
        };
        
        this.log(`Command completed in ${duration}ms`);
        if (result.stdout) this.log(`STDOUT: ${result.stdout.slice(0, 200)}...`);
        if (result.stderr) this.log(`STDERR: ${result.stderr.slice(0, 200)}...`);
        if (result.error) this.log(`ERROR: ${result.error}`);
        
        resolve(result);
      });
    });
  }

  async testBasicClaude() {
    this.log('=== Testing Basic Claude Command ===');
    this.results.basic = await this.runCommand('claude');
    
    // Also test with timeout to see if it hangs
    this.log('Testing claude with 3s timeout...');
    const timeoutResult = await this.runCommand('timeout 3s claude || echo "TIMEOUT"');
    this.results.basic.timeoutTest = timeoutResult;
  }

  async testClaudeHelp() {
    this.log('=== Testing Claude --help ===');
    this.results.help = await this.runCommand('claude --help');
  }

  async testClaudeVersion() {
    this.log('=== Testing Claude --version ===');
    this.results.version = await this.runCommand('claude --version');
  }

  async testEchoInput() {
    this.log('=== Testing Echo Input ===');
    this.results.echo = await this.runCommand('echo "hello world" | claude');
    
    // Test with different input methods
    const echoTests = [
      'echo "test message" | timeout 3s claude',
      'printf "another test\\n" | timeout 3s claude',
      'cat /dev/null | timeout 3s claude'  // empty input
    ];
    
    for (const cmd of echoTests) {
      const result = await this.runCommand(cmd);
      this.results.echo[`test_${echoTests.indexOf(cmd)}`] = result;
    }
  }

  async testWorkingDirectory() {
    this.log('=== Testing Working Directory Behavior ===');
    const testDirs = [
      '/workspaces/agent-feed/prod',
      '/workspaces/agent-feed',
      '/tmp'
    ];
    
    this.results.workdir = {};
    for (const dir of testDirs) {
      if (fs.existsSync(dir)) {
        this.log(`Testing in directory: ${dir}`);
        this.results.workdir[dir] = await this.runCommand('timeout 3s claude --help', { cwd: dir });
      }
    }
  }

  async testTTYRequirement() {
    this.log('=== Testing TTY Requirements ===');
    
    // Test with and without TTY
    const ttyTests = [
      'script -qec "claude --help" /dev/null',  // with pseudo-TTY
      'claude --help </dev/null',               // without TTY
      'setsid claude --help',                   // new session
    ];
    
    this.results.tty = {};
    for (const cmd of ttyTests) {
      this.results.tty[`test_${ttyTests.indexOf(cmd)}`] = await this.runCommand(cmd);
    }
  }

  async testEnvironmentVariables() {
    this.log('=== Testing Environment Variables ===');
    
    // Check current env vars
    const envVars = Object.keys(process.env).filter(key => 
      key.toLowerCase().includes('claude') || 
      key.toLowerCase().includes('anthropic') ||
      key.toLowerCase().includes('api') ||
      key.toLowerCase().includes('auth')
    );
    
    this.log(`Found relevant env vars: ${envVars.join(', ')}`);
    
    // Test with different env configurations
    this.results.env = {
      current: await this.runCommand('timeout 3s claude --help'),
      cleared: await this.runCommand('timeout 3s claude --help', { 
        env: { PATH: process.env.PATH } 
      }),
      envVars: envVars.reduce((acc, key) => {
        acc[key] = process.env[key] ? '[REDACTED]' : undefined;
        return acc;
      }, {})
    };
  }

  async testClaudePath() {
    this.log('=== Testing Claude Command Path ===');
    
    const pathTests = [
      'which claude',
      'type claude',
      'whereis claude',
      'ls -la $(which claude 2>/dev/null)',
      'file $(which claude 2>/dev/null)',
      'head -n 5 $(which claude 2>/dev/null)'
    ];
    
    this.results.path = {};
    for (const cmd of pathTests) {
      this.results.path[`test_${pathTests.indexOf(cmd)}`] = await this.runCommand(cmd);
    }
  }

  async testAuthentication() {
    this.log('=== Testing Authentication Requirements ===');
    
    // Test various auth-related scenarios
    const authTests = [
      'claude auth status 2>/dev/null || echo "AUTH_STATUS_FAILED"',
      'claude auth --help 2>/dev/null || echo "AUTH_HELP_FAILED"',
      'claude login --help 2>/dev/null || echo "LOGIN_HELP_FAILED"',
      'claude config --help 2>/dev/null || echo "CONFIG_HELP_FAILED"'
    ];
    
    this.results.auth = {};
    for (const cmd of authTests) {
      this.results.auth[`test_${authTests.indexOf(cmd)}`] = await this.runCommand(cmd);
    }
  }

  async testInteractiveMode() {
    this.log('=== Testing Interactive Mode Detection ===');
    
    // Test different ways to check if claude expects interactive input
    const interactiveTests = [
      'echo "" | timeout 1s claude 2>&1 || echo "INTERACTIVE_TEST_1"',
      'timeout 1s claude < /dev/null 2>&1 || echo "INTERACTIVE_TEST_2"',
      'expect -c "spawn claude; expect eof" 2>/dev/null || echo "EXPECT_FAILED"'
    ];
    
    this.results.interactive = {};
    for (const cmd of interactiveTests) {
      this.results.interactive[`test_${interactiveTests.indexOf(cmd)}`] = await this.runCommand(cmd);
    }
  }

  generateReport() {
    this.log('=== CLAUDE CLI DEBUG REPORT ===');
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cwd: process.cwd(),
        user: process.env.USER || process.env.USERNAME
      },
      tests: this.results,
      summary: {
        claudeFound: !this.results.basic?.error?.includes('command not found'),
        hasHelp: this.results.help?.exitCode === 0,
        hasVersion: this.results.version?.exitCode === 0,
        requiresTTY: this.analyzeTTYRequirement(),
        needsAuth: this.analyzeAuthRequirement(),
        supportsNonInteractive: this.analyzeNonInteractiveSupport()
      }
    };
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'claude-cli-debug-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`\nSUMMARY:`);
    this.log(`Claude CLI Found: ${report.summary.claudeFound}`);
    this.log(`Has Help: ${report.summary.hasHelp}`);
    this.log(`Has Version: ${report.summary.hasVersion}`);
    this.log(`Requires TTY: ${report.summary.requiresTTY}`);
    this.log(`Needs Auth: ${report.summary.needsAuth}`);
    this.log(`Supports Non-Interactive: ${report.summary.supportsNonInteractive}`);
    this.log(`\nDetailed report saved to: ${reportPath}`);
    
    return report;
  }

  analyzeTTYRequirement() {
    if (!this.results.tty) return 'unknown';
    
    // Look for patterns that indicate TTY requirement
    const results = Object.values(this.results.tty);
    const ttyErrors = results.filter(r => 
      r.stderr?.includes('tty') || 
      r.stderr?.includes('terminal') ||
      r.error?.includes('tty')
    );
    
    return ttyErrors.length > 0 ? 'likely' : 'unlikely';
  }

  analyzeAuthRequirement() {
    if (!this.results.auth) return 'unknown';
    
    // Look for auth-related messages
    const results = Object.values(this.results.auth);
    const authMessages = results.filter(r => 
      r.stdout?.includes('login') || 
      r.stdout?.includes('auth') ||
      r.stderr?.includes('authentication') ||
      r.stderr?.includes('unauthorized')
    );
    
    return authMessages.length > 0 ? 'likely' : 'unlikely';
  }

  analyzeNonInteractiveSupport() {
    if (!this.results.echo) return 'unknown';
    
    // Check if echo input worked
    const echoResult = this.results.echo;
    if (echoResult && echoResult.exitCode === 0 && echoResult.stdout) {
      return 'supported';
    }
    
    return 'unsupported';
  }

  async runAllTests() {
    try {
      this.log('Starting Claude CLI Debug Session...');
      fs.writeFileSync(this.logFile, ''); // Clear log file
      
      await this.testBasicClaude();
      await this.testClaudeHelp();
      await this.testClaudeVersion();
      await this.testEchoInput();
      await this.testWorkingDirectory();
      await this.testTTYRequirement();
      await this.testEnvironmentVariables();
      await this.testClaudePath();
      await this.testAuthentication();
      await this.testInteractiveMode();
      
      return this.generateReport();
    } catch (error) {
      this.log(`Critical error during testing: ${error.message}`);
      throw error;
    }
  }
}

// Export for use in other modules
module.exports = ClaudeCLIDebugger;

// Run if called directly
if (require.main === module) {
  const debugTool = new ClaudeCLIDebugger();
  
  debugTool.runAllTests()
    .then(report => {
      console.log('\n=== DEBUG COMPLETE ===');
      console.log('Check the generated files for detailed results:');
      console.log('- claude-cli-debug.log');
      console.log('- claude-cli-debug-report.json');
      process.exit(0);
    })
    .catch(error => {
      console.error('Debug failed:', error);
      process.exit(1);
    });
}