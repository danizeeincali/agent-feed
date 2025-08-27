/**
 * SPARC:debug Solution - Mock Claude Process
 * Provides Claude CLI-compatible simulation for development when authentication unavailable
 */

const EventEmitter = require('events');
const { Readable, Writable } = require('stream');

class MockClaudeProcess extends EventEmitter {
    constructor(instanceId, options = {}) {
        super();
        
        this.instanceId = instanceId;
        this.pid = Math.floor(Math.random() * 90000) + 10000; // Realistic PID
        this.killed = false;
        this.exitCode = null;
        this.startTime = Date.now();
        
        // Options
        this.options = {
            responseDelay: options.responseDelay || 1000, // 1 second response time
            startupDelay: options.startupDelay || 500,    // 500ms startup
            workingDirectory: options.cwd || process.cwd(),
            verbose: options.verbose || false,
            ...options
        };
        
        // Create stdio streams
        this.stdin = new MockStdin(this);
        this.stdout = new MockStdout(this);
        this.stderr = new MockStderr(this);
        
        // Internal state
        this.state = 'starting';
        this.commandHistory = [];
        this.isWaitingForInput = false;
        this.sessionStarted = false;
        
        // Start simulation
        this._simulateStartup();
    }
    
    _simulateStartup() {
        this._log('Mock Claude process starting...');
        
        // Emit spawn event after startup delay
        setTimeout(() => {
            if (!this.killed) {
                this.state = 'running';
                this._log('Mock Claude process ready');
                this.emit('spawn');
                
                // Send initial prompt
                this._sendWelcomeMessage();
            }
        }, this.options.startupDelay);
    }
    
    _sendWelcomeMessage() {
        const welcomeMessage = `Claude Code v1.0.93 (Mock Development Mode)
Working directory: ${this.options.workingDirectory}
Instance ID: ${this.instanceId}

Ready for your questions! Type 'help' for available commands.

> `;
        
        this._writeToStdout(welcomeMessage);
        this.isWaitingForInput = true;
        this.sessionStarted = true;
    }
    
    _writeToStdout(data) {
        if (!this.killed && this.stdout.writable) {
            this.stdout.push(data);
        }
    }
    
    _writeToStderr(data) {
        if (!this.killed && this.stderr.writable) {
            this.stderr.push(data);
        }
    }
    
    _processInput(input) {
        const command = input.trim().toLowerCase();
        this.commandHistory.push({ command, timestamp: Date.now() });
        this.isWaitingForInput = false;
        
        this._log(`Processing command: "${command}"`);
        
        // Simulate processing delay
        setTimeout(() => {
            this._generateResponse(command, input);
        }, this.options.responseDelay);
    }
    
    _generateResponse(command, originalInput) {
        if (this.killed) return;
        
        let response = '';
        
        // Built-in commands
        if (command === 'help') {
            response = this._getHelpResponse();
        } else if (command === 'exit' || command === 'quit') {
            response = 'Goodbye!\n';
            setTimeout(() => this._exit(0), 100);
            this._writeToStdout(response);
            return;
        } else if (command === 'status') {
            response = this._getStatusResponse();
        } else if (command === 'clear') {
            response = '\x1b[2J\x1b[0f'; // Clear screen ANSI codes
        } else if (command.startsWith('cd ')) {
            response = this._handleCdCommand(command);
        } else if (command === 'pwd') {
            response = `Current directory: ${this.options.workingDirectory}\n`;
        } else if (command === 'whoami') {
            response = 'Claude (Mock Development Instance)\n';
        } else {
            // Generate AI-like response for any other input
            response = this._generateAIResponse(originalInput);
        }
        
        // Send response
        this._writeToStdout(response);
        
        // Show prompt again if not exiting
        if (!this.killed && this.state === 'running') {
            setTimeout(() => {
                this._writeToStdout('\n> ');
                this.isWaitingForInput = true;
            }, 100);
        }
    }
    
    _getHelpResponse() {
        return `Mock Claude Development Mode - Available Commands:

Built-in Commands:
  help          - Show this help message
  status        - Show instance status
  clear         - Clear the screen  
  cd <dir>      - Change directory (simulated)
  pwd           - Show current directory
  whoami        - Show current user
  exit/quit     - Exit the session

AI Features:
  Ask any question and get a simulated AI response!
  
Examples:
  "What is 2+2?"
  "Write a hello world program"
  "Explain quantum physics"

Note: This is a development simulation. For real AI responses, 
configure authentication with: claude setup-token

`;
    }
    
    _getStatusResponse() {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        const memory = process.memoryUsage();
        
        return `Mock Claude Instance Status:

Instance ID: ${this.instanceId}
PID: ${this.pid}
State: ${this.state}
Uptime: ${uptime} seconds
Working Directory: ${this.options.workingDirectory}
Commands Processed: ${this.commandHistory.length}
Memory Usage: ${Math.round(memory.heapUsed / 1024 / 1024)}MB

Recent Commands:
${this.commandHistory.slice(-3).map(c => `  ${new Date(c.timestamp).toLocaleTimeString()} - ${c.command}`).join('\n')}

`;
    }
    
    _handleCdCommand(command) {
        const newDir = command.substring(3).trim();
        if (newDir) {
            this.options.workingDirectory = newDir;
            return `Changed directory to: ${newDir}\n`;
        } else {
            return `Changed directory to: ${process.env.HOME || '/home'}\n`;
        }
    }
    
    _generateAIResponse(input) {
        // Simulate different types of AI responses based on input
        const responses = [
            // Math questions
            {
                pattern: /what\s+is\s+\d+[\+\-\*\/]\d+/i,
                response: (input) => {
                    const match = input.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/);
                    if (match) {
                        const [, a, op, b] = match;
                        const num1 = parseInt(a), num2 = parseInt(b);
                        let result;
                        switch (op) {
                            case '+': result = num1 + num2; break;
                            case '-': result = num1 - num2; break;
                            case '*': result = num1 * num2; break;
                            case '/': result = num1 / num2; break;
                        }
                        return `${a} ${op} ${b} = ${result}\n\nThis is a simulated calculation. In production mode with authentication, Claude would provide detailed mathematical explanations and context.`;
                    }
                    return "I can help with math! This is a mock response. Enable authentication for real AI capabilities.";
                }
            },
            
            // Programming requests
            {
                pattern: /write|code|program|function/i,
                response: () => `Here's a mock code example:

\`\`\`javascript
// Mock Hello World (Development Mode)
function helloWorld() {
    console.log("Hello from Mock Claude!");
    console.log("Enable authentication for real code generation");
}

helloWorld();
\`\`\`

Note: This is a development simulation. Configure Claude authentication 
to get real AI-powered code generation and explanations.`
            },
            
            // General questions
            {
                pattern: /.+/,
                response: (input) => `Mock Claude Response to: "${input}"

This is a development simulation response. The actual Claude AI would provide:
- Detailed, accurate information
- Context-aware explanations  
- Follow-up questions and suggestions
- Rich formatting and examples

To enable real AI responses:
1. Run: claude setup-token
2. Follow the authentication prompts
3. Restart your application

Current mode: Development Simulation
Response generated at: ${new Date().toLocaleTimeString()}`
            }
        ];
        
        // Find matching response pattern
        for (const responseConfig of responses) {
            if (responseConfig.pattern.test(input)) {
                if (typeof responseConfig.response === 'function') {
                    return responseConfig.response(input);
                } else {
                    return responseConfig.response;
                }
            }
        }
        
        // Fallback response
        return `Mock response generated for: "${input}"\n\nThis is a development simulation. Configure authentication for real AI responses.`;
    }
    
    _exit(code = 0) {
        if (this.killed) return;
        
        this.killed = true;
        this.exitCode = code;
        this.state = 'stopped';
        
        this._log(`Mock Claude process exiting with code ${code}`);
        
        // Close streams
        this.stdin.destroy();
        this.stdout.push(null);
        this.stderr.push(null);
        
        // Emit exit event
        this.emit('exit', code, null);
    }
    
    kill(signal = 'SIGTERM') {
        this._log(`Mock Claude process killed with signal ${signal}`);
        
        if (signal === 'SIGKILL') {
            this._exit(null);
        } else {
            // Graceful shutdown
            this._writeToStdout('\nReceived termination signal, shutting down...\n');
            setTimeout(() => this._exit(0), 100);
        }
    }
    
    _log(message) {
        if (this.options.verbose) {
            console.log(`[Mock Claude ${this.instanceId}] ${message}`);
        }
    }
}

// Mock stdin stream that processes input
class MockStdin extends Writable {
    constructor(mockProcess) {
        super({ encoding: 'utf8' });
        this.mockProcess = mockProcess;
    }
    
    _write(chunk, encoding, callback) {
        const input = chunk.toString();
        
        // Process input if Claude is waiting
        if (this.mockProcess.isWaitingForInput && !this.mockProcess.killed) {
            this.mockProcess._processInput(input);
        }
        
        callback();
    }
}

// Mock stdout stream that emits data events
class MockStdout extends Readable {
    constructor(mockProcess) {
        super({ encoding: 'utf8' });
        this.mockProcess = mockProcess;
    }
    
    _read() {
        // Implementation handled by push() calls from MockClaudeProcess
    }
}

// Mock stderr stream for error output
class MockStderr extends Readable {
    constructor(mockProcess) {
        super({ encoding: 'utf8' });
        this.mockProcess = mockProcess;
    }
    
    _read() {
        // Implementation handled by push() calls from MockClaudeProcess
    }
}

module.exports = MockClaudeProcess;