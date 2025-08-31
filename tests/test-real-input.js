#!/usr/bin/env node

/**
 * Test REAL input/output with Claude
 */

const WebSocket = require('ws');
const http = require('http');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createInstance() {
  console.log('📦 Creating Claude instance...');
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/claude/instances',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        console.log(`✅ Instance created: ${result.instance.id} (PID: ${result.instance.pid})`);
        resolve(result.instance.id);
      });
    });
    req.write(JSON.stringify({ instanceType: 'prod' }));
    req.end();
  });
}

async function waitForRunning(instanceId, maxWait = 10000) {
  console.log(`⏳ Waiting for instance ${instanceId} to be ready...`);
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    const status = await new Promise((resolve) => {
      http.get(`http://localhost:3000/api/claude/instances`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const result = JSON.parse(data);
          const instance = result.instances?.find(i => i.id === instanceId);
          resolve(instance?.status);
        });
      });
    });
    
    if (status === 'running') {
      console.log('✅ Instance is running!');
      return true;
    }
    
    console.log(`   Status: ${status}`);
    await delay(1000);
  }
  
  console.log('❌ Timeout waiting for instance to be ready');
  return false;
}

async function testRealInput() {
  const instanceId = await createInstance();
  
  // Wait for instance to be fully ready
  const isReady = await waitForRunning(instanceId);
  if (!isReady) {
    console.log('❌ Instance never became ready');
    return;
  }
  
  console.log('\n🔌 Connecting WebSocket...');
  const ws = new WebSocket(`ws://localhost:3000/terminal`);
  
  return new Promise((resolve) => {
    const allOutputs = [];
    let testPhase = 'connecting';
    
    ws.on('open', async () => {
      console.log('✅ WebSocket connected');
      
      // Wait a bit for any initial output
      await delay(1000);
      
      // Send a simple test command
      testPhase = 'sending';
      const testCommand = 'echo "Hello from test"';
      console.log(`\n📤 Sending command: "${testCommand}"`);
      
      ws.send(JSON.stringify({
        type: 'input',
        data: testCommand + '\n',
        terminalId: instanceId
      }));
      
      // Wait for response
      console.log('⏳ Waiting for Claude response...\n');
    });
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'error') {
          console.log(`❌ ERROR: ${msg.error}`);
          return;
        }
        
        if (msg.type === 'output' && msg.data) {
          // Clean up ANSI codes for display
          const cleanOutput = msg.data
            .replace(/\x1b\[[0-9;]*m/g, '') // Remove color codes
            .replace(/\[38;[0-9;]*m/g, '') // Remove 256 color codes
            .replace(/\[2m|\[22m/g, '') // Remove dim/normal
            .replace(/\[7m|\[27m/g, '') // Remove reverse video
            .trim();
          
          if (cleanOutput) {
            allOutputs.push(cleanOutput);
            
            // Show different types of output
            if (cleanOutput.includes('echo')) {
              console.log(`📝 COMMAND ECHO: ${cleanOutput}`);
            } else if (cleanOutput.includes('Hello from test')) {
              console.log(`🎯 RESPONSE: ${cleanOutput}`);
            } else if (cleanOutput.includes('Welcome') || cleanOutput.includes('Claude')) {
              console.log(`📋 SYSTEM: ${cleanOutput.substring(0, 50)}...`);
            } else if (cleanOutput.includes('>')) {
              console.log(`💻 PROMPT: ${cleanOutput}`);
            } else if (cleanOutput.length > 2) {
              console.log(`📥 OUTPUT: ${cleanOutput.substring(0, 100)}${cleanOutput.length > 100 ? '...' : ''}`);
            }
          }
        }
      } catch (e) {
        console.log('Parse error:', e.message);
      }
    });
    
    ws.on('error', (err) => {
      console.error('❌ WebSocket error:', err.message);
    });
    
    // Analyze results after 8 seconds
    setTimeout(() => {
      ws.close();
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 ANALYSIS');
      console.log('='.repeat(60));
      
      // Check what we received
      const hasEcho = allOutputs.some(o => o.includes('echo') || o.includes('Hello from test'));
      const hasPrompt = allOutputs.some(o => o.includes('>'));
      const hasWelcome = allOutputs.some(o => o.includes('Welcome') || o.includes('Claude'));
      
      console.log(`\nTotal outputs received: ${allOutputs.length}`);
      console.log(`Has welcome message: ${hasWelcome ? '✅ YES' : '❌ NO'}`);
      console.log(`Has prompt: ${hasPrompt ? '✅ YES' : '❌ NO'}`);
      console.log(`Has command echo/response: ${hasEcho ? '✅ YES' : '❌ NO'}`);
      
      if (!hasEcho) {
        console.log('\n⚠️  PROBLEM: Command was sent but no echo or response received!');
        console.log('This means the input is NOT reaching Claude or Claude is NOT responding.');
      } else {
        console.log('\n✅ SUCCESS: Input is working and Claude is responding!');
      }
      
      console.log('\n' + '='.repeat(60));
      resolve();
    }, 8000);
  });
}

testRealInput().catch(console.error);