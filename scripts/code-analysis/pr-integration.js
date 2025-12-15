#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { spawn, exec } = require('child_process');

class PRIntegration {
  constructor() {
    this.ghCliAvailable = false;
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const configPath = path.resolve(__dirname, '../../config/code-review-rules.json');
      return JSON.parse(fs.readFileSync(configPath, 'utf8')).codeReviewConfig;
    } catch (error) {
      console.warn('Could not load config:', error.message);
      return {};
    }
  }

  async checkGitHubCLI() {
    return new Promise((resolve) => {
      exec('gh --version', (error) => {
        this.ghCliAvailable = !error;
        resolve(this.ghCliAvailable);
      });
    });
  }

  async getPRData(prNumber) {
    if (!await this.checkGitHubCLI()) {
      throw new Error('GitHub CLI not available');
    }

    return new Promise((resolve, reject) => {
      const cmd = `gh pr view ${prNumber} --json files,additions,deletions,title,body,labels,headRefOid,author,url`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to get PR data: ${stderr || error.message}`));
          return;
        }
        
        try {
          const prData = JSON.parse(stdout);
          resolve(prData);
        } catch (parseError) {
          reject(new Error(`Failed to parse PR data: ${parseError.message}`));
        }
      });
    });
  }

  async getPRDiff(prNumber) {
    if (!this.ghCliAvailable) {
      throw new Error('GitHub CLI not available');
    }

    return new Promise((resolve, reject) => {
      const cmd = `gh pr diff ${prNumber} --color never`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to get PR diff: ${stderr || error.message}`));
          return;
        }
        
        resolve(stdout);
      });
    });
  }

  async postPRComment(prNumber, comment) {
    if (!this.ghCliAvailable) {
      console.warn('GitHub CLI not available, cannot post comment');
      return false;
    }

    // Truncate comment if too long for GitHub
    const maxLength = this.config.reporting?.maxCommentLength || 65000;
    let truncatedComment = comment;
    
    if (comment.length > maxLength) {
      truncatedComment = comment.substring(0, maxLength - 200) + 
        '\n\n---\n*Comment truncated due to length. Full report available in CI logs.*';
    }

    return new Promise((resolve, reject) => {
      // Escape the comment for shell
      const escapedComment = truncatedComment.replace(/'/g, "'\"'\"'");
      const cmd = `gh pr comment ${prNumber} --body '${escapedComment}'`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Failed to post comment: ${stderr || error.message}`);
          resolve(false);
          return;
        }
        
        console.log(`✅ Posted comment to PR #${prNumber}`);
        resolve(true);
      });
    });
  }

  async updatePRLabels(prNumber, labels, action = 'add') {
    if (!this.ghCliAvailable) {
      console.warn('GitHub CLI not available, cannot update labels');
      return false;
    }

    if (!labels || labels.length === 0) return true;

    return new Promise((resolve) => {
      const labelList = Array.isArray(labels) ? labels.join(',') : labels;
      const flag = action === 'add' ? '--add-label' : '--remove-label';
      const cmd = `gh pr edit ${prNumber} ${flag} "${labelList}"`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.warn(`Failed to ${action} labels: ${stderr || error.message}`);
          resolve(false);
          return;
        }
        
        console.log(`✅ ${action === 'add' ? 'Added' : 'Removed'} labels: ${labelList}`);
        resolve(true);
      });
    });
  }

  async createPRReview(prNumber, action, body) {
    if (!this.ghCliAvailable) {
      console.warn('GitHub CLI not available, cannot create review');
      return false;
    }

    const validActions = ['approve', 'request-changes', 'comment'];
    if (!validActions.includes(action)) {
      console.warn(`Invalid review action: ${action}`);
      return false;
    }

    return new Promise((resolve) => {
      // Escape body for shell
      const escapedBody = body.replace(/'/g, "'\"'\"'");
      const cmd = action === 'comment' 
        ? `gh pr review ${prNumber} --comment --body '${escapedBody}'`
        : `gh pr review ${prNumber} --${action} --body '${escapedBody}'`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Failed to create review: ${stderr || error.message}`);
          resolve(false);
          return;
        }
        
        console.log(`✅ Created ${action} review for PR #${prNumber}`);
        resolve(true);
      });
    });
  }

  async setStatusCheck(context, state, description, targetUrl = '') {
    if (!this.ghCliAvailable) {
      console.warn('GitHub CLI not available, cannot set status check');
      return false;
    }

    // GitHub status checks would typically be set via API
    // This is a simplified version
    return new Promise((resolve) => {
      const status = state === 'success' ? 'passed' : 
                    state === 'failure' ? 'failed' : 'pending';
      
      console.log(`📊 Status Check: ${context} - ${status}`);
      console.log(`   Description: ${description}`);
      if (targetUrl) {
        console.log(`   URL: ${targetUrl}`);
      }
      
      // In a real implementation, this would use the GitHub API
      resolve(true);
    });
  }

  determineLabelsFromRisk(riskScore, issues) {
    const labels = [];
    
    switch (riskScore) {
      case 'critical':
        labels.push('security-review-required', 'performance-review-required', 'high-risk-change');
        break;
      case 'high':
        labels.push('high-risk-change', 'manual-review-required');
        break;
      case 'medium':
        labels.push('automated-review-complete');
        break;
      case 'low':
        labels.push('auto-approved', 'low-risk-change');
        break;
    }
    
    // Add specific labels based on issue types
    if (issues.security && issues.security > 0) {
      labels.push('security-issues');
    }
    
    if (issues.performance && issues.performance > 0) {
      labels.push('performance-issues');
    }
    
    if (issues.testing && issues.testing > 0) {
      labels.push('needs-tests');
    }
    
    return labels;
  }

  async processReviewResults(prNumber, consolidatedResults) {
    console.log(`🔄 Processing review results for PR #${prNumber}`);
    
    const { summary, report } = consolidatedResults;
    const labels = this.determineLabelsFromRisk(summary.riskScore, {
      security: summary.criticalIssues,
      performance: summary.highIssues,
      testing: summary.mediumIssues
    });
    
    // Post consolidated comment
    await this.postPRComment(prNumber, report);
    
    // Update labels
    await this.updatePRLabels(prNumber, labels, 'add');
    
    // Create review based on recommendation
    if (summary.recommendation === 'request-changes') {
      await this.createPRReview(
        prNumber,
        'request-changes',
        '🚨 Critical issues detected. Please address the issues mentioned in the automated review before merging.'
      );
    } else if (summary.recommendation === 'approve' && summary.riskScore === 'low') {
      await this.createPRReview(
        prNumber,
        'approve',
        '✅ Automated review passed. No significant issues detected.'
      );
    } else {
      await this.createPRReview(
        prNumber,
        'comment',
        '📝 Automated review completed. Please review the findings above.'
      );
    }
    
    // Set status checks
    const statusChecks = [
      {
        context: 'review-swarm/security',
        state: summary.criticalIssues > 0 ? 'failure' : 'success',
        description: `${summary.criticalIssues} critical security issues`
      },
      {
        context: 'review-swarm/performance', 
        state: summary.highIssues > 2 ? 'failure' : 'success',
        description: `${summary.highIssues} performance issues`
      },
      {
        context: 'review-swarm/architecture',
        state: summary.mediumIssues > 5 ? 'failure' : 'success',
        description: `${summary.mediumIssues} architecture issues`
      },
      {
        context: 'review-swarm/overall',
        state: summary.shouldBlock ? 'failure' : 'success',
        description: `Overall risk: ${summary.riskScore}`
      }
    ];
    
    for (const check of statusChecks) {
      await this.setStatusCheck(check.context, check.state, check.description);
    }
    
    return {
      success: true,
      prNumber: prNumber,
      riskScore: summary.riskScore,
      recommendation: summary.recommendation,
      totalIssues: summary.totalIssues,
      labelsAdded: labels
    };
  }

  async runFullReview(prNumber, options = {}) {
    console.log(`🚀 Starting full code review for PR #${prNumber}`);
    
    try {
      // Get PR data
      const prData = await this.getPRData(prNumber);
      const prDiff = await this.getPRDiff(prNumber);
      
      const files = prData.files.map(f => f.path);
      console.log(`📁 Analyzing ${files.length} files`);
      
      // Initialize review orchestrator
      const ReviewOrchestrator = require('./review-orchestrator');
      const orchestrator = new ReviewOrchestrator();
      
      await orchestrator.initialize({
        pr: prNumber,
        files: files.join(','),
        swarmId: `review-${prNumber}`
      });
      
      // Run all agents in parallel
      const agentPromises = [];
      const agents = ['security', 'performance', 'architecture', 'testing'];
      
      for (const agent of agents) {
        agentPromises.push(orchestrator.runAgent(agent, files, prDiff));
      }
      
      const agentResults = await Promise.allSettled(agentPromises);
      
      // Consolidate results
      const consolidationInput = {};
      agentResults.forEach((result, index) => {
        const agentName = agents[index];
        if (result.status === 'fulfilled' && result.value.success) {
          consolidationInput[`${agentName}-results`] = result.value.results;
        } else {
          console.warn(`❌ ${agentName} agent failed:`, result.reason?.message || 'Unknown error');
        }
      });
      
      const consolidatedResults = await orchestrator.consolidateResults(consolidationInput);
      const formattedResults = orchestrator.formatForGitHub(consolidatedResults);
      
      // Process results with GitHub
      const processResult = await this.processReviewResults(prNumber, formattedResults);
      
      // Update metrics
      await orchestrator.updateMetrics({
        pr: prNumber,
        riskScore: formattedResults.riskScore,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Full review completed for PR #${prNumber}`);
      console.log(`   Risk Score: ${formattedResults.riskScore}`);
      console.log(`   Total Issues: ${formattedResults.totalIssues}`);
      console.log(`   Recommendation: ${formattedResults.recommendation}`);
      
      return {
        success: true,
        ...processResult,
        executionTime: Date.now() - (options.startTime || Date.now())
      };
      
    } catch (error) {
      console.error(`❌ Full review failed for PR #${prNumber}:`, error.message);
      
      // Post error comment
      await this.postPRComment(prNumber, `## ❌ Automated Review Failed\n\nError: ${error.message}\n\nPlease run manual review or contact the development team.`);
      
      return {
        success: false,
        error: error.message,
        prNumber: prNumber
      };
    }
  }
}

// CLI Interface
program
  .name('pr-integration')
  .description('GitHub PR integration for automated code reviews');

program
  .command('review')
  .description('Run full automated review for a PR')
  .requiredOption('--pr <number>', 'Pull request number')
  .option('--files <files>', 'Comma-separated list of files to review')
  .option('--agents <agents>', 'Comma-separated list of agents to run')
  .action(async (options) => {
    try {
      const integration = new PRIntegration();
      const result = await integration.runFullReview(parseInt(options.pr), {
        startTime: Date.now()
      });
      
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
      
    } catch (error) {
      console.error('PR review failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('comment')
  .description('Post a comment to a PR')
  .requiredOption('--pr <number>', 'Pull request number')
  .requiredOption('--body <text>', 'Comment body')
  .action(async (options) => {
    try {
      const integration = new PRIntegration();
      const success = await integration.postPRComment(parseInt(options.pr), options.body);
      process.exit(success ? 0 : 1);
    } catch (error) {
      console.error('Failed to post comment:', error.message);
      process.exit(1);
    }
  });

program
  .command('labels')
  .description('Update PR labels')
  .requiredOption('--pr <number>', 'Pull request number')
  .requiredOption('--labels <labels>', 'Comma-separated list of labels')
  .option('--action <action>', 'Action: add or remove', 'add')
  .action(async (options) => {
    try {
      const integration = new PRIntegration();
      const success = await integration.updatePRLabels(
        parseInt(options.pr), 
        options.labels.split(',').map(l => l.trim()),
        options.action
      );
      process.exit(success ? 0 : 1);
    } catch (error) {
      console.error('Failed to update labels:', error.message);
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}

module.exports = PRIntegration;