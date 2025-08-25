/**
 * Claude CLI UI Redraw Fix Validation Test
 * Validates that line-based input buffering prevents UI redraw cascades
 */

const WebSocket = require('ws');

console.log('🧪 Testing Claude CLI Line-Based Input Buffering (Complete Message Stability)\n');

const ws = new WebSocket('ws://localhost:3002/terminal');

ws.on('open', () => {
  console.log('✅ Connected to terminal WebSocket');
  
  ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
  
  setTimeout(() => {
    console.log('📤 Starting Claude CLI...');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'cd prod && claude --dangerously-skip-permissions\n'
    }));
  }, 1500);
  
  // Test complete message sending (line-based buffering)
  setTimeout(() => {
    console.log('📤 Testing complete message input: "hello\\n"');
    console.log('   - This should trigger minimal UI redraws due to line buffering');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'hello\n'
    }));
  }, 8000);
  
  // Test a second complete command to verify consistent behavior
  setTimeout(() => {
    console.log('📤 Testing second complete message: "exit\\n"');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'exit\n'
    }));
  }, 12000);
});

let output = '';
let uiRedrawCount = 0;
let claudeInterfaceAppeared = false;

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  if (message.type === 'data') {
    output += message.data;
    process.stdout.write(message.data);
    
    // Check for Claude CLI interface appearance
    if (message.data.includes('Welcome to Claude Code') || message.data.includes('Welcome to ')) {
      console.log('\n🎉 Claude CLI interface detected!');
      claudeInterfaceAppeared = true;
    }
    
    // Count UI box redraws (each box starts with ╭ character)
    const boxCount = (message.data.match(/╭/g) || []).length;
    if (boxCount > 0) {
      uiRedrawCount += boxCount;
    }
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

setTimeout(() => {
  console.log('\n' + '='.repeat(70));
  console.log('📊 CLAUDE CLI LINE-BASED INPUT BUFFERING VALIDATION RESULTS');
  console.log('='.repeat(70));
  
  console.log(`🎯 Claude CLI Interface Appeared: ${claudeInterfaceAppeared ? '✅ YES' : '❌ NO'}`);
  console.log(`📦 UI Box Redraws Detected: ${uiRedrawCount}`);
  console.log(`📝 Total Output Length: ${output.length} characters`);
  console.log(`🔧 Expected Behavior: < 3 redraws for line-based buffering`);
  
  // Check for optimal UI redraw behavior (should be minimal with line buffering)
  if (uiRedrawCount < 3 && claudeInterfaceAppeared) {
    console.log('\n🎉 SUCCESS: Line-based input buffering working perfectly!');
    console.log('✅ Interface displays with minimal redraws (< 3 boxes)');
    console.log('✅ Complete messages prevent UI redraw cascades');
    console.log('✅ Claude CLI shows stable interface behavior');
  } else if (uiRedrawCount >= 3 && uiRedrawCount < 10) {
    console.log('\n⚠️  PARTIAL: Some improvement but not optimal');
    console.log(`  - ${uiRedrawCount} box redraws found (should be < 3 for optimal buffering)`);
    console.log('  - Line buffering may need further refinement');
  } else if (uiRedrawCount >= 10) {
    console.log('\n❌ ISSUE: Excessive UI redrawing still occurring');
    console.log(`  - ${uiRedrawCount} box redraws found (expected < 3)`);
    console.log('  - Line-based buffering not preventing redraw cascades');
  } else {
    console.log('\n❌ ISSUE: Claude CLI interface failed to appear');
    console.log('  - Check terminal server and Claude CLI installation');
  }
  
  ws.close();
  process.exit(claudeInterfaceAppeared && uiRedrawCount < 3 ? 0 : 1);
}, 18000);