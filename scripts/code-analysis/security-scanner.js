#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');

class SecurityScanner {
  constructor() {
    this.securityRules = {
      // Critical security patterns
      critical: [
        {
          name: 'Hardcoded Credentials',
          pattern: /(?:password|pwd|secret|key|token|api[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
          description: 'Potential hardcoded credentials detected',
          fix: 'Use environment variables or secure credential storage'
        },
        {
          name: 'SQL Injection Risk',
          pattern: /(?:query|execute|exec)\s*\(\s*['"`].*\$\{.*\}.*['"`]\s*\)/gi,
          description: 'Potential SQL injection vulnerability',
          fix: 'Use parameterized queries or prepared statements'
        },
        {
          name: 'Command Injection',
          pattern: /(?:exec|spawn|system)\s*\(\s*.*\$\{.*\}.*\)/gi,
          description: 'Potential command injection vulnerability',
          fix: 'Validate and sanitize input, use safe execution methods'
        },
        {
          name: 'Unsafe eval()',
          pattern: /eval\s*\(/gi,
          description: 'Use of dangerous eval() function',
          fix: 'Replace eval() with safer alternatives like JSON.parse()'
        }
      ],
      
      // High priority security issues  
      high: [
        {
          name: 'Insecure Random',
          pattern: /Math\.random\(\)/gi,
          description: 'Math.random() is not cryptographically secure',
          fix: 'Use crypto.randomBytes() for security-sensitive operations'
        },
        {
          name: 'Insecure HTTP',
          pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/gi,
          description: 'Insecure HTTP connection detected',
          fix: 'Use HTTPS for all external connections'
        },
        {
          name: 'Debug Information',
          pattern: /(?:console\.log|console\.error|console\.warn|console\.debug)\s*\([^)]*(?:password|token|secret|key)[^)]*\)/gi,
          description: 'Sensitive information may be logged',
          fix: 'Remove or sanitize sensitive data from logs'
        }
      ],
      
      // Medium priority warnings
      medium: [
        {
          name: 'Missing Input Validation',
          pattern: /req\.(body|query|params)\.[a-zA-Z_$][a-zA-Z0-9_$]*(?!\s*&&|\s*\|\||\s*\?)/g,
          description: 'Request parameters used without validation',
          fix: 'Add input validation and sanitization'
        },
        {
          name: 'Weak Crypto Algorithm',
          pattern: /(?:md5|sha1|des)\s*\(/gi,
          description: 'Weak cryptographic algorithm detected',
          fix: 'Use stronger algorithms like SHA-256 or bcrypt'
        }
      ]
    };
    
    // Claude-specific security patterns
    this.claudeSpecificRules = {
      critical: [
        {
          name: 'SSE Connection Security',
          pattern: /broadcastToConnections.*(?:req\.body|req\.query|req\.params).*(?!validate|sanitize)/gi,
          description: 'SSE broadcast may include unsanitized user input',
          fix: 'Validate and sanitize all user input before broadcasting'
        },
        {
          name: 'PTY Process Injection',
          pattern: /pty\.spawn\s*\(\s*.*\$\{.*\}.*\)/gi,
          description: 'PTY process spawn with user input',
          fix: 'Validate shell commands and use safe execution contexts'
        },
        {
          name: 'Instance Manager Auth',
          pattern: /createInstance.*(?:req\.body|req\.query).*(?!authenticate|authorize)/gi,
          description: 'Instance creation without proper authentication',
          fix: 'Add authentication and authorization checks'
        }
      ]
    };
  }

  async scanFiles(files, diffData = '') {
    const results = {
      critical: [],
      high: [],
      medium: [],
      info: [],
      summary: {
        totalIssues: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        riskScore: 'low'
      }
    };

    for (const filePath of files) {
      if (!filePath || typeof filePath !== 'string') continue;
      
      try {
        const fullPath = path.resolve(filePath);
        if (!fs.existsSync(fullPath)) continue;
        
        const content = fs.readFileSync(fullPath, 'utf8');
        const fileResults = this.scanFileContent(content, filePath, diffData);
        
        // Merge results
        Object.keys(fileResults).forEach(severity => {
          if (Array.isArray(results[severity]) && Array.isArray(fileResults[severity])) {
            results[severity].push(...fileResults[severity]);
          }
        });
        
      } catch (error) {
        console.error(`Error scanning ${filePath}:`, error.message);
      }
    }

    // Calculate summary
    results.summary.criticalCount = results.critical.length;
    results.summary.highCount = results.high.length;  
    results.summary.mediumCount = results.medium.length;
    results.summary.totalIssues = results.critical.length + results.high.length + results.medium.length;

    // Calculate risk score
    if (results.critical.length > 0) {
      results.summary.riskScore = 'critical';
    } else if (results.high.length > 0) {
      results.summary.riskScore = 'high';
    } else if (results.medium.length > 2) {
      results.summary.riskScore = 'high';
    } else if (results.medium.length > 0) {
      results.summary.riskScore = 'medium';
    }

    return results;
  }

  scanFileContent(content, filePath, diffData = '') {
    const results = {
      critical: [],
      high: [],
      medium: [],
      info: []
    };

    const lines = content.split('\n');
    
    // Check each severity level
    ['critical', 'high', 'medium'].forEach(severity => {
      const rules = [...(this.securityRules[severity] || [])];
      
      // Add Claude-specific rules for critical
      if (severity === 'critical') {
        rules.push(...(this.claudeSpecificRules.critical || []));
      }
      
      rules.forEach(rule => {
        const matches = content.match(rule.pattern);
        if (matches) {
          matches.forEach(match => {
            // Find line number
            let lineNumber = 1;
            let charPosition = 0;
            
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(match.substring(0, Math.min(match.length, 50)))) {
                lineNumber = i + 1;
                break;
              }
            }

            // Check if this issue is in the diff (new/modified code)
            const inDiff = !diffData || diffData.includes(match.substring(0, 20));
            
            results[severity].push({
              rule: rule.name,
              description: rule.description,
              fix: rule.fix,
              file: filePath,
              line: lineNumber,
              match: match.substring(0, 100), // Truncate for security
              severity: severity,
              inDiff: inDiff,
              timestamp: new Date().toISOString()
            });
          });
        }
      });
    });

    return results;
  }

  generateReport(scanResults) {
    let report = '# 🔒 Security Analysis Report\n\n';
    
    // Summary section
    report += `## Summary\n`;
    report += `- **Total Issues**: ${scanResults.summary.totalIssues}\n`;
    report += `- **Critical**: ${scanResults.summary.criticalCount}\n`;
    report += `- **High**: ${scanResults.summary.highCount}\n`;
    report += `- **Medium**: ${scanResults.summary.mediumCount}\n`;
    report += `- **Risk Score**: ${scanResults.summary.riskScore.toUpperCase()}\n\n`;

    // Critical issues
    if (scanResults.critical.length > 0) {
      report += '## 🚨 Critical Security Issues\n\n';
      scanResults.critical.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.rule}\n`;
        report += `- **File**: \`${issue.file}:${issue.line}\`\n`;
        report += `- **Description**: ${issue.description}\n`;
        report += `- **Recommended Fix**: ${issue.fix}\n`;
        if (issue.inDiff) report += `- **Status**: ⚠️ New in this PR\n`;
        report += '\n';
      });
    }

    // High priority issues
    if (scanResults.high.length > 0) {
      report += '## ⚠️ High Priority Issues\n\n';
      scanResults.high.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.rule}\n`;
        report += `- **File**: \`${issue.file}:${issue.line}\`\n`;  
        report += `- **Description**: ${issue.description}\n`;
        report += `- **Recommended Fix**: ${issue.fix}\n`;
        if (issue.inDiff) report += `- **Status**: ⚠️ New in this PR\n`;
        report += '\n';
      });
    }

    // Medium priority issues (collapsed)
    if (scanResults.medium.length > 0) {
      report += '<details><summary>📝 Medium Priority Issues (' + scanResults.medium.length + ')</summary>\n\n';
      scanResults.medium.forEach((issue, index) => {
        report += `**${index + 1}. ${issue.rule}** - \`${issue.file}:${issue.line}\`\n`;
        report += `${issue.description}\n\n`;
      });
      report += '</details>\n\n';
    }

    // Recommendations
    report += '## 🛡️ Security Recommendations\n\n';
    if (scanResults.summary.criticalCount > 0) {
      report += '1. **Immediate Action Required**: Address all critical security issues before merging\n';
      report += '2. **Security Review**: Manual security review recommended\n';
    } else if (scanResults.summary.highCount > 0) {
      report += '1. **Review Required**: Address high priority issues\n';
    } else {
      report += '1. **Good Security Posture**: No critical issues detected\n';
    }
    
    report += '2. **Regular Scans**: Implement regular security scanning in CI/CD\n';
    report += '3. **Security Training**: Consider security awareness training for the team\n\n';
    
    report += '*Scan completed at: ' + new Date().toISOString() + '*\n';

    return report;
  }

  formatForGitHub(scanResults) {
    const report = this.generateReport(scanResults);
    return {
      report: report,
      riskScore: scanResults.summary.riskScore,
      totalIssues: scanResults.summary.totalIssues,
      criticalCount: scanResults.summary.criticalCount,
      shouldBlock: scanResults.summary.riskScore === 'critical'
    };
  }
}

// CLI Interface
program
  .name('security-scanner')
  .description('AI-powered security analysis for code reviews')
  .option('--pr <number>', 'Pull request number')
  .option('--files <files>', 'Comma-separated list of files to scan')
  .option('--diff-data <data>', 'Diff data from PR')
  .option('--output <format>', 'Output format: json, markdown, github', 'github')
  .action(async (options) => {
    try {
      const scanner = new SecurityScanner();
      const files = options.files ? options.files.split(',').map(f => f.trim()) : [];
      
      if (files.length === 0) {
        console.error('No files specified for scanning');
        process.exit(1);
      }
      
      const results = await scanner.scanFiles(files, options.diffData || '');
      
      if (options.output === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else if (options.output === 'markdown') {
        console.log(scanner.generateReport(results));
      } else {
        // GitHub format
        const formatted = scanner.formatForGitHub(results);
        console.log(JSON.stringify(formatted, null, 2));
      }
      
      // Exit with appropriate code
      if (results.summary.riskScore === 'critical') {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('Security scan failed:', error.message);
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}

module.exports = SecurityScanner;