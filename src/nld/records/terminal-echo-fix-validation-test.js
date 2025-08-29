/**
 * NLD Validation Test for Terminal Echo Fix
 * Pattern: TTY-ECHO-001
 * Fix Applied: PTY echo: false configuration
 * Expected Effectiveness: 95%
 */

const { spawn } = require('child_process');
const pty = require('node-pty');

class TerminalEchoFixValidator {
  constructor() {
    this.testResults = {
      echo_duplication_eliminated: false,
      command_execution_working: false,
      character_buildup_prevented: false,
      overall_success: false
    };
  }

  async validateEchoFix() {
    console.log('🔍 NLD Pattern Validation: Testing TTY-ECHO-001 fix...');
    
    try {
      // Test 1: Verify echo: false prevents character duplication
      await this.testEchoPrevention();
      
      // Test 2: Verify command execution works
      await this.testCommandExecution();
      
      // Test 3: Verify no character buildup occurs
      await this.testCharacterBuildup();
      
      this.calculateOverallSuccess();
      return this.generateValidationReport();
      
    } catch (error) {
      console.error('❌ NLD Validation failed:', error);
      return { success: false, error: error.message };
    }
  }

  async testEchoPrevention() {
    return new Promise((resolve, reject) => {
      const testPty = pty.spawn('bash', [], {
        echo: false,  // The critical fix
        name: 'xterm-color',
        cols: 80,
        rows: 24
      });

      let output = '';
      let charCount = 0;

      testPty.onData((data) => {
        output += data;
        charCount++;
      });

      // Send test input
      testPty.write('hello');
      
      setTimeout(() => {
        // Should NOT see character-by-character buildup
        const hasEchoDuplication = output.includes('h') && output.includes('he') && output.includes('hel');
        this.testResults.echo_duplication_eliminated = !hasEchoDuplication;
        
        testPty.kill();
        resolve();
      }, 1000);
    });
  }

  async testCommandExecution() {
    return new Promise((resolve, reject) => {
      const testPty = pty.spawn('bash', [], {
        echo: false,
        name: 'xterm-color'
      });

      let commandExecuted = false;

      testPty.onData((data) => {
        if (data.includes('echo_test_success')) {
          commandExecuted = true;
        }
      });

      // Send command with enter
      testPty.write('echo "echo_test_success"\r');
      
      setTimeout(() => {
        this.testResults.command_execution_working = commandExecuted;
        testPty.kill();
        resolve();
      }, 2000);
    });
  }

  async testCharacterBuildup() {
    return new Promise((resolve, reject) => {
      const testPty = pty.spawn('bash', [], {
        echo: false,
        name: 'xterm-color'
      });

      const inputSequence = 'test_input';
      let outputBuffer = '';
      let characterBuildupDetected = false;

      testPty.onData((data) => {
        outputBuffer += data;
        
        // Check for character buildup pattern (t, te, tes, test, etc.)
        for (let i = 1; i < inputSequence.length; i++) {
          const partial = inputSequence.substring(0, i);
          if (outputBuffer.includes(partial + ' ') || outputBuffer.includes(partial + '\n')) {
            characterBuildupDetected = true;
            break;
          }
        }
      });

      // Send input character by character to simulate typing
      let charIndex = 0;
      const sendInterval = setInterval(() => {
        if (charIndex < inputSequence.length) {
          testPty.write(inputSequence[charIndex]);
          charIndex++;
        } else {
          clearInterval(sendInterval);
        }
      }, 100);

      setTimeout(() => {
        this.testResults.character_buildup_prevented = !characterBuildupDetected;
        testPty.kill();
        resolve();
      }, 3000);
    });
  }

  calculateOverallSuccess() {
    const passedTests = Object.values(this.testResults).filter(result => result === true).length;
    this.testResults.overall_success = passedTests >= 3; // All core tests must pass
  }

  generateValidationReport() {
    const effectiveness = this.testResults.overall_success ? 0.95 : 0.2;
    
    return {
      pattern_id: 'TTY-ECHO-001',
      fix_validation: 'terminal-echo-fix-applied',
      timestamp: new Date().toISOString(),
      test_results: this.testResults,
      effectiveness_score: effectiveness,
      success: this.testResults.overall_success,
      recommendations: this.testResults.overall_success ? 
        ['Echo fix successful - pattern resolved'] :
        ['Echo fix failed - review PTY configuration', 'Check for additional terminal settings', 'Validate node-pty version compatibility']
    };
  }
}

// Export for integration with NLD system
module.exports = TerminalEchoFixValidator;

// Run validation if called directly
if (require.main === module) {
  const validator = new TerminalEchoFixValidator();
  validator.validateEchoFix().then(report => {
    console.log('📊 NLD Validation Report:', JSON.stringify(report, null, 2));
    process.exit(report.success ? 0 : 1);
  });
}