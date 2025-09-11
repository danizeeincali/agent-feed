#!/usr/bin/env node

/**
 * Math.random() Elimination Report Generator
 * 
 * Simple Node.js script to detect and report all Math.random() usage
 * across the production codebase.
 */

const fs = require('fs');
const path = require('path');

class MathRandomDetector {
  constructor() {
    this.projectRoot = '/workspaces/agent-feed';
    this.productionPaths = [
      'frontend/src/components',
      'frontend/src/pages', 
      'frontend/src/services',
      'frontend/src/hooks',
      'src/api',
      'src/services',
      'src/database'
    ];
    
    this.agentPageComponents = [
      'UnifiedAgentPage.tsx',
      'AgentHomePage.tsx', 
      'AgentHome.tsx',
      'AgentManager.tsx',
      'AgentPostsFeed.tsx',
      'DualInstance.tsx',
      'DualInstanceDashboard.tsx'
    ];
    
    this.detectedContaminations = [];
  }

  // Recursively find all files in a directory
  findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip test, coverage, and node_modules directories
        if (entry.name.includes('test') || 
            entry.name.includes('spec') || 
            entry.name.includes('coverage') ||
            entry.name === 'node_modules') {
          continue;
        }
        files.push(...this.findFiles(fullPath, extensions));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  // Detect Math.random() usage in a file
  detectMathRandomInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const mathRandomLines = [];
    
    lines.forEach((line, index) => {
      if (line.includes('Math.random()')) {
        mathRandomLines.push({
          lineNumber: index + 1,
          content: line.trim(),
          context: this.getLineContext(lines, index)
        });
      }
    });
    
    return mathRandomLines;
  }
  
  getLineContext(lines, lineIndex) {
    const start = Math.max(0, lineIndex - 1);
    const end = Math.min(lines.length, lineIndex + 2);
    return lines.slice(start, end).map((line, idx) => {
      const actualLineNum = start + idx + 1;
      const prefix = actualLineNum === lineIndex + 1 ? '>>> ' : '    ';
      return `${prefix}${actualLineNum}: ${line}`;
    }).join('\n');
  }
  
  determineSeverity(filePath, mathRandomLines) {
    const fileName = path.basename(filePath);
    
    // Agent page components are CRITICAL
    if (this.agentPageComponents.some(component => 
        fileName === component || filePath.includes(component.replace('.tsx', '')))) {
      return 'CRITICAL';
    }
    
    // API and service files are HIGH priority
    if (filePath.includes('/api/') || filePath.includes('/services/')) {
      return 'HIGH';
    }
    
    // Multiple usages are HIGH priority
    if (mathRandomLines.length > 2) {
      return 'HIGH';
    }
    
    return 'MEDIUM';
  }

  // Run comprehensive detection
  runDetection() {
    console.log('🔍 Starting Math.random() contamination detection...\n');
    
    for (const searchPath of this.productionPaths) {
      const fullPath = path.join(this.projectRoot, searchPath);
      const files = this.findFiles(fullPath);
      
      console.log(`📁 Scanning ${searchPath}: ${files.length} files`);
      
      for (const file of files) {
        const mathRandomLines = this.detectMathRandomInFile(file);
        
        if (mathRandomLines.length > 0) {
          const contamination = {
            file: path.relative(this.projectRoot, file),
            lines: mathRandomLines,
            severity: this.determineSeverity(file, mathRandomLines),
            affectsAgentPages: this.agentPageComponents.some(component => 
              file.includes(component.replace('.tsx', ''))
            )
          };
          
          this.detectedContaminations.push(contamination);
          
          console.log(`❌ ${contamination.severity}: ${contamination.file}`);
          mathRandomLines.forEach(line => {
            console.log(`   Line ${line.lineNumber}: ${line.content}`);
          });
          console.log('');
        }
      }
    }
  }

  // Generate comprehensive report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalContaminatedFiles: this.detectedContaminations.length,
        totalViolations: this.detectedContaminations.reduce((sum, c) => sum + c.lines.length, 0),
        criticalFiles: this.detectedContaminations.filter(c => c.severity === 'CRITICAL').length,
        highPriorityFiles: this.detectedContaminations.filter(c => c.severity === 'HIGH').length,
        mediumPriorityFiles: this.detectedContaminations.filter(c => c.severity === 'MEDIUM').length,
        agentPageViolations: this.detectedContaminations.filter(c => c.affectsAgentPages).length
      },
      contaminations: this.detectedContaminations,
      recommendations: this.generateRecommendations()
    };

    // Write detailed report
    const reportPath = path.join(this.projectRoot, 'tests/tdd-london-school/mock-elimination-detection-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 MATH.RANDOM() CONTAMINATION REPORT');
    console.log('=====================================');
    console.log(`📁 Total contaminated files: ${report.summary.totalContaminatedFiles}`);
    console.log(`🚨 Total violations: ${report.summary.totalViolations}`);
    console.log(`🔥 Critical files: ${report.summary.criticalFiles}`);
    console.log(`⚠️  High priority files: ${report.summary.highPriorityFiles}`);
    console.log(`📄 Medium priority files: ${report.summary.mediumPriorityFiles}`);
    console.log(`🏠 Agent page violations: ${report.summary.agentPageViolations}`);
    
    console.log('\n🎯 ZERO TOLERANCE ENFORCEMENT:');
    if (report.summary.totalViolations === 0) {
      console.log('✅ SUCCESS: Zero Math.random() contamination detected!');
      console.log('✅ All agent pages display 100% real data!');
    } else {
      console.log('❌ FAILURE: Math.random() contamination detected!');
      console.log('❌ Agent pages contain mock/synthetic data!');
      
      console.log('\n🚨 CRITICAL VIOLATIONS:');
      const criticalContaminations = this.detectedContaminations.filter(c => c.severity === 'CRITICAL');
      criticalContaminations.forEach(contamination => {
        console.log(`   ${contamination.file}: ${contamination.lines.length} violations`);
      });
    }
    
    console.log(`\n📄 Full report saved: ${reportPath}`);
    
    return report.summary.totalViolations === 0;
  }

  generateRecommendations() {
    const recommendations = [];
    
    this.detectedContaminations.forEach(contamination => {
      if (contamination.affectsAgentPages) {
        recommendations.push({
          file: contamination.file,
          priority: 'CRITICAL',
          action: 'Replace Math.random() with real agent data from API endpoints',
          details: 'Agent pages must display 100% real data for production use'
        });
      } else if (contamination.file.includes('service') || contamination.file.includes('api')) {
        recommendations.push({
          file: contamination.file,
          priority: 'HIGH',
          action: 'Replace Math.random() with deterministic calculations or real data',
          details: 'Service layer should not contain mock data generation'
        });
      } else {
        recommendations.push({
          file: contamination.file,
          priority: 'MEDIUM',
          action: 'Replace Math.random() with deterministic alternatives',
          details: 'Remove mock data contamination for production reliability'
        });
      }
    });
    
    return recommendations;
  }
}

// Run the detection
if (require.main === module) {
  const detector = new MathRandomDetector();
  detector.runDetection();
  const success = detector.generateReport();
  
  // Exit with proper code for CI/CD
  process.exit(success ? 0 : 1);
}

module.exports = { MathRandomDetector };