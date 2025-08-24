#!/usr/bin/env node

/**
 * SPARC:Debug Browser Diagnostic Tool
 * Comprehensive browser-based white screen debugging
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class BrowserDiagnostics {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.diagnosticResults = {
      timestamp: new Date().toISOString(),
      errors: [],
      warnings: [],
      networkFailures: [],
      performanceMetrics: {},
      componentAnalysis: {},
      renderingStatus: 'unknown'
    };
  }

  async initialize() {
    console.log('🔍 SPARC:Debug - Initializing browser diagnostics...');
    
    this.browser = await chromium.launch({ 
      headless: false, // Show browser for debugging
      devtools: true,  // Enable DevTools
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--enable-logging=stderr',
        '--v=1'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'diagnostic-videos/' }
    });

    this.page = await this.context.newPage();
    
    // Enable console monitoring
    this.page.on('console', this.handleConsoleMessage.bind(this));
    this.page.on('pageerror', this.handlePageError.bind(this));
    this.page.on('requestfailed', this.handleNetworkFailure.bind(this));
    
    console.log('✅ Browser initialized for diagnostics');
  }

  handleConsoleMessage(msg) {
    const level = msg.type();
    const text = msg.text();
    
    console.log(`📊 Console [${level}]: ${text}`);
    
    if (level === 'error') {
      this.diagnosticResults.errors.push({
        type: 'console_error',
        message: text,
        timestamp: new Date().toISOString()
      });
    } else if (level === 'warning') {
      this.diagnosticResults.warnings.push({
        type: 'console_warning', 
        message: text,
        timestamp: new Date().toISOString()
      });
    }
  }

  handlePageError(error) {
    console.log(`🚨 Page Error: ${error.message}`);
    this.diagnosticResults.errors.push({
      type: 'page_error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  handleNetworkFailure(request) {
    console.log(`🌐 Network Failure: ${request.url()} - ${request.failure().errorText}`);
    this.diagnosticResults.networkFailures.push({
      url: request.url(),
      method: request.method(),
      error: request.failure().errorText,
      timestamp: new Date().toISOString()
    });
  }

  async runComprehensiveAnalysis(url = 'http://localhost:5173') {
    console.log(`🎯 Starting comprehensive analysis of: ${url}`);

    try {
      // 1. Navigation with timeout
      console.log('🚀 Phase 1: Page Navigation');
      const response = await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      console.log(`📡 Response Status: ${response.status()}`);

      // 2. Wait for potential React mounting
      console.log('⚛️  Phase 2: React Component Detection');
      await this.page.waitForTimeout(5000); // Allow React time to mount
      
      // 3. Check for white screen indicators
      await this.checkWhiteScreenIndicators();
      
      // 4. Analyze DOM structure
      await this.analyzeDOMStructure();
      
      // 5. Check React DevTools presence
      await this.checkReactDevTools();
      
      // 6. Performance analysis
      await this.runPerformanceAnalysis();
      
      // 7. Screenshot capture
      await this.captureScreenshots();
      
      // 8. Source map validation
      await this.validateSourceMaps();

    } catch (error) {
      console.error(`❌ Analysis failed: ${error.message}`);
      this.diagnosticResults.errors.push({
        type: 'analysis_failure',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  async checkWhiteScreenIndicators() {
    console.log('🔍 Checking white screen indicators...');
    
    // Check if body has content
    const bodyContent = await this.page.evaluate(() => {
      return {
        hasChildren: document.body.children.length > 0,
        textContent: document.body.textContent.trim(),
        innerHTML: document.body.innerHTML.length,
        reactRoot: !!document.getElementById('root')
      };
    });

    // Check React root mounting
    const reactMounted = await this.page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        exists: !!root,
        hasContent: root ? root.children.length > 0 : false,
        innerHTML: root ? root.innerHTML.length : 0,
        textContent: root ? root.textContent.trim().length : 0
      };
    });

    console.log('📊 Body Content Analysis:', bodyContent);
    console.log('⚛️  React Root Analysis:', reactMounted);

    this.diagnosticResults.componentAnalysis = {
      bodyContent,
      reactMounted,
      renderingStatus: reactMounted.hasContent ? 'rendered' : 'white_screen'
    };
    
    this.diagnosticResults.renderingStatus = reactMounted.hasContent ? 'rendered' : 'white_screen';
  }

  async analyzeDOMStructure() {
    console.log('🏗️  Analyzing DOM structure...');
    
    const domAnalysis = await this.page.evaluate(() => {
      const getElementInfo = (element) => {
        return {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          childCount: element.children.length,
          textLength: element.textContent.trim().length
        };
      };

      return {
        documentReady: document.readyState,
        headChildren: Array.from(document.head.children).map(getElementInfo),
        bodyChildren: Array.from(document.body.children).map(getElementInfo),
        scriptTags: Array.from(document.querySelectorAll('script')).map(script => ({
          src: script.src,
          type: script.type,
          hasContent: script.textContent.length > 0
        }))
      };
    });

    console.log('📋 DOM Analysis:', JSON.stringify(domAnalysis, null, 2));
    this.diagnosticResults.componentAnalysis.domStructure = domAnalysis;
  }

  async checkReactDevTools() {
    console.log('⚛️  Checking React DevTools integration...');
    
    const reactDevTools = await this.page.evaluate(() => {
      return {
        reactDetected: !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__),
        reactVersion: window.React ? window.React.version : 'unknown',
        devToolsHook: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
        fiberRoot: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.size
      };
    });

    console.log('🔧 React DevTools Status:', reactDevTools);
    this.diagnosticResults.componentAnalysis.reactDevTools = reactDevTools;
  }

  async runPerformanceAnalysis() {
    console.log('📊 Running performance analysis...');
    
    const metrics = await this.page.evaluate(() => ({
      timing: performance.timing,
      navigation: performance.navigation,
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null,
      resources: performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize,
        type: entry.initiatorType
      }))
    }));

    this.diagnosticResults.performanceMetrics = metrics;
    console.log('⚡ Performance metrics captured');
  }

  async captureScreenshots() {
    console.log('📸 Capturing diagnostic screenshots...');
    
    await this.page.screenshot({ 
      path: 'diagnostic-screenshots/full-page.png',
      fullPage: true 
    });
    
    await this.page.screenshot({ 
      path: 'diagnostic-screenshots/viewport.png' 
    });
    
    console.log('📷 Screenshots saved');
  }

  async validateSourceMaps() {
    console.log('🗺️  Validating source maps...');
    
    const sourceMapInfo = await this.page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts.map(script => ({
        src: script.src,
        hasSourceMap: script.src.includes('.map') || 
                     document.querySelector(`script[src="${script.src}.map"]`) !== null
      }));
    });

    console.log('🔍 Source Map Analysis:', sourceMapInfo);
    this.diagnosticResults.componentAnalysis.sourceMaps = sourceMapInfo;
  }

  async generateReport() {
    console.log('📝 Generating comprehensive diagnostic report...');
    
    const report = {
      ...this.diagnosticResults,
      summary: {
        totalErrors: this.diagnosticResults.errors.length,
        totalWarnings: this.diagnosticResults.warnings.length,
        networkFailures: this.diagnosticResults.networkFailures.length,
        renderingStatus: this.diagnosticResults.renderingStatus,
        criticalIssues: this.diagnosticResults.errors.filter(e => 
          e.type === 'page_error' || e.type === 'console_error'
        ).length
      },
      recommendations: this.generateRecommendations()
    };

    await fs.writeFile(
      'diagnostic-reports/browser-analysis-report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('✅ Diagnostic report generated');
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.diagnosticResults.renderingStatus === 'white_screen') {
      recommendations.push('CRITICAL: White screen detected - check console errors and component mounting');
    }
    
    if (this.diagnosticResults.errors.length > 0) {
      recommendations.push('HIGH: JavaScript errors detected - review console output');
    }
    
    if (this.diagnosticResults.networkFailures.length > 0) {
      recommendations.push('MEDIUM: Network failures detected - check asset loading');
    }
    
    return recommendations;
  }

  async cleanup() {
    console.log('🧹 Cleaning up browser resources...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    console.log('✅ Cleanup completed');
  }
}

// Main execution
async function main() {
  const diagnostics = new BrowserDiagnostics();
  
  try {
    // Ensure directories exist
    await fs.mkdir('diagnostic-screenshots', { recursive: true });
    await fs.mkdir('diagnostic-reports', { recursive: true });
    await fs.mkdir('diagnostic-videos', { recursive: true });
    
    await diagnostics.initialize();
    await diagnostics.runComprehensiveAnalysis();
    const report = await diagnostics.generateReport();
    
    console.log('\n🎯 SPARC:Debug Analysis Complete');
    console.log(`📊 Status: ${report.renderingStatus}`);
    console.log(`❌ Errors: ${report.summary.totalErrors}`);
    console.log(`⚠️  Warnings: ${report.summary.totalWarnings}`);
    console.log(`🌐 Network Failures: ${report.summary.networkFailures}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
  } catch (error) {
    console.error(`💥 Diagnostic failed: ${error.message}`);
    process.exit(1);
  } finally {
    await diagnostics.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = BrowserDiagnostics;