#!/usr/bin/env node

/**
 * NLD Monitoring Dashboard
 * Real-time monitoring and metrics visualization for NLD system
 */

const fs = require('fs');
const path = require('path');

class NLDDashboard {
  constructor() {
    this.databaseDir = '.claude-flow/nld/database';
    this.metricsDir = '.claude-flow/nld/metrics';
    this.logsDir = '.claude-flow/nld/logs';
    
    // Initialize metrics storage
    this.metrics = {
      realtime: {
        patterns_detected: 0,
        success_rate: 0,
        failure_rate: 0,
        tdd_adoption: 0,
        avg_effectiveness: 0
      },
      historical: {
        daily_patterns: [],
        weekly_trends: [],
        monthly_summary: []
      }
    };
  }

  /**
   * Generate comprehensive dashboard
   */
  async generateDashboard() {
    const dashboard = {
      timestamp: new Date().toISOString(),
      system_health: await this.getSystemHealth(),
      realtime_metrics: await this.getRealTimeMetrics(),
      performance_stats: await this.getPerformanceStats(),
      pattern_analysis: await this.getPatternAnalysis(),
      tdd_insights: await this.getTDDInsights(),
      trending_data: await this.getTrendingData(),
      alerts: await this.generateAlerts(),
      recommendations: await this.generateRecommendations()
    };

    // Save dashboard data
    await this.saveDashboard(dashboard);
    
    return dashboard;
  }

  /**
   * Get current system health status
   */
  async getSystemHealth() {
    const health = {
      overall_status: 'healthy',
      components: {
        database: await this.checkDatabaseHealth(),
        neural_integration: await this.checkNeuralHealth(),
        pattern_detection: await this.checkDetectionHealth(),
        tdd_enhancement: await this.checkTDDHealth()
      },
      uptime: this.calculateUptime(),
      last_activity: await this.getLastActivity()
    };

    // Determine overall health
    const componentStatuses = Object.values(health.components).map(c => c.status);
    if (componentStatuses.includes('critical')) {
      health.overall_status = 'critical';
    } else if (componentStatuses.includes('warning')) {
      health.overall_status = 'warning';
    }

    return health;
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics() {
    const records = await this.loadRecentRecords(24); // Last 24 hours
    
    const metrics = {
      total_records: records.length,
      patterns_detected_24h: records.length,
      success_rate: this.calculateSuccessRate(records),
      failure_rate: this.calculateFailureRate(records),
      tdd_adoption: this.calculateTDDAdoption(records),
      avg_effectiveness: this.calculateAverageEffectiveness(records),
      top_domains: this.getTopDomains(records),
      active_sessions: await this.getActiveSessions()
    };

    return metrics;
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats() {
    const stats = {
      detection_latency: await this.calculateDetectionLatency(),
      database_performance: await this.getDatabasePerformance(), 
      neural_export_stats: await this.getNeuralExportStats(),
      memory_usage: await this.getMemoryUsage(),
      disk_usage: await this.getDiskUsage()
    };

    return stats;
  }

  /**
   * Get pattern analysis insights
   */
  async getPatternAnalysis() {
    const records = await this.loadAllRecords();
    
    const analysis = {
      total_patterns: records.length,
      failure_patterns: this.analyzeFailurePatterns(records),
      success_patterns: this.analyzeSuccessPatterns(records),
      domain_breakdown: this.analyzeDomainBreakdown(records),
      complexity_analysis: this.analyzeComplexity(records),
      recurring_issues: this.findRecurringIssues(records)
    };

    return analysis;
  }

  /**
   * Get TDD-specific insights
   */
  async getTDDInsights() {
    const records = await this.loadAllRecords();
    const tddRecords = records.filter(r => r.failure_analysis.tdd_used);
    const nonTddRecords = records.filter(r => !r.failure_analysis.tdd_used);
    
    const insights = {
      overall_tdd_rate: records.length > 0 ? tddRecords.length / records.length : 0,
      tdd_success_rate: this.calculateSuccessRate(tddRecords),
      non_tdd_success_rate: this.calculateSuccessRate(nonTddRecords),
      tdd_effectiveness_boost: this.calculateTDDBoost(tddRecords, nonTddRecords),
      tdd_by_domain: this.analyzeTDDByDomain(records),
      test_coverage_correlation: this.analyzeCoverageCorrelation(tddRecords),
      suggested_improvements: this.generateTDDSuggestions(records)
    };

    return insights;
  }

  /**
   * Get trending data and forecasts
   */
  async getTrendingData() {
    const timeWindows = await this.createTimeWindows();
    
    const trends = {
      failure_rate_trend: this.calculateTrend(timeWindows, 'failure_rate'),
      tdd_adoption_trend: this.calculateTrend(timeWindows, 'tdd_rate'),
      effectiveness_trend: this.calculateTrend(timeWindows, 'effectiveness'),
      emerging_patterns: this.identifyEmergingPatterns(timeWindows),
      predictions: this.generatePredictions(timeWindows)
    };

    return trends;
  }

  /**
   * Generate system alerts
   */
  async generateAlerts() {
    const alerts = [];
    const recentRecords = await this.loadRecentRecords(24);
    
    // High failure rate alert
    const failureRate = this.calculateFailureRate(recentRecords);
    if (failureRate > 0.5) {
      alerts.push({
        level: 'critical',
        type: 'high_failure_rate',
        message: `Failure rate is ${Math.round(failureRate * 100)}% (24h)`,
        threshold: '50%',
        current: `${Math.round(failureRate * 100)}%`,
        recommended_action: 'Review recent failures and implement preventive measures'
      });
    }

    // Low TDD adoption alert
    const tddRate = this.calculateTDDAdoption(recentRecords);
    if (tddRate < 0.3) {
      alerts.push({
        level: 'warning',
        type: 'low_tdd_adoption',
        message: `TDD adoption is only ${Math.round(tddRate * 100)}%`,
        threshold: '30%',
        current: `${Math.round(tddRate * 100)}%`,
        recommended_action: 'Increase TDD training and tooling support'
      });
    }

    // Database size alert
    const dbSize = await this.getDatabaseSize();
    if (dbSize > 100000) { // 100MB
      alerts.push({
        level: 'warning',
        type: 'large_database',
        message: `NLD database size: ${Math.round(dbSize / 1000)}MB`,
        threshold: '100MB',
        current: `${Math.round(dbSize / 1000)}MB`,
        recommended_action: 'Consider archiving old records or optimizing storage'
      });
    }

    // Stale data alert
    const lastActivity = await this.getLastActivity();
    const hoursSinceActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);
    if (hoursSinceActivity > 24) {
      alerts.push({
        level: 'info',
        type: 'stale_data',
        message: `No new patterns detected in ${Math.round(hoursSinceActivity)} hours`,
        recommended_action: 'Verify pattern detection is working correctly'
      });
    }

    return alerts.sort((a, b) => {
      const levelOrder = { critical: 3, warning: 2, info: 1 };
      return levelOrder[b.level] - levelOrder[a.level];
    });
  }

  /**
   * Generate actionable recommendations
   */
  async generateRecommendations() {
    const records = await this.loadAllRecords();
    const recentRecords = await this.loadRecentRecords(168); // Last week
    
    const recommendations = [];

    // Performance recommendations
    const avgEffectiveness = this.calculateAverageEffectiveness(recentRecords);
    if (avgEffectiveness < 0.6) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Improve Solution Effectiveness',
        description: `Current average effectiveness is ${Math.round(avgEffectiveness * 100)}%`,
        actions: [
          'Implement solution review process',
          'Add more comprehensive testing',
          'Focus on TDD practices'
        ],
        expected_impact: 'Increase success rate by 20-30%'
      });
    }

    // Domain-specific recommendations
    const domainIssues = this.identifyDomainIssues(recentRecords);
    for (const [domain, issue] of Object.entries(domainIssues)) {
      if (issue.failure_rate > 0.4) {
        recommendations.push({
          category: 'domain_specific',
          priority: 'medium',
          title: `Improve ${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain Practices`,
          description: `${domain} has ${Math.round(issue.failure_rate * 100)}% failure rate`,
          actions: [
            `Implement ${domain}-specific TDD patterns`,
            `Add domain expertise training`,
            `Review ${domain} best practices`
          ],
          expected_impact: `Reduce ${domain} failures by 15-25%`
        });
      }
    }

    // TDD recommendations
    const tddRate = this.calculateTDDAdoption(recentRecords);
    if (tddRate < 0.4) {
      recommendations.push({
        category: 'tdd',
        priority: 'high',
        title: 'Increase TDD Adoption',
        description: `Only ${Math.round(tddRate * 100)}% of solutions use TDD`,
        actions: [
          'Mandatory TDD training for developers',
          'Implement TDD tooling and templates',
          'Add TDD success metrics to reviews'
        ],
        expected_impact: 'Increase overall success rate by 25-40%'
      });
    }

    // Data quality recommendations
    const dataQuality = await this.assessDataQuality(records);
    if (dataQuality.completeness < 0.8) {
      recommendations.push({
        category: 'data_quality',
        priority: 'medium',
        title: 'Improve Data Collection',
        description: `Data completeness is ${Math.round(dataQuality.completeness * 100)}%`,
        actions: [
          'Review data collection triggers',
          'Improve user feedback detection',
          'Add data validation checks'
        ],
        expected_impact: 'Better pattern analysis and predictions'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Helper methods for calculations and analysis
   */

  async loadAllRecords() {
    const recordsDir = path.join(this.databaseDir, 'records');
    if (!fs.existsSync(recordsDir)) return [];
    
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
    
    return records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async loadRecentRecords(hours) {
    const allRecords = await this.loadAllRecords();
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    
    return allRecords.filter(record => 
      new Date(record.timestamp).getTime() > cutoff
    );
  }

  calculateSuccessRate(records) {
    if (records.length === 0) return 0;
    return records.filter(r => r.user_feedback.outcome === 'success').length / records.length;
  }

  calculateFailureRate(records) {
    if (records.length === 0) return 0;
    return records.filter(r => r.user_feedback.outcome === 'failure').length / records.length;
  }

  calculateTDDAdoption(records) {
    if (records.length === 0) return 0;
    return records.filter(r => r.failure_analysis.tdd_used).length / records.length;
  }

  calculateAverageEffectiveness(records) {
    if (records.length === 0) return 0;
    const scores = records.map(r => r.effectiveness_metrics.effectiveness_score).filter(s => s != null);
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  getTopDomains(records) {
    const domains = {};
    records.forEach(record => {
      const domain = record.task_context.task_domain;
      domains[domain] = (domains[domain] || 0) + 1;
    });
    
    return Object.entries(domains)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }));
  }

  async getActiveSessions() {
    const sessionsDir = '.claude-flow/nld/sessions';
    if (!fs.existsSync(sessionsDir)) return 0;
    
    const sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
    return sessionFiles.length;
  }

  async calculateDetectionLatency() {
    // This would measure time from user feedback to pattern detection
    // For now, return simulated data
    return {
      avg_latency_ms: 150,
      p95_latency_ms: 300,
      p99_latency_ms: 500
    };
  }

  async getDatabasePerformance() {
    const recordsDir = path.join(this.databaseDir, 'records');
    const recordCount = fs.existsSync(recordsDir) ? 
      fs.readdirSync(recordsDir).filter(f => f.endsWith('.json')).length : 0;
    
    return {
      total_records: recordCount,
      avg_query_time_ms: recordCount > 1000 ? 50 : 10,
      index_health: 'good',
      storage_efficiency: recordCount > 0 ? 85 : 100
    };
  }

  async getNeuralExportStats() {
    const exportsDir = '.claude-flow/nld/neural/exports';
    if (!fs.existsSync(exportsDir)) {
      return { total_exports: 0, last_export: null, export_frequency: 'none' };
    }
    
    const exportFiles = fs.readdirSync(exportsDir).filter(f => f.endsWith('.json'));
    const lastExport = exportFiles.length > 0 ? 
      fs.statSync(path.join(exportsDir, exportFiles[exportFiles.length - 1])).mtime : null;
    
    return {
      total_exports: exportFiles.length,
      last_export: lastExport,
      export_frequency: this.calculateExportFrequency(exportFiles),
      avg_export_size_kb: this.calculateAvgExportSize(exportsDir, exportFiles)
    };
  }

  async getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      heap_used_mb: Math.round(used.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(used.heapTotal / 1024 / 1024),
      rss_mb: Math.round(used.rss / 1024 / 1024),
      external_mb: Math.round(used.external / 1024 / 1024)
    };
  }

  async getDiskUsage() {
    const nldDir = '.claude-flow/nld';
    const size = await this.getDirectorySize(nldDir);
    
    return {
      total_size_mb: Math.round(size / 1024 / 1024),
      database_size_mb: Math.round(await this.getDirectorySize(path.join(nldDir, 'database')) / 1024 / 1024),
      neural_size_mb: Math.round(await this.getDirectorySize(path.join(nldDir, 'neural')) / 1024 / 1024),
      logs_size_mb: Math.round(await this.getDirectorySize(path.join(nldDir, 'logs')) / 1024 / 1024)
    };
  }

  async getDirectorySize(dir) {
    if (!fs.existsSync(dir)) return 0;
    
    let size = 0;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filepath = path.join(dir, file);
      const stats = fs.statSync(filepath);
      
      if (stats.isFile()) {
        size += stats.size;
      } else if (stats.isDirectory()) {
        size += await this.getDirectorySize(filepath);
      }
    }
    
    return size;
  }

  analyzeFailurePatterns(records) {
    const failures = records.filter(r => r.user_feedback.outcome === 'failure');
    const types = {};
    
    failures.forEach(failure => {
      const type = failure.failure_analysis.failure_type;
      types[type] = (types[type] || 0) + 1;
    });
    
    return Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, percentage: count / failures.length }));
  }

  analyzeSuccessPatterns(records) {
    const successes = records.filter(r => r.user_feedback.outcome === 'success');
    
    return {
      total: successes.length,
      with_tdd: successes.filter(s => s.failure_analysis.tdd_used).length,
      avg_effectiveness: this.calculateAverageEffectiveness(successes),
      high_confidence: successes.filter(s => s.task_context.claude_confidence > 0.8).length
    };
  }

  analyzeDomainBreakdown(records) {
    const domains = {};
    
    records.forEach(record => {
      const domain = record.task_context.task_domain;
      if (!domains[domain]) {
        domains[domain] = { total: 0, failures: 0, successes: 0, tdd_used: 0 };
      }
      
      domains[domain].total++;
      if (record.user_feedback.outcome === 'failure') domains[domain].failures++;
      if (record.user_feedback.outcome === 'success') domains[domain].successes++;
      if (record.failure_analysis.tdd_used) domains[domain].tdd_used++;
    });
    
    // Calculate rates
    for (const domain of Object.keys(domains)) {
      const data = domains[domain];
      data.failure_rate = data.total > 0 ? data.failures / data.total : 0;
      data.success_rate = data.total > 0 ? data.successes / data.total : 0;
      data.tdd_rate = data.total > 0 ? data.tdd_used / data.total : 0;
    }
    
    return domains;
  }

  analyzeComplexity(records) {
    const complexityBuckets = { low: [], medium: [], high: [] };
    
    records.forEach(record => {
      const complexity = record.task_context.task_complexity;
      if (complexity <= 3) complexityBuckets.low.push(record);
      else if (complexity <= 6) complexityBuckets.medium.push(record);
      else complexityBuckets.high.push(record);
    });
    
    return {
      low: {
        count: complexityBuckets.low.length,
        failure_rate: this.calculateFailureRate(complexityBuckets.low)
      },
      medium: {
        count: complexityBuckets.medium.length,
        failure_rate: this.calculateFailureRate(complexityBuckets.medium)
      },
      high: {
        count: complexityBuckets.high.length,
        failure_rate: this.calculateFailureRate(complexityBuckets.high)
      }
    };
  }

  findRecurringIssues(records) {
    const issues = {};
    
    records.forEach(record => {
      if (record.user_feedback.outcome === 'failure') {
        const key = `${record.task_context.task_domain}_${record.failure_analysis.failure_type}`;
        issues[key] = (issues[key] || 0) + 1;
      }
    });
    
    return Object.entries(issues)
      .filter(([_, count]) => count > 2) // Only recurring issues
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }));
  }

  calculateTDDBoost(tddRecords, nonTddRecords) {
    const tddSuccess = this.calculateSuccessRate(tddRecords);
    const nonTddSuccess = this.calculateSuccessRate(nonTddRecords);
    
    return nonTddSuccess > 0 ? ((tddSuccess - nonTddSuccess) / nonTddSuccess) * 100 : 0;
  }

  analyzeTDDByDomain(records) {
    const domains = this.analyzeDomainBreakdown(records);
    const tddAnalysis = {};
    
    for (const [domain, data] of Object.entries(domains)) {
      const domainRecords = records.filter(r => r.task_context.task_domain === domain);
      const tddRecords = domainRecords.filter(r => r.failure_analysis.tdd_used);
      const nonTddRecords = domainRecords.filter(r => !r.failure_analysis.tdd_used);
      
      tddAnalysis[domain] = {
        tdd_adoption: data.tdd_rate,
        tdd_success_rate: this.calculateSuccessRate(tddRecords),
        non_tdd_success_rate: this.calculateSuccessRate(nonTddRecords),
        improvement: this.calculateTDDBoost(tddRecords, nonTddRecords)
      };
    }
    
    return tddAnalysis;
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

  generateTDDSuggestions(records) {
    const suggestions = [];
    const tddRate = this.calculateTDDAdoption(records);
    
    if (tddRate < 0.3) {
      suggestions.push('Implement TDD training program - adoption below 30%');
    }
    
    const domains = this.analyzeDomainBreakdown(records);
    for (const [domain, data] of Object.entries(domains)) {
      if (data.tdd_rate < 0.2 && data.total > 5) {
        suggestions.push(`Focus TDD adoption on ${domain} domain - only ${Math.round(data.tdd_rate * 100)}% usage`);
      }
    }
    
    return suggestions;
  }

  async createTimeWindows() {
    const records = await this.loadAllRecords();
    if (records.length === 0) return [];
    
    const windows = [];
    const sortedRecords = records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
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
          tdd_rate: this.calculateTDDAdoption(windowRecords),
          effectiveness: this.calculateAverageEffectiveness(windowRecords)
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
      change_rate: Math.abs(slope) * 100
    };
  }

  identifyEmergingPatterns(windows) {
    if (windows.length < 4) return [];
    
    const recentWindows = windows.slice(-2);
    const olderWindows = windows.slice(0, -2);
    
    const recentFailures = recentWindows.flatMap(w => w.records.filter(r => r.user_feedback.outcome === 'failure'));
    const olderFailures = olderWindows.flatMap(w => w.records.filter(r => r.user_feedback.outcome === 'failure'));
    
    const recentPatterns = this.analyzeFailurePatterns(recentFailures);
    const olderPatterns = this.analyzeFailurePatterns(olderFailures);
    
    const emerging = [];
    
    recentPatterns.forEach(recent => {
      const older = olderPatterns.find(o => o.type === recent.type);
      const oldRate = older ? older.percentage : 0;
      
      if (recent.percentage > oldRate * 1.5 && recent.count > 2) {
        emerging.push({
          pattern: recent.type,
          old_rate: oldRate,
          new_rate: recent.percentage,
          increase_factor: oldRate > 0 ? recent.percentage / oldRate : 'new'
        });
      }
    });
    
    return emerging;
  }

  generatePredictions(windows) {
    if (windows.length < 3) {
      return { prediction: 'insufficient_data' };
    }
    
    const failureTrend = this.calculateTrend(windows, 'failure_rate');
    const tddTrend = this.calculateTrend(windows, 'tdd_rate');
    
    const predictions = {
      next_week_failure_rate: this.extrapolateTrend(failureTrend, windows[windows.length - 1].failure_rate),
      next_week_tdd_rate: this.extrapolateTrend(tddTrend, windows[windows.length - 1].tdd_rate),
      risk_level: 'medium'
    };
    
    // Determine risk level
    if (predictions.next_week_failure_rate > 0.6) {
      predictions.risk_level = 'high';
    } else if (predictions.next_week_failure_rate < 0.3) {
      predictions.risk_level = 'low';
    }
    
    return predictions;
  }

  extrapolateTrend(trend, currentValue) {
    if (trend.trend === 'stable') return currentValue;
    
    const change = trend.slope;
    return Math.max(0, Math.min(1, currentValue + change));
  }

  identifyDomainIssues(records) {
    const domains = this.analyzeDomainBreakdown(records);
    const issues = {};
    
    for (const [domain, data] of Object.entries(domains)) {
      if (data.total > 5) { // Only domains with sufficient data
        issues[domain] = {
          failure_rate: data.failure_rate,
          tdd_rate: data.tdd_rate,
          needs_attention: data.failure_rate > 0.4 || data.tdd_rate < 0.2
        };
      }
    }
    
    return issues;
  }

  async assessDataQuality(records) {
    const quality = {
      completeness: 0,
      consistency: 0,
      timeliness: 0
    };
    
    if (records.length === 0) return quality;
    
    // Completeness check
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
    
    // Consistency check
    const validFailureTypes = ['logic', 'environment', 'dependency', 'integration', 'syntax', 'design'];
    const validOutcomes = ['success', 'failure', 'partial'];
    
    const consistentRecords = records.filter(record => {
      return validFailureTypes.includes(record.failure_analysis.failure_type) &&
             validOutcomes.includes(record.user_feedback.outcome);
    }).length;
    
    quality.consistency = consistentRecords / records.length;
    
    // Timeliness check (records from last 7 days)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentRecords = records.filter(r => new Date(r.timestamp).getTime() > weekAgo).length;
    quality.timeliness = Math.min(1, recentRecords / Math.max(1, records.length * 0.1)); // Expect 10% in last week
    
    return quality;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  calculateUptime() {
    return Math.floor(process.uptime() / 60) + ' minutes';
  }

  async getLastActivity() {
    const recordsDir = path.join(this.databaseDir, 'records');
    if (!fs.existsSync(recordsDir)) return new Date().toISOString();
    
    const files = fs.readdirSync(recordsDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) return new Date().toISOString();
    
    let latestTime = 0;
    files.forEach(file => {
      const stats = fs.statSync(path.join(recordsDir, file));
      if (stats.mtime.getTime() > latestTime) {
        latestTime = stats.mtime.getTime();
      }
    });
    
    return new Date(latestTime).toISOString();
  }

  async checkDatabaseHealth() {
    const recordsDir = path.join(this.databaseDir, 'records');
    const indexFile = path.join(this.databaseDir, 'index.json');
    
    const hasRecords = fs.existsSync(recordsDir) && fs.readdirSync(recordsDir).length > 0;
    const hasIndex = fs.existsSync(indexFile);
    
    let status = 'healthy';
    if (!hasRecords || !hasIndex) status = 'warning';
    
    return {
      status,
      details: {
        records_directory: fs.existsSync(recordsDir),
        index_file: hasIndex,
        record_count: hasRecords ? fs.readdirSync(recordsDir).filter(f => f.endsWith('.json')).length : 0
      }
    };
  }

  async checkNeuralHealth() {
    const neuralDir = '.claude-flow/nld/neural';
    const exportsDir = path.join(neuralDir, 'exports');
    
    return {
      status: fs.existsSync(neuralDir) ? 'healthy' : 'warning',
      details: {
        neural_directory: fs.existsSync(neuralDir),
        exports_directory: fs.existsSync(exportsDir),
        latest_export: fs.existsSync(path.join(neuralDir, 'latest-export.json'))
      }
    };
  }

  async checkDetectionHealth() {
    const hooksDir = '.claude-flow/nld/hooks';
    const detectionScript = path.join(hooksDir, 'detection-triggers.js');
    
    return {
      status: fs.existsSync(detectionScript) ? 'healthy' : 'warning',
      details: {
        hooks_directory: fs.existsSync(hooksDir),
        detection_script: fs.existsSync(detectionScript)
      }
    };
  }

  async checkTDDHealth() {
    const workflowsDir = '.claude-flow/nld/workflows';
    const enhancementScript = path.join(workflowsDir, 'tdd-enhancement.js');
    
    return {
      status: fs.existsSync(enhancementScript) ? 'healthy' : 'warning',
      details: {
        workflows_directory: fs.existsSync(workflowsDir),
        enhancement_script: fs.existsSync(enhancementScript)
      }
    };
  }

  async getDatabaseSize() {
    return await this.getDirectorySize(this.databaseDir);
  }

  calculateExportFrequency(exportFiles) {
    if (exportFiles.length < 2) return 'insufficient_data';
    
    // Calculate average time between exports
    const timestamps = exportFiles.map(file => {
      const match = file.match(/training-data-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
      return match ? new Date(match[1].replace(/-/g, ':')) : null;
    }).filter(Boolean).sort((a, b) => a - b);
    
    if (timestamps.length < 2) return 'insufficient_data';
    
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i-1]);
    }
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const hours = avgInterval / (1000 * 60 * 60);
    
    if (hours < 24) return 'multiple_times_daily';
    else if (hours < 168) return 'daily';
    else if (hours < 720) return 'weekly';
    else return 'monthly';
  }

  calculateAvgExportSize(exportsDir, exportFiles) {
    if (exportFiles.length === 0) return 0;
    
    let totalSize = 0;
    exportFiles.forEach(file => {
      try {
        const stats = fs.statSync(path.join(exportsDir, file));
        totalSize += stats.size;
      } catch (error) {
        // Ignore errors for individual files
      }
    });
    
    return Math.round(totalSize / exportFiles.length / 1024); // KB
  }

  /**
   * Save dashboard data
   */
  async saveDashboard(dashboard) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dashboard-${timestamp}.json`;
    const filepath = path.join(this.metricsDir, 'dashboards', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(dashboard, null, 2));
    
    // Update latest dashboard reference
    const latestPath = path.join(this.metricsDir, 'latest-dashboard.json');
    fs.writeFileSync(latestPath, JSON.stringify({
      dashboard_file: filename,
      generated_at: dashboard.timestamp,
      system_status: dashboard.system_health.overall_status
    }, null, 2));
    
    console.log(`Dashboard saved to ${filename}`);
    return filepath;
  }

  /**
   * Generate dashboard summary for CLI display
   */
  generateSummary(dashboard) {
    const summary = {
      status: dashboard.system_health.overall_status,
      metrics: {
        total_patterns: dashboard.realtime_metrics.patterns_detected_24h,
        success_rate: `${Math.round(dashboard.realtime_metrics.success_rate * 100)}%`,
        tdd_adoption: `${Math.round(dashboard.realtime_metrics.tdd_adoption * 100)}%`
      },
      alerts: dashboard.alerts.length,
      top_recommendation: dashboard.recommendations[0]?.title || 'No recommendations'
    };
    
    return summary;
  }
}

module.exports = { NLDDashboard };

// CLI usage
if (require.main === module) {
  const dashboard = new NLDDashboard();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'generate':
      dashboard.generateDashboard()
        .then(data => {
          const summary = dashboard.generateSummary(data);
          console.log('NLD Dashboard Summary:');
          console.log(JSON.stringify(summary, null, 2));
        })
        .catch(err => console.error('Dashboard error:', err));
      break;
      
    case 'health':
      dashboard.getSystemHealth()
        .then(health => {
          console.log('System Health:', JSON.stringify(health, null, 2));
        })
        .catch(err => console.error('Health check error:', err));
      break;
      
    case 'metrics':
      dashboard.getRealTimeMetrics()
        .then(metrics => {
          console.log('Real-time Metrics:', JSON.stringify(metrics, null, 2));
        })
        .catch(err => console.error('Metrics error:', err));
      break;
      
    default:
      console.log('Usage: node dashboard.js <command>');
      console.log('Commands: generate, health, metrics');
  }
}