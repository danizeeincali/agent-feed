/**
 * TDD London School Results Processor
 * Processes test results with focus on interaction verification and mock contracts
 */

module.exports = (results) => {
  const { testResults, numTotalTests, numPassedTests, numFailedTests } = results;
  
  console.log('\n🧪 TDD London School Test Results Summary');
  console.log('==========================================');
  
  // Overall statistics
  console.log(`📊 Total Tests: ${numTotalTests}`);
  console.log(`✅ Passed: ${numPassedTests}`);
  console.log(`❌ Failed: ${numFailedTests}`);
  console.log(`📈 Pass Rate: ${((numPassedTests / numTotalTests) * 100).toFixed(1)}%`);
  
  // Categorize test results by London School TDD principles
  const categories = {
    mockInteractions: [],
    contractVerification: [],
    raceConditions: [],
    stateTransitions: [],
    integrationChain: []
  };
  
  testResults.forEach(testResult => {
    const { testResults: tests, testFilePath } = testResult;
    
    tests.forEach(test => {
      const { title, status, ancestorTitles } = test;
      const fullTitle = [...ancestorTitles, title].join(' › ');
      
      const testInfo = {
        file: testFilePath.split('/').pop(),
        title: fullTitle,
        status,
        duration: test.duration || 0
      };
      
      // Categorize by test focus
      if (fullTitle.includes('Mock') || fullTitle.includes('mock') || fullTitle.includes('interaction')) {
        categories.mockInteractions.push(testInfo);
      } else if (fullTitle.includes('Contract') || fullTitle.includes('contract') || fullTitle.includes('interface')) {
        categories.contractVerification.push(testInfo);
      } else if (fullTitle.includes('race') || fullTitle.includes('Race') || fullTitle.includes('concurrent')) {
        categories.raceConditions.push(testInfo);
      } else if (fullTitle.includes('state') || fullTitle.includes('State') || fullTitle.includes('transition')) {
        categories.stateTransitions.push(testInfo);
      } else if (fullTitle.includes('integration') || fullTitle.includes('Integration') || fullTitle.includes('chain')) {
        categories.integrationChain.push(testInfo);
      }
    });
  });
  
  // Report by category
  console.log('\n🎯 London School TDD Categories:');
  console.log('----------------------------------');
  
  Object.entries(categories).forEach(([category, tests]) => {
    if (tests.length > 0) {
      const passed = tests.filter(t => t.status === 'passed').length;
      const failed = tests.filter(t => t.status === 'failed').length;
      const categoryIcon = getCategoryIcon(category);
      
      console.log(`\n${categoryIcon} ${formatCategoryName(category)} (${tests.length} tests)`);
      console.log(`   ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
      
      if (failed > 0) {
        console.log('   Failed Tests:');
        tests.filter(t => t.status === 'failed').forEach(test => {
          console.log(`     • ${test.title}`);
        });
      }
    }
  });
  
  // London School TDD Principles Check
  console.log('\n🏛️ London School TDD Principles Adherence:');
  console.log('-------------------------------------------');
  
  const mockTests = categories.mockInteractions.length;
  const contractTests = categories.contractVerification.length;
  const totalTests = numTotalTests;
  
  const mockCoverage = ((mockTests / totalTests) * 100).toFixed(1);
  const contractCoverage = ((contractTests / totalTests) * 100).toFixed(1);
  
  console.log(`🎭 Mock-driven Testing: ${mockCoverage}% (${mockTests}/${totalTests} tests)`);
  console.log(`📋 Contract Verification: ${contractCoverage}% (${contractTests}/${totalTests} tests)`);
  
  if (mockCoverage < 60) {
    console.log('⚠️  Warning: Low mock-driven test coverage. Consider adding more interaction tests.');
  }
  
  if (contractCoverage < 20) {
    console.log('⚠️  Warning: Low contract verification coverage. Add more interface compliance tests.');
  }
  
  // Performance insights
  console.log('\n⚡ Performance Insights:');
  console.log('-------------------------');
  
  const allTests = Object.values(categories).flat();
  const slowTests = allTests.filter(t => t.duration > 1000).sort((a, b) => b.duration - a.duration);
  
  if (slowTests.length > 0) {
    console.log('🐌 Slow Tests (>1s):');
    slowTests.slice(0, 5).forEach(test => {
      console.log(`   • ${test.title} (${test.duration}ms)`);
    });
  } else {
    console.log('🚀 All tests completed in <1s - Excellent!');
  }
  
  // Recommendations
  if (numFailedTests > 0) {
    console.log('\n💡 TDD London School Recommendations:');
    console.log('--------------------------------------');
    console.log('1. Focus on mock interactions - ensure collaborators are properly isolated');
    console.log('2. Verify mock contracts match real implementations');
    console.log('3. Test behavior, not implementation details');
    console.log('4. Use outside-in development approach');
  }
  
  console.log('\n==========================================\n');
  
  return results;
};

function getCategoryIcon(category) {
  const icons = {
    mockInteractions: '🎭',
    contractVerification: '📋',
    raceConditions: '⚡',
    stateTransitions: '🔄',
    integrationChain: '🔗'
  };
  return icons[category] || '🧪';
}

function formatCategoryName(category) {
  const names = {
    mockInteractions: 'Mock Interactions',
    contractVerification: 'Contract Verification',
    raceConditions: 'Race Conditions',
    stateTransitions: 'State Transitions',
    integrationChain: 'Integration Chain'
  };
  return names[category] || category;
}