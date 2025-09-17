#!/usr/bin/env node

/**
 * NLD Monitoring System Runner
 * Comprehensive fake data detection and monitoring
 */

const FakeDataDetector = require('./fake-data-detector');
const path = require('path');
const fs = require('fs').promises;

class NLDRunner {
  constructor() {
    this.detector = new FakeDataDetector();
    this.config = {
      scanPaths: [
        '/workspaces/agent-feed/frontend/src',
        '/workspaces/agent-feed/backend',
        '/workspaces/agent-feed/src',
        '/workspaces/agent-feed/pages',
        '/workspaces/agent-feed/components'
      ],
      extensions: ['.js', '.ts', '.tsx', '.jsx'],
      outputPath: '/workspaces/agent-feed/tests/nld-monitoring/reports',
      realTimeWatch: true
    };
  }

  /**
   * Run comprehensive fake data scan
   */
  async runComprehensiveScan() {
    console.log('🔍 Starting NLD Comprehensive Fake Data Scan...');
    console.log('========================================');

    const allFindings = [];
    const scanResults = [];

    for (const scanPath of this.config.scanPaths) {
      try {
        console.log(`\n📁 Scanning: ${scanPath}`);
        const findings = await this.detector.scanDirectory(scanPath, this.config.extensions);

        allFindings.push(...findings);
        scanResults.push({
          path: scanPath,
          findings: findings.length,
          issues: findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length
        });

        console.log(`   Found: ${findings.length} potential issues`);
      } catch (error) {
        console.log(`   Error scanning ${scanPath}: ${error.message}`);
      }
    }

    // Generate comprehensive report
    const report = this.detector.generateReport(allFindings);

    // Save report
    await this.saveReport(report, 'comprehensive-scan');

    // Display results
    this.displayResults(report, scanResults);

    return report;
  }

  /**
   * Run targeted file scan
   */
  async runTargetedScan(filePaths) {
    console.log('🎯 Starting NLD Targeted File Scan...');
    console.log('===================================');

    const allFindings = [];

    for (const filePath of filePaths) {
      try {
        console.log(`\n📄 Scanning: ${filePath}`);
        const findings = await this.detector.scanFile(filePath);
        allFindings.push(...findings);
        console.log(`   Found: ${findings.length} potential issues`);
      } catch (error) {
        console.log(`   Error scanning ${filePath}: ${error.message}`);
      }
    }

    const report = this.detector.generateReport(allFindings);
    await this.saveReport(report, 'targeted-scan');
    this.displayResults(report);

    return report;
  }

  /**
   * Start real-time monitoring
   */
  async startRealTimeMonitoring() {
    console.log('⚡ Starting NLD Real-Time Monitoring...');
    console.log('=====================================');

    const watchPaths = this.config.scanPaths.filter(async (p) => {
      try {
        await fs.access(p);
        return true;
      } catch {
        return false;
      }
    });

    watchPaths.forEach(watchPath => {
      this.detector.startRealTimeMonitoring(watchPath, (alert) => {
        this.handleRealTimeAlert(alert);
      });
    });

    console.log(`👁️  Monitoring ${watchPaths.length} directories for fake data patterns...`);
    console.log('Press Ctrl+C to stop monitoring\n');
  }

  /**
   * Handle real-time alerts
   */
  handleRealTimeAlert(alert) {
    console.log(`\n🚨 REAL-TIME ALERT - ${alert.level}`);
    console.log(`📅 ${alert.timestamp}`);
    console.log(`📝 ${alert.message}`);

    alert.findings.forEach((finding, index) => {
      console.log(`\n${index + 1}. ${finding.category.toUpperCase()}`);
      console.log(`   File: ${finding.filePath}`);
      console.log(`   Pattern: ${finding.match}`);
      console.log(`   Severity: ${finding.severity}`);
    });

    if (alert.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      alert.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * Save report to file
   */
  async saveReport(report, scanType) {
    try {
      // Ensure reports directory exists
      await fs.mkdir(this.config.outputPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `nld-report-${scanType}-${timestamp}.json`;
      const filePath = path.join(this.config.outputPath, fileName);

      await fs.writeFile(filePath, JSON.stringify(report, null, 2));
      console.log(`\n📊 Report saved: ${filePath}`);

      // Also save latest report
      const latestPath = path.join(this.config.outputPath, `nld-report-latest.json`);
      await fs.writeFile(latestPath, JSON.stringify(report, null, 2));

    } catch (error) {
      console.error('Error saving report:', error);
    }
  }

  /**
   * Display scan results
   */
  displayResults(report, scanResults = []) {
    console.log('\n📊 NLD SCAN RESULTS');
    console.log('==================');

    console.log(`\n🎯 Overall Status: ${report.status}`);
    console.log(`📈 Total Findings: ${report.summary.totalFindings}`);

    if (report.summary.totalFindings > 0) {
      console.log('\n🚨 Severity Breakdown:');
      Object.entries(report.summary.bySeverity).forEach(([severity, count]) => {
        const icon = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟠' : severity === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`   ${icon} ${severity}: ${count}`);
      });

      console.log('\n📂 Category Breakdown:');
      Object.entries(report.summary.byCategory).forEach(([category, count]) => {
        console.log(`   • ${category}: ${count}`);
      });

      console.log('\n📄 Top Problematic Files:');
      const sortedFiles = Object.entries(report.summary.byFile)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      sortedFiles.forEach(([file, count]) => {
        console.log(`   • ${path.basename(file)}: ${count} issues`);
      });

      if (report.summary.recommendations.length > 0) {
        console.log('\n💡 Key Recommendations:');
        report.summary.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
    } else {
      console.log('\n✅ No fake data patterns detected!');
      console.log('🎉 System appears to be using 100% real data');
    }

    if (scanResults.length > 0) {
      console.log('\n📁 Directory Scan Summary:');
      scanResults.forEach(result => {
        const status = result.issues > 0 ? '🚨' : result.findings > 0 ? '⚠️' : '✅';
        console.log(`   ${status} ${path.basename(result.path)}: ${result.findings} findings (${result.issues} high-priority)`);
      });
    }

    console.log(`\n📅 Scan completed at: ${report.generatedAt}`);
    console.log('==========================================\n');
  }

  /**
   * Validate specific components for fake data
   */
  async validateComponents() {
    console.log('🔍 Validating Key Components for Fake Data...');
    console.log('============================================');

    const criticalFiles = [
      '/workspaces/agent-feed/frontend/src/components/Feed.js',
      '/workspaces/agent-feed/frontend/src/components/TokenAnalytics.js',
      '/workspaces/agent-feed/frontend/src/utils/analytics.js',
      '/workspaces/agent-feed/backend/routes/api.js',
      '/workspaces/agent-feed/backend/services/claude-api.js'
    ];

    const results = [];

    for (const file of criticalFiles) {
      try {
        const findings = await this.detector.scanFile(file);
        results.push({
          file: path.basename(file),
          path: file,
          findings: findings.length,
          critical: findings.filter(f => f.severity === 'CRITICAL').length,
          status: findings.length === 0 ? 'CLEAN' : 'ISSUES'
        });

        console.log(`${findings.length === 0 ? '✅' : '🚨'} ${path.basename(file)}: ${findings.length} issues`);

      } catch (error) {
        console.log(`❌ ${path.basename(file)}: Could not scan (${error.message})`);
      }
    }

    return results;
  }
}

// CLI Interface
async function main() {
  const runner = new NLDRunner();
  const args = process.argv.slice(2);
  const command = args[0] || 'scan';

  try {
    switch (command) {
      case 'scan':
        await runner.runComprehensiveScan();
        break;

      case 'watch':
        await runner.startRealTimeMonitoring();
        // Keep process alive
        process.on('SIGINT', () => {
          console.log('\n👋 Stopping NLD monitoring...');
          runner.detector.stopRealTimeMonitoring();
          process.exit(0);
        });
        break;

      case 'validate':
        await runner.validateComponents();
        break;

      case 'file':
        const files = args.slice(1);
        if (files.length === 0) {
          console.error('Usage: node nld-runner.js file <path1> [path2] ...');
          process.exit(1);
        }
        await runner.runTargetedScan(files);
        break;

      default:
        console.log('Usage: node nld-runner.js [scan|watch|validate|file]');
        console.log('  scan     - Run comprehensive fake data scan');
        console.log('  watch    - Start real-time monitoring');
        console.log('  validate - Validate key components');
        console.log('  file     - Scan specific files');
    }
  } catch (error) {
    console.error('NLD Runner Error:', error);
    process.exit(1);
  }
}

// Export for testing
module.exports = NLDRunner;

// Run if called directly
if (require.main === module) {
  main();
}