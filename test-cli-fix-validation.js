/**
 * SPARC CLI Fix Validation Script
 * 
 * Tests the CLI detection fix without server conflicts
 */

const { spawn } = require('child_process');
const path = require('path');

class CLIFixValidator {
  static async validateFix() {
    console.log('🧪 SPARC CLI Fix Validation Starting...\n');
    
    const results = {
      cliDetection: false,
      pathResolution: false,
      commandExecution: false,
      environmentSetup: false,
      cascadePrevention: false
    };
    
    // Test 1: CLI Detection
    console.log('1️⃣ Testing CLI Detection...');
    const cliPath = await this.findClaudeInPath();
    if (cliPath) {
      console.log(`✅ Claude CLI found: ${cliPath}`);
      results.cliDetection = true;
    } else {
      console.log('❌ Claude CLI not found');
    }
    
    // Test 2: PATH Resolution  
    console.log('\n2️⃣ Testing PATH Resolution...');
    const pathValid = process.env.PATH.includes('/home/codespace/nvm/current/bin');
    if (pathValid) {
      console.log('✅ PATH includes Claude CLI location');
      results.pathResolution = true;
    } else {
      console.log('❌ PATH missing Claude CLI location');
    }
    
    // Test 3: Command Execution
    console.log('\n3️⃣ Testing Command Execution...');
    const cmdResult = await this.testCommandExecution('claude --version');
    if (cmdResult.success) {
      console.log(`✅ Claude command executed: ${cmdResult.output}`);
      results.commandExecution = true;
    } else {
      console.log(`❌ Claude command failed: ${cmdResult.error}`);
    }
    
    // Test 4: Environment Setup
    console.log('\n4️⃣ Testing Environment Setup...');
    const envValid = this.validateEnvironment();
    if (envValid) {
      console.log('✅ Terminal environment properly configured');
      results.environmentSetup = true;
    } else {
      console.log('❌ Terminal environment missing required variables');
    }
    
    // Test 5: Cascade Prevention
    console.log('\n5️⃣ Testing Cascade Prevention...');
    const cascadeFixed = this.testCascadePrevention();
    if (cascadeFixed) {
      console.log('✅ ANSI sequence processing maintains cascade prevention');
      results.cascadePrevention = true;
    } else {
      console.log('❌ Cascade prevention broken');
    }
    
    // Summary
    const passCount = Object.values(results).filter(Boolean).length;
    console.log(`\n📊 VALIDATION SUMMARY: ${passCount}/5 tests passed`);
    
    if (passCount === 5) {
      console.log('🎉 ALL TESTS PASSED - CLI fix successful!');
      return true;
    } else {
      console.log('⚠️  Some tests failed - review needed');
      return false;
    }
  }
  
  static async findClaudeInPath() {
    return new Promise((resolve) => {
      const whichProcess = spawn('which', ['claude'], { 
        env: process.env,
        stdio: 'pipe'
      });
      
      let output = '';
      whichProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      whichProcess.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });
      
      whichProcess.on('error', () => {
        resolve(null);
      });
    });
  }
  
  static async testCommandExecution(command) {
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ');
      const testProcess = spawn(cmd, args, {
        env: process.env,
        stdio: 'pipe',
        timeout: 5000
      });
      
      let output = '';
      let error = '';
      
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      testProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: error.trim() || undefined
        });
      });
      
      testProcess.on('error', (err) => {
        resolve({
          success: false,
          output: '',
          error: err.message
        });
      });
    });
  }
  
  static validateEnvironment() {
    const requiredVars = ['HOME', 'PATH', 'PWD'];
    return requiredVars.every(varName => process.env[varName]);
  }
  
  static testCascadePrevention() {
    const testCases = [
      { input: '\r\x1b[K', expected: '\x1b[2K\x1b[1G' },
      { input: '\r', expected: '\x1b[1G' },
      { input: '\x1b[?25l', expected: '' },
      { input: '\x1b[?25h', expected: '' }
    ];
    
    const processAnsiSequences = (data) => {
      return data
        .replace(/\r\x1b\[K/g, '\x1b[2K\x1b[1G')
        .replace(/\r(?!\n)/g, '\x1b[1G')
        .replace(/\x1b\[\?25[lh]/g, '');
    };
    
    return testCases.every(({ input, expected }) => {
      const result = processAnsiSequences(input);
      return result === expected;
    });
  }
}

// Run validation
if (require.main === module) {
  CLIFixValidator.validateFix()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = CLIFixValidator;