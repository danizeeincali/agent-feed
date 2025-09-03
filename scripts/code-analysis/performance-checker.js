#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const acorn = require('acorn');
const walk = require('acorn-walk');

class PerformanceChecker {
  constructor() {
    this.performanceRules = {
      critical: [
        {
          name: 'Blocking Synchronous Operations',
          patterns: [
            /\.readFileSync\(/g,
            /\.writeFileSync\(/g,
            /\.execSync\(/g,
            /\.readdirSync\(/g
          ],
          description: 'Synchronous operations block the event loop',
          fix: 'Use asynchronous alternatives (readFile, writeFile, exec, readdir)',
          impact: 'high'
        },
        {
          name: 'Infinite Loop Risk',
          patterns: [
            /while\s*\(\s*true\s*\)/g,
            /for\s*\(\s*;\s*;\s*\)/g
          ],
          description: 'Potential infinite loop detected',
          fix: 'Add proper loop termination conditions',
          impact: 'critical'
        },
        {
          name: 'Memory Leak - Event Listeners',
          patterns: [
            /\.on\s*\(\s*['"][^'"]*['"],.*\)(?!.*\.removeListener|.*\.off)/g,
            /\.addEventListener\s*\([^)]*\)(?!.*removeEventListener)/g
          ],
          description: 'Event listeners without cleanup may cause memory leaks',
          fix: 'Add corresponding removeListener/removeEventListener calls',
          impact: 'high'
        }
      ],
      
      high: [
        {
          name: 'N+1 Query Pattern',
          patterns: [
            /for\s*\([^{]*\)\s*\{[^}]*(?:query|find|select|exec)\s*\(/g,
            /\.map\s*\([^}]*(?:query|find|select|exec)\s*\(/g
          ],
          description: 'Potential N+1 query problem in loops',
          fix: 'Use bulk queries or eager loading',
          impact: 'high'
        },
        {
          name: 'Large Object Creation in Loops',
          patterns: [
            /for\s*\([^{]*\)\s*\{[^}]*new\s+(?:Array|Object|Map|Set)\s*\(/g,
            /\.map\s*\([^}]*new\s+(?:Array|Object|Map|Set)\s*\(/g
          ],
          description: 'Creating large objects inside loops',
          fix: 'Move object creation outside loops when possible',
          impact: 'medium'
        },
        {
          name: 'Expensive Operations in Render',
          patterns: [
            /return\s*\([^}]*(?:JSON\.parse|JSON\.stringify|\.sort\(\)|\.filter\(|\.map\()/g
          ],
          description: 'Expensive operations in render functions',
          fix: 'Use useMemo or move calculations outside render',
          impact: 'high'
        }
      ],
      
      medium: [
        {
          name: 'Regular Expression Performance',
          patterns: [
            /new\s+RegExp\s*\(/g,
            /\/.*\+.*\/[gim]*/g
          ],
          description: 'Complex regex patterns may impact performance',
          fix: 'Optimize regex patterns or cache compiled expressions',
          impact: 'low'
        },
        {
          name: 'String Concatenation in Loops',
          patterns: [
            /for\s*\([^{]*\)\s*\{[^}]*\w+\s*\+=\s*['"`]/g
          ],
          description: 'String concatenation in loops is inefficient',
          fix: 'Use array join() or template literals',
          impact: 'medium'
        }
      ]
    };

    // Claude-specific performance patterns
    this.claudeSpecificRules = {
      critical: [
        {
          name: 'SSE Broadcast Performance',
          patterns: [
            /broadcastToConnections\s*\([^)]*(?:JSON\.stringify|\.map\(|\.filter\()/g
          ],
          description: 'Expensive operations in SSE broadcast path',
          fix: 'Pre-process data before broadcasting to multiple connections',
          impact: 'critical'
        },
        {
          name: 'PTY Process Memory',
          patterns: [
            /pty\.spawn(?!.*maxBuffer|.*timeout)/g
          ],
          description: 'PTY processes without memory/timeout limits',
          fix: 'Add maxBuffer and timeout options to PTY spawn',
          impact: 'high'
        }
      ],
      high: [
        {
          name: 'Instance Manager Scaling',
          patterns: [
            /instances\s*\[\s*\]\s*\.push(?!.*length.*>.*\d+)/g,
            /createInstance(?!.*limit|.*throttle)/g
          ],
          description: 'Instance creation without scaling limits',
          fix: 'Add instance limits and throttling',
          impact: 'high'
        }
      ]
    };
  }

  async analyzeFiles(files, diffData = '') {
    const results = {
      critical: [],
      high: [],
      medium: [],
      metrics: {
        complexity: {},
        performance: {},
        memory: {}
      },
      summary: {
        totalIssues: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        averageComplexity: 0,
        riskScore: 'low'
      }
    };

    for (const filePath of files) {
      if (!filePath || typeof filePath !== 'string') continue;
      
      try {
        const fullPath = path.resolve(filePath);
        if (!fs.existsSync(fullPath)) continue;
        
        const content = fs.readFileSync(fullPath, 'utf8');
        const fileResults = await this.analyzeFileContent(content, filePath, diffData);
        
        // Merge results
        Object.keys(fileResults).forEach(key => {
          if (Array.isArray(results[key]) && Array.isArray(fileResults[key])) {
            results[key].push(...fileResults[key]);
          } else if (key === 'metrics') {
            Object.assign(results.metrics, fileResults.metrics);
          }
        });
        
      } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error.message);
      }
    }

    // Calculate summary
    results.summary.criticalCount = results.critical.length;
    results.summary.highCount = results.high.length;
    results.summary.mediumCount = results.medium.length;
    results.summary.totalIssues = results.critical.length + results.high.length + results.medium.length;

    // Calculate average complexity
    const complexities = Object.values(results.metrics.complexity);
    results.summary.averageComplexity = complexities.length > 0 
      ? Math.round(complexities.reduce((a, b) => a + b, 0) / complexities.length)
      : 0;

    // Calculate risk score
    if (results.critical.length > 0 || results.summary.averageComplexity > 15) {
      results.summary.riskScore = 'critical';
    } else if (results.high.length > 0 || results.summary.averageComplexity > 10) {
      results.summary.riskScore = 'high';
    } else if (results.medium.length > 2 || results.summary.averageComplexity > 7) {
      results.summary.riskScore = 'medium';
    }

    return results;
  }

  async analyzeFileContent(content, filePath, diffData = '') {
    const results = {
      critical: [],
      high: [],
      medium: [],
      metrics: {
        complexity: {},
        performance: {},
        memory: {}
      }
    };

    // Pattern-based analysis
    ['critical', 'high', 'medium'].forEach(severity => {
      const rules = [...(this.performanceRules[severity] || [])];
      
      // Add Claude-specific rules
      if (this.claudeSpecificRules[severity]) {
        rules.push(...this.claudeSpecificRules[severity]);
      }
      
      rules.forEach(rule => {
        rule.patterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const lines = content.split('\n');
              let lineNumber = 1;
              
              // Find line number
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(match.substring(0, Math.min(match.length, 30)))) {
                  lineNumber = i + 1;
                  break;
                }
              }

              // Check if in diff
              const inDiff = !diffData || diffData.includes(match.substring(0, 20));
              
              results[severity].push({
                rule: rule.name,
                description: rule.description,
                fix: rule.fix,
                impact: rule.impact,
                file: filePath,
                line: lineNumber,
                match: match.substring(0, 100),
                severity: severity,
                inDiff: inDiff,
                timestamp: new Date().toISOString()
              });
            });
          }
        });
      });
    });

    // AST-based complexity analysis
    try {
      const ast = acorn.parse(content, { 
        ecmaVersion: 'latest', 
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true
      });
      
      const complexity = this.calculateComplexity(ast);
      results.metrics.complexity[filePath] = complexity;
      
      // Memory usage estimation
      results.metrics.memory[filePath] = this.estimateMemoryUsage(content);
      
      // Performance metrics
      results.metrics.performance[filePath] = this.analyzePerformanceMetrics(content);
      
    } catch (parseError) {
      console.warn(`Could not parse ${filePath} for complexity analysis:`, parseError.message);
    }

    return results;
  }

  calculateComplexity(ast) {
    let complexity = 1; // Base complexity
    
    walk.simple(ast, {
      IfStatement: () => complexity += 1,
      WhileStatement: () => complexity += 1,
      ForStatement: () => complexity += 1,
      ForInStatement: () => complexity += 1,
      ForOfStatement: () => complexity += 1,
      DoWhileStatement: () => complexity += 1,
      SwitchCase: () => complexity += 1,
      ConditionalExpression: () => complexity += 1,
      LogicalExpression: (node) => {
        if (node.operator === '&&' || node.operator === '||') {
          complexity += 1;
        }
      },
      CatchClause: () => complexity += 1,
      FunctionDeclaration: () => complexity += 1,
      FunctionExpression: () => complexity += 1,
      ArrowFunctionExpression: () => complexity += 1
    });
    
    return complexity;
  }

  estimateMemoryUsage(content) {
    let score = 0;
    
    // Count potential memory-heavy patterns
    const patterns = [
      { pattern: /new\s+Array\s*\(\s*\d{4,}\s*\)/g, weight: 3 }, // Large arrays
      { pattern: /new\s+Buffer\s*\(/g, weight: 2 }, // Buffer creation
      { pattern: /\.map\s*\(/g, weight: 1 }, // Array transformations
      { pattern: /\.filter\s*\(/g, weight: 1 },
      { pattern: /JSON\.parse\s*\(/g, weight: 1 }, // JSON operations
      { pattern: /JSON\.stringify\s*\(/g, weight: 1 },
      { pattern: /require\s*\(\s*['"][^'"]*['"]s*\)/g, weight: 1 } // Module imports
    ];
    
    patterns.forEach(({ pattern, weight }) => {
      const matches = content.match(pattern);
      if (matches) {
        score += matches.length * weight;
      }
    });
    
    return Math.min(score, 100); // Cap at 100
  }

  analyzePerformanceMetrics(content) {
    const metrics = {
      asyncOperations: 0,
      syncOperations: 0,
      loopCount: 0,
      functionCount: 0,
      callbackDepth: 0
    };
    
    // Count async operations
    metrics.asyncOperations = (content.match(/await\s+|\.then\s*\(|\.catch\s*\(/g) || []).length;
    
    // Count sync operations
    metrics.syncOperations = (content.match(/Sync\s*\(/g) || []).length;
    
    // Count loops
    metrics.loopCount = (content.match(/for\s*\(|while\s*\(|\.map\s*\(|\.forEach\s*\(/g) || []).length;
    
    // Count functions
    metrics.functionCount = (content.match(/function\s+|=>\s*{?|function\s*\(/g) || []).length;
    
    // Estimate callback depth (rough approximation)
    const callbacks = content.match(/\(\s*[^)]*\s*\)\s*=>/g) || [];
    metrics.callbackDepth = callbacks.length > 0 ? Math.ceil(callbacks.length / 3) : 0;
    
    return metrics;
  }

  generateReport(analysisResults) {
    let report = '# ⚡ Performance Analysis Report\n\n';
    
    // Summary section
    report += `## Summary\n`;
    report += `- **Total Issues**: ${analysisResults.summary.totalIssues}\n`;
    report += `- **Critical**: ${analysisResults.summary.criticalCount}\n`;
    report += `- **High**: ${analysisResults.summary.highCount}\n`;
    report += `- **Medium**: ${analysisResults.summary.mediumCount}\n`;
    report += `- **Average Complexity**: ${analysisResults.summary.averageComplexity}\n`;
    report += `- **Risk Score**: ${analysisResults.summary.riskScore.toUpperCase()}\n\n`;

    // Critical performance issues
    if (analysisResults.critical.length > 0) {
      report += '## 🚨 Critical Performance Issues\n\n';
      analysisResults.critical.forEach((issue, index) => {
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
    if (analysisResults.high.length > 0) {
      report += '## ⚠️ High Priority Performance Issues\n\n';
      analysisResults.high.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.rule}\n`;
        report += `- **File**: \`${issue.file}:${issue.line}\`\n`;
        report += `- **Impact**: ${issue.impact.toUpperCase()}\n`;
        report += `- **Description**: ${issue.description}\n`;
        report += `- **Recommended Fix**: ${issue.fix}\n`;
        if (issue.inDiff) report += `- **Status**: ⚠️ New in this PR\n`;
        report += '\n';
      });
    }

    // Performance metrics
    if (Object.keys(analysisResults.metrics.complexity).length > 0) {
      report += '## 📊 Complexity Metrics\n\n';
      report += '| File | Complexity | Memory Score | Performance Score |\n';
      report += '|------|------------|--------------|-------------------|\n';
      
      Object.keys(analysisResults.metrics.complexity).forEach(file => {
        const complexity = analysisResults.metrics.complexity[file] || 0;
        const memory = analysisResults.metrics.memory[file] || 0;
        const perf = analysisResults.metrics.performance[file];
        const perfScore = perf ? Math.round((perf.asyncOperations - perf.syncOperations + perf.functionCount) / 3) : 0;
        
        report += `| ${path.basename(file)} | ${complexity} | ${memory} | ${perfScore} |\n`;
      });
      report += '\n';
    }

    // Recommendations
    report += '## 🚀 Performance Recommendations\n\n';
    if (analysisResults.summary.criticalCount > 0) {
      report += '1. **Immediate Optimization Required**: Address critical performance issues\n';
      report += '2. **Load Testing**: Perform load testing to validate fixes\n';
    } else if (analysisResults.summary.highCount > 0) {
      report += '1. **Optimization Recommended**: Address high priority issues\n';
    } else {
      report += '1. **Good Performance Profile**: No critical issues detected\n';
    }
    
    if (analysisResults.summary.averageComplexity > 10) {
      report += '2. **Complexity Reduction**: Consider refactoring complex functions\n';
    }
    
    report += '3. **Monitoring**: Implement performance monitoring in production\n';
    report += '4. **Profiling**: Use profiling tools for detailed analysis\n\n';
    
    report += '*Analysis completed at: ' + new Date().toISOString() + '*\n';

    return report;
  }

  formatForGitHub(analysisResults) {
    const report = this.generateReport(analysisResults);
    return {
      report: report,
      riskScore: analysisResults.summary.riskScore,
      totalIssues: analysisResults.summary.totalIssues,
      criticalCount: analysisResults.summary.criticalCount,
      averageComplexity: analysisResults.summary.averageComplexity,
      shouldBlock: analysisResults.summary.riskScore === 'critical'
    };
  }
}

// CLI Interface
program
  .name('performance-checker')
  .description('AI-powered performance analysis for code reviews')
  .option('--pr <number>', 'Pull request number')
  .option('--files <files>', 'Comma-separated list of files to analyze')
  .option('--diff-data <data>', 'Diff data from PR')
  .option('--output <format>', 'Output format: json, markdown, github', 'github')
  .action(async (options) => {
    try {
      const checker = new PerformanceChecker();
      const files = options.files ? options.files.split(',').map(f => f.trim()) : [];
      
      if (files.length === 0) {
        console.error('No files specified for analysis');
        process.exit(1);
      }
      
      const results = await checker.analyzeFiles(files, options.diffData || '');
      
      if (options.output === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else if (options.output === 'markdown') {
        console.log(checker.generateReport(results));
      } else {
        // GitHub format
        const formatted = checker.formatForGitHub(results);
        console.log(JSON.stringify(formatted, null, 2));
      }
      
      // Exit with appropriate code
      if (results.summary.riskScore === 'critical') {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('Performance analysis failed:', error.message);
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}

module.exports = PerformanceChecker;