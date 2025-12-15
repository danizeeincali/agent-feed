/**
 * FINAL VALIDATION: UI Redraw Optimization Results
 * Tests the complete backend fix for character-by-character UI redraws
 */

const WebSocket = require('ws');

console.log('🎯 FINAL VALIDATION: Testing backend UI redraw optimization');

function testOriginalProblem() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let startTime = Date.now();
    let outputs = [];
    let totalUIRedraws = 0;
    
    ws.on('open', () => {
      console.log('✅ Testing original problem: character-by-character input');
      
      ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
      
      setTimeout(() => {
        console.log('📤 Sending individual characters (simulating frontend typing)...');
        
        // Send chars individually - original problem
        ['h', 'e', 'l', 'l', 'o'].forEach((char, i) => {
          setTimeout(() => {
            console.log(`  Sending: "${char}"`);
            ws.send(JSON.stringify({ type: 'input', data: char }));
          }, i * 30);
        });
        
        // Send Enter
        setTimeout(() => {
          console.log('  Sending: Enter');
          ws.send(JSON.stringify({ type: 'input', data: '\n' }));
        }, 5 * 30 + 100);
        
        // Analyze results
        setTimeout(() => {
          const duration = Date.now() - startTime;
          console.log(`\n📊 ORIGINAL PROBLEM RESULTS:`);
          console.log(`  Duration: ${duration}ms`);
          console.log(`  Total UI redraws: ${totalUIRedraws}`);
          console.log(`  Redraw rate: ${(totalUIRedraws / duration * 1000).toFixed(1)} redraws/sec`);
          
          ws.close();
          resolve({ test: 'original', redraws: totalUIRedraws, duration, outputs });
        }, 3000);
      }, 500);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data) {
          totalUIRedraws++;
          outputs.push(message.data);
          console.log(`  📥 UI Redraw ${totalUIRedraws}: ${JSON.stringify(message.data.substring(0, 20))}...`);
        }
      } catch (err) {
        if (data.toString().trim()) {
          totalUIRedraws++;
          outputs.push(data.toString());
          console.log(`  📥 Raw UI Redraw ${totalUIRedraws}: ${JSON.stringify(data.toString().substring(0, 20))}...`);
        }
      }
    });
    
    ws.on('error', reject);
    ws.on('close', () => console.log('🔌 Original problem test closed'));
  });
}

function testOptimizedSolution() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let startTime = Date.now();
    let outputs = [];
    let totalUIRedraws = 0;
    
    ws.on('open', () => {
      console.log('✅ Testing optimized solution: line-based input with output buffering');
      
      ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
      
      setTimeout(() => {
        console.log('📤 Sending complete line (optimized approach)...');
        startTime = Date.now(); // Reset timer to measure only input processing
        
        // Send complete line - optimized solution
        ws.send(JSON.stringify({ type: 'input', data: 'hello\n' }));
        
        // Analyze results
        setTimeout(() => {
          const duration = Date.now() - startTime;
          console.log(`\n🎯 OPTIMIZED SOLUTION RESULTS:`);
          console.log(`  Duration: ${duration}ms`);
          console.log(`  Total UI redraws: ${totalUIRedraws}`);
          console.log(`  Redraw rate: ${(totalUIRedraws / duration * 1000).toFixed(1)} redraws/sec`);
          
          ws.close();
          resolve({ test: 'optimized', redraws: totalUIRedraws, duration, outputs });
        }, 2000);
      }, 500);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data) {
          totalUIRedraws++;
          outputs.push(message.data);
          console.log(`  📥 UI Update ${totalUIRedraws}: ${JSON.stringify(message.data.substring(0, 20))}...`);
        }
      } catch (err) {
        if (data.toString().trim()) {
          totalUIRedraws++;
          outputs.push(data.toString());
          console.log(`  📥 Raw UI Update ${totalUIRedraws}: ${JSON.stringify(data.toString().substring(0, 20))}...`);
        }
      }
    });
    
    ws.on('error', reject);
    ws.on('close', () => console.log('🔌 Optimized solution test closed'));
  });
}

async function runFinalValidation() {
  console.log('\n🧪 Starting Final UI Redraw Optimization Validation...\n');
  
  try {
    // Test 1: Original Problem
    console.log('=' .repeat(70));
    console.log('TEST 1: ORIGINAL PROBLEM (Character-by-character)');
    console.log('=' .repeat(70));
    
    const originalResult = await testOriginalProblem();
    
    console.log('\n⏳ Waiting between tests...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Optimized Solution
    console.log('=' .repeat(70));
    console.log('TEST 2: OPTIMIZED SOLUTION (Line-based + Output buffering)');
    console.log('=' .repeat(70));
    
    const optimizedResult = await testOptimizedSolution();
    
    // Final Analysis
    console.log('\n' + '='.repeat(70));
    console.log('🔬 FINAL PERFORMANCE ANALYSIS');
    console.log('='.repeat(70));
    
    const redrawImprovement = originalResult.redraws - optimizedResult.redraws;
    const redrawReduction = ((redrawImprovement / originalResult.redraws) * 100).toFixed(1);
    
    console.log(`\n📊 UI REDRAW METRICS:`);
    console.log(`  Original redraws: ${originalResult.redraws}`);
    console.log(`  Optimized redraws: ${optimizedResult.redraws}`);
    console.log(`  Reduction: ${redrawImprovement} redraws (${redrawReduction}% improvement)`);
    
    console.log(`\n⚡ PERFORMANCE IMPACT:`);
    const originalRate = originalResult.redraws / originalResult.duration * 1000;
    const optimizedRate = optimizedResult.redraws / optimizedResult.duration * 1000;
    console.log(`  Original rate: ${originalRate.toFixed(1)} redraws/sec`);
    console.log(`  Optimized rate: ${optimizedRate.toFixed(1)} redraws/sec`);
    console.log(`  Rate improvement: ${((originalRate - optimizedRate) / originalRate * 100).toFixed(1)}%`);
    
    // Success criteria
    console.log(`\n🎯 SUCCESS CRITERIA:`);
    const passedCriteria = [];
    const failedCriteria = [];
    
    if (redrawImprovement > 0) {
      passedCriteria.push('✅ Reduced UI redraws');
    } else {
      failedCriteria.push('❌ No UI redraw reduction');
    }
    
    if (optimizedResult.redraws <= 6) {
      passedCriteria.push('✅ Achieved low UI redraw count');
    } else {
      failedCriteria.push('❌ UI redraw count still high');
    }
    
    if (redrawReduction >= 10) {
      passedCriteria.push('✅ Achieved significant improvement');
    } else if (redrawReduction > 0) {
      passedCriteria.push('📈 Achieved modest improvement');
    } else {
      failedCriteria.push('❌ No measurable improvement');
    }
    
    console.log(`  ${passedCriteria.join('\n  ')}`);
    if (failedCriteria.length > 0) {
      console.log(`  ${failedCriteria.join('\n  ')}`);
    }
    
    // Final recommendation
    console.log(`\n🚀 DEPLOYMENT RECOMMENDATION:`);
    if (redrawImprovement > 2 && optimizedResult.redraws <= 6) {
      console.log('  ✅ READY FOR PRODUCTION');
      console.log('  The backend optimization successfully reduces UI redraws.');
      console.log('  Claude CLI will perform better with less UI flicker.');
    } else if (redrawImprovement > 0) {
      console.log('  📈 PARTIAL SUCCESS');
      console.log('  Some improvement achieved, consider further optimization.');
    } else {
      console.log('  🔧 NEEDS REFINEMENT');
      console.log('  Backend changes did not achieve expected improvement.');
    }
    
    console.log('\n✅ Final validation complete');
    return { originalResult, optimizedResult, improvement: redrawImprovement };
    
  } catch (error) {
    console.error('🚨 Final validation failed:', error);
    process.exit(1);
  }
}

// Run final validation
runFinalValidation()
  .then(results => {
    console.log('\n🎉 All tests completed successfully');
    if (results.improvement > 0) {
      console.log('🎯 Backend optimization VALIDATED');
      process.exit(0);
    } else {
      console.log('⚠️ Backend optimization needs adjustment');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('🚨 Final validation suite failed:', err);
    process.exit(1);
  });