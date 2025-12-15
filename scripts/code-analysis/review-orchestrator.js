#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');

class ReviewOrchestrator {
  constructor() {
    this.config = this.loadConfig();
    this.agents = new Map();
    this.reviewSessions = new Map();
    this.metrics = {
      reviews: 0,
      issues: 0,
      fixes: 0,
      blockedPRs: 0,
      approvedPRs: 0
    };
  }

  loadConfig() {
    try {
      const configPath = path.resolve(__dirname, '../../config/code-review-rules.json');
      return JSON.parse(fs.readFileSync(configPath, 'utf8')).codeReviewConfig;
    } catch (error) {
      console.warn('Could not load config, using defaults:', error.message);
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      agents: {
        security: { enabled: true, priority: "critical", timeout: 300 },
        performance: { enabled: true, priority: "high", timeout: 300 },
        architecture: { enabled: true, priority: "medium", timeout: 300 },
        testing: { enabled: true, priority: "medium", timeout: 300 }
      },
      riskAssessment: {
        scoring: {
          critical: { weight: 10, autoBlock: true },
          high: { weight: 5, autoBlock: false },
          medium: { weight: 2, autoBlock: false },
          low: { weight: 1, autoBlock: false }
        },
        thresholds: { critical: 10, high: 15, medium: 25 }
      }
    };
  }

  async initialize(options = {}) {
    const { pr, files, swarmId } = options;
    
    console.log(chalk.blue(`🔍 Initializing Code Review Swarm for PR #${pr}`));
    
    const sessionId = `review-${pr}-${Date.now()}`;
    const session = {
      id: sessionId,
      pr: pr,
      files: files ? files.split(',').map(f => f.trim()) : [],
      swarmId: swarmId,
      startTime: Date.now(),
      status: 'initialized',
      agents: {},
      results: {},
      riskScore: 'unknown'
    };
    
    this.reviewSessions.set(sessionId, session);
    
    // Initialize agents based on config
    const enabledAgents = Object.entries(this.config.agents)
      .filter(([name, config]) => config.enabled)
      .sort(([,a], [,b]) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority));
    
    for (const [agentName, agentConfig] of enabledAgents) {
      session.agents[agentName] = {
        name: agentName,
        status: 'pending',
        priority: agentConfig.priority,
        timeout: agentConfig.timeout,
        startTime: null,
        endTime: null,
        results: null
      };
      
      console.log(chalk.gray(`  ✓ ${agentName} agent initialized (${agentConfig.priority} priority)`));
    }
    
    console.log(chalk.green(`✅ Review session ${sessionId} initialized with ${enabledAgents.length} agents`));
    
    return {
      success: true,
      sessionId: sessionId,
      agents: enabledAgents.length,
      files: session.files.length
    };
  }

  getPriorityWeight(priority) {
    const weights = { critical: 1, high: 2, medium: 3, low: 4 };
    return weights[priority] || 5;
  }

  async runAgent(agentName, files, diffData = '') {
    console.log(chalk.blue(`🤖 Running ${agentName} agent...`));
    
    try {
      let results;
      
      switch (agentName) {
        case 'security':
          const SecurityScanner = require('./security-scanner');
          const scanner = new SecurityScanner();
          results = await scanner.scanFiles(files, diffData);
          break;
          
        case 'performance':
          const PerformanceChecker = require('./performance-checker');
          const checker = new PerformanceChecker();
          results = await checker.analyzeFiles(files, diffData);
          break;
          
        case 'architecture':
          const PatternValidator = require('./pattern-validator');
          const validator = new PatternValidator();
          results = await validator.validateFiles(files, diffData);
          break;
          
        case 'testing':
          const TestAnalyzer = require('./test-analyzer');
          const analyzer = new TestAnalyzer();
          results = await analyzer.analyzeTestCoverage(files, diffData);
          break;
          
        default:
          throw new Error(`Unknown agent: ${agentName}`);
      }
      
      console.log(chalk.green(`✅ ${agentName} agent completed: ${results.summary?.totalIssues || 0} issues found`));
      
      return {
        success: true,
        agent: agentName,
        results: results,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(chalk.red(`❌ ${agentName} agent failed: ${error.message}`));
      
      return {
        success: false,
        agent: agentName,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async consolidateResults(results) {
    console.log(chalk.blue('📊 Consolidating review results...'));
    
    const consolidatedReport = {
      summary: {
        totalAgents: 0,
        successfulAgents: 0,
        failedAgents: 0,
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        riskScore: 'low',
        shouldBlock: false,
        recommendation: 'approve'
      },
      agentResults: {},
      consolidatedIssues: {
        critical: [],
        high: [],
        medium: [],
        low: []
      },
      metrics: {
        security: {},
        performance: {},
        architecture: {},
        testing: {}
      },
      recommendations: [],
      autoFixes: []
    };

    // Parse individual agent results
    const agents = ['security', 'performance', 'architecture', 'testing'];
    
    for (const agent of agents) {
      const resultKey = `${agent}-results`;
      const resultData = results[resultKey];
      
      if (!resultData) continue;
      
      consolidatedReport.summary.totalAgents++;
      
      try {
        const parsedResults = typeof resultData === 'string' 
          ? JSON.parse(resultData) 
          : resultData;
        
        if (parsedResults.success !== false) {
          consolidatedReport.summary.successfulAgents++;
          consolidatedReport.agentResults[agent] = parsedResults;
          
          // Aggregate issues
          ['critical', 'high', 'medium', 'low'].forEach(severity => {
            if (parsedResults[severity]) {
              consolidatedReport.consolidatedIssues[severity].push(...parsedResults[severity]);
              consolidatedReport.summary[`${severity}Issues`] += parsedResults[severity].length;
            }
          });
          
          // Store metrics
          if (parsedResults.metrics || parsedResults.summary) {
            consolidatedReport.metrics[agent] = parsedResults.metrics || parsedResults.summary;
          }
          
        } else {
          consolidatedReport.summary.failedAgents++;
          console.warn(chalk.yellow(`⚠️ Agent ${agent} reported failure`));
        }
        
      } catch (parseError) {
        consolidatedReport.summary.failedAgents++;
        console.error(chalk.red(`❌ Failed to parse ${agent} results: ${parseError.message}`));
      }
    }

    // Calculate total issues
    consolidatedReport.summary.totalIssues = 
      consolidatedReport.summary.criticalIssues +
      consolidatedReport.summary.highIssues +
      consolidatedReport.summary.mediumIssues +
      consolidatedReport.summary.lowIssues;

    // Calculate risk score
    const riskScore = this.calculateRiskScore(consolidatedReport.summary);
    consolidatedReport.summary.riskScore = riskScore.level;
    consolidatedReport.summary.shouldBlock = riskScore.shouldBlock;
    consolidatedReport.summary.recommendation = riskScore.recommendation;

    // Generate recommendations
    consolidatedReport.recommendations = this.generateRecommendations(consolidatedReport);
    
    // Generate auto-fixes if enabled
    if (this.config.autoFix?.enabled) {
      consolidatedReport.autoFixes = this.generateAutoFixes(consolidatedReport);
    }

    console.log(chalk.green(`✅ Consolidation complete: ${consolidatedReport.summary.totalIssues} total issues, risk: ${riskScore.level}`));

    return consolidatedReport;
  }

  calculateRiskScore(summary) {
    const config = this.config.riskAssessment;
    let score = 0;
    
    // Base scoring
    score += summary.criticalIssues * (config.scoring.critical?.weight || 10);
    score += summary.highIssues * (config.scoring.high?.weight || 5);
    score += summary.mediumIssues * (config.scoring.medium?.weight || 2);
    score += summary.lowIssues * (config.scoring.low?.weight || 1);
    
    // Determine level
    let level = 'low';
    let shouldBlock = false;
    let recommendation = 'approve';
    
    if (summary.criticalIssues > 0 || score >= (config.thresholds.critical || 10)) {
      level = 'critical';
      shouldBlock = true;
      recommendation = 'request-changes';
    } else if (summary.highIssues > 0 || score >= (config.thresholds.high || 15)) {
      level = 'high';
      shouldBlock = false;
      recommendation = 'comment';
    } else if (summary.mediumIssues > 3 || score >= (config.thresholds.medium || 25)) {
      level = 'medium';
      shouldBlock = false;
      recommendation = 'comment';
    }
    
    return { level, shouldBlock, recommendation, score };
  }

  generateRecommendations(consolidatedReport) {
    const recommendations = [];
    const { summary } = consolidatedReport;
    
    if (summary.criticalIssues > 0) {
      recommendations.push({
        priority: 'critical',
        title: 'Address Critical Issues',
        description: `${summary.criticalIssues} critical issues must be resolved before merging`,
        action: 'Block PR until resolved'
      });
    }
    
    if (summary.highIssues > 0) {
      recommendations.push({
        priority: 'high', 
        title: 'Review High Priority Issues',
        description: `${summary.highIssues} high priority issues should be addressed`,
        action: 'Manual review recommended'
      });
    }
    
    // Agent-specific recommendations
    Object.entries(consolidatedReport.metrics).forEach(([agent, metrics]) => {
      switch (agent) {
        case 'security':
          if (metrics.criticalCount > 0) {
            recommendations.push({
              priority: 'critical',
              title: 'Security Review Required',
              description: 'Critical security vulnerabilities detected',
              action: 'Security team review required'
            });
          }
          break;
          
        case 'performance':
          if (metrics.averageComplexity > 15) {
            recommendations.push({
              priority: 'medium',
              title: 'Code Complexity Review',
              description: `Average complexity: ${metrics.averageComplexity}`,
              action: 'Consider refactoring complex functions'
            });
          }
          break;
          
        case 'architecture':
          if (metrics.averageCoupling > 8) {
            recommendations.push({
              priority: 'medium',
              title: 'Architecture Review',
              description: `High coupling detected: ${metrics.averageCoupling}`,
              action: 'Consider reducing dependencies'
            });
          }
          break;
          
        case 'testing':
          if (metrics.coverageScore < 70) {
            recommendations.push({
              priority: 'high',
              title: 'Improve Test Coverage',
              description: `Coverage: ${metrics.coverageScore}%`,
              action: 'Add tests to reach 80% coverage'
            });
          }
          break;
      }
    });
    
    return recommendations;
  }

  generateAutoFixes(consolidatedReport) {
    const autoFixes = [];
    
    if (!this.config.autoFix?.rules) return autoFixes;
    
    // Process each issue for potential auto-fixes
    ['medium', 'low'].forEach(severity => {
      consolidatedReport.consolidatedIssues[severity].forEach(issue => {
        const fix = this.findAutoFix(issue);
        if (fix) {
          autoFixes.push({
            file: issue.file,
            line: issue.line,
            issue: issue.rule,
            currentCode: issue.match,
            suggestedFix: fix,
            confidence: 'medium',
            severity: severity
          });
        }
      });
    });
    
    return autoFixes;
  }

  findAutoFix(issue) {
    const rules = this.config.autoFix.rules;
    
    for (const rule of rules) {
      const pattern = new RegExp(rule.pattern, 'gi');
      if (pattern.test(issue.match || '')) {
        return rule.replacement.replace(/\$(\d+)/g, (match, num) => {
          // Simple replacement - would need more sophisticated logic for real use
          return issue.match || '';
        });
      }
    }
    
    // Check suggestions
    if (this.config.autoFix.suggestions) {
      const suggestion = this.config.autoFix.suggestions.find(s => s.rule === issue.rule);
      if (suggestion) {
        return suggestion.template.replace('${code}', issue.match || '')
          .replace('${functionCall}', issue.match || '');
      }
    }
    
    return null;
  }

  generateReport(consolidatedReport) {
    let report = '# 🤖 AI Code Review Results\n\n';
    
    // Executive Summary
    report += '## Executive Summary\n\n';
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| **Risk Level** | ${consolidatedReport.summary.riskScore.toUpperCase()} |\n`;
    report += `| **Total Issues** | ${consolidatedReport.summary.totalIssues} |\n`;
    report += `| **Critical** | ${consolidatedReport.summary.criticalIssues} |\n`;
    report += `| **High** | ${consolidatedReport.summary.highIssues} |\n`;
    report += `| **Medium** | ${consolidatedReport.summary.mediumIssues} |\n`;
    report += `| **Recommendation** | ${consolidatedReport.summary.recommendation.toUpperCase()} |\n\n`;
    
    // Status indicators
    if (consolidatedReport.summary.shouldBlock) {
      report += '🚨 **BLOCKING ISSUES DETECTED** - This PR cannot be merged until critical issues are resolved.\n\n';
    } else if (consolidatedReport.summary.criticalIssues === 0 && consolidatedReport.summary.highIssues === 0) {
      report += '✅ **REVIEW PASSED** - No critical or high priority issues detected.\n\n';
    } else {
      report += '⚠️ **REVIEW COMPLETED** - Some issues detected but PR can proceed with caution.\n\n';
    }

    // Agent Results Summary
    report += '## Agent Analysis Results\n\n';
    
    const agentEmojis = {
      security: '🔒',
      performance: '⚡',
      architecture: '🏗️',
      testing: '🧪'
    };
    
    Object.entries(consolidatedReport.agentResults).forEach(([agent, results]) => {
      const emoji = agentEmojis[agent] || '🤖';
      const summary = results.summary || {};
      const status = summary.riskScore === 'critical' ? '🚨 CRITICAL' : 
                    summary.riskScore === 'high' ? '⚠️ HIGH' : 
                    summary.riskScore === 'medium' ? '📝 MEDIUM' : '✅ PASSED';
      
      report += `### ${emoji} ${agent.charAt(0).toUpperCase() + agent.slice(1)} Agent - ${status}\n`;
      report += `- **Issues Found**: ${summary.totalIssues || 0}\n`;
      
      if (agent === 'security') {
        report += `- **Critical**: ${summary.criticalCount || 0}\n`;
      } else if (agent === 'performance') {
        report += `- **Avg Complexity**: ${summary.averageComplexity || 0}\n`;
      } else if (agent === 'architecture') {
        report += `- **Coupling**: ${summary.averageCoupling || 0}\n`;
      } else if (agent === 'testing') {
        report += `- **Coverage**: ${summary.coverageScore || 0}%\n`;
      }
      
      report += '\n';
    });

    // Critical Issues (if any)
    if (consolidatedReport.consolidatedIssues.critical.length > 0) {
      report += '## 🚨 Critical Issues\n\n';
      consolidatedReport.consolidatedIssues.critical.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.rule}\n`;
        report += `- **File**: \`${issue.file}:${issue.line}\`\n`;
        report += `- **Description**: ${issue.description}\n`;
        report += `- **Fix**: ${issue.fix}\n\n`;
      });
    }

    // High Priority Issues (collapsed if many)
    if (consolidatedReport.consolidatedIssues.high.length > 0) {
      const highIssues = consolidatedReport.consolidatedIssues.high;
      if (highIssues.length > 5) {
        report += `<details><summary>⚠️ High Priority Issues (${highIssues.length})</summary>\n\n`;
      } else {
        report += '## ⚠️ High Priority Issues\n\n';
      }
      
      highIssues.slice(0, 10).forEach((issue, index) => {
        report += `**${index + 1}. ${issue.rule}** - \`${issue.file}:${issue.line}\`\n`;
        report += `${issue.description}\n\n`;
      });
      
      if (highIssues.length > 10) {
        report += `*... and ${highIssues.length - 10} more issues*\n\n`;
      }
      
      if (highIssues.length > 5) {
        report += '</details>\n\n';
      }
    }

    // Recommendations
    if (consolidatedReport.recommendations.length > 0) {
      report += '## 🎯 Recommendations\n\n';
      consolidatedReport.recommendations.forEach((rec, index) => {
        const emoji = rec.priority === 'critical' ? '🚨' : 
                     rec.priority === 'high' ? '⚠️' : '📝';
        report += `${index + 1}. **${emoji} ${rec.title}**\n`;
        report += `   - ${rec.description}\n`;
        report += `   - *Action*: ${rec.action}\n\n`;
      });
    }

    // Auto-fixes (if any)
    if (consolidatedReport.autoFixes.length > 0) {
      report += `<details><summary>🔧 Suggested Auto-fixes (${consolidatedReport.autoFixes.length})</summary>\n\n`;
      consolidatedReport.autoFixes.slice(0, 5).forEach((fix, index) => {
        report += `**${index + 1}. ${fix.issue}** - \`${fix.file}:${fix.line}\`\n`;
        report += '```diff\n';
        report += `- ${fix.currentCode}\n`;
        report += `+ ${fix.suggestedFix}\n`;
        report += '```\n\n';
      });
      report += '</details>\n\n';
    }

    // Footer
    report += '---\n';
    report += `*Review completed at ${new Date().toISOString()} by Claude Code Review Swarm*\n`;
    report += `*Agents: ${consolidatedReport.summary.successfulAgents}/${consolidatedReport.summary.totalAgents} successful*\n`;

    return report;
  }

  formatForGitHub(consolidatedReport) {
    return {
      report: this.generateReport(consolidatedReport),
      riskScore: consolidatedReport.summary.riskScore,
      shouldBlock: consolidatedReport.summary.shouldBlock,
      recommendation: consolidatedReport.summary.recommendation,
      totalIssues: consolidatedReport.summary.totalIssues,
      criticalCount: consolidatedReport.summary.criticalIssues,
      metrics: consolidatedReport.metrics
    };
  }

  async updateMetrics(options = {}) {
    const { pr, riskScore, timestamp } = options;
    
    this.metrics.reviews++;
    
    if (riskScore === 'critical') {
      this.metrics.blockedPRs++;
    } else if (riskScore === 'low') {
      this.metrics.approvedPRs++;
    }
    
    // Save metrics to file
    try {
      const metricsPath = path.resolve(__dirname, '../../.claude-flow/metrics/review-metrics.json');
      const metricsData = {
        ...this.metrics,
        lastUpdate: timestamp || new Date().toISOString(),
        pr: pr
      };
      
      // Ensure directory exists
      const metricsDir = path.dirname(metricsPath);
      if (!fs.existsSync(metricsDir)) {
        fs.mkdirSync(metricsDir, { recursive: true });
      }
      
      fs.writeFileSync(metricsPath, JSON.stringify(metricsData, null, 2));
      console.log(chalk.green('📊 Metrics updated successfully'));
      
    } catch (error) {
      console.error(chalk.red('Failed to update metrics:'), error.message);
    }
    
    return { success: true, metrics: this.metrics };
  }
}

// CLI Interface
program
  .name('review-orchestrator')
  .description('AI code review orchestration and coordination')
  .command('initialize')
  .description('Initialize review swarm for a PR')
  .option('--pr <number>', 'Pull request number')
  .option('--files <files>', 'Comma-separated list of files')
  .option('--swarm-id <id>', 'Swarm identifier')
  .action(async (options) => {
    try {
      const orchestrator = new ReviewOrchestrator();
      const result = await orchestrator.initialize(options);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Initialization failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('consolidate')
  .description('Consolidate results from all review agents')
  .option('--security-results <data>', 'Security agent results')
  .option('--performance-results <data>', 'Performance agent results') 
  .option('--architecture-results <data>', 'Architecture agent results')
  .option('--testing-results <data>', 'Testing agent results')
  .option('--output <format>', 'Output format: json, markdown, github', 'github')
  .action(async (options) => {
    try {
      const orchestrator = new ReviewOrchestrator();
      const results = await orchestrator.consolidateResults(options);
      
      if (options.output === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else if (options.output === 'markdown') {
        console.log(orchestrator.generateReport(results));
      } else {
        // GitHub format
        const formatted = orchestrator.formatForGitHub(results);
        console.log(JSON.stringify(formatted, null, 2));
      }
      
    } catch (error) {
      console.error('Consolidation failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('updateMetrics')
  .description('Update review metrics')
  .option('--pr <number>', 'Pull request number')
  .option('--risk-score <score>', 'Risk score from review')
  .option('--timestamp <time>', 'Timestamp of review')
  .action(async (options) => {
    try {
      const orchestrator = new ReviewOrchestrator();
      const result = await orchestrator.updateMetrics(options);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Metrics update failed:', error.message);
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}

module.exports = ReviewOrchestrator;