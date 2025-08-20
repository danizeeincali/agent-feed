#!/usr/bin/env node

/**
 * NLD TDD Enhancement Workflows
 * Provides TDD suggestions based on historical failure patterns
 */

const fs = require('fs');
const path = require('path');

class TDDEnhancer {
  constructor() {
    this.databaseDir = '.claude-flow/nld/database';
    this.patternsDir = '.claude-flow/nld/patterns';
  }

  /**
   * Analyze current task and suggest TDD patterns based on historical failures
   */
  async suggestTDDPatterns(taskDescription, domain = 'general') {
    const historicalFailures = await this.getHistoricalFailures(domain);
    const relevantPatterns = this.findRelevantPatterns(taskDescription, historicalFailures);
    
    const suggestions = {
      recommended_tests: [],
      edge_cases: [],
      common_pitfalls: [],
      tdd_workflow: this.generateTDDWorkflow(domain, relevantPatterns),
      success_probability: this.calculateSuccessProbability(taskDescription, relevantPatterns)
    };

    // Generate specific test recommendations
    for (const pattern of relevantPatterns.slice(0, 5)) {
      if (pattern.failure_analysis.failure_type === 'logic') {
        suggestions.recommended_tests.push({
          type: 'unit',
          focus: 'Core logic validation',
          template: this.generateLogicTestTemplate(pattern),
          priority: 'high'
        });
      }
      
      if (pattern.failure_analysis.failure_type === 'integration') {
        suggestions.recommended_tests.push({
          type: 'integration',  
          focus: 'Component interaction testing',
          template: this.generateIntegrationTestTemplate(pattern),
          priority: 'medium'
        });
      }
      
      // Add edge cases based on historical failures
      suggestions.edge_cases.push({
        scenario: this.extractEdgeCase(pattern),
        likelihood: pattern.effectiveness_metrics.pattern_frequency || 0.1,
        test_approach: this.suggestTestApproach(pattern)
      });
      
      // Add common pitfalls
      suggestions.common_pitfalls.push({
        pitfall: pattern.failure_analysis.root_cause,
        prevention: this.generatePreventionStrategy(pattern),
        detection_test: this.generateDetectionTest(pattern)
      });
    }

    return suggestions;
  }

  /**
   * Get historical failures for a specific domain
   */
  async getHistoricalFailures(domain) {
    const indexPath = path.join(this.databaseDir, 'index.json');
    
    if (!fs.existsSync(indexPath)) {
      return [];
    }
    
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const domainRecords = index.by_domain[domain] || [];
    
    const failures = [];
    
    for (const recordId of domainRecords) {
      const recordPath = path.join(this.databaseDir, 'records', `${recordId}.json`);
      
      if (fs.existsSync(recordPath)) {
        const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
        if (record.user_feedback.outcome === 'failure') {
          failures.push(record);
        }
      }
    }
    
    return failures.sort((a, b) => 
      b.effectiveness_metrics.pattern_frequency - a.effectiveness_metrics.pattern_frequency
    );
  }

  /**
   * Find patterns relevant to current task
   */
  findRelevantPatterns(taskDescription, historicalFailures) {
    const taskWords = taskDescription.toLowerCase().split(/\s+/);
    
    return historicalFailures
      .map(failure => ({
        ...failure,
        relevance: this.calculateRelevance(taskWords, failure)
      }))
      .filter(failure => failure.relevance > 0.3)
      .sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Calculate relevance score between task and historical failure
   */
  calculateRelevance(taskWords, failure) {
    const failureWords = failure.task_context.original_task.toLowerCase().split(/\s+/);
    const commonWords = taskWords.filter(word => failureWords.includes(word));
    
    let score = commonWords.length / Math.max(taskWords.length, failureWords.length);
    
    // Boost score for same domain
    if (failure.task_context.task_domain !== 'general') {
      score *= 1.3;
    }
    
    // Boost score for common failure patterns
    if (failure.effectiveness_metrics.pattern_frequency > 0.5) {
      score *= 1.2;
    }
    
    return score;
  }

  /**
   * Generate TDD workflow based on domain and patterns
   */
  generateTDDWorkflow(domain, patterns) {
    const workflow = {
      phases: [],
      estimated_time: '30-60 minutes',
      complexity: 'medium'
    };

    // Red Phase - Write failing tests
    workflow.phases.push({
      name: 'Red - Write Failing Tests',
      steps: [
        'Write unit tests for core functionality',
        'Add integration tests for component interactions',
        'Include edge case tests based on historical failures',
        'Ensure all tests fail initially'
      ],
      focus: patterns.length > 0 ? `Focus on ${patterns[0].failure_analysis.failure_type} failures` : 'Core functionality',
      duration: '15-20 minutes'
    });

    // Green Phase - Make tests pass
    workflow.phases.push({
      name: 'Green - Make Tests Pass',
      steps: [
        'Implement minimal code to pass tests',
        'Address one test at a time',
        'Avoid over-engineering solutions',
        'Keep implementation simple and focused'
      ],
      focus: 'Simplest implementation that passes tests',
      duration: '20-30 minutes'
    });

    // Refactor Phase - Improve code quality
    workflow.phases.push({
      name: 'Refactor - Improve Code Quality',
      steps: [
        'Refactor implementation while keeping tests green',
        'Extract common patterns and utilities',
        'Optimize for readability and maintainability',
        'Add performance optimizations if needed'
      ],
      focus: 'Code quality and maintainability',
      duration: '10-15 minutes'
    });

    // Adjust complexity based on patterns
    if (patterns.some(p => p.task_context.task_complexity > 7)) {
      workflow.complexity = 'high';
      workflow.estimated_time = '60-90 minutes';
    } else if (patterns.every(p => p.task_context.task_complexity < 4)) {
      workflow.complexity = 'low';  
      workflow.estimated_time = '15-30 minutes';
    }

    return workflow;
  }

  /**
   * Calculate success probability based on TDD usage and patterns
   */
  calculateSuccessProbability(taskDescription, patterns) {
    let baseProbability = 0.7; // Base TDD success rate
    
    if (patterns.length === 0) {
      return { probability: baseProbability, confidence: 'medium' };
    }

    // Calculate average TDD effectiveness from patterns
    const tddPatterns = patterns.filter(p => p.failure_analysis.tdd_used);
    const nonTddPatterns = patterns.filter(p => !p.failure_analysis.tdd_used);
    
    if (tddPatterns.length > 0) {
      const tddSuccessRate = tddPatterns.reduce((sum, p) => 
        sum + p.effectiveness_metrics.effectiveness_score, 0) / tddPatterns.length;
      baseProbability = Math.max(baseProbability, tddSuccessRate);
    }
    
    // Adjust based on non-TDD failure rate
    if (nonTddPatterns.length > 0) {
      const nonTddFailureRate = nonTddPatterns.filter(p => 
        p.user_feedback.outcome === 'failure').length / nonTddPatterns.length;
      baseProbability *= (1 + (1 - nonTddFailureRate));
    }

    // Boost for high-frequency failure patterns (we know what to avoid)
    const highFreqPatterns = patterns.filter(p => p.effectiveness_metrics.pattern_frequency > 0.7);
    if (highFreqPatterns.length > 0) {
      baseProbability *= 1.2;
    }

    const probability = Math.min(0.95, baseProbability);
    const confidence = probability > 0.8 ? 'high' : probability > 0.6 ? 'medium' : 'low';
    
    return { probability, confidence };
  }

  /**
   * Generate test templates for different failure types
   */
  generateLogicTestTemplate(pattern) {
    return {
      framework: 'jest', // Default, can be customized
      template: `describe('${this.extractFunctionName(pattern)}', () => {
  test('should handle normal case', () => {
    // Test normal operation
    expect(functionUnderTest(validInput)).toBe(expectedOutput);
  });
  
  test('should handle edge case from pattern', () => {
    // Based on failure: ${pattern.failure_analysis.root_cause}
    expect(functionUnderTest(edgeCaseInput)).toBe(expectedEdgeOutput);
  });
  
  test('should validate input parameters', () => {
    // Prevent ${pattern.failure_analysis.failure_type} failures
    expect(() => functionUnderTest(invalidInput)).toThrow();
  });
});`,
      focus_areas: ['Input validation', 'Edge cases', 'Error handling']
    };
  }

  generateIntegrationTestTemplate(pattern) {
    return {
      framework: 'jest',
      template: `describe('Integration Tests', () => {
  test('should integrate components successfully', () => {
    // Test component interaction
    const result = componentA.interactWith(componentB);
    expect(result).toBeDefined();
  });
  
  test('should handle integration failure gracefully', () => {
    // Based on pattern: ${pattern.failure_analysis.root_cause}
    const mockFailure = jest.fn().mockRejectedValue(new Error('Integration failed'));
    expect(handleIntegrationFailure(mockFailure)).resolves.toBeDefined();
  });
});`,
      focus_areas: ['Component interaction', 'Error propagation', 'State consistency']
    };
  }

  /**
   * Extract edge case scenarios from failure patterns
   */
  extractEdgeCase(pattern) {
    const failureTypes = {
      'logic': 'Boundary conditions and null/undefined values',
      'environment': 'Missing dependencies and permission errors', 
      'dependency': 'Module loading failures and version conflicts',
      'integration': 'Network timeouts and API failures',
      'syntax': 'Malformed input and parsing errors',
      'design': 'Architectural assumptions and interface mismatches'
    };
    
    return failureTypes[pattern.failure_analysis.failure_type] || 'Unexpected input conditions';
  }

  /**
   * Suggest test approach for specific failure pattern
   */
  suggestTestApproach(pattern) {
    const approaches = {
      'logic': 'Use parameterized tests with boundary values',
      'environment': 'Mock external dependencies and test error conditions',
      'dependency': 'Test with missing/mock dependencies',
      'integration': 'Use contract testing and service virtualization',
      'syntax': 'Test input validation and parsing edge cases',
      'design': 'Test interface contracts and assumptions'
    };
    
    return approaches[pattern.failure_analysis.failure_type] || 'Comprehensive unit and integration testing';
  }

  /**
   * Generate prevention strategy for common pitfalls
   */
  generatePreventionStrategy(pattern) {
    return {
      strategy: `Implement ${pattern.failure_analysis.failure_type} validation early`,
      techniques: [
        'Add comprehensive input validation',
        'Use defensive programming practices',
        'Implement proper error handling',
        'Add logging for debugging'
      ],
      tests_needed: this.suggestTestApproach(pattern)
    };
  }

  /**
   * Generate test to detect specific failure pattern
   */
  generateDetectionTest(pattern) {
    return {
      purpose: `Detect ${pattern.failure_analysis.failure_type} issues early`,
      test_type: 'negative_test',
      description: `Test should fail when ${pattern.failure_analysis.root_cause} occurs`,
      example: `expect(() => functionWithIssue()).toThrow('${pattern.failure_analysis.failure_type} error')`
    };
  }

  /**
   * Extract function name from task context
   */
  extractFunctionName(pattern) {
    const task = pattern.task_context.original_task;
    const match = task.match(/function\s+(\w+)|(\w+)\s*function|\b(\w+)\(/);
    return match ? (match[1] || match[2] || match[3]) : 'functionUnderTest';
  }

  /**
   * Generate comprehensive TDD report for current task
   */
  async generateTDDReport(taskDescription, domain = 'general') {
    const suggestions = await this.suggestTDDPatterns(taskDescription, domain);
    const historicalData = await this.getHistoricalData(domain);
    
    const report = {
      task_analysis: {
        description: taskDescription,
        domain: domain,
        estimated_complexity: this.estimateComplexity(taskDescription),
        recommended_approach: suggestions.tdd_workflow
      },
      historical_insights: {
        similar_failures: historicalData.failures,
        success_patterns: historicalData.successes,
        tdd_effectiveness_rate: historicalData.tdd_success_rate
      },
      recommendations: suggestions,
      implementation_checklist: this.generateImplementationChecklist(suggestions),
      success_metrics: {
        predicted_success_rate: suggestions.success_probability.probability,
        confidence_level: suggestions.success_probability.confidence,
        risk_factors: this.identifyRiskFactors(suggestions)
      }
    };
    
    return report;
  }

  /**
   * Get historical data for domain analysis
   */
  async getHistoricalData(domain) {
    const allRecords = await this.loadDomainRecords(domain);
    
    const failures = allRecords.filter(r => r.user_feedback.outcome === 'failure');
    const successes = allRecords.filter(r => r.user_feedback.outcome === 'success');
    const tddRecords = allRecords.filter(r => r.failure_analysis.tdd_used);
    
    return {
      failures: failures.length,
      successes: successes.length, 
      tdd_success_rate: tddRecords.length > 0 ? 
        tddRecords.filter(r => r.user_feedback.outcome === 'success').length / tddRecords.length : 0,
      total_records: allRecords.length
    };
  }

  /**
   * Load all records for a specific domain
   */
  async loadDomainRecords(domain) {
    const indexPath = path.join(this.databaseDir, 'index.json');
    
    if (!fs.existsSync(indexPath)) {
      return [];
    }
    
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const recordIds = index.by_domain[domain] || [];
    
    const records = [];
    
    for (const recordId of recordIds) {
      const recordPath = path.join(this.databaseDir, 'records', `${recordId}.json`);
      if (fs.existsSync(recordPath)) {
        records.push(JSON.parse(fs.readFileSync(recordPath, 'utf8')));
      }
    }
    
    return records;
  }

  /**
   * Estimate task complexity
   */
  estimateComplexity(taskDescription) {
    const complexityIndicators = {
      simple: ['simple', 'basic', 'small', 'quick'],
      medium: ['feature', 'component', 'function', 'api'],
      complex: ['system', 'architecture', 'integration', 'complex', 'multiple']
    };
    
    const task = taskDescription.toLowerCase();
    
    for (const [level, indicators] of Object.entries(complexityIndicators)) {
      if (indicators.some(indicator => task.includes(indicator))) {
        return level;
      }
    }
    
    return 'medium';
  }

  /**
   * Generate implementation checklist
   */
  generateImplementationChecklist(suggestions) {
    const checklist = [
      { item: 'Set up test framework and environment', completed: false },
      { item: 'Write failing tests for core functionality', completed: false },
      { item: 'Implement minimal code to pass tests', completed: false },
      { item: 'Add tests for identified edge cases', completed: false },
      { item: 'Refactor code while keeping tests green', completed: false },
      { item: 'Add integration tests if needed', completed: false },
      { item: 'Review and optimize test coverage', completed: false },
      { item: 'Document implementation decisions', completed: false }
    ];
    
    // Add specific items based on suggestions
    for (const pitfall of suggestions.common_pitfalls.slice(0, 3)) {
      checklist.splice(-1, 0, {
        item: `Add prevention for: ${pitfall.pitfall}`,
        completed: false,
        priority: 'high'
      });
    }
    
    return checklist;
  }

  /**
   * Identify risk factors for current task
   */
  identifyRiskFactors(suggestions) {
    const risks = [];
    
    if (suggestions.success_probability.probability < 0.6) {
      risks.push('Low predicted success rate - consider breaking into smaller tasks');
    }
    
    if (suggestions.common_pitfalls.length > 5) {
      risks.push('High number of historical pitfalls - extra caution recommended');
    }
    
    if (suggestions.edge_cases.some(ec => ec.likelihood > 0.7)) {
      risks.push('High-likelihood edge cases identified - comprehensive testing essential');
    }
    
    return risks;
  }
}

module.exports = { TDDEnhancer };

// CLI usage
if (require.main === module) {
  const enhancer = new TDDEnhancer();
  
  const task = process.argv[2];
  const domain = process.argv[3] || 'general';
  
  if (task) {
    enhancer.generateTDDReport(task, domain)
      .then(report => {
        console.log('TDD Enhancement Report:');
        console.log(JSON.stringify(report, null, 2));
      })
      .catch(err => console.error('Error:', err));
  } else {
    console.log('Usage: node tdd-enhancement.js "task description" [domain]');
  }
}