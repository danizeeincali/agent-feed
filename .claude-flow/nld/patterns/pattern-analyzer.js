#!/usr/bin/env node

/**
 * NLD Pattern Analyzer
 * Analyzes failure patterns and provides insights for TDD improvement
 */

const fs = require('fs');
const path = require('path');

class PatternAnalyzer {
  constructor() {
    this.databaseDir = '.claude-flow/nld/database';
    this.outputDir = '.claude-flow/nld/patterns';
  }

  /**
   * Analyze all patterns in the database
   */
  async analyzeAllPatterns() {
    const records = await this.loadAllRecords();
    
    const analysis = {
      overview: this.generateOverview(records),
      failure_patterns: this.analyzeFailurePatterns(records),
      success_patterns: this.analyzeSuccessPatterns(records),
      tdd_analysis: this.analyzeTDDEffectiveness(records),
      trending_patterns: this.identifyTrendingPatterns(records),
      recommendations: this.generateRecommendations(records)
    };
    
    await this.saveAnalysis(analysis);
    return analysis;
  }

  /**
   * Load all NLT records
   */
  async loadAllRecords() {
    const recordsDir = path.join(this.databaseDir, 'records');
    
    if (!fs.existsSync(recordsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(recordsDir).filter(f => f.endsWith('.json'));
    const records = [];
    
    for (const file of files) {
      try {
        const record = JSON.parse(fs.readFileSync(path.join(recordsDir, file), 'utf8'));
        records.push(record);
      } catch (error) {
        console.error(`Error loading ${file}:`, error.message);
      }
    }
    
    return records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Generate overview statistics
   */
  generateOverview(records) {
    const total = records.length;
    const failures = records.filter(r => r.user_feedback.outcome === 'failure').length;
    const successes = records.filter(r => r.user_feedback.outcome === 'success').length;
    const tddUsed = records.filter(r => r.failure_analysis.tdd_used).length;
    
    const domainDistribution = this.calculateDistribution(records, 'task_context.task_domain');
    const failureTypeDistribution = this.calculateDistribution(records, 'failure_analysis.failure_type');
    
    return {
      total_records: total,
      failure_rate: total > 0 ? failures / total : 0,
      success_rate: total > 0 ? successes / total : 0,
      tdd_adoption_rate: total > 0 ? tddUsed / total : 0,
      domain_distribution: domainDistribution,
      failure_type_distribution: failureTypeDistribution,
      avg_effectiveness_score: this.calculateAverage(records, 'effectiveness_metrics.effectiveness_score'),
      data_quality: this.assessDataQuality(records)
    };
  }

  /**
   * Analyze failure patterns
   */
  analyzeFailurePatterns(records) {
    const failures = records.filter(r => r.user_feedback.outcome === 'failure');
    
    const patterns = {
      most_common_failures: this.getMostCommon(failures, 'failure_analysis.failure_type'),
      failure_by_domain: this.groupBy(failures, 'task_context.task_domain'),
      complexity_correlation: this.analyzeComplexityCorrelation(failures),
      time_patterns: this.analyzeTimePatterns(failures),
      repeat_failures: this.identifyRepeatFailures(failures),
      severity_analysis: this.analyzeSeverity(failures)
    };
    
    return patterns;
  }

  /**
   * Analyze success patterns
   */
  analyzeSuccessPatterns(records) {
    const successes = records.filter(r => r.user_feedback.outcome === 'success');
    
    const patterns = {
      success_factors: this.identifySuccessFactors(successes),
      tdd_correlation: this.analyzeTDDCorrelation(successes),
      optimal_complexity: this.findOptimalComplexity(successes),
      best_practices: this.extractBestPractices(successes),
      high_effectiveness: successes.filter(s => s.effectiveness_metrics.effectiveness_score > 0.8)
    };
    
    return patterns;
  }

  /**
   * Analyze TDD effectiveness
   */
  analyzeTDDEffectiveness(records) {
    const tddRecords = records.filter(r => r.failure_analysis.tdd_used);
    const nonTddRecords = records.filter(r => !r.failure_analysis.tdd_used);
    
    return {
      tdd_success_rate: this.calculateSuccessRate(tddRecords),
      non_tdd_success_rate: this.calculateSuccessRate(nonTddRecords),
      tdd_effectiveness_improvement: this.calculateImprovement(tddRecords, nonTddRecords),
      tdd_by_domain: this.analyzeTDDByDomain(records),
      coverage_correlation: this.analyzeCoverageCorrelation(tddRecords),
      recommendations: this.generateTDDRecommendations(tddRecords, nonTddRecords)
    };
  }

  /**
   * Identify trending patterns over time
   */
  identifyTrendingPatterns(records) {
    const timeWindows = this.createTimeWindows(records);
    
    return {
      failure_rate_trend: this.calculateTrend(timeWindows, 'failure_rate'),
      tdd_adoption_trend: this.calculateTrend(timeWindows, 'tdd_rate'),
      effectiveness_trend: this.calculateTrend(timeWindows, 'avg_effectiveness'),
      emerging_failure_types: this.identifyEmergingPatterns(timeWindows),
      improvement_areas: this.identifyImprovementAreas(timeWindows)
    };
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(records) {
    const recommendations = [];
    
    const failureRate = this.calculateFailureRate(records);
    const tddRate = this.calculateTDDRate(records);
    const avgEffectiveness = this.calculateAverage(records, 'effectiveness_metrics.effectiveness_score');
    
    // High failure rate recommendations
    if (failureRate > 0.4) {
      recommendations.push({
        type: 'critical',
        area: 'failure_reduction',
        recommendation: 'Implement mandatory TDD practices - current failure rate exceeds 40%',
        impact: 'high',
        effort: 'medium'
      });
    }
    
    // Low TDD adoption recommendations
    if (tddRate < 0.3) {
      recommendations.push({
        type: 'improvement',
        area: 'tdd_adoption',
        recommendation: 'Increase TDD training and tooling support - current adoption below 30%',
        impact: 'high',
        effort: 'medium'
      });
    }
    
    // Low effectiveness recommendations
    if (avgEffectiveness < 0.6) {
      recommendations.push({
        type: 'optimization',
        area: 'solution_quality',
        recommendation: 'Implement solution review process - average effectiveness below 60%',
        impact: 'medium',
        effort: 'low'
      });
    }
    
    // Domain-specific recommendations
    const domainAnalysis = this.analyzeDomainSpecificIssues(records);
    recommendations.push(...domainAnalysis);
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 3, improvement: 2, optimization: 1 };
      return priorityOrder[b.type] - priorityOrder[a.type];
    });
  }

  /**
   * Helper methods
   */
  
  calculateDistribution(records, path) {
    const values = records.map(r => this.getNestedValue(r, path));
    const counts = {};
    
    values.forEach(value => {
      counts[value] = (counts[value] || 0) + 1;
    });
    
    const total = values.length;
    const distribution = {};
    
    for (const [key, count] of Object.entries(counts)) {
      distribution[key] = { count, percentage: total > 0 ? count / total : 0 };
    }
    
    return distribution;
  }

  calculateAverage(records, path) {
    const values = records.map(r => this.getNestedValue(r, path)).filter(v => typeof v === 'number');
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  getMostCommon(records, path, limit = 5) {
    const distribution = this.calculateDistribution(records, path);
    return Object.entries(distribution)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([key, value]) => ({ type: key, ...value }));
  }

  groupBy(records, path) {
    const groups = {};
    
    records.forEach(record => {
      const key = this.getNestedValue(record, path);
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    });
    
    return groups;
  }

  analyzeComplexityCorrelation(failures) {
    const complexityGroups = this.groupBy(failures, 'task_context.task_complexity');
    const correlation = {};
    
    for (const [complexity, records] of Object.entries(complexityGroups)) {
      correlation[complexity] = {
        count: records.length,
        avg_effectiveness: this.calculateAverage(records, 'effectiveness_metrics.effectiveness_score'),
        failure_types: this.getMostCommon(records, 'failure_analysis.failure_type', 3)
      };
    }
    
    return correlation;
  }

  analyzeTimePatterns(records) {
    const patterns = {
      by_hour: {},
      by_day: {},
      by_month: {}
    };
    
    records.forEach(record => {
      const date = new Date(record.timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      const month = date.getMonth();
      
      patterns.by_hour[hour] = (patterns.by_hour[hour] || 0) + 1;
      patterns.by_day[day] = (patterns.by_day[day] || 0) + 1;
      patterns.by_month[month] = (patterns.by_month[month] || 0) + 1;
    });
    
    return patterns;
  }

  identifyRepeatFailures(failures) {
    const signatures = {};
    
    failures.forEach(failure => {
      const signature = `${failure.task_context.task_domain}_${failure.failure_analysis.failure_type}`;
      if (!signatures[signature]) signatures[signature] = [];
      signatures[signature].push(failure);
    });
    
    return Object.entries(signatures)
      .filter(([_, records]) => records.length > 1)
      .map(([signature, records]) => ({
        pattern: signature,
        frequency: records.length,
        recent_occurrence: Math.max(...records.map(r => new Date(r.timestamp).getTime())),
        avg_effectiveness: this.calculateAverage(records, 'effectiveness_metrics.effectiveness_score')
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  analyzeSeverity(failures) {
    return {
      critical: failures.filter(f => f.effectiveness_metrics.effectiveness_score < 0.3).length,
      moderate: failures.filter(f => f.effectiveness_metrics.effectiveness_score >= 0.3 && f.effectiveness_metrics.effectiveness_score < 0.6).length,
      minor: failures.filter(f => f.effectiveness_metrics.effectiveness_score >= 0.6).length
    };
  }

  identifySuccessFactors(successes) {
    const factors = {
      tdd_usage: successes.filter(s => s.failure_analysis.tdd_used).length / successes.length,
      optimal_complexity: this.calculateAverage(successes, 'task_context.task_complexity'),
      high_confidence: successes.filter(s => s.task_context.claude_confidence > 0.7).length / successes.length,
      good_test_coverage: successes.filter(s => s.failure_analysis.test_coverage > 70).length / successes.length
    };
    
    return factors;
  }

  analyzeTDDCorrelation(successes) {
    const tddSuccesses = successes.filter(s => s.failure_analysis.tdd_used);
    const nonTddSuccesses = successes.filter(s => !s.failure_analysis.tdd_used);
    
    return {
      tdd_effectiveness: this.calculateAverage(tddSuccesses, 'effectiveness_metrics.effectiveness_score'),
      non_tdd_effectiveness: this.calculateAverage(nonTddSuccesses, 'effectiveness_metrics.effectiveness_score'),
      improvement_factor: tddSuccesses.length > 0 && nonTddSuccesses.length > 0 ? 
        this.calculateAverage(tddSuccesses, 'effectiveness_metrics.effectiveness_score') / 
        this.calculateAverage(nonTddSuccesses, 'effectiveness_metrics.effectiveness_score') : 1
    };
  }

  findOptimalComplexity(successes) {
    const complexityGroups = this.groupBy(successes, 'task_context.task_complexity');
    let optimal = { complexity: 3, effectiveness: 0 };
    
    for (const [complexity, records] of Object.entries(complexityGroups)) {
      const effectiveness = this.calculateAverage(records, 'effectiveness_metrics.effectiveness_score');
      if (effectiveness > optimal.effectiveness) {
        optimal = { complexity: parseInt(complexity), effectiveness };
      }
    }
    
    return optimal;
  }

  extractBestPractices(successes) {
    const highPerformers = successes.filter(s => s.effectiveness_metrics.effectiveness_score > 0.8);
    
    return {
      common_patterns: this.getMostCommon(highPerformers, 'task_context.task_domain'),
      avg_complexity: this.calculateAverage(highPerformers, 'task_context.task_complexity'),
      tdd_usage_rate: highPerformers.filter(s => s.failure_analysis.tdd_used).length / highPerformers.length,
      confidence_calibration: this.calculateAverage(highPerformers, 'task_context.claude_confidence')
    };
  }

  calculateSuccessRate(records) {
    if (records.length === 0) return 0;
    return records.filter(r => r.user_feedback.outcome === 'success').length / records.length;
  }

  calculateImprovement(tddRecords, nonTddRecords) {
    const tddSuccess = this.calculateSuccessRate(tddRecords);
    const nonTddSuccess = this.calculateSuccessRate(nonTddRecords);
    
    return nonTddSuccess > 0 ? (tddSuccess - nonTddSuccess) / nonTddSuccess : 0;
  }

  analyzeTDDByDomain(records) {
    const domains = this.groupBy(records, 'task_context.task_domain');
    const analysis = {};
    
    for (const [domain, domainRecords] of Object.entries(domains)) {
      const tddRecords = domainRecords.filter(r => r.failure_analysis.tdd_used);
      const nonTddRecords = domainRecords.filter(r => !r.failure_analysis.tdd_used);
      
      analysis[domain] = {
        tdd_adoption: tddRecords.length / domainRecords.length,
        tdd_success_rate: this.calculateSuccessRate(tddRecords),
        non_tdd_success_rate: this.calculateSuccessRate(nonTddRecords),
        improvement: this.calculateImprovement(tddRecords, nonTddRecords)
      };
    }
    
    return analysis;
  }

  analyzeCoverageCorrelation(tddRecords) {
    const withCoverage = tddRecords.filter(r => r.failure_analysis.test_coverage > 0);
    
    if (withCoverage.length === 0) return null;
    
    const coverageGroups = {
      low: withCoverage.filter(r => r.failure_analysis.test_coverage < 50),
      medium: withCoverage.filter(r => r.failure_analysis.test_coverage >= 50 && r.failure_analysis.test_coverage < 80),
      high: withCoverage.filter(r => r.failure_analysis.test_coverage >= 80)
    };
    
    return {
      low_coverage_success: this.calculateSuccessRate(coverageGroups.low),
      medium_coverage_success: this.calculateSuccessRate(coverageGroups.medium),
      high_coverage_success: this.calculateSuccessRate(coverageGroups.high)
    };
  }

  generateTDDRecommendations(tddRecords, nonTddRecords) {
    const recommendations = [];
    
    const tddSuccess = this.calculateSuccessRate(tddRecords);
    const nonTddSuccess = this.calculateSuccessRate(nonTddRecords);
    
    if (tddSuccess > nonTddSuccess * 1.2) {
      recommendations.push('TDD shows significant improvement - recommend expanding adoption');
    }
    
    if (tddRecords.length < nonTddRecords.length * 0.5) {
      recommendations.push('Low TDD adoption detected - consider training and tooling improvements');
    }
    
    return recommendations;
  }

  createTimeWindows(records) {
    const windows = [];
    const sortedRecords = records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (sortedRecords.length === 0) return windows;
    
    const firstDate = new Date(sortedRecords[0].timestamp);
    const lastDate = new Date(sortedRecords[sortedRecords.length - 1].timestamp);
    const windowSize = 7 * 24 * 60 * 60 * 1000; // 1 week
    
    for (let start = firstDate.getTime(); start < lastDate.getTime(); start += windowSize) {
      const end = start + windowSize;
      const windowRecords = sortedRecords.filter(r => {
        const time = new Date(r.timestamp).getTime();
        return time >= start && time < end;
      });
      
      if (windowRecords.length > 0) {
        windows.push({
          start_date: new Date(start).toISOString(),
          end_date: new Date(end).toISOString(),
          records: windowRecords,
          failure_rate: this.calculateFailureRate(windowRecords),
          tdd_rate: this.calculateTDDRate(windowRecords),
          avg_effectiveness: this.calculateAverage(windowRecords, 'effectiveness_metrics.effectiveness_score')
        });
      }
    }
    
    return windows;
  }

  calculateTrend(windows, metric) {
    if (windows.length < 2) return { trend: 'insufficient_data', slope: 0 };
    
    const values = windows.map((w, i) => ({ x: i, y: w[metric] }));
    const n = values.length;
    
    const sumX = values.reduce((sum, point) => sum + point.x, 0);
    const sumY = values.reduce((sum, point) => sum + point.y, 0);
    const sumXY = values.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = values.reduce((sum, point) => sum + point.x * point.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return {
      trend: slope > 0.01 ? 'improving' : slope < -0.01 ? 'declining' : 'stable',
      slope: slope,
      confidence: this.calculateTrendConfidence(values, slope)
    };
  }

  calculateTrendConfidence(values, slope) {
    // Simple R-squared calculation
    const meanY = values.reduce((sum, point) => sum + point.y, 0) / values.length;
    let ssRes = 0;
    let ssTot = 0;
    
    values.forEach((point, i) => {
      const predicted = slope * i;
      ssRes += Math.pow(point.y - predicted, 2);
      ssTot += Math.pow(point.y - meanY, 2);
    });
    
    return ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  }

  identifyEmergingPatterns(windows) {
    // Identify patterns that are becoming more frequent over time
    const recentWindows = windows.slice(-3); // Last 3 time windows
    const olderWindows = windows.slice(0, -3);
    
    if (recentWindows.length === 0 || olderWindows.length === 0) return [];
    
    const recentFailures = recentWindows.flatMap(w => w.records.filter(r => r.user_feedback.outcome === 'failure'));
    const olderFailures = olderWindows.flatMap(w => w.records.filter(r => r.user_feedback.outcome === 'failure'));
    
    const recentPatterns = this.getMostCommon(recentFailures, 'failure_analysis.failure_type');
    const olderPatterns = this.getMostCommon(olderFailures, 'failure_analysis.failure_type');
    
    const emerging = [];
    
    recentPatterns.forEach(recent => {
      const older = olderPatterns.find(o => o.type === recent.type);
      const oldRate = older ? older.percentage : 0;
      
      if (recent.percentage > oldRate * 1.5) {
        emerging.push({
          pattern: recent.type,
          old_rate: oldRate,
          new_rate: recent.percentage,
          increase_factor: oldRate > 0 ? recent.percentage / oldRate : Infinity
        });
      }
    });
    
    return emerging.sort((a, b) => b.increase_factor - a.increase_factor);
  }

  identifyImprovementAreas(windows) {
    const areas = [];
    
    if (windows.length < 2) return areas;
    
    const latest = windows[windows.length - 1];
    const average = windows.reduce((sum, w) => sum + w.failure_rate, 0) / windows.length;
    
    if (latest.failure_rate > average * 1.2) {
      areas.push({
        area: 'failure_rate',
        current: latest.failure_rate,
        average: average,
        priority: 'high'
      });
    }
    
    if (latest.tdd_rate < average * 0.8) {
      areas.push({
        area: 'tdd_adoption',
        current: latest.tdd_rate,
        average: average,
        priority: 'medium'
      });
    }
    
    return areas;
  }

  analyzeDomainSpecificIssues(records) {
    const recommendations = [];
    const domains = this.groupBy(records, 'task_context.task_domain');
    
    for (const [domain, domainRecords] of Object.entries(domains)) {
      const failureRate = this.calculateFailureRate(domainRecords);
      const tddRate = this.calculateTDDRate(domainRecords);
      
      if (failureRate > 0.5) {
        recommendations.push({
          type: 'critical',
          area: `${domain}_failures`,
          recommendation: `High failure rate in ${domain} domain (${Math.round(failureRate * 100)}%) - implement domain-specific best practices`,
          impact: 'high',
          effort: 'medium'
        });
      }
      
      if (tddRate < 0.2 && domainRecords.length > 5) {
        recommendations.push({
          type: 'improvement',
          area: `${domain}_tdd`,
          recommendation: `Very low TDD adoption in ${domain} domain - provide targeted training`,
          impact: 'medium',
          effort: 'medium'
        });
      }
    }
    
    return recommendations;
  }

  calculateFailureRate(records) {
    if (records.length === 0) return 0;
    return records.filter(r => r.user_feedback.outcome === 'failure').length / records.length;
  }

  calculateTDDRate(records) {
    if (records.length === 0) return 0;
    return records.filter(r => r.failure_analysis.tdd_used).length / records.length;
  }

  assessDataQuality(records) {
    const quality = {
      completeness: 0,
      consistency: 0,
      accuracy: 0
    };
    
    if (records.length === 0) return quality;
    
    // Completeness - check for missing required fields
    const requiredFields = [
      'task_context.original_task',
      'user_feedback.outcome',
      'failure_analysis.failure_type',
      'effectiveness_metrics.effectiveness_score'
    ];
    
    let completeRecords = 0;
    
    records.forEach(record => {
      if (requiredFields.every(field => this.getNestedValue(record, field) != null)) {
        completeRecords++;
      }
    });
    
    quality.completeness = completeRecords / records.length;
    
    // Consistency - check for consistent enum values
    const validFailureTypes = ['logic', 'environment', 'dependency', 'integration', 'syntax', 'design'];
    const validOutcomes = ['success', 'failure', 'partial'];
    
    const consistentRecords = records.filter(record => {
      return validFailureTypes.includes(record.failure_analysis.failure_type) &&
             validOutcomes.includes(record.user_feedback.outcome);
    }).length;
    
    quality.consistency = consistentRecords / records.length;
    
    // Accuracy - check for reasonable value ranges
    const accurateRecords = records.filter(record => {
      const complexity = record.task_context.task_complexity;
      const effectiveness = record.effectiveness_metrics.effectiveness_score;
      const confidence = record.task_context.claude_confidence;
      
      return complexity >= 1 && complexity <= 10 &&
             effectiveness >= 0 && effectiveness <= 1 &&
             confidence >= 0 && confidence <= 1;
    }).length;
    
    quality.accuracy = accurateRecords / records.length;
    
    return quality;
  }

  /**
   * Save analysis results
   */
  async saveAnalysis(analysis) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pattern-analysis-${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(analysis, null, 2));
    
    // Update latest analysis reference
    const latestPath = path.join(this.outputDir, 'latest-analysis.json');
    fs.writeFileSync(latestPath, JSON.stringify({
      analysis_file: filename,
      created: analysis.overview ? new Date().toISOString() : null,
      total_records: analysis.overview ? analysis.overview.total_records : 0
    }, null, 2));
    
    console.log(`Pattern analysis saved to ${filename}`);
    return filepath;
  }
}

module.exports = { PatternAnalyzer };

// CLI usage
if (require.main === module) {
  const analyzer = new PatternAnalyzer();
  
  analyzer.analyzeAllPatterns()
    .then(analysis => {
      console.log('Pattern Analysis Complete');
      console.log('Overview:', JSON.stringify(analysis.overview, null, 2));
      console.log('Recommendations:', JSON.stringify(analysis.recommendations, null, 2));
    })
    .catch(err => console.error('Analysis error:', err));
}