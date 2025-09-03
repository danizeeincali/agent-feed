#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const acorn = require('acorn');
const walk = require('acorn-walk');

class PatternValidator {
  constructor() {
    this.architectureRules = {
      critical: [
        {
          name: 'Missing Error Handling',
          validator: this.validateErrorHandling.bind(this),
          description: 'Functions with potential errors lack proper error handling',
          fix: 'Add try-catch blocks or proper error callbacks',
          impact: 'high'
        },
        {
          name: 'Circular Dependencies',
          validator: this.detectCircularDependencies.bind(this),
          description: 'Potential circular dependency detected',
          fix: 'Restructure imports to avoid circular dependencies',
          impact: 'critical'
        },
        {
          name: 'God Object Anti-pattern',
          validator: this.detectGodObjects.bind(this),
          description: 'Class or module has too many responsibilities',
          fix: 'Split into smaller, focused modules following SRP',
          impact: 'high'
        }
      ],
      
      high: [
        {
          name: 'Tight Coupling',
          validator: this.analyzeCoupling.bind(this),
          description: 'High coupling between modules detected',
          fix: 'Use dependency injection or interfaces to reduce coupling',
          impact: 'medium'
        },
        {
          name: 'Magic Numbers',
          validator: this.detectMagicNumbers.bind(this),
          description: 'Magic numbers found in code',
          fix: 'Replace with named constants',
          impact: 'low'
        },
        {
          name: 'Long Parameter Lists',
          validator: this.checkParameterLists.bind(this),
          description: 'Functions with too many parameters',
          fix: 'Use parameter objects or builder pattern',
          impact: 'medium'
        }
      ],
      
      medium: [
        {
          name: 'Code Duplication',
          validator: this.detectDuplication.bind(this),
          description: 'Similar code patterns detected',
          fix: 'Extract common functionality into shared functions',
          impact: 'medium'
        },
        {
          name: 'Inconsistent Naming',
          validator: this.validateNaming.bind(this),
          description: 'Inconsistent naming conventions',
          fix: 'Follow consistent naming conventions',
          impact: 'low'
        }
      ]
    };

    // Claude-specific architecture patterns
    this.claudeSpecificRules = {
      critical: [
        {
          name: 'SSE Connection Management',
          validator: this.validateSSEPatterns.bind(this),
          description: 'Improper SSE connection lifecycle management',
          fix: 'Implement proper connection cleanup and error handling',
          impact: 'critical'
        },
        {
          name: 'PTY Process Lifecycle',
          validator: this.validatePTYPatterns.bind(this),
          description: 'PTY processes without proper lifecycle management',
          fix: 'Add process cleanup, timeout handling, and resource limits',
          impact: 'high'
        },
        {
          name: 'Instance Manager State',
          validator: this.validateInstanceManagement.bind(this),
          description: 'Instance state management issues',
          fix: 'Implement proper state synchronization and cleanup',
          impact: 'high'
        }
      ]
    };

    this.patterns = {
      errorHandling: [
        /await\s+[^;]+(?!.*catch|.*\.catch)/g,
        /\.then\s*\([^}]*\)(?!.*\.catch)/g,
        /JSON\.parse\s*\([^)]*\)(?!.*try|.*catch)/g
      ],
      magicNumbers: /(?<![a-zA-Z_])\d{2,}(?![a-zA-Z_])/g,
      longParameterLists: /function\s+\w*\s*\([^)]{50,}\)/g
    };
  }

  async validateFiles(files, diffData = '') {
    const results = {
      critical: [],
      high: [],
      medium: [],
      metrics: {
        coupling: {},
        cohesion: {},
        complexity: {},
        maintainability: {}
      },
      summary: {
        totalIssues: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        averageCoupling: 0,
        averageCohesion: 0,
        riskScore: 'low'
      }
    };

    for (const filePath of files) {
      if (!filePath || typeof filePath !== 'string') continue;
      
      try {
        const fullPath = path.resolve(filePath);
        if (!fs.existsSync(fullPath)) continue;
        
        const content = fs.readFileSync(fullPath, 'utf8');
        const fileResults = await this.validateFileContent(content, filePath, diffData);
        
        // Merge results
        Object.keys(fileResults).forEach(key => {
          if (Array.isArray(results[key]) && Array.isArray(fileResults[key])) {
            results[key].push(...fileResults[key]);
          } else if (key === 'metrics') {
            Object.assign(results.metrics, fileResults.metrics);
          }
        });
        
      } catch (error) {
        console.error(`Error validating ${filePath}:`, error.message);
      }
    }

    // Calculate summary
    results.summary.criticalCount = results.critical.length;
    results.summary.highCount = results.high.length;
    results.summary.mediumCount = results.medium.length;
    results.summary.totalIssues = results.critical.length + results.high.length + results.medium.length;

    // Calculate averages
    const couplingScores = Object.values(results.metrics.coupling);
    results.summary.averageCoupling = couplingScores.length > 0 
      ? Math.round(couplingScores.reduce((a, b) => a + b, 0) / couplingScores.length * 10) / 10
      : 0;

    const cohesionScores = Object.values(results.metrics.cohesion);
    results.summary.averageCohesion = cohesionScores.length > 0 
      ? Math.round(cohesionScores.reduce((a, b) => a + b, 0) / cohesionScores.length * 10) / 10
      : 0;

    // Calculate risk score
    if (results.critical.length > 0 || results.summary.averageCoupling > 8) {
      results.summary.riskScore = 'critical';
    } else if (results.high.length > 0 || results.summary.averageCoupling > 6) {
      results.summary.riskScore = 'high';
    } else if (results.medium.length > 3 || results.summary.averageCoupling > 4) {
      results.summary.riskScore = 'medium';
    }

    return results;
  }

  async validateFileContent(content, filePath, diffData = '') {
    const results = {
      critical: [],
      high: [],
      medium: [],
      metrics: {
        coupling: {},
        cohesion: {},
        complexity: {},
        maintainability: {}
      }
    };

    // Run validation rules
    ['critical', 'high', 'medium'].forEach(severity => {
      const rules = [...(this.architectureRules[severity] || [])];
      
      // Add Claude-specific rules
      if (this.claudeSpecificRules[severity]) {
        rules.push(...this.claudeSpecificRules[severity]);
      }
      
      rules.forEach(rule => {
        try {
          const issues = rule.validator(content, filePath, diffData);
          if (issues && issues.length > 0) {
            results[severity].push(...issues.map(issue => ({
              ...issue,
              rule: rule.name,
              description: rule.description,
              fix: rule.fix,
              impact: rule.impact,
              severity: severity,
              timestamp: new Date().toISOString()
            })));
          }
        } catch (error) {
          console.warn(`Error running ${rule.name} validator:`, error.message);
        }
      });
    });

    // Calculate metrics
    results.metrics.coupling[filePath] = this.calculateCoupling(content);
    results.metrics.cohesion[filePath] = this.calculateCohesion(content);
    results.metrics.complexity[filePath] = this.calculateComplexity(content);
    results.metrics.maintainability[filePath] = this.calculateMaintainability(content);

    return results;
  }

  validateErrorHandling(content, filePath, diffData) {
    const issues = [];
    const lines = content.split('\n');
    
    this.patterns.errorHandling.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          let lineNumber = 1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(match.substring(0, 20))) {
              lineNumber = i + 1;
              break;
            }
          }
          
          const inDiff = !diffData || diffData.includes(match.substring(0, 20));
          
          issues.push({
            file: filePath,
            line: lineNumber,
            match: match.substring(0, 100),
            inDiff: inDiff
          });
        });
      }
    });
    
    return issues;
  }

  detectCircularDependencies(content, filePath, diffData) {
    const issues = [];
    const imports = [];
    const lines = content.split('\n');
    
    // Extract imports/requires
    const importPattern = /(?:import.*from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
    let match;
    
    while ((match = importPattern.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (importPath && !importPath.startsWith('.')) continue; // Skip external modules
      
      imports.push({
        path: importPath,
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    // Simple heuristic: if file A imports B and they're in same directory,
    // check if B might import back to A
    const currentDir = path.dirname(filePath);
    const currentName = path.basename(filePath, path.extname(filePath));
    
    imports.forEach(imp => {
      const importedFile = path.resolve(currentDir, imp.path);
      const importedName = path.basename(imp.path, path.extname(imp.path));
      
      // Check if the imported name suggests it might import back
      if (importedName.includes(currentName) || currentName.includes(importedName)) {
        const inDiff = !diffData || diffData.includes(imp.path);
        
        issues.push({
          file: filePath,
          line: imp.line,
          match: imp.path,
          inDiff: inDiff,
          details: `Potential circular dependency with ${imp.path}`
        });
      }
    });
    
    return issues;
  }

  detectGodObjects(content, filePath, diffData) {
    const issues = [];
    let functionCount = 0;
    let methodCount = 0;
    let propertyCount = 0;
    
    // Count functions
    functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || []).length;
    
    // Count methods in classes
    const classMatches = content.match(/class\s+\w+[^{]*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g);
    if (classMatches) {
      classMatches.forEach(classContent => {
        methodCount += (classContent.match(/\w+\s*\([^)]*\)\s*\{/g) || []).length;
        propertyCount += (classContent.match(/this\.\w+\s*=/g) || []).length;
      });
    }
    
    // Count object properties
    propertyCount += (content.match(/\w+\s*:\s*(?:function|[^,\}]+)/g) || []).length;
    
    const totalResponsibilities = functionCount + methodCount + propertyCount;
    
    if (totalResponsibilities > 20) {
      const inDiff = !diffData || diffData.length > 0;
      
      issues.push({
        file: filePath,
        line: 1,
        match: `${totalResponsibilities} responsibilities detected`,
        inDiff: inDiff,
        details: `Functions: ${functionCount}, Methods: ${methodCount}, Properties: ${propertyCount}`
      });
    }
    
    return issues;
  }

  analyzeCoupling(content, filePath, diffData) {
    const issues = [];
    
    // Count imports (afferent coupling)
    const imports = (content.match(/(?:import.*from|require\s*\()/g) || []).length;
    
    // Count exports (efferent coupling) 
    const exports = (content.match(/(?:export|module\.exports)/g) || []).length;
    
    // High coupling threshold
    const couplingScore = imports + exports;
    
    if (couplingScore > 15) {
      const inDiff = !diffData || diffData.length > 0;
      
      issues.push({
        file: filePath,
        line: 1,
        match: `Coupling score: ${couplingScore}`,
        inDiff: inDiff,
        details: `Imports: ${imports}, Exports: ${exports}`
      });
    }
    
    return issues;
  }

  detectMagicNumbers(content, filePath, diffData) {
    const issues = [];
    const lines = content.split('\n');
    const matches = content.match(this.patterns.magicNumbers);
    
    if (matches) {
      matches.forEach(match => {
        // Skip common non-magic numbers
        const number = parseInt(match);
        if ([0, 1, 2, 100, 200, 404, 500].includes(number)) return;
        
        let lineNumber = 1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(match)) {
            lineNumber = i + 1;
            break;
          }
        }
        
        const inDiff = !diffData || diffData.includes(match);
        
        issues.push({
          file: filePath,
          line: lineNumber,
          match: match,
          inDiff: inDiff
        });
      });
    }
    
    return issues;
  }

  checkParameterLists(content, filePath, diffData) {
    const issues = [];
    const lines = content.split('\n');
    const matches = content.match(this.patterns.longParameterLists);
    
    if (matches) {
      matches.forEach(match => {
        let lineNumber = 1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(match.substring(0, 30))) {
            lineNumber = i + 1;
            break;
          }
        }
        
        const paramCount = (match.match(/,/g) || []).length + 1;
        const inDiff = !diffData || diffData.includes(match.substring(0, 20));
        
        issues.push({
          file: filePath,
          line: lineNumber,
          match: match.substring(0, 100),
          inDiff: inDiff,
          details: `${paramCount} parameters`
        });
      });
    }
    
    return issues;
  }

  detectDuplication(content, filePath, diffData) {
    const issues = [];
    const lines = content.split('\n');
    const blocks = {};
    
    // Simple duplication detection: look for identical blocks of 3+ lines
    for (let i = 0; i < lines.length - 2; i++) {
      const block = lines.slice(i, i + 3).join('\n').trim();
      if (block.length < 20) continue; // Skip short blocks
      
      if (blocks[block]) {
        blocks[block].push(i + 1);
      } else {
        blocks[block] = [i + 1];
      }
    }
    
    Object.entries(blocks).forEach(([block, lineNumbers]) => {
      if (lineNumbers.length > 1) {
        const inDiff = !diffData || diffData.includes(block.substring(0, 20));
        
        issues.push({
          file: filePath,
          line: lineNumbers[0],
          match: block.substring(0, 100),
          inDiff: inDiff,
          details: `Duplicated at lines: ${lineNumbers.join(', ')}`
        });
      }
    });
    
    return issues;
  }

  validateNaming(content, filePath, diffData) {
    const issues = [];
    const lines = content.split('\n');
    
    // Check for inconsistent naming patterns
    const camelCasePattern = /\b[a-z][a-zA-Z0-9]*\b/g;
    const snakeCasePattern = /\b[a-z][a-z0-9_]*\b/g;
    const PascalCasePattern = /\b[A-Z][a-zA-Z0-9]*\b/g;
    
    const camelCaseCount = (content.match(camelCasePattern) || []).length;
    const snakeCaseCount = (content.match(snakeCasePattern) || []).length;
    const pascalCaseCount = (content.match(PascalCasePattern) || []).length;
    
    const total = camelCaseCount + snakeCaseCount + pascalCaseCount;
    const diversity = [camelCaseCount, snakeCaseCount, pascalCaseCount].filter(c => c / total > 0.1).length;
    
    if (diversity > 2) {
      const inDiff = !diffData || diffData.length > 0;
      
      issues.push({
        file: filePath,
        line: 1,
        match: 'Mixed naming conventions',
        inDiff: inDiff,
        details: `camelCase: ${camelCaseCount}, snake_case: ${snakeCaseCount}, PascalCase: ${pascalCaseCount}`
      });
    }
    
    return issues;
  }

  // Claude-specific validators
  validateSSEPatterns(content, filePath, diffData) {
    const issues = [];
    const lines = content.split('\n');
    
    // Check for proper SSE connection cleanup
    const ssePatterns = [
      /broadcastToConnections.*(?!.*cleanup|.*close|.*disconnect)/g,
      /new\s+EventSource.*(?!.*addEventListener.*close)/g,
      /connections\s*\.\s*push.*(?!.*timeout|.*cleanup)/g
    ];
    
    ssePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          let lineNumber = 1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(match.substring(0, 20))) {
              lineNumber = i + 1;
              break;
            }
          }
          
          const inDiff = !diffData || diffData.includes(match.substring(0, 20));
          
          issues.push({
            file: filePath,
            line: lineNumber,
            match: match.substring(0, 100),
            inDiff: inDiff
          });
        });
      }
    });
    
    return issues;
  }

  validatePTYPatterns(content, filePath, diffData) {
    const issues = [];
    const lines = content.split('\n');
    
    // Check for proper PTY lifecycle management
    const ptyPatterns = [
      /pty\.spawn.*(?!.*kill|.*close|.*timeout)/g,
      /new\s+.*pty.*(?!.*cleanup|.*dispose)/g
    ];
    
    ptyPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          let lineNumber = 1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(match.substring(0, 20))) {
              lineNumber = i + 1;
              break;
            }
          }
          
          const inDiff = !diffData || diffData.includes(match.substring(0, 20));
          
          issues.push({
            file: filePath,
            line: lineNumber,
            match: match.substring(0, 100),
            inDiff: inDiff
          });
        });
      }
    });
    
    return issues;
  }

  validateInstanceManagement(content, filePath, diffData) {
    const issues = [];
    const lines = content.split('\n');
    
    // Check for proper instance state management
    const instancePatterns = [
      /createInstance.*(?!.*validate|.*cleanup)/g,
      /instances\s*\[.*\]\s*=.*(?!.*state|.*status)/g,
      /deleteInstance.*(?!.*cleanup|.*dispose)/g
    ];
    
    instancePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          let lineNumber = 1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(match.substring(0, 20))) {
              lineNumber = i + 1;
              break;
            }
          }
          
          const inDiff = !diffData || diffData.includes(match.substring(0, 20));
          
          issues.push({
            file: filePath,
            line: lineNumber,
            match: match.substring(0, 100),
            inDiff: inDiff
          });
        });
      }
    });
    
    return issues;
  }

  calculateCoupling(content) {
    const imports = (content.match(/(?:import.*from|require\s*\()/g) || []).length;
    const exports = (content.match(/(?:export|module\.exports)/g) || []).length;
    const references = (content.match(/\w+\.\w+/g) || []).length;
    
    return Math.min((imports + exports + references / 10), 10);
  }

  calculateCohesion(content) {
    const functions = (content.match(/function\s+\w+|const\s+\w+\s*=.*=>/g) || []).length;
    const variables = (content.match(/(?:let|const|var)\s+\w+/g) || []).length;
    const references = (content.match(/\w+/g) || []).length;
    
    if (functions === 0 || variables === 0) return 0;
    
    // Simple cohesion metric: references per function/variable
    return Math.min(references / (functions + variables), 1);
  }

  calculateComplexity(content) {
    const conditions = (content.match(/if\s*\(|while\s*\(|for\s*\(|switch\s*\(/g) || []).length;
    const functions = (content.match(/function\s+|=>/g) || []).length;
    const operators = (content.match(/&&|\|\||==|!=|<=|>=/g) || []).length;
    
    return Math.min(conditions + functions + operators / 5, 20);
  }

  calculateMaintainability(content) {
    const lines = content.split('\n').length;
    const comments = (content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || []).length;
    const complexity = this.calculateComplexity(content);
    
    // Simple maintainability index
    const commentRatio = comments / lines;
    const complexityPenalty = complexity / 20;
    
    return Math.max(0, Math.min(1, commentRatio + 0.5 - complexityPenalty));
  }

  generateReport(validationResults) {
    let report = '# 🏗️ Architecture Analysis Report\n\n';
    
    // Summary section
    report += `## Summary\n`;
    report += `- **Total Issues**: ${validationResults.summary.totalIssues}\n`;
    report += `- **Critical**: ${validationResults.summary.criticalCount}\n`;
    report += `- **High**: ${validationResults.summary.highCount}\n`;
    report += `- **Medium**: ${validationResults.summary.mediumCount}\n`;
    report += `- **Average Coupling**: ${validationResults.summary.averageCoupling}\n`;
    report += `- **Average Cohesion**: ${validationResults.summary.averageCohesion}\n`;
    report += `- **Risk Score**: ${validationResults.summary.riskScore.toUpperCase()}\n\n`;

    // Critical architecture issues
    if (validationResults.critical.length > 0) {
      report += '## 🚨 Critical Architecture Issues\n\n';
      validationResults.critical.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.rule}\n`;
        report += `- **File**: \`${issue.file}:${issue.line}\`\n`;
        report += `- **Impact**: ${issue.impact.toUpperCase()}\n`;
        report += `- **Description**: ${issue.description}\n`;
        report += `- **Recommended Fix**: ${issue.fix}\n`;
        if (issue.details) report += `- **Details**: ${issue.details}\n`;
        if (issue.inDiff) report += `- **Status**: ⚠️ New in this PR\n`;
        report += '\n';
      });
    }

    // High priority issues
    if (validationResults.high.length > 0) {
      report += '## ⚠️ High Priority Architecture Issues\n\n';
      validationResults.high.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.rule}\n`;
        report += `- **File**: \`${issue.file}:${issue.line}\`\n`;
        report += `- **Impact**: ${issue.impact.toUpperCase()}\n`;
        report += `- **Description**: ${issue.description}\n`;
        report += `- **Recommended Fix**: ${issue.fix}\n`;
        if (issue.details) report += `- **Details**: ${issue.details}\n`;
        if (issue.inDiff) report += `- **Status**: ⚠️ New in this PR\n`;
        report += '\n';
      });
    }

    // Architecture metrics
    if (Object.keys(validationResults.metrics.coupling).length > 0) {
      report += '## 📊 Architecture Metrics\n\n';
      report += '| File | Coupling | Cohesion | Complexity | Maintainability |\n';
      report += '|------|----------|----------|------------|----------------|\n';
      
      Object.keys(validationResults.metrics.coupling).forEach(file => {
        const coupling = validationResults.metrics.coupling[file] || 0;
        const cohesion = validationResults.metrics.cohesion[file] || 0;
        const complexity = validationResults.metrics.complexity[file] || 0;
        const maintainability = validationResults.metrics.maintainability[file] || 0;
        
        report += `| ${path.basename(file)} | ${coupling.toFixed(1)} | ${cohesion.toFixed(2)} | ${complexity.toFixed(1)} | ${maintainability.toFixed(2)} |\n`;
      });
      report += '\n';
    }

    // Recommendations
    report += '## 🎯 Architecture Recommendations\n\n';
    if (validationResults.summary.criticalCount > 0) {
      report += '1. **Critical Refactoring Required**: Address critical architecture issues\n';
      report += '2. **Design Review**: Conduct architecture review with team\n';
    } else if (validationResults.summary.highCount > 0) {
      report += '1. **Improvements Needed**: Address high priority issues\n';
    } else {
      report += '1. **Good Architecture**: No critical issues detected\n';
    }
    
    if (validationResults.summary.averageCoupling > 6) {
      report += '2. **Reduce Coupling**: Consider dependency injection or interfaces\n';
    }
    
    if (validationResults.summary.averageCohesion < 0.5) {
      report += '3. **Improve Cohesion**: Group related functionality together\n';
    }
    
    report += '4. **Documentation**: Maintain architectural decision records\n';
    report += '5. **Testing**: Implement integration and contract tests\n\n';
    
    report += '*Analysis completed at: ' + new Date().toISOString() + '*\n';

    return report;
  }

  formatForGitHub(validationResults) {
    const report = this.generateReport(validationResults);
    return {
      report: report,
      riskScore: validationResults.summary.riskScore,
      totalIssues: validationResults.summary.totalIssues,
      criticalCount: validationResults.summary.criticalCount,
      averageCoupling: validationResults.summary.averageCoupling,
      shouldBlock: validationResults.summary.riskScore === 'critical'
    };
  }
}

// CLI Interface
program
  .name('pattern-validator')
  .description('AI-powered architecture pattern validation for code reviews')
  .option('--pr <number>', 'Pull request number')
  .option('--files <files>', 'Comma-separated list of files to validate')
  .option('--diff-data <data>', 'Diff data from PR')
  .option('--output <format>', 'Output format: json, markdown, github', 'github')
  .action(async (options) => {
    try {
      const validator = new PatternValidator();
      const files = options.files ? options.files.split(',').map(f => f.trim()) : [];
      
      if (files.length === 0) {
        console.error('No files specified for validation');
        process.exit(1);
      }
      
      const results = await validator.validateFiles(files, options.diffData || '');
      
      if (options.output === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else if (options.output === 'markdown') {
        console.log(validator.generateReport(results));
      } else {
        // GitHub format
        const formatted = validator.formatForGitHub(results);
        console.log(JSON.stringify(formatted, null, 2));
      }
      
      // Exit with appropriate code
      if (results.summary.riskScore === 'critical') {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('Architecture validation failed:', error.message);
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}

module.exports = PatternValidator;