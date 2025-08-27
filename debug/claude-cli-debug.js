#!/usr/bin/env node

/**
 * SPARC:debug - Claude CLI Silent Output Investigation
 * Systematic testing of Claude CLI behavior in different environments
 */

const { spawn, exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Debug test suite configuration
const CLAUDE_BINARY = '/home/codespace/nvm/current/bin/claude';
const DEBUG_DIR = '/workspaces/agent-feed/debug';
const TEST_TIMEOUT = 10000; // 10 seconds

// Ensure debug directory exists
if (!fs.existsSync(DEBUG_DIR)) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

class ClaudeDebugSuite {
    constructor() {
        this.results = {
            environment: {},
            tests: [],
            summary: {}
        };
        this.startTime = Date.now();
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '🔍';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async runEnvironmentChecks() {
        this.log('=== SPARC:debug Environment Analysis ===', 'info');
        
        try {
            // Check Claude binary existence and permissions
            const stats = fs.statSync(CLAUDE_BINARY);
            this.results.environment.binary = {
                path: CLAUDE_BINARY,
                exists: true,
                size: stats.size,
                mode: stats.mode.toString(8),
                executable: (stats.mode & parseInt('111', 8)) !== 0
            };
            this.log(`Claude binary: ${CLAUDE_BINARY} (${stats.size} bytes, mode: ${stats.mode.toString(8)})`);
        } catch (error) {
            this.results.environment.binary = { exists: false, error: error.message };
            this.log(`Claude binary check failed: ${error.message}`, 'error');
        }

        // Check environment variables
        this.results.environment.env = {
            ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
            HOME: process.env.HOME,
            PATH: process.env.PATH?.includes('claude'),
            NODE_ENV: process.env.NODE_ENV
        };
        
        this.log(`API Key present: ${this.results.environment.env.ANTHROPIC_API_KEY}`);
        this.log(`PATH contains claude: ${this.results.environment.env.PATH}`);

        // Check working directory
        this.results.environment.cwd = {
            current: process.cwd(),
            writable: true
        };
        
        try {
            fs.accessSync(process.cwd(), fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
            this.results.environment.cwd.writable = false;
            this.results.environment.cwd.error = error.message;
        }

        this.log(`Working directory: ${process.cwd()} (writable: ${this.results.environment.cwd.writable})`);
    }

    async testDirectExecution() {
        this.log('=== Test 1: Direct execSync Execution ===');
        
        const test = {
            name: 'Direct execSync',
            command: `${CLAUDE_BINARY} --help`,
            success: false,
            output: '',
            error: '',
            duration: 0
        };

        const startTime = Date.now();
        
        try {
            const output = execSync(`${CLAUDE_BINARY} --help`, {
                encoding: 'utf8',
                timeout: TEST_TIMEOUT,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            test.success = true;
            test.output = output;
            test.duration = Date.now() - startTime;
            
            this.log(`✅ Direct execution succeeded (${test.duration}ms)`);
            this.log(`Output length: ${output.length} chars`);
            this.log(`First 100 chars: ${output.substring(0, 100)}`);
            
        } catch (error) {
            test.success = false;
            test.error = error.message;
            test.duration = Date.now() - startTime;
            
            this.log(`❌ Direct execution failed: ${error.message}`, 'error');
            if (error.stdout) this.log(`Stdout: ${error.stdout.substring(0, 100)}`);
            if (error.stderr) this.log(`Stderr: ${error.stderr.substring(0, 100)}`);
        }

        this.results.tests.push(test);
        return test;
    }

    async testSpawnWithPipes() {
        this.log('=== Test 2: spawn() with stdio pipes ===');
        
        return new Promise((resolve) => {
            const test = {
                name: 'spawn with pipes',
                command: `${CLAUDE_BINARY} --help`,
                success: false,
                output: '',
                error: '',
                duration: 0,
                events: []
            };

            const startTime = Date.now();
            
            const child = spawn(CLAUDE_BINARY, ['--help'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: process.cwd(),
                env: { ...process.env }
            });

            test.events.push(`spawn: PID ${child.pid}`);
            this.log(`Spawned process PID: ${child.pid}`);

            let stdoutData = '';
            let stderrData = '';

            // Stdout handler
            if (child.stdout) {
                child.stdout.on('data', (data) => {
                    const chunk = data.toString();
                    stdoutData += chunk;
                    test.events.push(`stdout: ${chunk.length} bytes`);
                    this.log(`📤 Stdout received: ${chunk.length} bytes`);
                });

                child.stdout.on('end', () => {
                    test.events.push('stdout: end');
                    this.log('📤 Stdout ended');
                });

                child.stdout.on('error', (error) => {
                    test.events.push(`stdout error: ${error.message}`);
                    this.log(`❌ Stdout error: ${error.message}`, 'error');
                });
            } else {
                test.events.push('stdout: NULL');
                this.log('❌ Stdout is null', 'error');
            }

            // Stderr handler
            if (child.stderr) {
                child.stderr.on('data', (data) => {
                    const chunk = data.toString();
                    stderrData += chunk;
                    test.events.push(`stderr: ${chunk.length} bytes`);
                    this.log(`📤 Stderr received: ${chunk.length} bytes`);
                });

                child.stderr.on('end', () => {
                    test.events.push('stderr: end');
                    this.log('📤 Stderr ended');
                });

                child.stderr.on('error', (error) => {
                    test.events.push(`stderr error: ${error.message}`);
                    this.log(`❌ Stderr error: ${error.message}`, 'error');
                });
            } else {
                test.events.push('stderr: NULL');
                this.log('❌ Stderr is null', 'error');
            }

            // Process events
            child.on('spawn', () => {
                test.events.push('process: spawn event');
                this.log('✅ Process spawned successfully');
            });

            child.on('exit', (code, signal) => {
                test.duration = Date.now() - startTime;
                test.events.push(`process: exit ${code} ${signal}`);
                this.log(`🏁 Process exited: code ${code}, signal ${signal}`);
                
                test.success = code === 0;
                test.output = stdoutData;
                test.error = stderrData;
                
                this.log(`✅ Spawn test completed (${test.duration}ms)`);
                this.log(`Stdout length: ${stdoutData.length}`);
                this.log(`Stderr length: ${stderrData.length}`);
                
                this.results.tests.push(test);
                resolve(test);
            });

            child.on('error', (error) => {
                test.duration = Date.now() - startTime;
                test.events.push(`process error: ${error.message}`);
                test.success = false;
                test.error = error.message;
                
                this.log(`❌ Process error: ${error.message}`, 'error');
                
                this.results.tests.push(test);
                resolve(test);
            });

            // Timeout protection
            setTimeout(() => {
                if (!test.success && test.duration === 0) {
                    test.duration = Date.now() - startTime;
                    test.events.push('timeout: force kill');
                    this.log('⏰ Test timeout - killing process');
                    child.kill('SIGKILL');
                    
                    this.results.tests.push(test);
                    resolve(test);
                }
            }, TEST_TIMEOUT);
        });
    }

    async testSpawnWithInherit() {
        this.log('=== Test 3: spawn() with stdio inherit ===');
        
        return new Promise((resolve) => {
            const test = {
                name: 'spawn with inherit',
                command: `${CLAUDE_BINARY} --help`,
                success: false,
                output: 'captured via console',
                error: '',
                duration: 0,
                events: []
            };

            const startTime = Date.now();
            
            const child = spawn(CLAUDE_BINARY, ['--help'], {
                stdio: 'inherit',
                cwd: process.cwd(),
                env: { ...process.env }
            });

            test.events.push(`spawn: PID ${child.pid}`);
            this.log(`Spawned process PID: ${child.pid}`);

            child.on('spawn', () => {
                test.events.push('process: spawn event');
                this.log('✅ Process spawned successfully');
            });

            child.on('exit', (code, signal) => {
                test.duration = Date.now() - startTime;
                test.events.push(`process: exit ${code} ${signal}`);
                test.success = code === 0;
                
                this.log(`🏁 Process exited: code ${code}, signal ${signal}`);
                this.log(`✅ Inherit test completed (${test.duration}ms)`);
                
                this.results.tests.push(test);
                resolve(test);
            });

            child.on('error', (error) => {
                test.duration = Date.now() - startTime;
                test.events.push(`process error: ${error.message}`);
                test.success = false;
                test.error = error.message;
                
                this.log(`❌ Process error: ${error.message}`, 'error');
                
                this.results.tests.push(test);
                resolve(test);
            });

            // Timeout protection
            setTimeout(() => {
                if (!test.success && test.duration === 0) {
                    test.duration = Date.now() - startTime;
                    test.events.push('timeout: force kill');
                    this.log('⏰ Test timeout - killing process');
                    child.kill('SIGKILL');
                    
                    this.results.tests.push(test);
                    resolve(test);
                }
            }, TEST_TIMEOUT);
        });
    }

    async testInteractiveMode() {
        this.log('=== Test 4: Interactive spawn with stdin ===');
        
        return new Promise((resolve) => {
            const test = {
                name: 'interactive spawn',
                command: `${CLAUDE_BINARY}`,
                success: false,
                output: '',
                error: '',
                duration: 0,
                events: [],
                interaction: true
            };

            const startTime = Date.now();
            
            const child = spawn(CLAUDE_BINARY, [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: process.cwd(),
                env: { ...process.env }
            });

            test.events.push(`spawn: PID ${child.pid}`);
            this.log(`Spawned interactive process PID: ${child.pid}`);

            let stdoutData = '';
            let stderrData = '';
            let outputReceived = false;

            // Stdout handler
            if (child.stdout) {
                child.stdout.on('data', (data) => {
                    const chunk = data.toString();
                    stdoutData += chunk;
                    outputReceived = true;
                    test.events.push(`stdout: ${chunk.length} bytes`);
                    this.log(`📤 Interactive stdout: ${chunk.length} bytes`);
                    this.log(`Content: ${chunk.substring(0, 100)}`);
                });
            }

            // Stderr handler
            if (child.stderr) {
                child.stderr.on('data', (data) => {
                    const chunk = data.toString();
                    stderrData += chunk;
                    test.events.push(`stderr: ${chunk.length} bytes`);
                    this.log(`📤 Interactive stderr: ${chunk.length} bytes`);
                });
            }

            // Wait a moment, then send a simple command
            setTimeout(() => {
                if (child.stdin && !child.stdin.destroyed) {
                    this.log('⌨️ Sending test input: "hello\\n"');
                    child.stdin.write('hello\n');
                    test.events.push('stdin: hello');
                }
            }, 1000);

            // Give more time for interactive response
            setTimeout(() => {
                if (child.stdin && !child.stdin.destroyed) {
                    this.log('⌨️ Sending exit command');
                    child.stdin.end();
                    test.events.push('stdin: end');
                }
            }, 3000);

            child.on('exit', (code, signal) => {
                test.duration = Date.now() - startTime;
                test.events.push(`process: exit ${code} ${signal}`);
                test.success = outputReceived || code === 0;
                test.output = stdoutData;
                test.error = stderrData;
                
                this.log(`🏁 Interactive process exited: code ${code}, signal ${signal}`);
                this.log(`Output received: ${outputReceived}`);
                this.log(`Stdout length: ${stdoutData.length}`);
                this.log(`Stderr length: ${stderrData.length}`);
                
                this.results.tests.push(test);
                resolve(test);
            });

            child.on('error', (error) => {
                test.duration = Date.now() - startTime;
                test.events.push(`process error: ${error.message}`);
                test.success = false;
                test.error = error.message;
                
                this.log(`❌ Interactive process error: ${error.message}`, 'error');
                
                this.results.tests.push(test);
                resolve(test);
            });

            // Longer timeout for interactive test
            setTimeout(() => {
                if (test.duration === 0) {
                    test.duration = Date.now() - startTime;
                    test.events.push('timeout: force kill');
                    this.log('⏰ Interactive test timeout - killing process');
                    child.kill('SIGKILL');
                    
                    this.results.tests.push(test);
                    resolve(test);
                }
            }, TEST_TIMEOUT * 1.5);
        });
    }

    async testTTYRequirement() {
        this.log('=== Test 5: TTY/PTY requirement check ===');
        
        const test = {
            name: 'TTY check',
            command: 'tty detection',
            success: false,
            output: '',
            error: '',
            duration: 0,
            ttyInfo: {}
        };

        const startTime = Date.now();

        try {
            // Check if stdout/stderr are TTY
            test.ttyInfo = {
                stdout_isTTY: process.stdout.isTTY,
                stderr_isTTY: process.stderr.isTTY,
                stdin_isTTY: process.stdin.isTTY
            };

            this.log(`TTY Info - stdout: ${test.ttyInfo.stdout_isTTY}, stderr: ${test.ttyInfo.stderr_isTTY}, stdin: ${test.ttyInfo.stdin_isTTY}`);

            // Test with different TTY settings
            const envNoTTY = { ...process.env, TERM: undefined };
            const envWithTTY = { ...process.env, TERM: 'xterm-256color' };

            test.success = true;
            test.duration = Date.now() - startTime;
            test.output = JSON.stringify(test.ttyInfo);

        } catch (error) {
            test.error = error.message;
            test.duration = Date.now() - startTime;
            this.log(`❌ TTY check error: ${error.message}`, 'error');
        }

        this.results.tests.push(test);
        return test;
    }

    generateReport() {
        this.log('=== SPARC:debug Analysis Summary ===');
        
        const totalDuration = Date.now() - this.startTime;
        const passedTests = this.results.tests.filter(t => t.success).length;
        const totalTests = this.results.tests.length;

        this.results.summary = {
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            totalDuration,
            conclusions: [],
            recommendations: []
        };

        // Analyze patterns
        const hasStdoutOutput = this.results.tests.some(t => t.output && t.output.length > 0);
        const allTestsFailed = this.results.tests.every(t => !t.success);
        const spawnSucceeded = this.results.tests.some(t => t.events && t.events.includes('process: spawn event'));

        if (!hasStdoutOutput) {
            this.results.summary.conclusions.push('❌ CRITICAL: Claude CLI produces no stdout output in any test scenario');
        }

        if (allTestsFailed) {
            this.results.summary.conclusions.push('❌ ALL TESTS FAILED: Claude CLI not functioning properly');
        } else if (spawnSucceeded) {
            this.results.summary.conclusions.push('✅ Process spawning works - issue is with output generation');
        }

        // Generate recommendations
        if (!this.results.environment.env.ANTHROPIC_API_KEY) {
            this.results.summary.recommendations.push('🔑 Set ANTHROPIC_API_KEY environment variable');
        }

        if (!hasStdoutOutput && spawnSucceeded) {
            this.results.summary.recommendations.push('🔍 Claude CLI may require TTY/PTY for output');
            this.results.summary.recommendations.push('🔍 Check if Claude CLI requires interactive mode');
            this.results.summary.recommendations.push('🔍 Test with node-pty instead of spawn()');
        }

        this.log(`Test Results: ${passedTests}/${totalTests} passed (${totalDuration}ms total)`);
        
        this.results.summary.conclusions.forEach(c => this.log(c));
        this.results.summary.recommendations.forEach(r => this.log(r));

        return this.results;
    }

    async saveReport() {
        const reportPath = path.join(DEBUG_DIR, 'claude-cli-debug-report.json');
        const report = JSON.stringify(this.results, null, 2);
        
        fs.writeFileSync(reportPath, report);
        this.log(`📄 Debug report saved: ${reportPath}`);
        
        return reportPath;
    }
}

// Main execution
async function runDebugSuite() {
    const suite = new ClaudeDebugSuite();
    
    try {
        await suite.runEnvironmentChecks();
        await suite.testDirectExecution();
        await suite.testSpawnWithPipes();
        await suite.testSpawnWithInherit();
        await suite.testInteractiveMode();
        await suite.testTTYRequirement();
        
        const results = suite.generateReport();
        await suite.saveReport();
        
        return results;
    } catch (error) {
        suite.log(`❌ Debug suite failed: ${error.message}`, 'error');
        throw error;
    }
}

// Execute if run directly
if (require.main === module) {
    runDebugSuite()
        .then(() => {
            console.log('🎉 SPARC:debug suite completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 SPARC:debug suite failed:', error);
            process.exit(1);
        });
}

module.exports = { ClaudeDebugSuite, runDebugSuite };