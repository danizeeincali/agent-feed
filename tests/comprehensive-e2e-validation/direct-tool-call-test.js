/**
 * DIRECT TOOL CALL TESTING
 * 
 * Tests tool call functionality directly via WebSocket without browser
 * Validates command execution and tool call visualization in the backend
 */

const WebSocket = require('ws');
const axios = require('axios');
const { spawn } = require('child_process');

class DirectToolCallValidator {
    constructor() {
        this.ws = null;
        this.messages = [];
        this.toolCallsDetected = [];
        this.commandResults = [];
    }

    async validateBackendAPI() {
        console.log('🔍 BACKEND API VALIDATION');
        console.log('-' .repeat(40));
        
        try {
            // Test health endpoint
            const healthResponse = await axios.get('http://localhost:3000/health');
            console.log(`✅ Health endpoint: ${healthResponse.status} - ${healthResponse.data.status || 'OK'}`);
            
            // Test Claude instance creation
            try {
                const instanceResponse = await axios.post('http://localhost:3000/api/claude/instances', {
                    name: 'test-validation-instance'
                });
                console.log(`✅ Instance creation: ${instanceResponse.status}`);
                console.log(`   Instance ID: ${instanceResponse.data.id || 'N/A'}`);
                return instanceResponse.data;
            } catch (apiError) {
                console.log(`⚠️  Instance creation endpoint not available: ${apiError.response?.status || apiError.message}`);
                return null;
            }
            
        } catch (error) {
            console.error(`❌ Backend API validation error: ${error.message}`);
            return null;
        }
    }

    async testDirectWebSocketToolCalls() {
        console.log('\n🔌 DIRECT WEBSOCKET TOOL CALL TEST');
        console.log('-' .repeat(40));

        return new Promise((resolve) => {
            this.ws = new WebSocket('ws://localhost:3000/terminal');
            let testStarted = false;
            
            this.ws.on('open', () => {
                console.log('✅ WebSocket connected to terminal');
                testStarted = true;
                
                // Send initialization
                const initMessage = {
                    type: 'init',
                    cols: 80,
                    rows: 24
                };
                this.ws.send(JSON.stringify(initMessage));
                
                // Wait a bit then send test commands
                setTimeout(() => {
                    this.sendTestCommands();
                }, 1000);
            });
            
            this.ws.on('message', (data) => {
                const message = data.toString();
                this.messages.push({
                    timestamp: Date.now(),
                    data: message,
                    raw: message
                });
                
                console.log(`📨 Received: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
                
                // Check for tool call patterns
                if (this.detectToolCallPattern(message)) {
                    console.log('🎯 TOOL CALL PATTERN DETECTED!');
                    this.toolCallsDetected.push({
                        timestamp: Date.now(),
                        message: message,
                        pattern: this.identifyToolCallPattern(message)
                    });
                }
                
                // Check for command execution results
                if (this.detectCommandResult(message)) {
                    console.log('✅ COMMAND RESULT DETECTED!');
                    this.commandResults.push({
                        timestamp: Date.now(),
                        result: message
                    });
                }
            });
            
            this.ws.on('error', (error) => {
                console.error(`❌ WebSocket error: ${error.message}`);
                resolve(false);
            });
            
            this.ws.on('close', (code, reason) => {
                console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
                resolve(testStarted);
            });
            
            // Test timeout
            setTimeout(() => {
                if (this.ws) {
                    this.ws.close();
                }
                resolve(testStarted);
            }, 30000); // 30 second test
        });
    }

    sendTestCommands() {
        const commands = [
            'echo "Testing tool call visualization"',
            'ls -la',
            'pwd',
            'whoami',
            'echo "Test complete"'
        ];
        
        commands.forEach((cmd, index) => {
            setTimeout(() => {
                console.log(`📤 Sending command ${index + 1}: ${cmd}`);
                const message = {
                    type: 'input',
                    data: cmd + '\n'
                };
                
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify(message));
                }
            }, index * 3000); // 3 second intervals
        });
    }

    detectToolCallPattern(message) {
        // Look for common tool call patterns
        const patterns = [
            /●.*Bash\(/,
            /Tool call.*Bash/,
            /executing.*command/i,
            /running.*bash/i,
            /\[TOOL.*CALL\]/i,
            /● Bash\(.+\)/,
            /Command:.*Bash/
        ];
        
        return patterns.some(pattern => pattern.test(message));
    }

    identifyToolCallPattern(message) {
        if (message.includes('● Bash(')) return 'BULLET_BASH_FORMAT';
        if (message.includes('Tool call')) return 'TOOL_CALL_TEXT';
        if (message.includes('[TOOL CALL]')) return 'BRACKETED_FORMAT';
        if (message.includes('executing') || message.includes('running')) return 'EXECUTION_TEXT';
        return 'UNKNOWN_PATTERN';
    }

    detectCommandResult(message) {
        // Look for typical command output patterns
        const resultPatterns = [
            /total \d+/,  // ls -la output
            /drwx/,       // directory permissions
            /workspaces/,  // pwd output
            /codespace/,   // whoami output
            /Testing tool call visualization/, // echo output
            /Test complete/  // final echo
        ];
        
        return resultPatterns.some(pattern => pattern.test(message));
    }

    async testClaudeProcessSpawning() {
        console.log('\n🤖 CLAUDE PROCESS SPAWNING TEST');
        console.log('-' .repeat(40));

        return new Promise((resolve) => {
            // Try to spawn a simple Claude Code process for testing
            const claude = spawn('npx', ['claude', '--version'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 10000
            });

            let output = '';
            
            claude.stdout.on('data', (data) => {
                output += data.toString();
                console.log(`[CLAUDE STDOUT] ${data.toString().trim()}`);
            });

            claude.stderr.on('data', (data) => {
                output += data.toString();
                console.log(`[CLAUDE STDERR] ${data.toString().trim()}`);
            });

            claude.on('close', (code) => {
                console.log(`Claude process exited with code: ${code}`);
                
                const success = code === 0 || output.includes('claude') || output.includes('version');
                if (success) {
                    console.log('✅ Claude Code CLI is available');
                } else {
                    console.log('⚠️  Claude Code CLI may not be properly installed');
                }
                
                resolve(success);
            });

            claude.on('error', (error) => {
                console.log(`⚠️  Claude process error: ${error.message}`);
                resolve(false);
            });

            // Timeout the process
            setTimeout(() => {
                claude.kill();
                resolve(false);
            }, 10000);
        });
    }

    generateDirectTestReport() {
        console.log('\n📊 DIRECT TOOL CALL TEST REPORT');
        console.log('=' .repeat(50));
        
        console.log(`📨 Total Messages Received: ${this.messages.length}`);
        console.log(`🎯 Tool Calls Detected: ${this.toolCallsDetected.length}`);
        console.log(`✅ Command Results Detected: ${this.commandResults.length}`);
        
        if (this.toolCallsDetected.length > 0) {
            console.log('\n🎯 TOOL CALL DETAILS:');
            this.toolCallsDetected.forEach((tc, index) => {
                console.log(`   ${index + 1}. Pattern: ${tc.pattern}`);
                console.log(`      Message: ${tc.message.substring(0, 100)}${tc.message.length > 100 ? '...' : ''}`);
            });
        }
        
        if (this.commandResults.length > 0) {
            console.log('\n✅ COMMAND RESULT SAMPLES:');
            this.commandResults.slice(0, 3).forEach((cr, index) => {
                console.log(`   ${index + 1}. ${cr.result.substring(0, 80)}${cr.result.length > 80 ? '...' : ''}`);
            });
        }
        
        // Analysis
        const hasToolCalls = this.toolCallsDetected.length > 0;
        const hasCommandResults = this.commandResults.length > 0;
        const hasMessages = this.messages.length > 0;
        const hasCommunication = hasMessages && (hasToolCalls || hasCommandResults);
        
        console.log('\n📈 ASSESSMENT:');
        console.log(`   WebSocket Communication: ${hasMessages ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`   Tool Call Detection: ${hasToolCalls ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`   Command Execution: ${hasCommandResults ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`   Overall System: ${hasCommunication ? '✅ FUNCTIONING' : '❌ NEEDS WORK'}`);
        
        const score = [hasMessages, hasToolCalls, hasCommandResults, hasCommunication].filter(Boolean).length;
        const percentage = (score / 4) * 100;
        
        console.log('\n🎯 FINAL ASSESSMENT:');
        console.log(`   Score: ${score}/4 (${percentage}%)`);
        
        if (percentage >= 75) {
            console.log('   🏆 EXCELLENT - Tool call system is working');
        } else if (percentage >= 50) {
            console.log('   ✅ GOOD - Tool call system partially working');
        } else {
            console.log('   ❌ NEEDS WORK - Tool call system has issues');
        }
        
        return {
            score,
            percentage,
            hasToolCalls,
            hasCommandResults,
            hasCommunication,
            verdict: percentage >= 50 ? 'WORKING' : 'NEEDS_WORK'
        };
    }

    async cleanup() {
        if (this.ws) {
            this.ws.close();
        }
    }

    async runDirectValidation() {
        console.log('🎯 DIRECT TOOL CALL VALIDATION STARTING');
        console.log('=' .repeat(60));
        
        try {
            // Test backend API
            await this.validateBackendAPI();
            
            // Test Claude process availability
            await this.testClaudeProcessSpawning();
            
            // Test direct WebSocket communication
            await this.testDirectWebSocketToolCalls();
            
            // Generate report
            return this.generateDirectTestReport();
            
        } catch (error) {
            console.error('❌ Direct validation failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Execute if run directly
if (require.main === module) {
    (async () => {
        const validator = new DirectToolCallValidator();
        
        try {
            const result = await validator.runDirectValidation();
            process.exit(result.verdict === 'WORKING' ? 0 : 1);
        } catch (error) {
            console.error('Direct validation failed:', error);
            process.exit(1);
        }
    })();
}

module.exports = DirectToolCallValidator;