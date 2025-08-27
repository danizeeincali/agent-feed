/**
 * Demo: PTY vs Regular Pipes Benefits for Claude Terminal
 * Shows the key differences and advantages of using PTY
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function createAndTestInstance(usePty, name) {
    console.log(`\n🚀 Creating ${name} Instance...`);
    
    try {
        // Create instance
        const response = await axios.post(`${BASE_URL}/api/claude/instances`, {
            command: ['claude', '--dangerously-skip-permissions'],
            instanceType: 'skip-permissions',
            usePty: usePty
        });
        
        const instance = response.data.instance;
        console.log(`✅ Instance Created: ${instance.id}`);
        console.log(`   Process Type: ${instance.processType}`);
        console.log(`   PTY Enabled: ${instance.usePty}`);
        console.log(`   PID: ${instance.pid}`);
        
        // Wait and send help command
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`📝 Sending 'help' command...`);
        const inputResponse = await axios.post(`${BASE_URL}/api/claude/instances/${instance.id}/terminal/input`, {
            input: 'help\n'
        });
        
        console.log(`✅ Input sent (${inputResponse.data.processType} mode)`);
        
        // Let it run for a moment to see output
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Cleanup
        await axios.delete(`${BASE_URL}/api/claude/instances/${instance.id}`);
        console.log(`🗑️ Instance cleaned up`);
        
        return instance;
        
    } catch (error) {
        console.error(`❌ Failed to test ${name}:`, error.response?.data || error.message);
        return null;
    }
}

async function runDemo() {
    console.log('🎭 PTY vs Regular Pipes Demo for Claude Terminal');
    console.log('='.repeat(60));
    console.log('This demo shows the key differences between PTY and regular pipes');
    console.log('when running Claude processes.\n');
    
    // Check server
    try {
        const health = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Backend server is running');
    } catch (error) {
        console.error('❌ Backend server not available. Start with: node simple-backend.js');
        return;
    }
    
    // Demo PTY mode
    console.log('\n' + '='.repeat(60));
    console.log('🖥️  PTY MODE DEMO');
    console.log('='.repeat(60));
    console.log('PTY provides a pseudo-terminal that:');
    console.log('• Supports ANSI escape codes and colors');
    console.log('• Handles interactive CLI behavior');
    console.log('• Provides better terminal emulation');
    console.log('• Combines stdout/stderr into single stream');
    
    const ptyInstance = await createAndTestInstance(true, 'PTY');
    
    // Demo regular pipes mode
    console.log('\n' + '='.repeat(60));
    console.log('📁 REGULAR PIPES MODE DEMO');
    console.log('='.repeat(60));
    console.log('Regular pipes provide:');
    console.log('• Simple stdin/stdout/stderr streams');
    console.log('• Reliable but limited terminal capability');
    console.log('• No ANSI escape code processing');
    console.log('• Separate error and output streams');
    
    const pipeInstance = await createAndTestInstance(false, 'Regular Pipes');
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPARISON SUMMARY');
    console.log('='.repeat(60));
    
    if (ptyInstance) {
        console.log(`🖥️  PTY Mode: ${ptyInstance.id}`);
        console.log('   ✅ Rich terminal output with colors and formatting');
        console.log('   ✅ Interactive CLI support');
        console.log('   ✅ ANSI escape sequences processed');
        console.log('   ✅ Better user experience');
    }
    
    if (pipeInstance) {
        console.log(`\n📁 Pipes Mode: ${pipeInstance.id}`);
        console.log('   ✅ Simple and reliable');
        console.log('   ✅ Separate error handling');
        console.log('   ⚠️  Plain text output only');
        console.log('   ⚠️  Limited interactive support');
    }
    
    console.log('\n🎯 RECOMMENDATION:');
    console.log('Use PTY mode for Claude to provide the best terminal experience!');
    console.log('The backend automatically falls back to regular pipes if PTY fails.');
    
    console.log('\n🔧 API Usage:');
    console.log('POST /api/claude/instances');
    console.log('Body: { "usePty": true }  // Enable PTY mode');
    console.log('Body: { "usePty": false } // Use regular pipes');
}

if (require.main === module) {
    runDemo().catch(console.error);
}

module.exports = { runDemo };