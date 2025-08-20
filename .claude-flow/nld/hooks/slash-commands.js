#!/usr/bin/env node

/**
 * NLD Slash Commands
 * Implements /nld-* commands for manual NLD agent interaction
 */

const fs = require('fs');
const path = require('path');
const { NLDDetector } = require('./detection-triggers');
const { TDDEnhancer } = require('../workflows/tdd-enhancement');
const { PatternAnalyzer } = require('../patterns/pattern-analyzer');
const { NeuralDataExporter } = require('../neural/training-data-export');

class SlashCommands {
  constructor() {
    this.detector = new NLDDetector();
    this.enhancer = new TDDEnhancer();
    this.analyzer = new PatternAnalyzer();
    this.exporter = new NeuralDataExporter();
    this.databaseDir = '.claude-flow/nld/database';
  }

  /**
   * Handle /nld-report command
   * Manually report a success/failure pattern
   */
  async handleReport(args) {
    const [outcome, taskDescription, claudeResponse, userFeedback] = args;
    
    if (!outcome || !taskDescription) {
      return this.showReportUsage();
    }
    
    // Create artificial detection data for manual reporting
    const detectionData = {
      type: outcome === 'failure' ? 'unexpected_failure' : 'unexpected_success',
      userFeedback: userFeedback || `Manual report: ${outcome}`,
      claudeResponse: claudeResponse || 'Manual report - no Claude response provided',
      mismatch: true
    };
    
    const taskContext = {
      originalTask: taskDescription,
      manualReport: true
    };
    
    try {
      const record = await this.detector.createNLTRecord(detectionData, taskContext);
      
      return {
        success: true,
        message: 'NLD record created successfully',
        record_id: record.record_id,
        details: {
          outcome: outcome,
          task: taskDescription,
          effectiveness_score: record.effectiveness_metrics.effectiveness_score
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle /nld-stats command
   * Show NLD database statistics
   */
  async handleStats(args) {
    try {
      const analysis = await this.analyzer.analyzeAllPatterns();
      
      return {
        success: true,
        statistics: {
          total_records: analysis.overview.total_records,
          failure_rate: `${Math.round(analysis.overview.failure_rate * 100)}%`,
          success_rate: `${Math.round(analysis.overview.success_rate * 100)}%`,
          tdd_adoption: `${Math.round(analysis.overview.tdd_adoption_rate * 100)}%`,
          avg_effectiveness: Math.round(analysis.overview.avg_effectiveness_score * 100) / 100,
          top_failure_types: analysis.failure_patterns.most_common_failures.slice(0, 3),
          data_quality: {
            completeness: `${Math.round(analysis.overview.data_quality.completeness * 100)}%`,
            consistency: `${Math.round(analysis.overview.data_quality.consistency * 100)}%`,
            accuracy: `${Math.round(analysis.overview.data_quality.accuracy * 100)}%`
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle /nld-patterns command  
   * Analyze and show failure patterns
   */
  async handlePatterns(args) {
    const [domain, limit] = args;
    const maxResults = parseInt(limit) || 10;
    
    try {
      const analysis = await this.analyzer.analyzeAllPatterns();
      
      let patterns;
      if (domain && domain !== 'all') {
        // Filter patterns by domain
        const domainFailures = analysis.failure_patterns.failure_by_domain[domain] || [];
        patterns = domainFailures.slice(0, maxResults);
      } else {
        patterns = analysis.failure_patterns.most_common_failures.slice(0, maxResults);
      }
      
      return {
        success: true,
        patterns: patterns,
        summary: {
          total_patterns: patterns.length,
          domain_filter: domain || 'all',
          trending_patterns: analysis.trending_patterns.emerging_failure_types,
          recommendations: analysis.recommendations.slice(0, 3)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle /nld-suggest command
   * Get TDD suggestions for current task
   */
  async handleSuggest(args) {
    const [taskDescription, domain] = args;
    
    if (!taskDescription) {
      return this.showSuggestUsage();
    }
    
    try {
      const suggestions = await this.enhancer.suggestTDDPatterns(taskDescription, domain || 'general');
      
      return {
        success: true,
        task: taskDescription,
        domain: domain || 'general',
        suggestions: {
          success_probability: suggestions.success_probability,
          recommended_tests: suggestions.recommended_tests.slice(0, 3),
          top_edge_cases: suggestions.edge_cases.slice(0, 3),
          common_pitfalls: suggestions.common_pitfalls.slice(0, 2),
          tdd_workflow: suggestions.tdd_workflow
        },
        quick_tips: this.generateQuickTips(suggestions)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle /nld-train command
   * Export training data for neural networks
   */
  async handleTrain(args) {
    try {
      const trainingData = await this.exporter.exportTrainingData();
      const report = await this.exporter.generateReport(trainingData);
      
      return {
        success: true,
        training_export: {
          total_records: trainingData.metadata.total_records,
          patterns_exported: trainingData.patterns.failure_detection.length + trainingData.patterns.success_prediction.length,
          tdd_patterns: trainingData.patterns.tdd_effectiveness.length
        },
        summary: report.summary,
        recommendations: report.recommendations.slice(0, 3)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle /nld-analyze command
   * Run comprehensive pattern analysis
   */
  async handleAnalyze(args) {
    const [analysisType] = args;
    
    try {
      const analysis = await this.analyzer.analyzeAllPatterns();
      
      let result;
      switch (analysisType) {
        case 'failures':
          result = analysis.failure_patterns;
          break;
        case 'successes':
          result = analysis.success_patterns;
          break;
        case 'tdd':
          result = analysis.tdd_analysis;
          break;
        case 'trends':
          result = analysis.trending_patterns;
          break;
        default:
          result = {
            overview: analysis.overview,
            key_insights: {
              failure_rate: analysis.overview.failure_rate,
              tdd_effectiveness: analysis.tdd_analysis.tdd_effectiveness_improvement,
              top_failure_type: analysis.failure_patterns.most_common_failures[0]?.type || 'none',
              data_quality_score: (
                analysis.overview.data_quality.completeness +
                analysis.overview.data_quality.consistency +
                analysis.overview.data_quality.accuracy
              ) / 3
            },
            recommendations: analysis.recommendations.slice(0, 5)
          };
      }
      
      return {
        success: true,
        analysis_type: analysisType || 'overview',
        result: result,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle /nld-health command
   * Check NLD system health and status
   */
  async handleHealth(args) {
    try {
      const health = {
        database: this.checkDatabaseHealth(),
        neural_integration: this.checkNeuralIntegration(),
        pattern_detection: this.checkPatternDetection(),
        tdd_enhancement: this.checkTDDEnhancement()
      };
      
      const overallHealth = Object.values(health).every(h => h.status === 'healthy') ? 'healthy' : 'degraded';
      
      return {
        success: true,
        overall_status: overallHealth,
        components: health,
        system_info: {
          database_records: await this.countDatabaseRecords(),
          neural_patterns: await this.countNeuralPatterns(),
          uptime: this.getUptime()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle /nld-help command
   * Show available commands and usage
   */
  async handleHelp(args) {
    return {
      success: true,
      commands: {
        '/nld-report <outcome> "<task>" ["claude_response"] ["user_feedback"]': 'Manually report success/failure pattern',
        '/nld-stats [domain]': 'Show NLD database statistics',
        '/nld-patterns [domain] [limit]': 'Analyze and show failure patterns', 
        '/nld-suggest "<task>" [domain]': 'Get TDD suggestions for task',
        '/nld-train': 'Export neural network training data',
        '/nld-analyze [type]': 'Run pattern analysis (failures|successes|tdd|trends|overview)',
        '/nld-health': 'Check NLD system health status',
        '/nld-help': 'Show this help message'
      },
      examples: {
        'Report failure': '/nld-report failure "implement user login" "Here\'s the login code..." "that didn\'t work, got 500 error"',
        'Get TDD suggestions': '/nld-suggest "create API endpoint for user registration" backend',
        'View patterns': '/nld-patterns debug 5',
        'Check stats': '/nld-stats'
      },
      integration: {
        automatic_detection: 'NLD automatically detects patterns from "didn\'t work" / "that worked" user responses',
        neural_training: 'Use /nld-train to export data for claude-flow neural network training',
        tdd_enhancement: 'Use /nld-suggest to get historical failure-based TDD recommendations'
      }
    };
  }

  /**
   * Main command router
   */
  async handleCommand(command, args = []) {
    switch (command) {
      case 'nld-report':
        return await this.handleReport(args);
      case 'nld-stats':
        return await this.handleStats(args);
      case 'nld-patterns':
        return await this.handlePatterns(args);
      case 'nld-suggest':
        return await this.handleSuggest(args);
      case 'nld-train':
        return await this.handleTrain(args);
      case 'nld-analyze':
        return await this.handleAnalyze(args);
      case 'nld-health':
        return await this.handleHealth(args);
      case 'nld-help':
        return await this.handleHelp(args);
      default:
        return {
          success: false,
          error: `Unknown command: ${command}. Use /nld-help for available commands.`
        };
    }
  }

  /**
   * Helper methods
   */
  
  showReportUsage() {
    return {
      success: false,
      error: 'Usage: /nld-report <outcome> "<task_description>" ["claude_response"] ["user_feedback"]',
      examples: [
        '/nld-report failure "create login function" "Here is the code..." "got authentication error"',
        '/nld-report success "fix bug in API" "Updated the endpoint..." "working perfectly now"'
      ]
    };
  }

  showSuggestUsage() {
    return {
      success: false,
      error: 'Usage: /nld-suggest "<task_description>" [domain]',
      examples: [
        '/nld-suggest "implement user authentication" backend',
        '/nld-suggest "create responsive navigation component" frontend'
      ]
    };
  }

  generateQuickTips(suggestions) {
    const tips = [];
    
    if (suggestions.success_probability.probability < 0.6) {
      tips.push('⚠️ Low success probability - consider breaking task into smaller parts');
    }
    
    if (suggestions.common_pitfalls.length > 3) {
      tips.push('🧪 Many historical pitfalls found - extra testing recommended');
    }
    
    if (suggestions.recommended_tests.some(t => t.priority === 'high')) {
      tips.push('🎯 High-priority test patterns identified - implement these first');
    }
    
    if (suggestions.tdd_workflow.complexity === 'high') {
      tips.push('⏱️ Complex task detected - allocate extra time for TDD phases');
    }
    
    return tips;
  }

  checkDatabaseHealth() {
    try {
      const recordsDir = path.join(this.databaseDir, 'records');
      const indexFile = path.join(this.databaseDir, 'index.json');
      
      const hasRecords = fs.existsSync(recordsDir) && fs.readdirSync(recordsDir).length > 0;
      const hasIndex = fs.existsSync(indexFile);
      
      return {
        status: hasRecords && hasIndex ? 'healthy' : 'degraded',
        details: {
          records_directory: fs.existsSync(recordsDir),
          index_file: hasIndex,
          record_count: hasRecords ? fs.readdirSync(recordsDir).filter(f => f.endsWith('.json')).length : 0
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  checkNeuralIntegration() {
    try {
      const neuralDir = '.claude-flow/nld/neural';
      const exportsDir = path.join(neuralDir, 'exports');
      
      return {
        status: fs.existsSync(neuralDir) ? 'healthy' : 'degraded',
        details: {
          neural_directory: fs.existsSync(neuralDir),
          exports_directory: fs.existsSync(exportsDir),
          latest_export: fs.existsSync(path.join(neuralDir, 'latest-export.json'))
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  checkPatternDetection() {
    try {
      const hooksDir = '.claude-flow/nld/hooks';
      const detectionScript = path.join(hooksDir, 'detection-triggers.js');
      
      return {
        status: fs.existsSync(detectionScript) ? 'healthy' : 'degraded',
        details: {
          hooks_directory: fs.existsSync(hooksDir),
          detection_script: fs.existsSync(detectionScript),
          executable: fs.existsSync(detectionScript) && fs.statSync(detectionScript).mode & 0o111
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  checkTDDEnhancement() {
    try {
      const workflowsDir = '.claude-flow/nld/workflows';
      const enhancementScript = path.join(workflowsDir, 'tdd-enhancement.js');
      
      return {
        status: fs.existsSync(enhancementScript) ? 'healthy' : 'degraded',
        details: {
          workflows_directory: fs.existsSync(workflowsDir),
          enhancement_script: fs.existsSync(enhancementScript)
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy', 
        error: error.message
      };
    }
  }

  async countDatabaseRecords() {
    try {
      const recordsDir = path.join(this.databaseDir, 'records');
      if (!fs.existsSync(recordsDir)) return 0;
      
      return fs.readdirSync(recordsDir).filter(f => f.endsWith('.json')).length;
    } catch (error) {
      return 0;
    }
  }

  async countNeuralPatterns() {
    try {
      const patternsFile = '.claude-flow/nld/neural/nld-patterns.json';
      if (!fs.existsSync(patternsFile)) return 0;
      
      const patterns = JSON.parse(fs.readFileSync(patternsFile, 'utf8'));
      return (patterns.failure_patterns?.length || 0) + (patterns.success_patterns?.length || 0);
    } catch (error) {
      return 0;
    }
  }

  getUptime() {
    return Math.floor(process.uptime() / 60) + ' minutes';
  }
}

module.exports = { SlashCommands };

// CLI usage for testing
if (require.main === module) {
  const commands = new SlashCommands();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  if (command) {
    commands.handleCommand(command.replace('/', ''), args)
      .then(result => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch(err => console.error('Command error:', err));
  } else {
    console.log('Usage: node slash-commands.js <command> [args...]');
    console.log('Commands: nld-help, nld-stats, nld-patterns, nld-suggest, etc.');
  }
}