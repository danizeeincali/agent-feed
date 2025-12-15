#!/usr/bin/env node

/**
 * SPARC:debug - Claude CLI Authentication Resolution Test
 * Final test to resolve authentication requirements for interactive Claude CLI
 */

const { spawn } = require('child_process');
const fs = require('fs');

// Test with explicit API key setup (without actually setting one)
async function testClaudeAuthMethods() {
    console.log('🔍 === SPARC:debug Claude Authentication Methods ===');
    
    const tests = [];
    
    // Test 1: Check if Claude works with --help in current environment
    console.log('Test 1: Claude --help (baseline)');
    const helpResult = await runClaudeCommand(['--help'], 'help test');
    tests.push({ name: 'help', ...helpResult });
    
    // Test 2: Try with --dangerously-skip-permissions in interactive mode
    console.log('Test 2: Skip permissions + interactive mode');
    const interactiveResult = await runClaudeInteractive([
        '--dangerously-skip-permissions'
    ], 'What is 2+2?', 15000);
    tests.push({ name: 'skip-permissions-interactive', ...interactiveResult });
    
    // Test 3: Try interactive with skip permissions
    console.log('Test 3: Skip permissions + interactive');
    const interactiveResult = await runClaudeInteractive([
        '--dangerously-skip-permissions'
    ], 'What is 2+2?', 15000);
    tests.push({ name: 'skip-permissions-interactive', ...interactiveResult });
    
    // Test 4: Try with different permission modes in interactive
    console.log('Test 4: Permission mode bypass interactive');
    const bypassResult = await runClaudeInteractive([
        '--permission-mode', 'bypassPermissions'
    ], 'Hello', 15000);
    tests.push({ name: 'permission-bypass-interactive', ...bypassResult });
    
    return tests;
}

async function runClaudeCommand(args, testName, timeout = 10000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const child = spawn('/home/codespace/nvm/current/bin/claude', args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: '/workspaces/agent-feed',
            env: { ...process.env }
        });

        console.log(`  Spawned ${testName} PID: ${child.pid}`);
        
        let stdoutData = '';
        let stderrData = '';
        let hasOutput = false;
        
        child.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdoutData += chunk;
            hasOutput = true;
            console.log(`  📤 ${testName} stdout: ${chunk.substring(0, 100)}...`);
        });

        child.stderr.on('data', (data) => {
            const chunk = data.toString();
            stderrData += chunk;
            console.log(`  📤 ${testName} stderr: ${chunk.substring(0, 100)}...`);
        });

        child.on('exit', (code, signal) => {
            const duration = Date.now() - startTime;
            console.log(`  🏁 ${testName} exited: code ${code}, signal ${signal} (${duration}ms)`);
            
            resolve({
                success: code === 0 && hasOutput,
                code,
                signal,
                duration,
                stdoutLength: stdoutData.length,
                stderrLength: stderrData.length,
                stdout: stdoutData,
                stderr: stderrData,
                hasOutput
            });
        });

        child.on('error', (error) => {
            const duration = Date.now() - startTime;
            console.log(`  ❌ ${testName} error: ${error.message}`);
            resolve({
                success: false,
                error: error.message,
                duration
            });
        });

        // Timeout handling
        setTimeout(() => {
            if (!child.killed) {
                console.log(`  ⏰ ${testName} timeout, killing process`);
                child.kill('SIGKILL');
            }
        }, timeout);
    });
}

async function runClaudeInteractive(args, input, timeout = 15000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const child = spawn('/home/codespace/nvm/current/bin/claude', args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: '/workspaces/agent-feed',
            env: { ...process.env }
        });

        console.log(`  Spawned interactive PID: ${child.pid}`);
        
        let stdoutData = '';
        let stderrData = '';
        let hasOutput = false;
        let sentInput = false;
        
        child.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdoutData += chunk;
            hasOutput = true;
            console.log(`  📤 Interactive stdout: ${chunk.substring(0, 100)}...`);
            
            // If we see a prompt and haven't sent input yet, send it
            if ((chunk.includes('>') || chunk.includes('Claude:') || chunk.includes('$')) && !sentInput) {
                setTimeout(() => {
                    if (!child.killed && child.stdin && !child.stdin.destroyed) {
                        console.log(`  ⌨️ Sending input: ${input}`);
                        child.stdin.write(input + '\n');
                        sentInput = true;
                        
                        // Close after sending input
                        setTimeout(() => {
                            if (!child.killed && child.stdin && !child.stdin.destroyed) {
                                child.stdin.end();
                            }
                        }, 2000);
                    }
                }, 500);
            }
        });

        child.stderr.on('data', (data) => {
            const chunk = data.toString();
            stderrData += chunk;
            console.log(`  📤 Interactive stderr: ${chunk.substring(0, 100)}...`);
        });

        // Send input after initial delay if no prompt detected
        setTimeout(() => {
            if (!sentInput && !child.killed && child.stdin && !child.stdin.destroyed) {
                console.log(`  ⌨️ Sending input (delayed): ${input}`);
                child.stdin.write(input + '\n');
                sentInput = true;
            }
        }, 3000);

        child.on('exit', (code, signal) => {
            const duration = Date.now() - startTime;
            console.log(`  🏁 Interactive exited: code ${code}, signal ${signal} (${duration}ms)`);
            
            resolve({
                success: hasOutput && (code === 0 || code === null),
                code,
                signal,
                duration,
                stdoutLength: stdoutData.length,
                stderrLength: stderrData.length,
                stdout: stdoutData,
                stderr: stderrData,
                hasOutput,
                sentInput
            });
        });

        child.on('error', (error) => {
            const duration = Date.now() - startTime;
            console.log(`  ❌ Interactive error: ${error.message}`);
            resolve({
                success: false,
                error: error.message,
                duration
            });
        });

        // Timeout handling
        setTimeout(() => {
            if (!child.killed) {
                console.log(`  ⏰ Interactive timeout, killing process`);
                child.kill('SIGKILL');
            }
        }, timeout);
    });
}

// Main execution
async function runAuthTests() {
    console.log('🚀 Starting SPARC:debug Authentication Resolution Tests');
    
    try {
        const results = await testClaudeAuthMethods();
        
        console.log('\n=== SPARC:debug Authentication Test Results ===');
        
        results.forEach(result => {
            console.log(`\n${result.name}:`);
            console.log(`  Success: ${result.success}`);
            console.log(`  Has Output: ${result.hasOutput || false}`);
            console.log(`  Exit Code: ${result.code}`);
            console.log(`  Duration: ${result.duration}ms`);
            console.log(`  Stdout Length: ${result.stdoutLength || 0}`);
            console.log(`  Stderr Length: ${result.stderrLength || 0}`);
            
            if (result.stderr && result.stderr.length > 0) {
                console.log(`  Stderr Sample: ${result.stderr.substring(0, 200)}`);
            }
        });
        
        // Generate final conclusions
        console.log('\n=== SPARC:debug Final Analysis ===');
        
        const workingTests = results.filter(r => r.success);
        const outputTests = results.filter(r => r.hasOutput);
        
        if (workingTests.length === 0) {
            console.log('❌ CRITICAL: No Claude CLI configuration works');
            console.log('🔑 SOLUTION: Authentication setup required');
        } else {
            console.log(`✅ Found ${workingTests.length} working configuration(s):`);
            workingTests.forEach(t => console.log(`   - ${t.name}`));
        }
        
        if (outputTests.length === 0) {
            console.log('❌ CRITICAL: Claude CLI produces no output in any configuration');
            console.log('🔍 Root cause: Authentication or initialization issue');
        }
        
        // Generate recommendations
        const recommendations = [];
        
        if (results.find(r => r.name === 'help' && r.success)) {
            recommendations.push('✅ Claude CLI binary is functional');
        }
        
        if (results.find(r => r.name === 'skip-permissions-print' && !r.success)) {
            recommendations.push('🔑 Even --dangerously-skip-permissions requires authentication setup');
        }
        
        if (!outputTests.length) {
            recommendations.push('🔧 SOLUTION: Use claude setup-token or configure authentication');
            recommendations.push('🔧 ALTERNATIVE: Test with actual API key in environment');
        }
        
        recommendations.forEach(r => console.log(r));
        
        // Save results
        const finalResults = {
            tests: results,
            summary: {
                totalTests: results.length,
                successfulTests: workingTests.length,
                testsWithOutput: outputTests.length,
                conclusions: workingTests.length === 0 ? 'Authentication required' : 'Partial functionality',
                recommendations
            },
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync('/workspaces/agent-feed/debug/claude-auth-test-results.json', JSON.stringify(finalResults, null, 2));
        console.log('\n📄 Final results saved to /workspaces/agent-feed/debug/claude-auth-test-results.json');
        
        return finalResults;
        
    } catch (error) {
        console.error('💥 Authentication tests failed:', error);
        throw error;
    }
}

// Execute if run directly
if (require.main === module) {
    runAuthTests()
        .then(() => {
            console.log('\n🎉 SPARC:debug authentication tests completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Tests failed:', error);
            process.exit(1);
        });
}

module.exports = { runAuthTests };