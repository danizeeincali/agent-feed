#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

class RouteValidator {
  constructor(baseUrl = 'http://127.0.0.1:3001') {
    this.baseUrl = baseUrl;
    this.results = [];
    this.testRoutes = [
      { path: '/', name: 'Home' },
      { path: '/workflows', name: 'Workflows' },
      { path: '/activity', name: 'Activity' },
      { path: '/agents', name: 'Agents' },
      { path: '/dual-instance', name: 'Dual Instance' },
      { path: '/analytics', name: 'Analytics' },
      { path: '/claude-code', name: 'Claude Code' },
      { path: '/settings', name: 'Settings' }
    ];
  }

  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Route-Validator/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            contentLength: data.length
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  validateReactSPA(html) {
    const checks = {
      hasDoctype: /<!DOCTYPE html>/i.test(html),
      hasHtmlTag: /<html[^>]*>/i.test(html),
      hasHead: /<head[^>]*>/.test(html),
      hasBody: /<body[^>]*>/.test(html),
      hasReactRoot: /id=['"](root|app)['"]/.test(html),
      hasViteScript: /src=['"][^'"]*assets\/index-[^'"]*\.js['"]/.test(html) || /@vite\/client/.test(html),
      hasReactDevScript: /@vite\/client/.test(html) || /react/.test(html),
      hasTitle: /<title[^>]*>/.test(html),
      hasMetaCharset: /<meta[^>]*charset/i.test(html),
      hasMetaViewport: /<meta[^>]*viewport/i.test(html)
    };

    return checks;
  }

  checkForErrors(html) {
    const errorPatterns = [
      /cannot GET/i,
      /404 not found/i,
      /500 internal server error/i,
      /error 404/i,
      /page not found/i,
      /syntax error/i,
      /unexpected token/i,
      /module not found/i,
      /failed to fetch/i
    ];

    return errorPatterns.some(pattern => pattern.test(html));
  }

  async testRoute(route) {
    const url = `${this.baseUrl}${route.path}`;
    console.log(`Testing ${route.name}: ${url}`);

    try {
      const response = await this.makeRequest(url);
      
      // Basic validations
      const isSuccess = response.statusCode === 200;
      const hasMinimumContent = response.contentLength > 500;
      const reactChecks = this.validateReactSPA(response.body);
      const hasErrors = this.checkForErrors(response.body);

      // Calculate React SPA score
      const reactCheckCount = Object.values(reactChecks).filter(Boolean).length;
      const totalReactChecks = Object.keys(reactChecks).length;
      const reactScore = (reactCheckCount / totalReactChecks) * 100;

      const result = {
        route: route.name,
        path: route.path,
        url,
        statusCode: response.statusCode,
        contentLength: response.contentLength,
        isSuccess,
        hasMinimumContent,
        reactScore: Math.round(reactScore),
        hasErrors,
        reactChecks,
        passed: isSuccess && hasMinimumContent && !hasErrors && reactScore >= 70,
        contentType: response.headers['content-type'] || 'unknown',
        timestamp: new Date().toISOString()
      };

      // Log detailed results
      console.log(`  ✓ Status: ${response.statusCode} ${isSuccess ? '✓' : '✗'}`);
      console.log(`  ✓ Content Length: ${response.contentLength} ${hasMinimumContent ? '✓' : '✗'}`);
      console.log(`  ✓ React SPA Score: ${reactScore}% ${reactScore >= 70 ? '✓' : '✗'}`);
      console.log(`  ✓ No Errors: ${!hasErrors ? '✓' : '✗'}`);
      console.log(`  ✓ Overall: ${result.passed ? 'PASS' : 'FAIL'}`);

      if (!result.passed) {
        console.log(`  ⚠️ Failed checks:`);
        if (!isSuccess) console.log(`    - HTTP Status: ${response.statusCode}`);
        if (!hasMinimumContent) console.log(`    - Content too short: ${response.contentLength} chars`);
        if (hasErrors) console.log(`    - Contains error patterns`);
        if (reactScore < 70) {
          console.log(`    - React SPA validation failed:`);
          Object.entries(reactChecks).forEach(([check, passed]) => {
            if (!passed) console.log(`      - Missing: ${check}`);
          });
        }
      }

      console.log('');
      return result;

    } catch (error) {
      const result = {
        route: route.name,
        path: route.path,
        url,
        error: error.message,
        passed: false,
        timestamp: new Date().toISOString()
      };

      console.log(`  ✗ ERROR: ${error.message}`);
      console.log(`  ✗ Overall: FAIL\n`);
      
      return result;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Route Validation Tests');
    console.log('=' .repeat(60));
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Testing ${this.testRoutes.length} routes\n`);

    const startTime = Date.now();
    
    for (const route of this.testRoutes) {
      const result = await this.testRoute(route);
      this.results.push(result);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    this.generateReport(duration);
  }

  generateReport(duration) {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const successRate = Math.round((passed / total) * 100);

    console.log(`Total Routes Tested: ${total}`);
    console.log(`Passed: ${passed} ✓`);
    console.log(`Failed: ${failed} ${failed > 0 ? '✗' : '✓'}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Test Duration: ${duration}s`);
    console.log('');

    // Detailed results table
    console.log('📋 DETAILED RESULTS');
    console.log('-' .repeat(80));
    console.log('Route'.padEnd(15) + 'Status'.padEnd(8) + 'Content'.padEnd(10) + 'React'.padEnd(8) + 'Result');
    console.log('-' .repeat(80));

    this.results.forEach(result => {
      const route = result.route.padEnd(15);
      const status = (result.statusCode || 'ERROR').toString().padEnd(8);
      const content = (result.contentLength ? `${result.contentLength}b` : 'N/A').padEnd(10);
      const react = (result.reactScore ? `${result.reactScore}%` : 'N/A').padEnd(8);
      const resultStatus = result.passed ? '✓ PASS' : '✗ FAIL';
      
      console.log(`${route}${status}${content}${react}${resultStatus}`);
    });

    console.log('');

    // Failed routes details
    const failedRoutes = this.results.filter(r => !r.passed);
    if (failedRoutes.length > 0) {
      console.log('🔍 FAILED ROUTES ANALYSIS');
      console.log('-' .repeat(40));
      failedRoutes.forEach(result => {
        console.log(`❌ ${result.route} (${result.path})`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        } else {
          if (result.statusCode !== 200) console.log(`   Status: ${result.statusCode}`);
          if (result.contentLength <= 500) console.log(`   Content: ${result.contentLength} chars (too short)`);
          if (result.hasErrors) console.log(`   Contains error patterns`);
          if (result.reactScore < 70) console.log(`   React SPA: ${result.reactScore}% (insufficient)`);
        }
        console.log('');
      });
    }

    // Success summary
    console.log('🎯 FINAL ASSESSMENT');
    console.log('-' .repeat(30));
    if (successRate === 100) {
      console.log('🎉 ALL ROUTES WORKING PERFECTLY!');
      console.log('✅ No white screens detected');
      console.log('✅ All React SPAs loading correctly');
      console.log('✅ All routes returning proper content');
    } else if (successRate >= 80) {
      console.log('⚠️ MOSTLY WORKING - Some issues detected');
      console.log(`🔧 ${failed} route(s) need attention`);
    } else {
      console.log('🚨 MAJOR ISSUES DETECTED');
      console.log(`❌ ${failed} route(s) failing`);
      console.log('🛠️ Immediate fixes required');
    }

    console.log('');
    console.log(`Test completed at: ${new Date().toISOString()}`);

    // Exit with appropriate code
    process.exit(successRate === 100 ? 0 : 1);
  }
}

// Run the tests
const validator = new RouteValidator();
validator.runAllTests().catch(console.error);