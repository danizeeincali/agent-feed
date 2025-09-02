#!/usr/bin/env node
/**
 * SPARC Validation Report Generator
 * Analyzes test results and generates comprehensive validation reports
 */

const fs = require('fs');
const path = require('path');

class SPARCReportGenerator {
  constructor() {
    this.reportPath = path.join(__dirname, 'sparc-validation-report.json');
    this.outputDir = path.join(__dirname, 'reports');
    this.timestamp = new Date().toISOString();
  }

  async generateReport() {
    console.log('📊 Generating SPARC Validation Report...');
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    // Read test results
    let testResults = [];
    if (fs.existsSync(this.reportPath)) {
      try {
        const rawData = fs.readFileSync(this.reportPath, 'utf8');
        testResults = JSON.parse(rawData);
      } catch (error) {
        console.warn('⚠️ Could not read test results, generating empty report');
      }
    }
    
    // Generate comprehensive report
    const report = this.analyzeResults(testResults);
    
    // Generate multiple report formats
    this.generateJSONReport(report);
    this.generateMarkdownReport(report);
    this.generateHTMLReport(report);
    
    console.log('✅ SPARC Validation Report generated successfully');
    console.log(`📁 Reports available in: ${this.outputDir}`);
  }

  analyzeResults(testResults) {
    const analysis = {
      metadata: {
        generatedAt: this.timestamp,
        totalTests: testResults.length,
        methodology: 'SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)'
      },
      summary: {
        passed: 0,
        failed: 0,
        totalDuration: 0,
        averageDuration: 0
      },
      categories: {
        'instance-creation': { tests: [], passed: 0, failed: 0 },
        'command-processing': { tests: [], passed: 0, failed: 0 },
        'websocket-handling': { tests: [], passed: 0, failed: 0 },
        'loading-animation': { tests: [], passed: 0, failed: 0 },
        'permission-handling': { tests: [], passed: 0, failed: 0 },
        'error-handling': { tests: [], passed: 0, failed: 0 },
        'performance': { tests: [], passed: 0, failed: 0 }
      },
      testDetails: testResults,
      recommendations: [],
      systemHealth: {
        backendConnectivity: 'unknown',
        frontendConnectivity: 'unknown',
        claudeProcesses: 'unknown',
        websocketStability: 'unknown'
      }
    };
    
    // Analyze individual test results
    testResults.forEach(test => {
      if (test.result === 'PASSED') {
        analysis.summary.passed++;
      } else {
        analysis.summary.failed++;
      }
      
      if (test.duration) {
        analysis.summary.totalDuration += test.duration;
      }
      
      // Categorize tests
      const category = this.categorizeTest(test.test);
      if (analysis.categories[category]) {
        analysis.categories[category].tests.push(test);
        if (test.result === 'PASSED') {
          analysis.categories[category].passed++;
        } else {
          analysis.categories[category].failed++;
        }
      }
    });
    
    // Calculate averages
    if (analysis.summary.totalDuration > 0 && testResults.length > 0) {
      analysis.summary.averageDuration = Math.round(analysis.summary.totalDuration / testResults.length);
    }
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);
    
    return analysis;
  }

  categorizeTest(testName) {
    const name = testName.toLowerCase();
    
    if (name.includes('instance') && name.includes('creation')) return 'instance-creation';
    if (name.includes('command') || name.includes('processing')) return 'command-processing';
    if (name.includes('websocket') || name.includes('connection')) return 'websocket-handling';
    if (name.includes('loading') || name.includes('animation')) return 'loading-animation';
    if (name.includes('permission')) return 'permission-handling';
    if (name.includes('error') || name.includes('invalid') || name.includes('disconnection')) return 'error-handling';
    if (name.includes('performance') || name.includes('concurrent')) return 'performance';
    
    return 'other';
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    // Performance recommendations
    if (analysis.summary.averageDuration > 10000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Average test duration exceeds 10 seconds. Consider optimizing system response times.',
        details: `Current average: ${analysis.summary.averageDuration}ms`
      });
    }
    
    // Failure rate recommendations
    const failureRate = analysis.summary.failed / (analysis.summary.passed + analysis.summary.failed);
    if (failureRate > 0.1) {
      recommendations.push({
        type: 'reliability',
        priority: 'critical',
        message: 'Test failure rate exceeds 10%. System may not be production ready.',
        details: `Failure rate: ${(failureRate * 100).toFixed(1)}%`
      });
    }
    
    // Category-specific recommendations
    Object.entries(analysis.categories).forEach(([category, data]) => {
      if (data.failed > 0) {
        recommendations.push({
          type: 'category-failure',
          priority: 'medium',
          message: `Failures detected in ${category} category`,
          details: `${data.failed} out of ${data.tests.length} tests failed`
        });
      }
    });
    
    return recommendations;
  }

  generateJSONReport(report) {
    const jsonPath = path.join(this.outputDir, 'sparc-validation-comprehensive-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report: ${jsonPath}`);
  }

  generateMarkdownReport(report) {
    const mdPath = path.join(this.outputDir, 'SPARC-VALIDATION-REPORT.md');
    
    let markdown = `# SPARC Comprehensive Terminal Integration Validation Report\n\n`;
    markdown += `**Generated:** ${report.metadata.generatedAt}\\n`;
    markdown += `**Methodology:** ${report.metadata.methodology}\\n\\n`;
    
    markdown += `## Executive Summary\n\n`;
    markdown += `- **Total Tests:** ${report.metadata.totalTests}\\n`;
    markdown += `- **Passed:** ${report.summary.passed} ✅\\n`;
    markdown += `- **Failed:** ${report.summary.failed} ${report.summary.failed > 0 ? '❌' : '✅'}\\n`;
    markdown += `- **Success Rate:** ${((report.summary.passed / report.metadata.totalTests) * 100).toFixed(1)}%\\n`;
    markdown += `- **Average Duration:** ${report.summary.averageDuration}ms\\n\\n`;
    
    markdown += `## Test Categories\n\n`;
    Object.entries(report.categories).forEach(([category, data]) => {
      const successRate = data.tests.length > 0 ? ((data.passed / data.tests.length) * 100).toFixed(1) : 0;
      markdown += `### ${category.replace(/-/g, ' ').toUpperCase()}\n`;
      markdown += `- Tests: ${data.tests.length}\\n`;
      markdown += `- Passed: ${data.passed}\\n`;
      markdown += `- Failed: ${data.failed}\\n`;
      markdown += `- Success Rate: ${successRate}%\\n\\n`;
    });
    
    if (report.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      report.recommendations.forEach(rec => {
        const icon = rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚠️' : 'ℹ️';
        markdown += `${icon} **${rec.type.toUpperCase()}** (${rec.priority.toUpperCase()})\\n`;
        markdown += `${rec.message}\\n`;
        if (rec.details) {
          markdown += `*Details: ${rec.details}*\\n`;
        }
        markdown += `\\n`;
      });
    }
    
    markdown += `## Production Readiness Assessment\n\n`;
    const isProductionReady = report.summary.failed === 0 && report.recommendations.filter(r => r.priority === 'critical').length === 0;
    markdown += `**Status:** ${isProductionReady ? '✅ PRODUCTION READY' : '❌ REQUIRES ATTENTION'}\\n\\n`;
    
    if (isProductionReady) {
      markdown += `All tests passed successfully. The Claude Code terminal integration system is validated for production deployment.\\n\\n`;
    } else {
      markdown += `Critical issues detected. Address the recommendations above before production deployment.\\n\\n`;
    }
    
    markdown += `---\\n\\n`;
    markdown += `*Report generated by SPARC Methodology validation system*\\n`;
    
    fs.writeFileSync(mdPath, markdown);
    console.log(`📄 Markdown report: ${mdPath}`);
  }

  generateHTMLReport(report) {
    const htmlPath = path.join(this.outputDir, 'sparc-validation-report.html');
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SPARC Validation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; }
        .header h1 { margin: 0 0 10px 0; font-size: 2.5em; }
        .header p { margin: 0; opacity: 0.9; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fb; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
        .stat-number { font-size: 2em; font-weight: bold; color: #333; margin-bottom: 5px; }
        .stat-label { color: #666; text-transform: uppercase; font-size: 0.9em; letter-spacing: 1px; }
        .categories { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .category-card { border: 1px solid #e1e8ed; border-radius: 8px; padding: 20px; }
        .category-title { font-size: 1.2em; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; }
        .progress-bar { background: #e1e8ed; height: 8px; border-radius: 4px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #4CAF50, #45a049); }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .recommendation { margin: 15px 0; padding: 10px; border-left: 3px solid #f39c12; background: white; }
        .production-status { text-align: center; padding: 30px; margin: 30px 0; border-radius: 8px; }
        .production-ready { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .production-warning { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .timestamp { text-align: center; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e8ed; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SPARC Validation Report</h1>
            <p>Comprehensive Terminal Integration Validation</p>
            <p>Generated: ${report.metadata.generatedAt}</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <div class="stat-card">
                    <div class="stat-number">${report.metadata.totalTests}</div>
                    <div class="stat-label">Total Tests</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #4CAF50">${report.summary.passed}</div>
                    <div class="stat-label">Passed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: ${report.summary.failed > 0 ? '#f44336' : '#4CAF50'}">${report.summary.failed}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${report.summary.averageDuration}ms</div>
                    <div class="stat-label">Avg Duration</div>
                </div>
            </div>
            
            <h2>Test Categories</h2>
            <div class="categories">
                ${Object.entries(report.categories).map(([category, data]) => {
                  const successRate = data.tests.length > 0 ? (data.passed / data.tests.length) * 100 : 0;
                  return `
                    <div class="category-card">
                        <div class="category-title">${category.replace(/-/g, ' ')}</div>
                        <div>Tests: ${data.tests.length} | Passed: ${data.passed} | Failed: ${data.failed}</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${successRate}%"></div>
                        </div>
                        <div>Success Rate: ${successRate.toFixed(1)}%</div>
                    </div>
                  `;
                }).join('')}
            </div>
            
            ${report.recommendations.length > 0 ? `
            <div class="recommendations">
                <h2>Recommendations</h2>
                ${report.recommendations.map(rec => `
                    <div class="recommendation">
                        <strong>${rec.type.toUpperCase()}</strong> (${rec.priority.toUpperCase()})
                        <br>${rec.message}
                        ${rec.details ? `<br><em>${rec.details}</em>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <div class="production-status ${report.summary.failed === 0 ? 'production-ready' : 'production-warning'}">
                <h2>${report.summary.failed === 0 ? '✅ PRODUCTION READY' : '❌ REQUIRES ATTENTION'}</h2>
                <p>${report.summary.failed === 0 
                    ? 'All tests passed successfully. The system is validated for production deployment.' 
                    : 'Issues detected. Address the recommendations above before production deployment.'}</p>
            </div>
        </div>
        
        <div class="timestamp">
            Report generated by SPARC Methodology validation system
        </div>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(htmlPath, html);
    console.log(`📄 HTML report: ${htmlPath}`);
  }
}

// Run report generation
if (require.main === module) {
  const generator = new SPARCReportGenerator();
  generator.generateReport().catch(error => {
    console.error('❌ Report generation failed:', error);
    process.exit(1);
  });
}

module.exports = SPARCReportGenerator;