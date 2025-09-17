/**
 * NLD Fake Data Detection System
 * Monitors and detects hardcoded fake data patterns
 */

class FakeDataDetector {
  constructor() {
    this.patterns = {
      // Cost patterns that indicate fake data
      fakeCosts: [
        /\$12\.45/g,
        /\$0\.50/g,
        /\$1\.20/g,
        /\$3\.67/g,
        /\$25\.00/g,
        /cost:\s*["']?\$?\d+\.\d{2}["']?/g,
        /price:\s*["']?\$?\d+\.\d{2}["']?/g,
        /amount:\s*["']?\$?\d+\.\d{2}["']?/g
      ],

      // Token patterns that indicate fake data
      fakeTokens: [
        /tokens?:\s*["']?\d{3,6}["']?/g,
        /inputTokens?:\s*["']?\d{3,6}["']?/g,
        /outputTokens?:\s*["']?\d{3,6}["']?/g,
        /1234\s*tokens?/g,
        /5000\s*tokens?/g,
        /2500\s*tokens?/g
      ],

      // Hardcoded fake data arrays/objects
      fakeData: [
        /const\s+\w+\s*=\s*\[\s*\{[^}]*cost[^}]*\}/g,
        /const\s+\w+\s*=\s*\[\s*\{[^}]*token[^}]*\}/g,
        /mockData\s*=/g,
        /fakeData\s*=/g,
        /testData\s*=\s*\[/g
      ],

      // Analytics fake data
      analyticsFakeData: [
        /analytics:\s*\{[^}]*\$\d+\.\d{2}[^}]*\}/g,
        /metrics:\s*\{[^}]*token[^}]*:\s*\d+[^}]*\}/g,
        /usage:\s*\{[^}]*cost[^}]*:\s*["']?\$?\d+\.\d{2}["']?[^}]*\}/g
      ]
    };

    this.alerts = [];
    this.realTimeMonitor = null;
  }

  /**
   * Scan text content for fake data patterns
   */
  scanContent(content, filePath = 'unknown') {
    const findings = [];

    Object.entries(this.patterns).forEach(([category, patterns]) => {
      patterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            findings.push({
              category,
              pattern: pattern.toString(),
              match,
              filePath,
              severity: this.getSeverity(category),
              timestamp: new Date().toISOString()
            });
          });
        }
      });
    });

    return findings;
  }

  /**
   * Scan file for fake data patterns
   */
  async scanFile(filePath) {
    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf8');
      return this.scanContent(content, filePath);
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Scan directory recursively
   */
  async scanDirectory(dirPath, extensions = ['.js', '.ts', '.tsx', '.jsx']) {
    const path = require('path');
    const fs = require('fs').promises;
    const findings = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && !this.shouldSkipDir(entry.name)) {
          const subFindings = await this.scanDirectory(fullPath, extensions);
          findings.push(...subFindings);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          const fileFindings = await this.scanFile(fullPath);
          findings.push(...fileFindings);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }

    return findings;
  }

  /**
   * Check if directory should be skipped
   */
  shouldSkipDir(dirName) {
    const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage'];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * Get severity level for finding category
   */
  getSeverity(category) {
    const severityMap = {
      fakeCosts: 'CRITICAL',
      fakeTokens: 'HIGH',
      fakeData: 'HIGH',
      analyticsFakeData: 'CRITICAL'
    };
    return severityMap[category] || 'MEDIUM';
  }

  /**
   * Generate alert for findings
   */
  generateAlert(findings) {
    if (findings.length === 0) return null;

    const alert = {
      id: `alert-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: this.getHighestSeverity(findings),
      message: `Detected ${findings.length} fake data pattern(s)`,
      findings: findings,
      recommendations: this.getRecommendations(findings)
    };

    this.alerts.push(alert);
    return alert;
  }

  /**
   * Get highest severity from findings
   */
  getHighestSeverity(findings) {
    const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const severities = findings.map(f => f.severity);

    for (let i = levels.length - 1; i >= 0; i--) {
      if (severities.includes(levels[i])) {
        return levels[i];
      }
    }
    return 'LOW';
  }

  /**
   * Get recommendations based on findings
   */
  getRecommendations(findings) {
    const recommendations = [];

    if (findings.some(f => f.category === 'fakeCosts')) {
      recommendations.push('Replace hardcoded cost values with real API calculations');
    }

    if (findings.some(f => f.category === 'fakeTokens')) {
      recommendations.push('Implement real token counting from Claude API responses');
    }

    if (findings.some(f => f.category === 'fakeData')) {
      recommendations.push('Remove mock data arrays and use real data sources');
    }

    if (findings.some(f => f.category === 'analyticsFakeData')) {
      recommendations.push('Connect analytics to real usage data and metrics');
    }

    return recommendations;
  }

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring(watchPath, callback) {
    const chokidar = require('chokidar');

    this.realTimeMonitor = chokidar.watch(watchPath, {
      ignored: /node_modules|\.git|\.next/,
      persistent: true
    });

    this.realTimeMonitor
      .on('change', async (path) => {
        const findings = await this.scanFile(path);
        if (findings.length > 0) {
          const alert = this.generateAlert(findings);
          if (callback) callback(alert);
        }
      })
      .on('add', async (path) => {
        const findings = await this.scanFile(path);
        if (findings.length > 0) {
          const alert = this.generateAlert(findings);
          if (callback) callback(alert);
        }
      });

    console.log(`NLD Real-time monitoring started for: ${watchPath}`);
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring() {
    if (this.realTimeMonitor) {
      this.realTimeMonitor.close();
      this.realTimeMonitor = null;
      console.log('NLD Real-time monitoring stopped');
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport(findings) {
    const summary = {
      totalFindings: findings.length,
      bySeverity: {},
      byCategory: {},
      byFile: {},
      recommendations: []
    };

    findings.forEach(finding => {
      // Count by severity
      summary.bySeverity[finding.severity] = (summary.bySeverity[finding.severity] || 0) + 1;

      // Count by category
      summary.byCategory[finding.category] = (summary.byCategory[finding.category] || 0) + 1;

      // Count by file
      summary.byFile[finding.filePath] = (summary.byFile[finding.filePath] || 0) + 1;
    });

    // Get unique recommendations
    const allRecommendations = findings.map(f => this.getRecommendations([f])).flat();
    summary.recommendations = [...new Set(allRecommendations)];

    return {
      summary,
      findings,
      generatedAt: new Date().toISOString(),
      status: findings.length === 0 ? 'CLEAN' : 'ISSUES_FOUND'
    };
  }
}

module.exports = FakeDataDetector;