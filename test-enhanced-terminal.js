/**
 * Test Enhanced Terminal Server with Claude CLI Support
 */
const WebSocket = require('ws');

class TerminalTester {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.output = '';
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log('Connecting to enhanced terminal server...');
      this.ws = new WebSocket('ws://localhost:3002/terminal');

      this.ws.on('open', () => {
        console.log('✅ Connected to enhanced terminal');
        this.connected = true;
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.log('Raw data:', data.toString());
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('🔌 Terminal connection closed');
        this.connected = false;
      });

      // Timeout
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'connect':
        console.log('🎉 Terminal connected:', message.terminalId);
        console.log('Features:', message.features);
        this.sendInit();
        break;

      case 'data':
        process.stdout.write(message.data);
        this.output += message.data;
        break;

      case 'init_ack':
        console.log('✅ Terminal initialized, PID:', message.pid);
        this.runTests();
        break;

      case 'exit':
        console.log('🏁 Terminal process exited:', message.code);
        break;

      default:
        console.log('📨 Message:', message.type, message);
    }
  }

  sendInit() {
    this.send({
      type: 'init',
      cols: 80,
      rows: 24
    });
  }

  send(message) {
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendInput(data) {
    this.send({
      type: 'input',
      data: data
    });
  }

  async runTests() {
    console.log('\n🧪 Running enhanced terminal tests...\n');

    const tests = [
      // Basic shell tests
      { cmd: 'echo "=== Basic Shell Test ==="', delay: 1000 },
      { cmd: 'pwd', delay: 1000 },
      { cmd: 'whoami', delay: 1000 },
      
      // Path and environment tests
      { cmd: 'echo "=== Environment Tests ==="', delay: 1000 },
      { cmd: 'echo $TERM', delay: 1000 },
      { cmd: 'echo $PATH | tr : "\\n" | grep claude', delay: 1500 },
      
      // Claude CLI tests
      { cmd: 'echo "=== Claude CLI Tests ==="', delay: 1000 },
      { cmd: 'which claude', delay: 1000 },
      { cmd: 'claude --version', delay: 2000 },
      { cmd: 'claude --help | head -3', delay: 2000 },
      
      // Interactive Claude test (quick response)
      { cmd: 'echo "=== Interactive Claude Test ==="', delay: 1000 },
      { cmd: 'echo "Test prompt: Reply with exactly SUCCESS" | claude chat', delay: 5000 },
      
      // Cleanup
      { cmd: 'echo "=== Tests Complete ==="', delay: 1000 },
      { cmd: 'exit', delay: 1000 }
    ];

    let testIndex = 0;
    const runNextTest = () => {
      if (testIndex < tests.length) {
        const test = tests[testIndex++];
        console.log(`\n>>> Running: ${test.cmd}`);
        this.sendInput(test.cmd + '\n');
        setTimeout(runNextTest, test.delay);
      } else {
        console.log('\n✅ All tests completed');
        setTimeout(() => this.disconnect(), 2000);
      }
    };

    setTimeout(runNextTest, 2000);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Health check first
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3002/health');
    const health = await response.json();
    console.log('🏥 Server health:', health);
    return health.success;
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    return false;
  }
}

// Check Claude CLI status
async function checkClaudeStatus() {
  try {
    const response = await fetch('http://localhost:3002/api/claude-cli-status');
    const status = await response.json();
    console.log('🤖 Claude CLI status:', status);
    return status.available;
  } catch (error) {
    console.error('❌ Claude CLI status check failed:', error.message);
    return false;
  }
}

// Main test execution
async function main() {
  console.log('🚀 Enhanced Terminal Server Test Suite\n');

  // Check if server is running
  console.log('1. Checking server health...');
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.error('❌ Server is not healthy. Please start the enhanced terminal server first.');
    process.exit(1);
  }

  // Check Claude CLI
  console.log('2. Checking Claude CLI availability...');
  const claudeAvailable = await checkClaudeStatus();
  if (!claudeAvailable) {
    console.warn('⚠️ Claude CLI not available, but continuing with other tests...');
  }

  // Run terminal tests
  console.log('3. Starting terminal connection tests...');
  const tester = new TerminalTester();
  
  try {
    await tester.connect();
    // Tests run automatically after connection
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TerminalTester };