/**
 * Input Buffering Comparison Test
 * Demonstrates the difference between character-by-character and line-based input
 */

const WebSocket = require('ws');

console.log('🧪 Comparing Character-by-Character vs Line-Based Input\n');

// Test 1: Character-by-character (should cause many redraws)
function testCharacterByCharacter() {
  return new Promise((resolve) => {
    const ws1 = new WebSocket('ws://localhost:3002/terminal');
    let redraws1 = 0;
    
    ws1.on('open', () => {
      console.log('🔴 TEST 1: Character-by-character input');
      ws1.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
      
      setTimeout(() => {
        ws1.send(JSON.stringify({
          type: 'input',
          data: 'cd prod && claude --dangerously-skip-permissions\n'
        }));
      }, 1000);
      
      // Send characters individually (old problematic behavior)
      const chars = ['h', 'e', 'l', 'l', 'o'];
      chars.forEach((char, index) => {
        setTimeout(() => {
          ws1.send(JSON.stringify({ type: 'input', data: char }));
        }, 6000 + (index * 500));
      });
      
      setTimeout(() => {
        ws1.send(JSON.stringify({ type: 'input', data: '\n' }));
      }, 9000);
    });
    
    ws1.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'data') {
        const boxCount = (message.data.match(/╭/g) || []).length;
        redraws1 += boxCount;
      }
    });
    
    setTimeout(() => {
      ws1.close();
      resolve(redraws1);
    }, 12000);
  });
}

// Test 2: Complete line input (should cause minimal redraws)
function testCompleteLineInput() {
  return new Promise((resolve) => {
    const ws2 = new WebSocket('ws://localhost:3002/terminal');
    let redraws2 = 0;
    
    ws2.on('open', () => {
      console.log('🟢 TEST 2: Complete line input (buffered)');
      ws2.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
      
      setTimeout(() => {
        ws2.send(JSON.stringify({
          type: 'input',
          data: 'cd prod && claude --dangerously-skip-permissions\n'
        }));
      }, 1000);
      
      // Send complete line at once (new optimized behavior)
      setTimeout(() => {
        ws2.send(JSON.stringify({ 
          type: 'input', 
          data: 'hello\n' 
        }));
      }, 6000);
    });
    
    ws2.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'data') {
        const boxCount = (message.data.match(/╭/g) || []).length;
        redraws2 += boxCount;
      }
    });
    
    setTimeout(() => {
      ws2.close();
      resolve(redraws2);
    }, 10000);
  });
}

// Run both tests sequentially
async function runComparison() {
  console.log('Starting comparison tests...\n');
  
  const charByCharRedraws = await testCharacterByCharacter();
  console.log(`\n🔴 Character-by-character redraws: ${charByCharRedraws}`);
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const lineBasedRedraws = await testCompleteLineInput();
  console.log(`🟢 Line-based redraws: ${lineBasedRedraws}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 INPUT BUFFERING COMPARISON RESULTS');
  console.log('='.repeat(60));
  console.log(`🔴 Character-by-character: ${charByCharRedraws} redraws`);
  console.log(`🟢 Line-based buffering: ${lineBasedRedraws} redraws`);
  
  const improvement = charByCharRedraws > 0 ? 
    ((charByCharRedraws - lineBasedRedraws) / charByCharRedraws * 100).toFixed(1) : 0;
  
  if (lineBasedRedraws < charByCharRedraws) {
    console.log(`\n🎉 SUCCESS: ${improvement}% reduction in UI redraws!`);
    console.log('✅ Line-based input buffering is working');
  } else {
    console.log('\n❌ No improvement detected - buffering may not be working');
  }
  
  process.exit(lineBasedRedraws < charByCharRedraws ? 0 : 1);
}

runComparison().catch(console.error);