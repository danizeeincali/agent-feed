#!/usr/bin/env node

/**
 * Browser Validation Test Runner
 * Orchestrates comprehensive browser testing after SimpleLauncher import fixes
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  retries: 1,
  workers: 2
};

const VALIDATION_TESTS = [
  {
    name: 'Simple Launcher Core Validation',
    file: 'simple-launcher-validation.spec.ts',
    critical: true,
    description: 'Tests SimpleLauncher component rendering and functionality'
  },
  {
    name: 'Import Resolution Regression',
    file: 'regression-import-validation.spec.ts', 
    critical: true,
    description: 'Validates no duplicate import or compilation errors'
  },
  {
    name: 'Browser Compatibility',
    file: 'browser-compatibility-validation.spec.ts',
    critical: true,
    description: 'Tests cross-browser compatibility and responsive design'
  }
];

async function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 ${description}...`);
    console.log(`   Command: ${command}`);
    
    const process = exec(command, { 
      cwd: '/workspaces/agent-feed/frontend',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout?.on('data', (data) => {
      stdout += data;
      process.stdout.write(data);
    });
    
    process.stderr?.on('data', (data) => {
      stderr += data;
      process.stderr.write(data);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully`);
        resolve({ stdout, stderr, code });
      } else {
        console.log(`❌ ${description} failed with code ${code}`);
        reject({ stdout, stderr, code, command });
      }
    });
  });
}

async function checkServerRunning() {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function startDevServer() {
  console.log('\n🚀 Starting development server...');
  
  const serverProcess = exec('npm run dev', {
    cwd: '/workspaces/agent-feed/frontend'
  });
  
  // Wait for server to start
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 30;
    
    const checkServer = async () => {
      attempts++;
      const isRunning = await checkServerRunning();
      
      if (isRunning) {
        console.log('✅ Development server is running');
        resolve(serverProcess);
      } else if (attempts >= maxAttempts) {
        reject(new Error('Server failed to start within timeout'));
      } else {
        setTimeout(checkServer, 1000);
      }
    };
    
    checkServer();
  });
}

async function runValidationTests() {
  console.log('\n📋 Running Browser Validation Tests');
  console.log('=====================================');
  
  const results = {
    passed: 0,
    failed: 0,
    total: VALIDATION_TESTS.length,
    details: []
  };
  
  for (const test of VALIDATION_TESTS) {
    try {
      console.log(`\n🧪 Running: ${test.name}`);
      console.log(`   ${test.description}`);
      
      const command = `npx playwright test tests/browser-validation/${test.file} --reporter=html --output-dir=test-results/${test.name.replace(/\s+/g, '-').toLowerCase()}`;
      
      const result = await runCommand(command, `Running ${test.name}`);
      
      results.passed++;
      results.details.push({
        test: test.name,
        status: 'PASSED',
        critical: test.critical,
        file: test.file
      });
      
    } catch (error) {
      results.failed++;
      results.details.push({
        test: test.name,
        status: 'FAILED',
        critical: test.critical,
        file: test.file,
        error: error.stderr || error.stdout || 'Unknown error'
      });
      
      if (test.critical) {
        console.log(`❌ CRITICAL TEST FAILED: ${test.name}`);
      }
    }
  }
  
  return results;
}

async function generateValidationReport(results) {
  const reportPath = '/workspaces/agent-feed/frontend/tests/browser-validation/validation-report.md';
  
  const report = `# SimpleLauncher Browser Validation Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Tests**: ${results.total}
- **Passed**: ${results.passed}
- **Failed**: ${results.failed}
- **Success Rate**: ${((results.passed / results.total) * 100).toFixed(1)}%

## Test Results

${results.details.map(test => `
### ${test.status === 'PASSED' ? '✅' : '❌'} ${test.test}

- **Status**: ${test.status}
- **Critical**: ${test.critical ? 'Yes' : 'No'}
- **File**: ${test.file}
${test.error ? `- **Error**: \`\`\`\n${test.error}\n\`\`\`` : ''}

`).join('')}

## Critical Issues

${results.details
  .filter(test => test.status === 'FAILED' && test.critical)
  .map(test => `- ${test.test}: ${test.error?.split('\n')[0] || 'Unknown error'}`)
  .join('\n') || 'None'}

## Validation Status

${results.failed === 0 
  ? '🎉 **ALL TESTS PASSED** - SimpleLauncher browser validation successful!' 
  : results.details.filter(t => t.critical && t.status === 'FAILED').length === 0
    ? '⚠️ **NON-CRITICAL FAILURES** - SimpleLauncher core functionality validated'
    : '🚨 **CRITICAL FAILURES** - SimpleLauncher requires fixes before deployment'
}

## Next Steps

${results.failed === 0 
  ? '- Deploy to production\n- Monitor performance in live environment'
  : '- Fix critical test failures\n- Re-run validation tests\n- Review error logs'
}

---
*Generated by Browser Validation Test Suite*
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n📊 Validation report generated: ${reportPath}`);
  
  return reportPath;
}

async function main() {
  console.log('🎯 SimpleLauncher Browser Validation Suite');
  console.log('==========================================');
  
  try {
    // Check if server is already running
    const serverRunning = await checkServerRunning();
    
    if (!serverRunning) {
      console.log('⚠️ Development server not running, attempting to start...');
      // Note: In a real scenario, we'd need to handle server startup
      // For now, assume server needs to be started manually
      console.log('❌ Please start the development server first:');
      console.log('   cd /workspaces/agent-feed/frontend && npm run dev');
      process.exit(1);
    }
    
    console.log('✅ Development server is running');
    
    // Run validation tests
    const results = await runValidationTests();
    
    // Generate report
    const reportPath = await generateValidationReport(results);
    
    // Final summary
    console.log('\n🏁 Validation Complete');
    console.log('=======================');
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.failed === 0) {
      console.log('\n🎉 SUCCESS: All browser validation tests passed!');
      console.log('   SimpleLauncher is ready for production deployment');
    } else {
      const criticalFailures = results.details.filter(t => t.critical && t.status === 'FAILED');
      if (criticalFailures.length === 0) {
        console.log('\n⚠️ WARNING: Some non-critical tests failed, but core functionality is validated');
      } else {
        console.log('\n🚨 FAILURE: Critical tests failed - requires fixes before deployment');
        criticalFailures.forEach(test => {
          console.log(`   - ${test.test}`);
        });
      }
    }
    
    console.log(`\n📊 Full report: ${reportPath}`);
    
    // Exit with appropriate code
    process.exit(results.details.filter(t => t.critical && t.status === 'FAILED').length === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Validation suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runValidationTests, generateValidationReport };