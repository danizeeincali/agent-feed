import AgentWorker from '../../worker/agent-worker.js';
import fs from 'fs';
import path from 'path';

async function testRealWorkspace() {
  console.log('\n=== Test 2: Real Link-Logger Workspace Integration ===\n');

  const worker = new AgentWorker({ workerId: 'test-real' });
  const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent';

  // Check workspace structure
  console.log('1. Checking workspace structure...');
  const intelligenceDir = path.join(workspaceDir, 'intelligence');

  if (fs.existsSync(workspaceDir)) {
    console.log('   ✅ Workspace directory exists:', workspaceDir);
  } else {
    console.log('   ❌ Workspace directory not found:', workspaceDir);
    return;
  }

  if (fs.existsSync(intelligenceDir)) {
    console.log('   ✅ Intelligence subdirectory exists:', intelligenceDir);
    const files = fs.readdirSync(intelligenceDir);
    console.log('   📁 Files found:', files.length);
    files.forEach(file => console.log('      -', file));
  } else {
    console.log('   ⚠️  Intelligence subdirectory not found');
  }

  // Extract from workspace files
  console.log('\n2. Extracting intelligence from workspace...');
  const result = await worker.extractFromWorkspaceFiles(workspaceDir);

  // Results
  console.log('\n3. Results:');
  console.log('   Result is null:', result === null);
  console.log('   Result length:', result ? result.length : 0);
  console.log('   Contains "AgentDB":', result ? result.includes('AgentDB') : false);
  console.log('   Contains "Reuven Cohen":', result ? result.includes('Reuven Cohen') : false);
  console.log('   Contains "vector":', result ? result.includes('vector') : false);

  if (result) {
    console.log('\n4. Content Preview (first 400 chars):');
    console.log('   ' + result.substring(0, 400).replace(/\n/g, '\n   '));

    console.log('\n5. Content Preview (chars 400-800):');
    console.log('   ' + result.substring(400, 800).replace(/\n/g, '\n   '));
  }

  // Validation
  console.log('\n6. Validation:');
  if (result && result.length > 0 && result.includes('AgentDB')) {
    console.log('   ✅ SUCCESS: Intelligence extracted successfully');
    console.log('   ✅ Content is meaningful and relevant');
    return true;
  } else {
    console.log('   ❌ FAILED: Intelligence not extracted properly');
    return false;
  }
}

// Run the test
testRealWorkspace().then(success => {
  console.log('\n' + '='.repeat(60));
  console.log(success ? '✅ TEST PASSED' : '❌ TEST FAILED');
  console.log('='.repeat(60) + '\n');
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
