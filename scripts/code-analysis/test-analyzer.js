#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');

class TestAnalyzer {
  constructor() {
    this.testPatterns = {
      testFiles: [
        /\.test\.(js|ts|jsx|tsx)$/,
        /\.spec\.(js|ts|jsx|tsx)$/,
        /__tests__\/.*\.(js|ts|jsx|tsx)$/
      ],
      testFrameworks: [
        { name: 'Jest', patterns: [/describe\s*\(/g, /it\s*\(/g, /test\s*\(/g] },
        { name: 'Mocha', patterns: [/describe\s*\(/g, /it\s*\(/g] },
        { name: 'Jasmine', patterns: [/describe\s*\(/g, /it\s*\(/g] },
        { name: 'React Testing Library', patterns: [/render\s*\(/g, /screen\./g, /fireEvent\./g] },
        { name: 'Playwright', patterns: [/page\./g, /expect\s*\(/g, /test\s*\(/g] }
      ]
    };

    this.coverageRules = {
      critical: [
        {
          name: 'No Tests for New Code',
          description: 'New code added without corresponding tests',
          fix: 'Add unit tests for new functions and components',
          impact: 'high'
        },
        {
          name: 'Critical Path Untested',
          description: 'Critical system paths lack test coverage',
          fix: 'Add integration tests for critical workflows',
          impact: 'critical'
        }
      ],
      high: [
        {
          name: 'Low Test Coverage',
          description: 'Test coverage below acceptable threshold',
          fix: 'Add tests to reach minimum coverage requirements',
          impact: 'medium'
        },
        {
          name: 'Missing Edge Case Tests',
          description: 'Error handling and edge cases not tested',
          fix: 'Add tests for error scenarios and boundary conditions',
          impact: 'medium'
        }
      ],
      medium: [
        {
          name: 'Outdated Test Snapshots',
          description: 'Test snapshots may be outdated',
          fix: 'Review and update test snapshots if needed',
          impact: 'low'
        }
      ]
    };

    // Claude-specific test requirements
    this.claudeSpecificTests = {
      'simple-backend.js': [
        'SSE connection handling',
        'PTY process management',
        'Instance lifecycle',
        'Error handling',
        'Connection cleanup'
      ],
      'ClaudeInstanceManager.ts': [
        'Instance creation/deletion',
        'State management',
        'Connection handling',
        'Error recovery'
      ],
      'EnhancedSSEInterface.tsx': [
        'Component rendering',
        'Event handling',
        'Connection state management',
        'Error display'
      ]
    };
  }

  async analyzeTestCoverage(files, diffData = '') {
    const results = {
      critical: [],
      high: [],
      medium: [],
      coverage: {
        overall: 0,
        byFile: {},
        missing: [],
        existing: []
      },
      testMetrics: {
        totalTests: 0,
        testFiles: 0,
        frameworks: [],
        patterns: {}
      },
      summary: {
        totalIssues: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        coverageScore: 0,
        riskScore: 'low'
      }
    };

    // Analyze existing test files
    await this.analyzeExistingTests(results);

    // Analyze coverage for changed files
    for (const filePath of files) {
      if (!filePath || typeof filePath !== 'string') continue;
      
      try {
        const fullPath = path.resolve(filePath);
        if (!fs.existsSync(fullPath)) continue;
        
        const content = fs.readFileSync(fullPath, 'utf8');
        const fileAnalysis = this.analyzeFileForTests(content, filePath, diffData);
        
        // Merge results
        Object.keys(fileAnalysis).forEach(key => {
          if (Array.isArray(results[key]) && Array.isArray(fileAnalysis[key])) {
            results[key].push(...fileAnalysis[key]);
          } else if (key === 'coverage' && fileAnalysis.coverage) {
            Object.assign(results.coverage.byFile, fileAnalysis.coverage.byFile || {});
            results.coverage.missing.push(...(fileAnalysis.coverage.missing || []));
          }
        });
        
      } catch (error) {
        console.error(`Error analyzing tests for ${filePath}:`, error.message);
      }
    }

    // Calculate summary
    results.summary.criticalCount = results.critical.length;
    results.summary.highCount = results.high.length;
    results.summary.mediumCount = results.medium.length;
    results.summary.totalIssues = results.critical.length + results.high.length + results.medium.length;

    // Calculate coverage score
    const coverageValues = Object.values(results.coverage.byFile);
    results.summary.coverageScore = coverageValues.length > 0 
      ? Math.round(coverageValues.reduce((a, b) => a + b, 0) / coverageValues.length)
      : 0;

    results.coverage.overall = results.summary.coverageScore;

    // Calculate risk score
    if (results.critical.length > 0 || results.summary.coverageScore < 50) {
      results.summary.riskScore = 'critical';
    } else if (results.high.length > 0 || results.summary.coverageScore < 70) {
      results.summary.riskScore = 'high';
    } else if (results.medium.length > 0 || results.summary.coverageScore < 85) {
      results.summary.riskScore = 'medium';
    }

    return results;
  }

  async analyzeExistingTests(results) {
    const testDirs = ['tests', 'test', '__tests__', 'spec'];
    const rootDir = process.cwd();

    for (const testDir of testDirs) {
      const testPath = path.join(rootDir, testDir);
      if (fs.existsSync(testPath)) {
        await this.scanTestDirectory(testPath, results);
      }
    }

    // Also check for test files alongside source files
    await this.scanForColocatedTests(rootDir, results);
  }

  async scanTestDirectory(dirPath, results) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanTestDirectory(fullPath, results);
        } else if (this.isTestFile(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          this.analyzeTestFile(content, fullPath, results);
        }
      }
    } catch (error) {
      console.warn(`Error scanning test directory ${dirPath}:`, error.message);
    }
  }

  async scanForColocatedTests(dirPath, results) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          await this.scanForColocatedTests(fullPath, results);
        } else if (this.isTestFile(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          this.analyzeTestFile(content, fullPath, results);
        }
      }
    } catch (error) {
      console.warn(`Error scanning for colocated tests in ${dirPath}:`, error.message);
    }
  }

  isTestFile(filename) {
    return this.testPatterns.testFiles.some(pattern => pattern.test(filename));
  }

  analyzeTestFile(content, filePath, results) {
    results.testMetrics.testFiles++;
    
    // Count test cases
    const testCases = this.countTestCases(content);
    results.testMetrics.totalTests += testCases;
    
    // Detect frameworks
    this.testPatterns.testFrameworks.forEach(framework => {
      const hasFramework = framework.patterns.some(pattern => pattern.test(content));
      if (hasFramework && !results.testMetrics.frameworks.includes(framework.name)) {
        results.testMetrics.frameworks.push(framework.name);
      }
    });
    
    // Store test file info
    results.coverage.existing.push({
      file: filePath,
      testCases: testCases,
      frameworks: this.detectFrameworks(content)
    });
  }

  countTestCases(content) {
    const testPatterns = [
      /\btest\s*\(\s*['"`]/g,
      /\bit\s*\(\s*['"`]/g,
      /\bshould\s*\(\s*['"`]/g
    ];
    
    let total = 0;
    testPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) total += matches.length;
    });
    
    return total;
  }

  detectFrameworks(content) {
    const detected = [];
    this.testPatterns.testFrameworks.forEach(framework => {
      const hasFramework = framework.patterns.some(pattern => pattern.test(content));
      if (hasFramework) detected.push(framework.name);
    });
    return detected;
  }

  analyzeFileForTests(content, filePath, diffData) {
    const results = {
      critical: [],
      high: [],
      medium: [],
      coverage: {
        byFile: {},
        missing: []
      }
    };

    // Check if file has corresponding test file
    const hasTests = this.hasCorrespondingTests(filePath);
    const isNewFile = diffData && diffData.includes('new file');
    const isSignificantChange = this.isSignificantChange(content, diffData);

    // Estimate coverage for this file
    const estimatedCoverage = this.estimateCoverage(content, filePath);
    results.coverage.byFile[filePath] = estimatedCoverage;

    // Check for critical test issues
    if (!hasTests && (isNewFile || isSignificantChange)) {
      results.critical.push({
        rule: 'No Tests for New Code',
        description: 'New or significantly modified code lacks test coverage',
        fix: 'Add comprehensive test suite for this file',
        file: filePath,
        line: 1,
        severity: 'critical',
        inDiff: true,
        impact: 'high',
        timestamp: new Date().toISOString()
      });
    }

    // Check for Claude-specific test requirements
    const fileName = path.basename(filePath);
    if (this.claudeSpecificTests[fileName]) {
      const requiredTests = this.claudeSpecificTests[fileName];
      const missingTests = this.checkRequiredTests(content, requiredTests, filePath);
      
      results.critical.push(...missingTests.map(test => ({
        rule: 'Critical Path Untested',
        description: `Missing test for ${test}`,
        fix: `Add integration test for ${test}`,
        file: filePath,
        line: 1,
        severity: 'critical',
        inDiff: diffData && diffData.length > 0,
        impact: 'critical',
        timestamp: new Date().toISOString()
      })));
    }

    // Check for low coverage
    if (estimatedCoverage < 70) {
      results.high.push({
        rule: 'Low Test Coverage',
        description: `Estimated coverage: ${estimatedCoverage}%`,
        fix: 'Add more comprehensive tests',
        file: filePath,
        line: 1,
        severity: 'high',
        inDiff: diffData && diffData.length > 0,
        impact: 'medium',
        timestamp: new Date().toISOString()
      });
    }

    // Check for error handling tests
    const hasErrorHandling = /try\s*\{|catch\s*\(|throw\s+/g.test(content);
    const hasErrorTests = this.hasErrorHandlingTests(filePath);
    
    if (hasErrorHandling && !hasErrorTests) {
      results.high.push({
        rule: 'Missing Edge Case Tests',
        description: 'Error handling code lacks corresponding tests',
        fix: 'Add tests for error scenarios and exception handling',
        file: filePath,
        line: 1,
        severity: 'high',
        inDiff: diffData && diffData.length > 0,
        impact: 'medium',
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  hasCorrespondingTests(filePath) {
    const dir = path.dirname(filePath);
    const name = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath);
    
    // Common test file patterns
    const testPatterns = [
      `${name}.test${ext}`,
      `${name}.spec${ext}`,
      `${name}.test.js`,
      `${name}.spec.js`,
      path.join('__tests__', `${name}${ext}`),
      path.join('tests', `${name}.test.js`),
      path.join('test', `${name}.test.js`)
    ];
    
    return testPatterns.some(pattern => {
      const testPath = path.resolve(dir, pattern);
      return fs.existsSync(testPath);
    });
  }

  isSignificantChange(content, diffData) {
    if (!diffData) return false;
    
    // Count added/modified functions
    const functionsInDiff = (diffData.match(/^\+.*(?:function|const.*=|class\s+)/gm) || []).length;
    const linesInDiff = (diffData.match(/^\+/gm) || []).length;
    
    return functionsInDiff > 2 || linesInDiff > 50;
  }

  estimateCoverage(content, filePath) {
    // Simple heuristic for coverage estimation
    const functions = (content.match(/function\s+\w+|const\s+\w+\s*=.*=>/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    const methods = (content.match(/\w+\s*\([^)]*\)\s*\{/g) || []).length;
    
    const totalTestable = functions + classes + methods;
    
    if (totalTestable === 0) return 100; // No testable code
    
    // Check if has tests
    const hasTests = this.hasCorrespondingTests(filePath);
    
    if (!hasTests) return 0;
    
    // Estimate based on complexity and file type
    const isComponent = /\.(tsx|jsx)$/.test(filePath);
    const isBackend = /backend|server|api/i.test(filePath);
    
    let baseScore = 50;
    if (isComponent) baseScore = 60; // React components often have better test tooling
    if (isBackend) baseScore = 70; // Backend code often has better test coverage
    
    // Adjust based on complexity
    if (totalTestable > 20) baseScore -= 20;
    else if (totalTestable > 10) baseScore -= 10;
    
    return Math.max(0, Math.min(100, baseScore));
  }

  checkRequiredTests(content, requiredTests, filePath) {
    const missing = [];
    const testFileContent = this.getTestFileContent(filePath);
    
    if (!testFileContent) {
      return requiredTests; // All tests missing if no test file
    }
    
    requiredTests.forEach(testCase => {
      const testPatterns = [
        new RegExp(`test\\s*\\(.*${testCase}.*\\)`, 'i'),
        new RegExp(`it\\s*\\(.*${testCase}.*\\)`, 'i'),
        new RegExp(`describe\\s*\\(.*${testCase}.*\\)`, 'i')
      ];
      
      const hasTest = testPatterns.some(pattern => pattern.test(testFileContent));
      if (!hasTest) {
        missing.push(testCase);
      }
    });
    
    return missing;
  }

  getTestFileContent(filePath) {
    const dir = path.dirname(filePath);
    const name = path.basename(filePath, path.extname(filePath));
    
    const testPatterns = [
      `${name}.test.js`,
      `${name}.spec.js`,
      `${name}.test.ts`,
      `${name}.spec.ts`,
      path.join('__tests__', `${name}.test.js`),
      path.join('tests', `${name}.test.js`)
    ];
    
    for (const pattern of testPatterns) {
      const testPath = path.resolve(dir, pattern);
      if (fs.existsSync(testPath)) {
        return fs.readFileSync(testPath, 'utf8');
      }
    }
    
    return null;
  }

  hasErrorHandlingTests(filePath) {
    const testContent = this.getTestFileContent(filePath);
    if (!testContent) return false;
    
    const errorTestPatterns = [
      /error|Error|exception|Exception|throw|fail/i,
      /catch\s*\(/,
      /\.rejects\./,
      /toThrow/
    ];
    
    return errorTestPatterns.some(pattern => pattern.test(testContent));
  }

  generateReport(testResults) {
    let report = '# 🧪 Test Coverage Analysis Report\n\n';
    
    // Summary section
    report += `## Summary\n`;
    report += `- **Total Issues**: ${testResults.summary.totalIssues}\n`;
    report += `- **Critical**: ${testResults.summary.criticalCount}\n`;
    report += `- **High**: ${testResults.summary.highCount}\n`;
    report += `- **Medium**: ${testResults.summary.mediumCount}\n`;
    report += `- **Overall Coverage**: ${testResults.summary.coverageScore}%\n`;
    report += `- **Total Tests**: ${testResults.testMetrics.totalTests}\n`;
    report += `- **Test Files**: ${testResults.testMetrics.testFiles}\n`;
    report += `- **Risk Score**: ${testResults.summary.riskScore.toUpperCase()}\n\n`;

    // Test metrics
    if (testResults.testMetrics.frameworks.length > 0) {
      report += `## 🛠️ Testing Stack\n`;
      report += `- **Frameworks**: ${testResults.testMetrics.frameworks.join(', ')}\n`;
      report += `- **Test Files**: ${testResults.testMetrics.testFiles}\n`;
      report += `- **Total Test Cases**: ${testResults.testMetrics.totalTests}\n\n`;
    }

    // Critical test issues
    if (testResults.critical.length > 0) {
      report += '## 🚨 Critical Test Issues\n\n';
      testResults.critical.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.rule}\n`;
        report += `- **File**: \`${issue.file}:${issue.line}\`\n`;
        report += `- **Impact**: ${issue.impact.toUpperCase()}\n`;
        report += `- **Description**: ${issue.description}\n`;
        report += `- **Recommended Fix**: ${issue.fix}\n`;
        if (issue.inDiff) report += `- **Status**: ⚠️ New in this PR\n`;
        report += '\n';
      });
    }

    // High priority issues
    if (testResults.high.length > 0) {
      report += '## ⚠️ High Priority Test Issues\n\n';
      testResults.high.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.rule}\n`;
        report += `- **File**: \`${issue.file}:${issue.line}\`\n`;
        report += `- **Impact**: ${issue.impact.toUpperCase()}\n`;
        report += `- **Description**: ${issue.description}\n`;
        report += `- **Recommended Fix**: ${issue.fix}\n`;
        if (issue.inDiff) report += `- **Status**: ⚠️ New in this PR\n`;
        report += '\n';
      });
    }

    // Coverage by file
    if (Object.keys(testResults.coverage.byFile).length > 0) {
      report += '## 📊 Coverage by File\n\n';
      report += '| File | Estimated Coverage | Status |\n';
      report += '|------|-------------------|--------|\n';
      
      Object.entries(testResults.coverage.byFile).forEach(([file, coverage]) => {
        const status = coverage >= 80 ? '✅ Good' : coverage >= 60 ? '⚠️ Fair' : '❌ Poor';
        report += `| ${path.basename(file)} | ${coverage}% | ${status} |\n`;
      });
      report += '\n';
    }

    // Recommendations
    report += '## 🎯 Testing Recommendations\n\n';
    if (testResults.summary.criticalCount > 0) {
      report += '1. **Immediate Action Required**: Add tests for critical paths before merging\n';
      report += '2. **Test-First Development**: Implement TDD for new features\n';
    } else if (testResults.summary.coverageScore < 70) {
      report += '1. **Coverage Improvement**: Aim for minimum 80% test coverage\n';
    } else {
      report += '1. **Good Test Coverage**: Maintain current testing standards\n';
    }
    
    report += '2. **Continuous Testing**: Integrate tests into CI/CD pipeline\n';
    report += '3. **Test Automation**: Consider automated test generation tools\n';
    report += '4. **Integration Tests**: Add end-to-end testing for critical workflows\n';
    
    if (testResults.testMetrics.frameworks.length === 0) {
      report += '5. **Test Framework**: Set up a consistent testing framework\n';
    }
    
    report += '\n*Analysis completed at: ' + new Date().toISOString() + '*\n';

    return report;
  }

  formatForGitHub(testResults) {
    const report = this.generateReport(testResults);
    return {
      report: report,
      riskScore: testResults.summary.riskScore,
      totalIssues: testResults.summary.totalIssues,
      criticalCount: testResults.summary.criticalCount,
      coverageScore: testResults.summary.coverageScore,
      shouldBlock: testResults.summary.riskScore === 'critical'
    };
  }
}

// CLI Interface
program
  .name('test-analyzer')
  .description('AI-powered test coverage analysis for code reviews')
  .option('--pr <number>', 'Pull request number')
  .option('--files <files>', 'Comma-separated list of files to analyze')
  .option('--diff-data <data>', 'Diff data from PR')
  .option('--output <format>', 'Output format: json, markdown, github', 'github')
  .action(async (options) => {
    try {
      const analyzer = new TestAnalyzer();
      const files = options.files ? options.files.split(',').map(f => f.trim()) : [];
      
      if (files.length === 0) {
        console.error('No files specified for test analysis');
        process.exit(1);
      }
      
      const results = await analyzer.analyzeTestCoverage(files, options.diffData || '');
      
      if (options.output === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else if (options.output === 'markdown') {
        console.log(analyzer.generateReport(results));
      } else {
        // GitHub format
        const formatted = analyzer.formatForGitHub(results);
        console.log(JSON.stringify(formatted, null, 2));
      }
      
      // Exit with appropriate code
      if (results.summary.riskScore === 'critical') {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('Test analysis failed:', error.message);
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}

module.exports = TestAnalyzer;