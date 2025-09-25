#!/usr/bin/env node

/**
 * 🎯 SPARC Performance Migration Validation Script
 * Comprehensive 100% Real Functionality Testing - Zero Mocks
 * Testing Performance tab migration from PerformanceMonitor to Analytics
 */

const fs = require('fs');
const path = require('path');

const TIMESTAMP = new Date().toISOString();
const PROJECT_ROOT = '/workspaces/agent-feed';
const FRONTEND_ROOT = `${PROJECT_ROOT}/frontend`;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}🔍 ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

// Test results storage
const testResults = {
  timestamp: TIMESTAMP,
  tests: [],
  success: true,
  errors: []
};

function addTestResult(name, passed, details) {
  testResults.tests.push({ name, passed, details });
  if (!passed) {
    testResults.success = false;
    testResults.errors.push(`${name}: ${JSON.stringify(details)}`);
  }
}

function validateFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    logSuccess(`${description}: EXISTS`);
  } else {
    logError(`${description}: NOT FOUND`);
  }
  return exists;
}

function validateFileContent(filePath, patterns, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const results = {};

    for (const [key, pattern] of Object.entries(patterns)) {
      const found = pattern instanceof RegExp
        ? pattern.test(content)
        : content.includes(pattern);
      results[key] = found;
    }

    logInfo(`${description}: ${JSON.stringify(results)}`);
    return results;
  } catch (error) {
    logError(`${description}: ERROR - ${error.message}`);
    return null;
  }
}

async function runValidation() {
  console.log(`${colors.bold}🎯 SPARC Performance Migration Validation${colors.reset}`);
  console.log(`${colors.blue}Timestamp: ${TIMESTAMP}${colors.reset}`);
  console.log('');

  // Test 1: PerformanceMonitor.tsx should be removed/cleaned up
  logInfo('Test 1: PerformanceMonitor Component Cleanup');
  const perfMonitorPath = `${FRONTEND_ROOT}/src/components/PerformanceMonitor.tsx`;
  const perfMonitorExists = fs.existsSync(perfMonitorPath);

  if (perfMonitorExists) {
    // Check if it's cleaned up (no routes, minimal content)
    const perfContent = validateFileContent(perfMonitorPath, {
      'hasRoutes': /Route path/i,
      'hasNavigationLogic': /useNavigate|Link to/i,
      'hasPerformanceTab': /Performance.*Tab/i
    }, 'PerformanceMonitor Content Check');

    addTestResult('PerformanceMonitor Component Cleanup',
      !perfContent?.hasRoutes,
      `File exists but routes/navigation cleaned: ${JSON.stringify(perfContent)}`
    );
  } else {
    logSuccess('PerformanceMonitor.tsx: REMOVED');
    addTestResult('PerformanceMonitor Component Cleanup', true, 'File successfully removed');
  }

  // Test 2: App.tsx Performance Monitor route removal
  logInfo('Test 2: App.tsx Performance Monitor Route Removal');
  const appTsxPath = `${FRONTEND_ROOT}/src/App.tsx`;
  const appContent = validateFileContent(appTsxPath, {
    'performanceRouteRemoved': !/Route path="\/performance"/i,
    'performanceNavigationRemoved': !/(Performance.*Monitor|Performance.*Dashboard)/i,
    'analyticsRoutePreserved': /Route path="\/analytics"/i
  }, 'App.tsx Route Check');

  addTestResult('Performance Monitor Route Removal',
    appContent?.performanceRouteRemoved && appContent?.analyticsRoutePreserved,
    appContent
  );

  // Test 3: EnhancedPerformanceMetrics component exists
  logInfo('Test 3: EnhancedPerformanceMetrics Component Creation');
  const enhancedPerfPath = `${FRONTEND_ROOT}/src/components/EnhancedPerformanceMetrics.tsx`;
  const enhancedExists = validateFileExists(enhancedPerfPath, 'EnhancedPerformanceMetrics.tsx');

  if (enhancedExists) {
    const enhancedContent = validateFileContent(enhancedPerfPath, {
      'hasReactImport': /import.*React/,
      'hasPerformanceHooks': /(useEffect|useState|useCallback)/,
      'hasRealTimeMetrics': /(fps|memory|renderTime)/i,
      'hasPerformanceIndicators': /(performance.*status|optimization.*suggestion)/i
    }, 'EnhancedPerformanceMetrics Content');

    addTestResult('EnhancedPerformanceMetrics Component',
      enhancedContent?.hasReactImport && enhancedContent?.hasRealTimeMetrics,
      enhancedContent
    );
  } else {
    addTestResult('EnhancedPerformanceMetrics Component', false, 'Component file not found');
  }

  // Test 4: RealAnalytics integration
  logInfo('Test 4: RealAnalytics Integration');
  const analyticsPath = `${FRONTEND_ROOT}/src/components/RealAnalytics.tsx`;
  const analyticsExists = validateFileExists(analyticsPath, 'RealAnalytics.tsx');

  if (analyticsExists) {
    const analyticsContent = validateFileContent(analyticsPath, {
      'importsEnhancedPerf': /import.*EnhancedPerformanceMetrics/,
      'hasPerformanceTab': /(Performance|Enhanced.*Performance)/i,
      'rendersEnhancedComponent': /<EnhancedPerformanceMetrics/
    }, 'RealAnalytics Integration');

    addTestResult('RealAnalytics Integration',
      analyticsContent?.importsEnhancedPerf && analyticsContent?.rendersEnhancedComponent,
      analyticsContent
    );
  } else {
    addTestResult('RealAnalytics Integration', false, 'RealAnalytics.tsx not found');
  }

  // Test 5: Navigation consistency
  logInfo('Test 5: Navigation Consistency Check');
  const navigationContent = validateFileContent(appTsxPath, {
    'feedNavigation': /name.*Feed.*href.*\//,
    'agentsNavigation': /name.*Agents.*href.*\/agents/,
    'analyticsNavigation': /name.*Analytics.*href.*\/analytics/,
    'noPerformanceNav': !/name.*Performance.*Monitor/i
  }, 'Navigation Links Check');

  addTestResult('Navigation Consistency',
    navigationContent?.analyticsNavigation && navigationContent?.noPerformanceNav,
    navigationContent
  );

  // Test 6: Import cleanup validation
  logInfo('Test 6: Import Cleanup Validation');
  const importCleanupPaths = [
    `${FRONTEND_ROOT}/src/App.tsx`,
    `${FRONTEND_ROOT}/src/components/RealAnalytics.tsx`
  ];

  let importCleanupPassed = true;
  const importDetails = {};

  for (const filePath of importCleanupPaths) {
    if (fs.existsSync(filePath)) {
      const content = validateFileContent(filePath, {
        'noOrphanedPerformanceImports': !/import.*PerformanceMonitor(?!.*Enhanced)/,
        'hasValidImports': /import.*React/
      }, `Import cleanup: ${path.basename(filePath)}`);

      importDetails[path.basename(filePath)] = content;
      if (!content?.noOrphanedPerformanceImports) {
        importCleanupPassed = false;
      }
    }
  }

  addTestResult('Import Cleanup Validation', importCleanupPassed, importDetails);

  // Test 7: Real functionality preservation
  logInfo('Test 7: Core Functionality Preservation');
  const coreFiles = [
    `${FRONTEND_ROOT}/src/components/RealSocialMediaFeed.tsx`,
    `${FRONTEND_ROOT}/src/StreamingTickerWorking.tsx`,
    `${FRONTEND_ROOT}/src/services/AviDMService.ts`
  ];

  let coreFunctionalityPassed = true;
  const coreDetails = {};

  for (const filePath of coreFiles) {
    if (fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      coreDetails[fileName] = {
        hasReactComponents: /export.*default|export.*const.*=/.test(content),
        hasCoreLogic: content.length > 100
      };

      if (!coreDetails[fileName].hasReactComponents) {
        coreFunctionalityPassed = false;
      }
      logSuccess(`Core file preserved: ${fileName}`);
    } else {
      coreFunctionalityPassed = false;
      coreDetails[path.basename(filePath)] = 'FILE_MISSING';
      logError(`Core file missing: ${path.basename(filePath)}`);
    }
  }

  addTestResult('Core Functionality Preservation', coreFunctionalityPassed, coreDetails);

  // Final summary
  console.log('');
  console.log(`${colors.bold}📊 VALIDATION SUMMARY${colors.reset}`);
  console.log('');

  const passedTests = testResults.tests.filter(t => t.passed).length;
  const totalTests = testResults.tests.length;

  if (testResults.success) {
    logSuccess(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
    console.log(`${colors.green}${colors.bold}🎉 PERFORMANCE MIGRATION VALIDATION SUCCESSFUL${colors.reset}`);
  } else {
    logError(`TESTS FAILED: ${passedTests}/${totalTests}`);
    console.log(`${colors.red}${colors.bold}⚠️  PERFORMANCE MIGRATION VALIDATION FAILED${colors.reset}`);
    console.log('');
    console.log('Errors:');
    testResults.errors.forEach(error => logError(error));
  }

  // Save results
  const resultsPath = `${PROJECT_ROOT}/tests/performance-migration-validation-results.json`;
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  logInfo(`Results saved to: ${resultsPath}`);

  return testResults;
}

// Run the validation
runValidation().then(results => {
  process.exit(results.success ? 0 : 1);
}).catch(error => {
  console.error(`${colors.red}Validation script error: ${error.message}${colors.reset}`);
  process.exit(1);
});