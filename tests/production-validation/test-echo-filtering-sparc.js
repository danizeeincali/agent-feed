/**
 * SPARC Production Validation: Terminal Echo Filtering Test
 * Validates that character-by-character echo is properly suppressed
 * and commands execute correctly without duplication
 */

const WebSocket = require('ws');

class EchoFilteringValidator {
  constructor() {
    this.testResults = [];
    this.backendUrl = 'http://localhost:3000';
    this.wsUrl = 'ws://localhost:3000/terminal';
  }

  async runCompleteValidation() {
    console.log('>� SPARC Echo Filtering Validation Suite');
    console.log('=========================================');
    
    try {
      // Test 1: Create Claude instance
      const instanceId = await this.createClaudeInstance();
      
      // Test 2: WebSocket connection and echo suppression
      await this.testWebSocketEchoSuppression(instanceId);
      
      // Test 3: Command execution verification
      await this.testCommandExecution(instanceId);
      
      // Test 4: Character-by-character input test
      await this.testCharacterByCharacterInput(instanceId);
      
      // Test 5: Control sequence filtering
      await this.testControlSequenceFiltering(instanceId);
      
      // Cleanup
      await this.cleanupInstance(instanceId);
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('L Echo filtering validation failed:', error);
      this.testResults.push({
        test: 'Echo Filtering Suite',
        status: 'failed',
        error: error.message
      });
    }
  }

  async createClaudeInstance() {
    console.log('<� Creating Claude instance for echo testing...');
    
    const response = await fetch(`${this.backendUrl}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude'],
        instanceType: 'prod',
        usePty: true
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error('Failed to create Claude instance');
    }
    
    console.log(` Created instance: ${data.instance.id}`);
    this.testResults.push({
      test: 'Instance Creation',
      status: 'passed',
      instanceId: data.instance.id
    });
    
    // Wait for instance to be ready
    await this.waitForInstanceReady(data.instance.id);
    
    return data.instance.id;
  }

  async waitForInstanceReady(instanceId) {
    console.log(`� Waiting for instance ${instanceId} to be ready...`);
    
    for (let i = 0; i < 30; i++) {
      const response = await fetch(`${this.backendUrl}/api/claude/instances/${instanceId}/status`);
      const data = await response.json();
      
      if (data.success && data.status.status === 'running') {
        console.log(` Instance ${instanceId} is ready`);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Instance ${instanceId} never became ready`);
  }

  async testWebSocketEchoSuppression(instanceId) {
    console.log('= Testing WebSocket echo suppression...');
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      let outputBuffer = '';
      let echoCount = 0;
      const testCommand = 'echo "test-echo-suppression"';
      
      ws.on('open', () => {
        // Connect to specific instance
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));
        
        setTimeout(() => {
          // Send test command
          ws.send(JSON.stringify({
            type: 'input',
            data: testCommand
          }));
        }, 1000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'output') {
            outputBuffer += message.data;
            
            // Count how many times our test command appears in output
            const matches = (outputBuffer.match(/test-echo-suppression/g) || []);
            echoCount = matches.length;
          }
        } catch (e) {
          // Handle non-JSON messages
        }
      });
      
      setTimeout(() => {
        ws.close();
        
        // Analyze results
        console.log(`=� Echo analysis: Command appeared ${echoCount} times in output`);
        console.log(`=� Total output buffer size: ${outputBuffer.length} characters`);
        
        if (echoCount <= 1) {
          console.log(' Echo suppression working correctly');
          this.testResults.push({
            test: 'WebSocket Echo Suppression',
            status: 'passed',
            echoCount,
            outputSize: outputBuffer.length
          });
        } else {
          console.log('L Echo suppression failed - command duplicated');
          this.testResults.push({
            test: 'WebSocket Echo Suppression',
            status: 'failed',
            echoCount,
            issue: 'Command duplicated in output'
          });
        }
        
        resolve();
      }, 5000);
      
      ws.on('error', (error) => {
        console.error('L WebSocket error:', error);
        reject(error);
      });
    });
  }

  async testCommandExecution(instanceId) {
    console.log('� Testing command execution...');
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      let outputReceived = false;
      let commandExecuted = false;
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));
        
        setTimeout(() => {
          // Send a command that should execute
          ws.send(JSON.stringify({
            type: 'input',
            data: 'pwd\n'
          }));
        }, 1000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'output' && message.data.includes('/workspaces/agent-feed/prod')) {
            outputReceived = true;
            commandExecuted = true;
            console.log(' Command executed successfully');
          }
        } catch (e) {
          // Handle non-JSON messages
        }
      });
      
      setTimeout(() => {
        ws.close();
        
        if (commandExecuted) {
          this.testResults.push({
            test: 'Command Execution',
            status: 'passed',
            outputReceived
          });
        } else {
          console.log('L Command execution failed');
          this.testResults.push({
            test: 'Command Execution',
            status: 'failed',
            issue: 'No expected output received'
          });
        }
        
        resolve();
      }, 4000);
      
      ws.on('error', reject);
    });
  }

  async testCharacterByCharacterInput(instanceId) {
    console.log('🔤 Testing character-by-character input handling...');
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      let characterEchoes = 0;
      const testChars = ['h', 'e', 'l', 'l', 'o'];
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));
        
        setTimeout(() => {
          // Send characters individually
          testChars.forEach((char, index) => {
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'input',
                data: char
              }));
            }, index * 100);
          });
        }, 1000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'output') {
            // Count individual character echoes
            testChars.forEach(char => {
              if (message.data.includes(char)) {
                characterEchoes++;
              }
            });
          }
        } catch (e) {
          // Handle non-JSON messages
        }
      });
      
      setTimeout(() => {
        ws.close();
        
        console.log(`📊 Character echo count: ${characterEchoes}`);
        
        if (characterEchoes <= testChars.length) {
          console.log('✅ Character-by-character echo suppression working');
          this.testResults.push({
            test: 'Character Echo Suppression',
            status: 'passed',
            characterEchoes
          });
        } else {
          console.log('❌ Character-by-character echo not properly suppressed');
          this.testResults.push({
            test: 'Character Echo Suppression',
            status: 'failed',
            characterEchoes,
            issue: 'Too many character echoes detected'
          });
        }
        
        resolve();
      }, 3000);
      
      ws.on('error', reject);
    });
  }

  async testControlSequenceFiltering(instanceId) {
    console.log('🎛️ Testing control sequence filtering...');
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      let controlSequences = [];
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'output') {
            // Check for common control sequences that should be filtered
            const sequences = [
              /\[?25[lh]/g, // Hide/show cursor
              /\[?2004[hl]/g, // Bracketed paste mode
              /\[?1004[hl]/g, // Focus events
              /\[2K\[1A/g, // Clear line and move up
              /\[\dG/g // Move cursor to column
            ];
            
            sequences.forEach(seq => {
              const matches = message.data.match(seq);
              if (matches) {
                controlSequences.push(...matches);
              }
            });
          }
        } catch (e) {
          // Handle non-JSON messages
        }
      });
      
      setTimeout(() => {
        ws.close();
        
        console.log(`📊 Control sequences detected: ${controlSequences.length}`);
        
        if (controlSequences.length <= 5) { // Allow some sequences but not excessive
          console.log('✅ Control sequence filtering working acceptably');
          this.testResults.push({
            test: 'Control Sequence Filtering',
            status: 'passed',
            sequencesDetected: controlSequences.length
          });
        } else {
          console.log('❌ Too many control sequences in output');
          this.testResults.push({
            test: 'Control Sequence Filtering',
            status: 'failed',
            sequencesDetected: controlSequences.length,
            issue: 'Excessive control sequences not filtered'
          });
        }
        
        resolve();
      }, 3000);
      
      ws.on('error', reject);
    });
  }

  generateReport() {
    console.log('\n=� SPARC Echo Filtering Test Report');
    console.log('===================================');
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      console.log('\n<� All echo filtering tests passed! Terminal I/O is clean.');
    } else {
      console.log('\n� Some tests failed. Echo filtering needs adjustment.');
    }
  }

  async cleanupInstance(instanceId) {
    console.log(`>� Cleaning up instance ${instanceId}...`);
    
    try {
      const response = await fetch(`${this.backendUrl}/api/claude/instances/${instanceId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log(' Instance cleaned up successfully');
      }
    } catch (error) {
      console.warn('� Failed to cleanup instance:', error.message);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EchoFilteringValidator();
  validator.runCompleteValidation().catch(console.error);
}

module.exports = EchoFilteringValidator;