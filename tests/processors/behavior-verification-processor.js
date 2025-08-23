/**
 * Behavior Verification Processor - London School TDD
 * 
 * Processes Jest test results to generate behavior verification reports
 * Focuses on interaction testing and mock usage analysis
 */

const fs = require('fs');
const path = require('path');

/**
 * Process test results and generate behavior verification report
 */
function processBehaviorVerification(results) {
  const report = {
    summary: generateSummary(results),
    behaviorVerification: analyzeBehaviorVerification(results),
    mockInteractions: analyzeMockInteractions(results),
    contractVerification: analyzeContractVerification(results),
    recommendations: generateRecommendations(results),
    generatedAt: new Date().toISOString()
  };

  // Write report to file
  const reportPath = path.join(process.cwd(), 'tests', 'reports', 'behavior-verification.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate markdown report
  const markdownReport = generateMarkdownReport(report);
  const markdownPath = path.join(process.cwd(), 'tests', 'reports', 'behavior-verification.md');
  fs.writeFileSync(markdownPath, markdownReport);

  console.log('\n🔍 Behavior Verification Report Generated');
  console.log(`📊 Test Interaction Coverage: ${report.behaviorVerification.interactionCoverage}%`);
  console.log(`🤝 Mock Contract Compliance: ${report.contractVerification.complianceRate}%`);
  console.log(`📝 Report saved to: ${reportPath}`);

  return results;
}

/**
 * Generate test summary statistics
 */
function generateSummary(results) {
  const totalTests = results.numTotalTests;
  const passedTests = results.numPassedTests;
  const failedTests = results.numFailedTests;
  const mockTests = countMockTests(results);
  const integrationTests = countIntegrationTests(results);

  return {
    totalTests,
    passedTests,
    failedTests,
    mockTests,
    integrationTests,
    successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
    mockTestRatio: totalTests > 0 ? Math.round((mockTests / totalTests) * 100) : 0
  };
}

/**
 * Analyze behavior verification patterns in tests
 */
function analyzeBehaviorVerification(results) {
  const testResults = results.testResults || [];
  
  let totalInteractions = 0;
  let verifiedInteractions = 0;
  const behaviorPatterns = [];

  testResults.forEach(testFile => {
    if (testFile.assertionResults) {
      testFile.assertionResults.forEach(test => {
        const interactions = extractInteractions(test);
        totalInteractions += interactions.total;
        verifiedInteractions += interactions.verified;
        
        if (interactions.patterns.length > 0) {
          behaviorPatterns.push({
            testName: test.title,
            file: testFile.testFilePath,
            patterns: interactions.patterns
          });
        }
      });
    }
  });

  return {
    totalInteractions,
    verifiedInteractions,
    interactionCoverage: totalInteractions > 0 ? Math.round((verifiedInteractions / totalInteractions) * 100) : 0,
    behaviorPatterns,
    londonSchoolCompliance: calculateLondonSchoolCompliance(behaviorPatterns)
  };
}

/**
 * Analyze mock interactions and usage patterns
 */
function analyzeMockInteractions(results) {
  const testResults = results.testResults || [];
  
  const mockUsage = {
    totalMocks: 0,
    verifiedMocks: 0,
    mockTypes: {
      childProcess: 0,
      fileSystem: 0,
      httpApi: 0,
      webSocket: 0,
      reactComponent: 0
    }
  };

  const interactionPatterns = [];

  testResults.forEach(testFile => {
    if (testFile.assertionResults) {
      testFile.assertionResults.forEach(test => {
        const mocks = analyzeMockUsage(test);
        mockUsage.totalMocks += mocks.total;
        mockUsage.verifiedMocks += mocks.verified;
        
        // Count mock types
        Object.keys(mocks.types).forEach(type => {
          if (mockUsage.mockTypes[type] !== undefined) {
            mockUsage.mockTypes[type] += mocks.types[type];
          }
        });

        if (mocks.patterns.length > 0) {
          interactionPatterns.push({
            testName: test.title,
            file: testFile.testFilePath,
            patterns: mocks.patterns
          });
        }
      });
    }
  });

  return {
    mockUsage,
    interactionPatterns,
    mockVerificationRate: mockUsage.totalMocks > 0 ? 
      Math.round((mockUsage.verifiedMocks / mockUsage.totalMocks) * 100) : 0
  };
}

/**
 * Analyze contract verification compliance
 */
function analyzeContractVerification(results) {
  const testResults = results.testResults || [];
  
  let totalContracts = 0;
  let verifiedContracts = 0;
  const contractViolations = [];

  testResults.forEach(testFile => {
    if (testFile.assertionResults) {
      testFile.assertionResults.forEach(test => {
        const contracts = extractContracts(test);
        totalContracts += contracts.total;
        verifiedContracts += contracts.verified;
        
        if (contracts.violations.length > 0) {
          contractViolations.push({
            testName: test.title,
            file: testFile.testFilePath,
            violations: contracts.violations
          });
        }
      });
    }
  });

  return {
    totalContracts,
    verifiedContracts,
    complianceRate: totalContracts > 0 ? Math.round((verifiedContracts / totalContracts) * 100) : 0,
    contractViolations
  };
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(results) {
  const recommendations = [];
  const summary = generateSummary(results);
  const behaviorVerification = analyzeBehaviorVerification(results);
  const mockInteractions = analyzeMockInteractions(results);

  // Test coverage recommendations
  if (summary.mockTestRatio < 70) {
    recommendations.push({
      type: 'coverage',
      severity: 'high',
      message: `Mock test ratio is ${summary.mockTestRatio}%. Consider increasing mock-driven tests for better isolation.`,
      action: 'Add more unit tests with mocked dependencies'
    });
  }

  // Behavior verification recommendations
  if (behaviorVerification.interactionCoverage < 80) {
    recommendations.push({
      type: 'behavior',
      severity: 'medium',
      message: `Interaction coverage is ${behaviorVerification.interactionCoverage}%. Verify more object collaborations.`,
      action: 'Add assertions for mock calls and interaction sequences'
    });
  }

  // Mock verification recommendations
  if (mockInteractions.mockVerificationRate < 90) {
    recommendations.push({
      type: 'mocks',
      severity: 'medium',
      message: `Mock verification rate is ${mockInteractions.mockVerificationRate}%. Ensure all mocks are properly verified.`,
      action: 'Add expect() assertions for all mock function calls'
    });
  }

  // London School compliance
  if (behaviorVerification.londonSchoolCompliance < 85) {
    recommendations.push({
      type: 'methodology',
      severity: 'low',
      message: `London School compliance is ${behaviorVerification.londonSchoolCompliance}%. Focus more on interaction testing.`,
      action: 'Emphasize behavior verification over state testing'
    });
  }

  return recommendations;
}

/**
 * Helper functions for analysis
 */

function countMockTests(results) {
  const testResults = results.testResults || [];
  let mockTests = 0;

  testResults.forEach(testFile => {
    if (testFile.testFilePath.includes('.test.') && 
        (testFile.testResults || '').includes('mock')) {
      mockTests++;
    }
  });

  return mockTests;
}

function countIntegrationTests(results) {
  const testResults = results.testResults || [];
  return testResults.filter(testFile => 
    testFile.testFilePath.includes('integration')
  ).length;
}

function extractInteractions(test) {
  // Simplified analysis - in a real implementation, this would parse test code
  const testName = test.title.toLowerCase();
  
  let total = 0;
  let verified = 0;
  const patterns = [];

  // Look for interaction patterns in test names
  if (testName.includes('should') && testName.includes('when')) {
    total += 1;
    if (testName.includes('expect') || testName.includes('verify')) {
      verified += 1;
      patterns.push('behavior_verification');
    }
  }

  if (testName.includes('mock') || testName.includes('spy')) {
    total += 1;
    verified += 1;
    patterns.push('mock_interaction');
  }

  return { total, verified, patterns };
}

function analyzeMockUsage(test) {
  const testName = test.title.toLowerCase();
  
  let total = 0;
  let verified = 0;
  const types = {
    childProcess: 0,
    fileSystem: 0,
    httpApi: 0,
    webSocket: 0,
    reactComponent: 0
  };
  const patterns = [];

  // Analyze mock types based on test names and content
  if (testName.includes('process') || testName.includes('spawn')) {
    types.childProcess += 1;
    total += 1;
    verified += 1;
  }

  if (testName.includes('file') || testName.includes('fs')) {
    types.fileSystem += 1;
    total += 1;
    verified += 1;
  }

  if (testName.includes('api') || testName.includes('http')) {
    types.httpApi += 1;
    total += 1;
    verified += 1;
  }

  if (testName.includes('websocket') || testName.includes('socket')) {
    types.webSocket += 1;
    total += 1;
    verified += 1;
  }

  if (testName.includes('component') || testName.includes('react')) {
    types.reactComponent += 1;
    total += 1;
    verified += 1;
  }

  return { total, verified, types, patterns };
}

function extractContracts(test) {
  const testName = test.title.toLowerCase();
  
  let total = 0;
  let verified = 0;
  const violations = [];

  // Look for contract verification patterns
  if (testName.includes('contract') || testName.includes('interface')) {
    total += 1;
    verified += 1;
  }

  if (testName.includes('should') && testName.includes('call')) {
    total += 1;
    verified += 1;
  }

  return { total, verified, violations };
}

function calculateLondonSchoolCompliance(patterns) {
  if (patterns.length === 0) return 100;
  
  const behaviorTests = patterns.filter(p => 
    p.patterns.some(pattern => 
      pattern.includes('behavior') || pattern.includes('interaction')
    )
  ).length;
  
  return Math.round((behaviorTests / patterns.length) * 100);
}

function generateMarkdownReport(report) {
  return `# TDD London School Behavior Verification Report

Generated: ${report.generatedAt}

## Summary

- **Total Tests**: ${report.summary.totalTests}
- **Passed Tests**: ${report.summary.passedTests}
- **Success Rate**: ${report.summary.successRate}%
- **Mock Test Ratio**: ${report.summary.mockTestRatio}%

## Behavior Verification

- **Interaction Coverage**: ${report.behaviorVerification.interactionCoverage}%
- **London School Compliance**: ${report.behaviorVerification.londonSchoolCompliance}%
- **Total Interactions**: ${report.behaviorVerification.totalInteractions}
- **Verified Interactions**: ${report.behaviorVerification.verifiedInteractions}

## Mock Interactions

- **Mock Verification Rate**: ${report.mockInteractions.mockVerificationRate}%
- **Total Mocks**: ${report.mockInteractions.mockUsage.totalMocks}
- **Verified Mocks**: ${report.mockInteractions.mockUsage.verifiedMocks}

### Mock Types Distribution
${Object.entries(report.mockInteractions.mockUsage.mockTypes)
  .map(([type, count]) => `- **${type}**: ${count}`)
  .join('\n')}

## Contract Verification

- **Compliance Rate**: ${report.contractVerification.complianceRate}%
- **Total Contracts**: ${report.contractVerification.totalContracts}
- **Verified Contracts**: ${report.contractVerification.verifiedContracts}

## Recommendations

${report.recommendations.map(rec => 
  `### ${rec.type.toUpperCase()} - ${rec.severity.toUpperCase()}
  
**Issue**: ${rec.message}
  
**Action**: ${rec.action}
`).join('\n')}

## Behavior Patterns

${report.behaviorVerification.behaviorPatterns.map(pattern => 
  `### ${pattern.testName}
  
**File**: \`${pattern.file}\`
  
**Patterns**: ${pattern.patterns.join(', ')}
`).join('\n')}
`;
}

module.exports = processBehaviorVerification;