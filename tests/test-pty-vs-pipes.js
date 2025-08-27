/**
 * Test script to compare PTY vs Regular Pipes with Claude process
 * This helps verify that PTY provides better terminal emulation
 */

const { spawn } = require('child_process');
const pty = require('node-pty');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCreateInstance(usePty, testName) {
    console.log(`\n🧪 ${testName} Test Starting...`);
    
    try {
        // Create instance
        const createResponse = await axios.post(`${BASE_URL}/api/claude/instances`, {
            command: ['claude', '--dangerously-skip-permissions'],
            instanceType: 'skip-permissions',
            usePty: usePty
        });
        
        if (!createResponse.data.success) {
            throw new Error(`Failed to create instance: ${createResponse.data.error}`);
        }
        
        const instance = createResponse.data.instance;
        console.log(`✅ ${testName}: Instance created`);
        console.log(`   ID: ${instance.id}`);
        console.log(`   Process Type: ${instance.processType}`);
        console.log(`   PTY Enabled: ${instance.usePty}`);
        console.log(`   PID: ${instance.pid}`);
        
        // Wait for instance to be ready
        console.log(`⏳ Waiting for ${testName} instance to be ready...`);
        await sleep(3000);
        
        // Test terminal input
        console.log(`📝 Testing ${testName} terminal input...`);
        const inputResponse = await axios.post(`${BASE_URL}/api/claude/instances/${instance.id}/terminal/input`, {
            input: 'help\n'
        });
        
        if (inputResponse.data.success) {
            console.log(`✅ ${testName}: Terminal input successful`);
            console.log(`   Process Type: ${inputResponse.data.processType}`);
            console.log(`   PTY: ${inputResponse.data.usePty}`);
        } else {
            console.log(`❌ ${testName}: Terminal input failed`);
        }
        
        // Clean up
        await sleep(1000);
        await axios.delete(`${BASE_URL}/api/claude/instances/${instance.id}`);
        console.log(`🗑️ ${testName}: Instance cleaned up`);
        
        return {
            success: true,
            processType: instance.processType,
            usePty: instance.usePty,
            pid: instance.pid
        };
        
    } catch (error) {
        console.error(`❌ ${testName} Test Failed:`, error.response?.data || error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

async function testDirectPTYvsSpawn() {
    console.log(`\n🔬 Direct PTY vs Spawn Comparison Test`);
    
    // Test basic echo command with both methods
    const testCommand = process.platform === 'win32' ? 'echo' : 'echo';
    const testArgs = ['Hello from terminal!'];
    
    console.log(`\n📡 Testing Regular Spawn...`);
    try {
        const regularProcess = spawn(testCommand, testArgs, {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let regularOutput = '';
        regularProcess.stdout.on('data', (data) => {
            regularOutput += data.toString();
        });
        
        await new Promise((resolve) => {
            regularProcess.on('close', resolve);
        });
        
        console.log(`✅ Regular spawn output: "${regularOutput.trim()}"`);
    } catch (error) {
        console.error(`❌ Regular spawn failed:`, error.message);
    }
    
    console.log(`\n🖥️ Testing PTY Spawn...`);
    try {
        const ptyProcess = pty.spawn(testCommand, testArgs, {
            name: 'xterm-color',
            cols: 80,
            rows: 24
        });
        
        let ptyOutput = '';
        ptyProcess.onData((data) => {
            ptyOutput += data;
        });
        
        await new Promise((resolve) => {
            ptyProcess.onExit(resolve);
        });
        
        console.log(`✅ PTY spawn output: "${ptyOutput.trim()}"`);
        
        // Compare outputs
        if (ptyOutput.includes('Hello from terminal!')) {
            console.log(`🎉 PTY successfully captured output`);
        } else {
            console.log(`⚠️ PTY output may be different from expected`);
        }
        
    } catch (error) {
        console.error(`❌ PTY spawn failed:`, error.message);
    }
}

async function runTests() {
    console.log('🚀 Starting PTY vs Regular Pipes Comparison Tests');
    console.log('='.repeat(60));
    
    // Check if server is running
    try {
        await axios.get(`${BASE_URL}/health`);
        console.log('✅ Backend server is running');
    } catch (error) {
        console.error('❌ Backend server is not running. Please start it first with: node simple-backend.js');
        process.exit(1);
    }
    
    // Test direct PTY vs spawn
    await testDirectPTYvsSpawn();
    
    // Test PTY mode
    const ptyResult = await testCreateInstance(true, 'PTY Mode');
    
    // Test regular pipe mode  
    const pipeResult = await testCreateInstance(false, 'Regular Pipes Mode');
    
    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(40));
    
    if (ptyResult.success) {
        console.log(`✅ PTY Mode: SUCCESS`);
        console.log(`   Process Type: ${ptyResult.processType}`);
        console.log(`   PTY Enabled: ${ptyResult.usePty}`);
    } else {
        console.log(`❌ PTY Mode: FAILED - ${ptyResult.error}`);
    }
    
    if (pipeResult.success) {
        console.log(`✅ Regular Pipes Mode: SUCCESS`);
        console.log(`   Process Type: ${pipeResult.processType}`);
        console.log(`   PTY Enabled: ${pipeResult.usePty}`);
    } else {
        console.log(`❌ Regular Pipes Mode: FAILED - ${pipeResult.error}`);
    }
    
    console.log('\n🎯 Key Differences:');
    console.log('PTY Mode:');
    console.log('  ✅ Better terminal emulation');
    console.log('  ✅ Handles ANSI escape codes');
    console.log('  ✅ Supports interactive CLI tools');
    console.log('  ✅ Combined stdout/stderr stream');
    
    console.log('\nRegular Pipes Mode:');
    console.log('  ✅ Simple and reliable');
    console.log('  ✅ Separate stdout/stderr streams');
    console.log('  ⚠️ Limited terminal capabilities');
    console.log('  ⚠️ May not work with interactive tools');
    
    console.log('\n🚀 Recommendation: Use PTY mode for Claude to get better terminal experience!');
}

// Run the tests
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, testCreateInstance, testDirectPTYvsSpawn };