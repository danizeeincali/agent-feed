#!/usr/bin/env node

/**
 * SPARC:debug - Claude CLI Interactive Mode Investigation
 * Testing why Claude CLI works with --help but not in interactive mode
 */

const { spawn } = require('child_process');
const fs = require('fs');

// Test interactive Claude CLI with authentication
async function testInteractiveClaude() {
    console.log('🔍 === SPARC:debug Interactive Claude CLI Test ===');
    
    // First, test if we can authenticate
    console.log('1. Testing authentication with --dangerously-skip-permissions');
    
    return new Promise((resolve) => {
        const child = spawn('/home/codespace/nvm/current/bin/claude', ['--dangerously-skip-permissions'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: '/workspaces/agent-feed',
            env: { ...process.env }
        });

        console.log(`Spawned Claude process PID: ${child.pid}`);
        
        let stdoutData = '';
        let stderrData = '';
        let hasOutput = false;
        
        child.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdoutData += chunk;
            hasOutput = true;
            console.log(`📤 Claude stdout (${chunk.length} bytes):`, chunk.substring(0, 200));
        });

        child.stderr.on('data', (data) => {
            const chunk = data.toString();
            stderrData += chunk;
            console.log(`📤 Claude stderr (${chunk.length} bytes):`, chunk.substring(0, 200));
        });

        // Send a test message after a delay
        setTimeout(() => {
            if (!child.killed && child.stdin && !child.stdin.destroyed) {
                console.log('⌨️ Sending test message: "Hello Claude"');
                child.stdin.write('Hello Claude\n');
            }
        }, 2000);

        // Wait for response
        setTimeout(() => {
            if (!child.killed && child.stdin && !child.stdin.destroyed) {
                console.log('⌨️ Sending exit signal');
                child.stdin.end();
            }
        }, 5000);

        child.on('exit', (code, signal) => {
            console.log(`🏁 Claude process exited: code ${code}, signal ${signal}`);
            console.log(`Has output: ${hasOutput}`);
            console.log(`Stdout length: ${stdoutData.length}`);
            console.log(`Stderr length: ${stderrData.length}`);
            
            if (stdoutData.length > 0) {
                console.log('Stdout content:', stdoutData);
            }
            if (stderrData.length > 0) {
                console.log('Stderr content:', stderrData);
            }
            
            resolve({ hasOutput, stdoutData, stderrData, code });
        });

        child.on('error', (error) => {
            console.error(`❌ Claude process error: ${error.message}`);
            resolve({ hasOutput: false, error: error.message });
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            if (!child.killed) {
                console.log('⏰ Timeout reached, killing process');
                child.kill('SIGKILL');
            }
        }, 10000);
    });
}

// Test with interactive mode (no --print flag)
async function testInteractiveMode() {
    console.log('🔍 === Testing Claude in interactive mode ===');
    
    return new Promise((resolve) => {
        const child = spawn('/home/codespace/nvm/current/bin/claude', [
            '--dangerously-skip-permissions'
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: '/workspaces/agent-feed',
            env: { ...process.env }
        });

        console.log(`Spawned Claude print mode PID: ${child.pid}`);
        
        let stdoutData = '';
        let stderrData = '';
        
        child.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdoutData += chunk;
            console.log(`📤 Print mode stdout (${chunk.length} bytes):`, chunk.substring(0, 200));
        });

        child.stderr.on('data', (data) => {
            const chunk = data.toString();
            stderrData += chunk;
            console.log(`📤 Print mode stderr (${chunk.length} bytes):`, chunk.substring(0, 200));
        });

        child.on('exit', (code, signal) => {
            console.log(`🏁 Print mode exited: code ${code}, signal ${signal}`);
            console.log(`Stdout length: ${stdoutData.length}`);
            console.log(`Stderr length: ${stderrData.length}`);
            
            resolve({ 
                success: code === 0 && stdoutData.length > 0,
                stdoutData, 
                stderrData, 
                code 
            });
        });

        child.on('error', (error) => {
            console.error(`❌ Print mode error: ${error.message}`);
            resolve({ success: false, error: error.message });
        });

        // Timeout after 15 seconds
        setTimeout(() => {
            if (!child.killed) {
                console.log('⏰ Print mode timeout, killing process');
                child.kill('SIGKILL');
            }
        }, 15000);
    });
}

// Test authentication requirement
async function testAuthRequirement() {
    console.log('🔍 === Testing authentication requirement ===');
    
    // Test without skip permissions
    return new Promise((resolve) => {
        const child = spawn('/home/codespace/nvm/current/bin/claude', [], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: '/workspaces/agent-feed',
            env: { ...process.env }
        });

        console.log(`Spawned Claude (no skip permissions) PID: ${child.pid}`);
        
        let stdoutData = '';
        let stderrData = '';
        
        child.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdoutData += chunk;
            console.log(`📤 Auth test stdout (${chunk.length} bytes):`, chunk.substring(0, 200));
        });

        child.stderr.on('data', (data) => {
            const chunk = data.toString();
            stderrData += chunk;
            console.log(`📤 Auth test stderr (${chunk.length} bytes):`, chunk.substring(0, 200));
        });

        // Send message after delay
        setTimeout(() => {
            if (!child.killed && child.stdin && !child.stdin.destroyed) {
                console.log('⌨️ Sending test message without auth');
                child.stdin.write('Hello\n');
            }
        }, 3000);

        child.on('exit', (code, signal) => {
            console.log(`🏁 Auth test exited: code ${code}, signal ${signal}`);
            
            const needsAuth = stderrData.includes('authentication') || 
                             stderrData.includes('login') || 
                             stderrData.includes('API key') ||
                             code !== 0;
            
            resolve({ 
                needsAuth,
                stdoutData, 
                stderrData, 
                code 
            });
        });

        child.on('error', (error) => {
            console.error(`❌ Auth test error: ${error.message}`);
            resolve({ needsAuth: true, error: error.message });
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            if (!child.killed) {
                console.log('⏰ Auth test timeout, killing process');
                child.kill('SIGKILL');
                resolve({ needsAuth: true, timeout: true });
            }
        }, 10000);
    });
}

// Main test execution
async function runInteractiveTests() {
    console.log('🚀 Starting SPARC:debug Interactive Claude Tests');
    
    try {
        // Test 1: Interactive mode
        console.log('\n=== Test 1: Interactive Mode ===');
        const interactiveResult = await testInteractiveClaude();
        
        // Test 2: Print mode
        console.log('\n=== Test 2: Print Mode ===');
        const printModeResult = await testInteractiveMode();
        
        // Test 3: Authentication requirement
        console.log('\n=== Test 3: Authentication Requirement ===');
        const authResult = await testAuthRequirement();
        
        // Summary
        console.log('\n=== SPARC:debug Test Results Summary ===');
        console.log(`Interactive mode has output: ${interactiveResult.hasOutput || false}`);
        console.log(`Print mode works: ${printResult.success || false}`);
        console.log(`Requires authentication: ${authResult.needsAuth || false}`);
        
        // Generate conclusions
        const conclusions = [];
        
        if (!interactiveResult.hasOutput && !printResult.success) {
            conclusions.push('❌ CRITICAL: Claude CLI not producing any output in any mode');
        }
        
        if (printResult.success && !interactiveResult.hasOutput) {
            conclusions.push('✅ Claude CLI works in interactive mode');
            conclusions.push('🔍 Interactive mode may require different handling');
        }
        
        if (authResult.needsAuth) {
            conclusions.push('🔑 Claude CLI requires authentication or --dangerously-skip-permissions');
        }
        
        if (interactiveResult.stderrData && interactiveResult.stderrData.length > 0) {
            conclusions.push(`⚠️ Interactive stderr: ${interactiveResult.stderrData.substring(0, 200)}`);
        }
        
        conclusions.forEach(c => console.log(c));
        
        // Save detailed results
        const results = {
            interactive: interactiveResult,
            print: printResult,
            auth: authResult,
            conclusions,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync('/workspaces/agent-feed/debug/interactive-test-results.json', JSON.stringify(results, null, 2));
        console.log('📄 Results saved to /workspaces/agent-feed/debug/interactive-test-results.json');
        
        return results;
        
    } catch (error) {
        console.error('💥 Interactive tests failed:', error);
        throw error;
    }
}

// Execute if run directly
if (require.main === module) {
    runInteractiveTests()
        .then(() => {
            console.log('🎉 Interactive tests completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Tests failed:', error);
            process.exit(1);
        });
}

module.exports = { runInteractiveTests };