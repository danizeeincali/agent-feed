#!/usr/bin/env node

/**
 * TDD London School - WebSocket Removal Test Runner
 * 
 * This runner demonstrates the London School TDD approach:
 * 1. RED: Run failing tests to establish contracts
 * 2. GREEN: Implement minimal code to make tests pass
 * 3. REFACTOR: Improve implementation while keeping tests green
 * 
 * The tests will fail initially because they define the expected behavior
 * when WebSocket is removed, but the current implementation still depends on WebSocket.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

class TDDRunner {
  constructor() {
    this.testFile = path.join(__dirname, 'websocket-removal-tdd.test.js');
    this.phase = 'RED'; // Start with failing tests
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, color = 'white') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  async runTests() {
    this.log(`\n${'='.repeat(80)}`, 'cyan');
    this.log('🧪 TDD London School - WebSocket Removal Test Suite', 'bright');
    this.log(`${'='.repeat(80)}`, 'cyan');
    
    this.log(`\n📍 Current Phase: ${this.phase}`, 'yellow');
    
    if (this.phase === 'RED') {
      this.log('\n🔴 RED Phase: Running tests that SHOULD FAIL', 'red');
      this.log('These tests define the expected behavior when WebSocket is removed.', 'white');
      this.log('They will fail because the current implementation still uses WebSocket.', 'white');
    }
    
    return new Promise((resolve, reject) => {
      const jestConfig = path.join(__dirname, 'jest.config.js');
      const args = [
        '--config', jestConfig,
        '--testPathPattern', 'websocket-removal-tdd.test.js',
        '--verbose',
        '--no-cache',
        '--forceExit'
      ];

      const jest = spawn('npx', ['jest', ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: __dirname
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      jest.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      jest.on('close', (code) => {
        this.parseResults(stdout, stderr);
        this.displaySummary(code);
        
        if (this.phase === 'RED') {
          this.suggestImplementation();
        }
        
        resolve(code);
      });

      jest.on('error', (error) => {
        this.log(`❌ Test execution failed: ${error.message}`, 'red');
        reject(error);
      });
    });
  }

  parseResults(stdout, stderr) {
    // Parse Jest output to extract test results
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      if (line.includes('Tests:')) {
        const testMatch = line.match(/(\d+) failed.*?(\d+) passed.*?(\d+) total/);
        if (testMatch) {
          this.results.failed = parseInt(testMatch[1]) || 0;
          this.results.passed = parseInt(testMatch[2]) || 0;
          this.results.totalTests = parseInt(testMatch[3]) || 0;
        }
      }
      
      if (line.includes('✓') || line.includes('✗')) {
        // Capture individual test results
        this.results.errors.push(line.trim());
      }
    }
  }

  displaySummary(exitCode) {
    this.log(`\n${'─'.repeat(80)}`, 'cyan');
    this.log('📊 Test Results Summary', 'bright');
    this.log(`${'─'.repeat(80)}`, 'cyan');
    
    this.log(`\n📈 Total Tests: ${this.results.totalTests}`, 'white');
    
    if (this.results.passed > 0) {
      this.log(`✅ Passed: ${this.results.passed}`, 'green');
    }
    
    if (this.results.failed > 0) {
      this.log(`❌ Failed: ${this.results.failed}`, 'red');
    }
    
    if (this.phase === 'RED' && this.results.failed > 0) {
      this.log(`\n🎯 Expected Outcome: TESTS SHOULD FAIL in RED phase`, 'yellow');
      this.log(`✓ TDD RED Phase Complete - Tests properly define contracts`, 'green');
    } else if (this.phase === 'GREEN' && this.results.failed === 0) {
      this.log(`\n🎯 Expected Outcome: ALL TESTS SHOULD PASS in GREEN phase`, 'yellow');
      this.log(`✓ TDD GREEN Phase Complete - Implementation satisfies contracts`, 'green');
    }
    
    this.log(`\n🔄 Exit Code: ${exitCode}`, exitCode === 0 ? 'green' : 'red');
  }

  suggestImplementation() {
    this.log(`\n${'─'.repeat(80)}`, 'magenta');
    this.log('💡 TDD Implementation Guidance', 'bright');
    this.log(`${'─'.repeat(80)}`, 'magenta');
    
    this.log(`\n🔧 To move to GREEN phase, implement these changes:`, 'yellow');
    
    const suggestions = [
      {
        file: 'useTokenCostTracking.ts',
        changes: [
          '• Remove WebSocket dependency from useWebSocketSingleton import',
          '• Set isConnected to always return false',
          '• Remove socket.emit calls',
          '• Enable demo data fallback when WebSocket unavailable',
          '• Remove WebSocket event listeners'
        ]
      },
      {
        file: 'TokenCostAnalytics.tsx',
        changes: [
          '• Show "Disconnected" state when isConnected is false',
          '• Display "Demo Mode" badge when using fallback data',
          '• Remove real-time update indicators',
          '• Ensure export/refresh functions work without WebSocket'
        ]
      },
      {
        file: 'SimpleAnalytics.tsx',
        changes: [
          '• Ensure tab switching works without WebSocket dependencies',
          '• Add proper error boundaries for TokenCostAnalytics',
          '• Handle lazy loading failures gracefully'
        ]
      }
    ];

    suggestions.forEach(({ file, changes }) => {
      this.log(`\n📁 ${file}:`, 'cyan');
      changes.forEach(change => this.log(`  ${change}`, 'white'));
    });

    this.log(`\n🚀 Run this script again with GREEN phase to verify fixes:`, 'green');
    this.log(`   node run-websocket-removal-tdd.js --phase=GREEN`, 'green');
  }

  async checkDependencies() {
    const requiredFiles = [
      path.join(__dirname, 'jest.config.js'),
      path.join(__dirname, 'jest.setup.js'),
      path.join(__dirname, 'mocks/websocket-removal.mock.ts'),
      this.testFile
    ];

    const missing = [];
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        missing.push(file);
      }
    }

    if (missing.length > 0) {
      this.log(`❌ Missing required files:`, 'red');
      missing.forEach(file => this.log(`  - ${file}`, 'red'));
      return false;
    }

    return true;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const phaseArg = args.find(arg => arg.startsWith('--phase='));
  const phase = phaseArg ? phaseArg.split('=')[1].toUpperCase() : 'RED';

  const runner = new TDDRunner();
  runner.phase = phase;

  try {
    runner.log(`\n🏗️  TDD London School - WebSocket Removal`, 'bright');
    runner.log(`Phase: ${phase}`, 'yellow');
    
    // Check dependencies
    const depsOk = await runner.checkDependencies();
    if (!depsOk) {
      process.exit(1);
    }

    // Run the tests
    const exitCode = await runner.runTests();
    
    if (phase === 'RED' && exitCode !== 0) {
      runner.log(`\n✅ RED phase successful - tests failed as expected`, 'green');
      runner.log(`Next: Implement changes and run with --phase=GREEN`, 'yellow');
      process.exit(0); // Success in RED phase means tests failed
    } else if (phase === 'GREEN' && exitCode === 0) {
      runner.log(`\n✅ GREEN phase successful - all tests pass`, 'green');
      runner.log(`Next: Consider REFACTOR phase to improve implementation`, 'yellow');
      process.exit(0);
    } else {
      runner.log(`\n⚠️  Unexpected outcome for ${phase} phase`, 'yellow');
      process.exit(exitCode);
    }
    
  } catch (error) {
    runner.log(`\n💥 Test execution failed:`, 'red');
    runner.log(error.message, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TDDRunner;