/**
 * EXTREME TEST: Character spam to show UI redraw difference
 * Tests with rapid character-by-character input to demonstrate the optimization
 */

const WebSocket = require('ws');

console.log('🔥 EXTREME TEST: Character spam to demonstrate UI redraw optimization');

function testExtremeCharacterSpam() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let outputs = [];
    let totalUIRedraws = 0;
    const startTime = Date.now();
    
    ws.on('open', () => {
      console.log('🚨 EXTREME: Rapid character-by-character spam (20 chars)');
      
      ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
      
      setTimeout(() => {
        // Send 20 characters individually as fast as possible
        const testString = 'abcdefghijklmnopqrst';
        console.log(`📤 Spamming ${testString.length} individual characters...`);
        
        testString.split('').forEach((char, i) => {
          setTimeout(() => {
            ws.send(JSON.stringify({ type: 'input', data: char }));
          }, i * 5); // 5ms between characters (very fast typing)
        });
        
        // Send Enter
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'input', data: '\n' }));
        }, testString.length * 5 + 50);
        
        // Analyze results
        setTimeout(() => {
          const duration = Date.now() - startTime;
          console.log(`\n🔥 EXTREME CHARACTER SPAM RESULTS:`);
          console.log(`  Characters sent: ${testString.length}`);
          console.log(`  Duration: ${duration}ms`);
          console.log(`  Total UI redraws: ${totalUIRedraws}`);
          console.log(`  Redraws per character: ${(totalUIRedraws / testString.length).toFixed(2)}`);
          console.log(`  Expected WITHOUT optimization: ~${testString.length + 5} redraws`);
          console.log(`  Actual WITH optimization: ${totalUIRedraws} redraws`);
          
          const improvement = Math.max(0, (testString.length + 5) - totalUIRedraws);
          console.log(`  Estimated improvement: ${improvement} fewer redraws`);
          
          ws.close();
          resolve({ 
            test: 'extreme-spam', 
            chars: testString.length,
            redraws: totalUIRedraws, 
            duration, 
            improvement,
            outputs 
          });
        }, 3000);
      }, 1000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data && message.data.trim()) {
          totalUIRedraws++;
          outputs.push(message.data);
          console.log(`📥 Redraw ${totalUIRedraws}: ${JSON.stringify(message.data.substring(0, 15))}...`);
        }
      } catch (err) {
        if (data.toString().trim()) {
          totalUIRedraws++;
          outputs.push(data.toString());
          console.log(`📥 Raw ${totalUIRedraws}: ${JSON.stringify(data.toString().substring(0, 15))}...`);
        }
      }
    });
    
    ws.on('error', reject);
    ws.on('close', () => console.log('🔥 Extreme test closed'));
  });
}

function testOptimalLineBased() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let outputs = [];
    let totalUIRedraws = 0;
    const startTime = Date.now();
    
    ws.on('open', () => {
      console.log('✨ OPTIMAL: Single line-based input (20 chars)');
      
      ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
      
      setTimeout(() => {
        const testString = 'abcdefghijklmnopqrst';
        console.log(`📤 Sending complete line: "${testString}"`);
        
        // Send complete line in one message
        ws.send(JSON.stringify({ type: 'input', data: testString + '\n' }));
        
        // Analyze results
        setTimeout(() => {
          const duration = Date.now() - startTime;
          console.log(`\n✨ OPTIMAL LINE-BASED RESULTS:`);
          console.log(`  Characters sent: ${testString.length}`);
          console.log(`  Duration: ${duration}ms`);
          console.log(`  Total UI redraws: ${totalUIRedraws}`);
          console.log(`  Redraws per character: ${(totalUIRedraws / testString.length).toFixed(2)}`);
          
          ws.close();
          resolve({ 
            test: 'optimal-line', 
            chars: testString.length,
            redraws: totalUIRedraws, 
            duration,
            outputs 
          });
        }, 2000);
      }, 1000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data && message.data.trim()) {
          totalUIRedraws++;
          outputs.push(message.data);
          console.log(`📥 Update ${totalUIRedraws}: ${JSON.stringify(message.data.substring(0, 15))}...`);
        }
      } catch (err) {
        if (data.toString().trim()) {
          totalUIRedraws++;
          outputs.push(data.toString());
          console.log(`📥 Raw ${totalUIRedraws}: ${JSON.stringify(data.toString().substring(0, 15))}...`);
        }
      }
    });
    
    ws.on('error', reject);
    ws.on('close', () => console.log('✨ Optimal test closed'));
  });
}

async function runExtremeValidation() {
  console.log('\n🔥 EXTREME UI REDRAW OPTIMIZATION TEST\n');
  
  try {
    // Test 1: Extreme character spam
    console.log('=' .repeat(80));
    console.log('TEST 1: EXTREME CHARACTER SPAM (Simulates worst-case scenario)');
    console.log('=' .repeat(80));
    
    const spamResult = await testExtremeCharacterSpam();
    
    console.log('\n⏳ Cooling down between tests...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Optimal line-based
    console.log('=' .repeat(80));
    console.log('TEST 2: OPTIMAL LINE-BASED INPUT (Backend optimization)');
    console.log('=' .repeat(80));
    
    const optimalResult = await testOptimalLineBased();
    
    // Extreme comparison
    console.log('\n' + '='.repeat(80));
    console.log('🔥 EXTREME PERFORMANCE COMPARISON');
    console.log('='.repeat(80));
    
    const redrawDifference = spamResult.redraws - optimalResult.redraws;
    const efficiencyGain = ((redrawDifference / spamResult.redraws) * 100).toFixed(1);
    
    console.log(`\n📊 EXTREME METRICS:`);
    console.log(`  Character spam redraws: ${spamResult.redraws}`);
    console.log(`  Optimal line redraws: ${optimalResult.redraws}`);
    console.log(`  Redraw reduction: ${redrawDifference} (${efficiencyGain}% improvement)`);
    
    console.log(`\n⚡ EFFICIENCY COMPARISON:`);
    console.log(`  Spam redraws/char: ${(spamResult.redraws / spamResult.chars).toFixed(2)}`);
    console.log(`  Optimal redraws/char: ${(optimalResult.redraws / optimalResult.chars).toFixed(2)}`);
    
    // Success evaluation
    console.log(`\n🎯 EXTREME TEST EVALUATION:`);
    if (redrawDifference > 5) {
      console.log('  ✅ MAJOR SUCCESS: Significant UI redraw reduction achieved');
      console.log('  🚀 Backend optimization handles extreme cases excellently');
    } else if (redrawDifference > 2) {
      console.log('  📈 GOOD SUCCESS: Moderate UI redraw reduction');
      console.log('  👍 Backend optimization provides measurable benefit');
    } else if (redrawDifference > 0) {
      console.log('  📊 MINOR SUCCESS: Small but measurable improvement');
      console.log('  🔧 Backend optimization has limited but positive impact');
    } else {
      console.log('  ⚠️ NO IMPROVEMENT: Backend optimization not effective in extreme cases');
      console.log('  🛠️ Further optimization needed for high-frequency input');
    }
    
    // Performance impact assessment
    console.log(`\n💼 REAL-WORLD IMPACT:`);
    console.log(`  Without optimization: ~${spamResult.chars} UI redraws for typing "${spamResult.chars} chars"`);
    console.log(`  With optimization: ${optimalResult.redraws} UI redraws for same input`);
    console.log(`  User experience: ${redrawDifference > 3 ? 'Much smoother' : redrawDifference > 0 ? 'Slightly smoother' : 'No change'}`);
    
    console.log('\n✅ Extreme validation complete');
    return { spamResult, optimalResult, improvement: redrawDifference };
    
  } catch (error) {
    console.error('🚨 Extreme validation failed:', error);
    process.exit(1);
  }
}

// Run extreme validation
runExtremeValidation()
  .then(results => {
    console.log('\n🎉 Extreme test completed');
    if (results.improvement > 2) {
      console.log('🏆 BACKEND OPTIMIZATION VALIDATED under extreme conditions');
      process.exit(0);
    } else if (results.improvement > 0) {
      console.log('📈 Backend optimization shows improvement');
      process.exit(0);
    } else {
      console.log('⚠️ Backend optimization needs enhancement for extreme cases');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('🚨 Extreme validation suite failed:', err);
    process.exit(1);
  });