const nldSystem = require('./pattern-detector');
const integrationMonitor = require('./integration-monitor');
const fs = require('fs');
const path = require('path');

class NLDDashboard {
  constructor() {
    this.dashboardData = {
      realtime_status: {},
      pattern_history: [],
      performance_trends: [],
      recommendations: [],
      alerts: []
    };
    
    this.startDashboard();
  }

  startDashboard() {
    console.log('📊 NLD Dashboard Starting...');
    
    // Generate reports every minute
    setInterval(() => {
      this.updateDashboard();
      this.generateReports();
    }, 60000);

    // Initial dashboard update
    this.updateDashboard();
    this.displayDashboard();
  }

  updateDashboard() {
    this.dashboardData = {
      timestamp: new Date().toISOString(),
      realtime_status: this.getRealtimeStatus(),
      pattern_history: this.getPatternHistory(),
      performance_trends: this.getPerformanceTrends(),
      recommendations: this.getRecommendations(),
      alerts: this.getActiveAlerts(),
      implementation_progress: this.getImplementationProgress()
    };
  }

  getRealtimeStatus() {
    const systemStatus = nldSystem.getSystemStatus();
    const integrationReport = integrationMonitor.generateIntegrationReport();
    
    return {
      monitoring_active: systemStatus.active,
      patterns_detected: systemStatus.total_detections,
      current_phase: integrationReport.current_phase,
      health_score: this.calculateHealthScore(systemStatus),
      last_update: new Date().toISOString()
    };
  }

  calculateHealthScore(systemStatus) {
    const baseScore = 100;
    const detectionPenalty = Math.min(systemStatus.total_detections * 2, 30);
    const failurePenalty = Math.min(systemStatus.failure_count * 5, 50);
    
    return Math.max(baseScore - detectionPenalty - failurePenalty, 0);
  }

  getPatternHistory() {
    const patterns = [];
    const logDir = path.join(__dirname, 'logs');
    
    if (fs.existsSync(logDir)) {
      const logFiles = fs.readdirSync(logDir);
      
      logFiles.forEach(file => {
        if (file.startsWith('pattern-detection-')) {
          try {
            const content = fs.readFileSync(path.join(logDir, file), 'utf8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
              try {
                patterns.push(JSON.parse(line));
              } catch (e) {
                // Skip invalid JSON lines
              }
            });
          } catch (error) {
            // Skip problematic files
          }
        }
      });
    }
    
    return patterns.slice(-50); // Last 50 patterns
  }

  getPerformanceTrends() {
    const trends = integrationMonitor.performanceMetrics.slice(-20);
    
    return {
      recent_metrics: trends,
      average_response_time: this.calculateAverage(trends, 'responseTime'),
      average_memory_usage: this.calculateAverage(trends, 'memoryUsage'),
      trend_direction: this.calculateTrend(trends, 'responseTime')
    };
  }

  calculateAverage(metrics, field) {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + (metric[field] || 0), 0);
    return Math.round(sum / metrics.length);
  }

  calculateTrend(metrics, field) {
    if (metrics.length < 2) return 'stable';
    
    const recent = metrics.slice(-5);
    const older = metrics.slice(-10, -5);
    
    const recentAvg = this.calculateAverage(recent, field);
    const olderAvg = this.calculateAverage(older, field);
    
    if (recentAvg > olderAvg * 1.1) return 'increasing';
    if (recentAvg < olderAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  getRecommendations() {
    const recommendations = [];
    const systemStatus = nldSystem.getSystemStatus();
    
    // Dynamic recommendations based on current state
    if (systemStatus.total_detections > 10) {
      recommendations.push({
        priority: 'high',
        category: 'pattern_optimization',
        message: 'High pattern detection rate - consider implementing suggested fixes',
        action: 'Review auto-fix suggestions in analysis logs'
      });
    }

    if (systemStatus.failure_count > 5) {
      recommendations.push({
        priority: 'critical',
        category: 'failure_prevention',
        message: 'Multiple failures detected - immediate attention required',
        action: 'Check failure logs and implement preventive measures'
      });
    }

    // Performance-based recommendations
    const perfTrends = this.getPerformanceTrends();
    if (perfTrends.average_response_time > 800) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        message: 'Response times above optimal threshold',
        action: 'Implement caching and query optimization'
      });
    }

    // Default recommendations for proactive improvement
    recommendations.push(
      {
        priority: 'low',
        category: 'testing',
        message: 'Maintain comprehensive test coverage',
        action: 'Ensure all critical paths have automated tests'
      },
      {
        priority: 'low',
        category: 'monitoring',
        message: 'Continue proactive monitoring',
        action: 'Review monitoring patterns weekly'
      }
    );

    return recommendations;
  }

  getActiveAlerts() {
    const alerts = [];
    const alertDir = path.join(__dirname, 'logs');
    const alertFile = path.join(alertDir, `critical-alerts-${this.getDateString()}.json`);
    
    if (fs.existsSync(alertFile)) {
      try {
        const content = fs.readFileSync(alertFile, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          try {
            const alert = JSON.parse(line);
            const alertAge = Date.now() - new Date(alert.timestamp).getTime();
            
            // Only show alerts from last hour
            if (alertAge < 3600000) {
              alerts.push(alert);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        });
      } catch (error) {
        // Skip file read errors
      }
    }
    
    return alerts;
  }

  getImplementationProgress() {
    const integrationReport = integrationMonitor.generateIntegrationReport();
    const phases = integrationMonitor.implementationPhases;
    const currentIndex = phases.indexOf(integrationReport.current_phase);
    
    return {
      current_phase: integrationReport.current_phase,
      phase_index: currentIndex + 1,
      total_phases: phases.length,
      progress_percentage: Math.round(((currentIndex + 1) / phases.length) * 100),
      phases_status: phases.map((phase, index) => ({
        phase,
        status: index < currentIndex ? 'completed' :
                index === currentIndex ? 'in_progress' : 'pending'
      }))
    };
  }

  displayDashboard() {
    console.clear();
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🧠 NEURAL LEARNING DETECTION DASHBOARD           ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    
    const status = this.dashboardData.realtime_status;
    console.log(`║ System Status: ${status.monitoring_active ? '🟢 ACTIVE' : '🔴 INACTIVE'}                                            ║`);
    console.log(`║ Health Score: ${status.health_score}/100                                               ║`);
    console.log(`║ Current Phase: ${status.current_phase || 'N/A'}                               ║`);
    console.log(`║ Patterns Detected: ${status.patterns_detected}                                              ║`);
    
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    console.log('║                         📊 IMPLEMENTATION PROGRESS                  ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    
    const progress = this.dashboardData.implementation_progress;
    if (progress) {
      console.log(`║ Progress: ${progress.progress_percentage}% (${progress.phase_index}/${progress.total_phases})                                        ║`);
      
      progress.phases_status.forEach(phase => {
        const statusIcon = phase.status === 'completed' ? '✅' :
                          phase.status === 'in_progress' ? '🔄' : '⏳';
        console.log(`║ ${statusIcon} ${phase.phase.padEnd(35)} ║`);
      });
    }
    
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    console.log('║                           🚨 ACTIVE ALERTS                          ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    
    const alerts = this.dashboardData.alerts;
    if (alerts.length === 0) {
      console.log('║ No active alerts - System running smoothly                          ║');
    } else {
      alerts.slice(0, 3).forEach(alert => {
        console.log(`║ 🚨 ${alert.pattern}: ${alert.trigger.substring(0, 40)}...        ║`);
      });
    }
    
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    console.log('║                        💡 TOP RECOMMENDATIONS                       ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    
    const recommendations = this.dashboardData.recommendations;
    recommendations.slice(0, 3).forEach(rec => {
      const priorityIcon = rec.priority === 'critical' ? '🔴' :
                          rec.priority === 'high' ? '🟡' : '🟢';
      console.log(`║ ${priorityIcon} ${rec.message.substring(0, 60)}... ║`);
    });
    
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    console.log('║                         📈 PERFORMANCE TRENDS                       ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    
    const perfTrends = this.dashboardData.performance_trends;
    if (perfTrends.recent_metrics && perfTrends.recent_metrics.length > 0) {
      console.log(`║ Avg Response Time: ${perfTrends.average_response_time}ms (${perfTrends.trend_direction})                        ║`);
      console.log(`║ Avg Memory Usage: ${perfTrends.average_memory_usage}MB                                   ║`);
    } else {
      console.log('║ Performance data collection in progress...                          ║');
    }
    
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log(`Last Updated: ${new Date(this.dashboardData.timestamp).toLocaleString()}`);
    console.log('\n🔄 Auto-refreshing every 60 seconds...\n');
  }

  generateReports() {
    // Daily summary report
    this.generateDailySummary();
    
    // Pattern analysis report  
    this.generatePatternAnalysis();
    
    // Performance report
    this.generatePerformanceReport();
  }

  generateDailySummary() {
    const summary = {
      date: this.getDateString(),
      timestamp: new Date().toISOString(),
      summary: {
        total_patterns_detected: this.dashboardData.realtime_status.patterns_detected,
        health_score: this.dashboardData.realtime_status.health_score,
        current_phase: this.dashboardData.realtime_status.current_phase,
        implementation_progress: this.dashboardData.implementation_progress?.progress_percentage || 0
      },
      alerts: this.dashboardData.alerts,
      recommendations: this.dashboardData.recommendations,
      performance: this.dashboardData.performance_trends
    };

    const reportFile = path.join(__dirname, 'analysis', `daily-summary-${this.getDateString()}.json`);
    this.ensureDirectoryExists(path.dirname(reportFile));
    fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2));
  }

  generatePatternAnalysis() {
    const patterns = this.dashboardData.pattern_history;
    const analysis = {
      timestamp: new Date().toISOString(),
      total_patterns: patterns.length,
      pattern_types: this.groupPatternsByType(patterns),
      severity_distribution: this.groupPatternsBySeverity(patterns),
      trend_analysis: this.analyzePatternTrends(patterns)
    };

    const analysisFile = path.join(__dirname, 'analysis', `pattern-analysis-${this.getDateString()}.json`);
    this.ensureDirectoryExists(path.dirname(analysisFile));
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
  }

  generatePerformanceReport() {
    const perfData = this.dashboardData.performance_trends;
    const report = {
      timestamp: new Date().toISOString(),
      performance_summary: perfData,
      benchmarks: {
        response_time_target: 500,
        memory_usage_target: 300,
        current_response_time: perfData.average_response_time,
        current_memory_usage: perfData.average_memory_usage
      },
      optimization_suggestions: this.getPerformanceOptimizations()
    };

    const reportFile = path.join(__dirname, 'analysis', `performance-report-${this.getDateString()}.json`);
    this.ensureDirectoryExists(path.dirname(reportFile));
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  }

  groupPatternsByType(patterns) {
    const groups = {};
    patterns.forEach(pattern => {
      const type = pattern.pattern || 'unknown';
      groups[type] = (groups[type] || 0) + 1;
    });
    return groups;
  }

  groupPatternsBySeverity(patterns) {
    const groups = { critical: 0, high: 0, medium: 0, low: 0 };
    patterns.forEach(pattern => {
      const severity = pattern.severity || 'low';
      groups[severity] = (groups[severity] || 0) + 1;
    });
    return groups;
  }

  analyzePatternTrends(patterns) {
    const hourlyGroups = {};
    patterns.forEach(pattern => {
      const hour = new Date(pattern.timestamp).getHours();
      hourlyGroups[hour] = (hourlyGroups[hour] || 0) + 1;
    });
    
    return {
      hourly_distribution: hourlyGroups,
      peak_hours: Object.keys(hourlyGroups).sort((a, b) => hourlyGroups[b] - hourlyGroups[a]).slice(0, 3)
    };
  }

  getPerformanceOptimizations() {
    const perfTrends = this.dashboardData.performance_trends;
    const suggestions = [];
    
    if (perfTrends.average_response_time > 500) {
      suggestions.push('Implement database query optimization and indexing');
      suggestions.push('Add response caching for frequently accessed data');
    }
    
    if (perfTrends.average_memory_usage > 300) {
      suggestions.push('Review memory usage patterns and implement cleanup');
      suggestions.push('Optimize data structures and reduce memory footprint');
    }
    
    if (perfTrends.trend_direction === 'increasing') {
      suggestions.push('Performance degradation detected - investigate recent changes');
    }
    
    return suggestions;
  }

  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  // API for external access
  getDashboardData() {
    return this.dashboardData;
  }

  getHealthScore() {
    return this.dashboardData.realtime_status.health_score;
  }

  getCurrentPhase() {
    return this.dashboardData.realtime_status.current_phase;
  }
}

// Initialize dashboard
const dashboard = new NLDDashboard();

// Update dashboard every minute
setInterval(() => {
  dashboard.displayDashboard();
}, 60000);

module.exports = dashboard;

console.log('📊 NLD Dashboard initialized and running');