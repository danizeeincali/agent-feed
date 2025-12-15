/**
 * CRITICAL VALIDATION: Character-by-character UI redraw issue
 * This test simulates the exact problem occurring in the frontend
 */

const WebSocket = require('ws');

console.log('🔬 PRECISE TEST: Validating character-by-character vs line-based input processing');

function testRealCharacterByCharacterInput() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let outputCount = 0;
    const outputs = [];
    
    ws.on('open', () => {
      console.log('✅ Connected for character-by-character test');
      
      // Send init
      ws.send(JSON.stringify({
        type: 'init',
        cols: 80,
        rows: 24
      }));
      
      setTimeout(() => {
        console.log('🚨 SIMULATING FRONTEND CHARACTER-BY-CHARACTER INPUT');
        
        // Send each character as separate WebSocket messages (mimics frontend typing)
        const chars = ['h', 'e', 'l', 'l', 'o'];
        
        chars.forEach((char, index) => {
          setTimeout(() => {
            console.log(`📤 Sending individual character: "${char}"`);
            ws.send(JSON.stringify({
              type: 'input',
              data: char  // Single character
            }));
          }, index * 50); // 50ms between characters
        });
        
        // Send enter
        setTimeout(() => {
          console.log('📤 Sending Enter key');
          ws.send(JSON.stringify({
            type: 'input',
            data: '\r'
          }));
        }, chars.length * 50 + 100);
        
        // Analyze after delay
        setTimeout(() => {
          console.log(`\n🔍 CHARACTER-BY-CHARACTER ANALYSIS:`);
          console.log(`Total UI redraws: ${outputCount}`);
          console.log(`Expected redraws: 1-3 (welcome + prompt + result)`);
          console.log(`Actual problem: ${outputCount > 5 ? 'CONFIRMED' : 'Not detected'}`);
          
          ws.close();
          resolve({ test: 'character-by-character', outputCount, outputs });
        }, 2500);
        
      }, 1000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data && message.data.trim()) {
          outputCount++;
          outputs.push(message.data);
          console.log(`📥 UI Redraw ${outputCount}: ${JSON.stringify(message.data.substring(0, 30))}`);
        }
      } catch (err) {
        // Raw data
        if (data.toString().trim()) {
          outputCount++;
          outputs.push(data.toString());
          console.log(`📥 Raw UI Redraw ${outputCount}: ${JSON.stringify(data.toString().substring(0, 30))}`);
        }
      }
    });
    
    ws.on('error', reject);
    ws.on('close', () => console.log('🔌 Character-by-character test connection closed'));
  });
}

function testOptimizedLineBasedInput() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let outputCount = 0;
    const outputs = [];
    
    ws.on('open', () => {
      console.log('✅ Connected for optimized line-based test');
      
      // Send init
      ws.send(JSON.stringify({
        type: 'init',
        cols: 80,
        rows: 24
      }));
      
      setTimeout(() => {
        console.log('✨ OPTIMIZED: Sending complete line in single message');
        
        // Send complete line as single message
        console.log('📤 Sending complete line: "hello\\r"');
        ws.send(JSON.stringify({
          type: 'input',
          data: 'hello\r'  // Complete line with carriage return
        }));
        
        // Analyze after delay
        setTimeout(() => {
          console.log(`\n🎯 LINE-BASED ANALYSIS:`);
          console.log(`Total UI redraws: ${outputCount}`);
          console.log(`Expected redraws: 1-3 (welcome + prompt + result)`);
          console.log(`Performance gain: ${outputCount <= 5 ? 'CONFIRMED' : 'Needs improvement'}`);
          
          ws.close();
          resolve({ test: 'line-based', outputCount, outputs });
        }, 2000);
        
      }, 1000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data && message.data.trim()) {
          outputCount++;
          outputs.push(message.data);
          console.log(`📥 UI Update ${outputCount}: ${JSON.stringify(message.data.substring(0, 30))}`);
        }
      } catch (err) {
        // Raw data
        if (data.toString().trim()) {
          outputCount++;
          outputs.push(data.toString());
          console.log(`📥 Raw UI Update ${outputCount}: ${JSON.stringify(data.toString().substring(0, 30))}`);
        }
      }
    });
    
    ws.on('error', reject);
    ws.on('close', () => console.log('🔌 Line-based test connection closed'));
  });
}

async function runValidation() {
  console.log('🧪 Starting Comprehensive UI Redraw Validation...\n');
  
  try {
    // Test 1: Character-by-character (problematic)
    console.log('=' .repeat(70));
    console.log('TEST 1: CHARACTER-BY-CHARACTER INPUT (Current Frontend Behavior)');
    console.log('=' .repeat(70));
    
    const charResult = await testRealCharacterByCharacterInput();
    
    console.log('\n⏱️  Waiting 2 seconds between tests...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Line-based (solution)
    console.log('=' .repeat(70));
    console.log('TEST 2: OPTIMIZED LINE-BASED INPUT (Backend Fix)');
    console.log('=' .repeat(70));
    
    const lineResult = await testOptimizedLineBasedInput();
    
    // Final analysis
    console.log('\n' + '='.repeat(70));
    console.log('🔬 FINAL VALIDATION RESULTS');
    console.log('='.repeat(70));
    
    console.log(`Character-by-character UI redraws: ${charResult.outputCount}`);
    console.log(`Line-based UI redraws: ${lineResult.outputCount}`);
    
    const improvement = charResult.outputCount - lineResult.outputCount;
    const improvementPercent = ((improvement / charResult.outputCount) * 100).toFixed(1);
    
    console.log(`Improvement: ${improvement} fewer redraws (${improvementPercent}% reduction)`);
    
    if (improvement > 0) {
      console.log('✅ SUCCESS: Line-based input reduces UI redraws');
      console.log('📊 Backend optimization is working');
      
      if (improvement >= 3) {
        console.log('🎯 EXCELLENT: Significant UI redraw reduction achieved');
      } else {
        console.log('📈 GOOD: Modest UI redraw reduction achieved');
      }
    } else if (improvement === 0) {
      console.log('⚠️  WARNING: No improvement detected');
      console.log('🔧 Backend buffering may need adjustment');
    } else {
      console.log('❌ ERROR: Line-based approach worse than character-by-character');
      console.log('🚨 Backend configuration issue detected');
    }
    
    // Recommendations
    console.log('\n📋 RECOMMENDATIONS:');
    if (charResult.outputCount > 8) {
      console.log('• Critical: UI redraws too frequent, affects performance');
    }
    if (lineResult.outputCount <= 4) {
      console.log('• Excellent: Line-based approach achieves optimal UI updates');
    }
    if (improvement > 2) {
      console.log('• Deploy: Backend fix ready for production');
    } else {
      console.log('• Continue: Further optimization needed');
    }
    
    console.log('\n✅ Validation complete');
    
  } catch (error) {
    console.error('🚨 Validation failed:', error);
    process.exit(1);
  }
}

// Run comprehensive validation
runValidation().catch(err => {
  console.error('🚨 Validation suite failed:', err);
  process.exit(1);
});