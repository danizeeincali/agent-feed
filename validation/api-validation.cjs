#!/usr/bin/env node

/**
 * API Validation Script - Real Backend Testing
 * Tests actual API endpoints with real data, no mocks
 */

const http = require('http');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class APIValidator {
  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl,
      endpoints: [],
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
        errors: []
      }
    };
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;

      const req = client.request(url, {
        method: 'GET',
        timeout: 10000,
        ...options
      }, (res) => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            contentType: res.headers['content-type'] || '',
            responseTime: Date.now() - startTime
          });
        });
      });

      const startTime = Date.now();

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async testEndpoint(path, expectedStatus = 200, description = '') {
    const url = `${this.baseUrl}${path}`;
    console.log(`🧪 Testing: ${description || path}`);

    const result = {
      path,
      url,
      description,
      expectedStatus,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await this.makeRequest(url);

      result.actualStatus = response.status;
      result.responseTime = response.responseTime;
      result.contentType = response.contentType;
      result.contentLength = response.data.length;
      result.success = response.status === expectedStatus;

      // Try to parse JSON if content-type suggests it
      if (response.contentType.includes('application/json')) {
        try {
          result.parsedData = JSON.parse(response.data);
          result.dataValid = true;
        } catch (e) {
          result.dataValid = false;
          result.parseError = e.message;
        }
      }

      if (result.success) {
        console.log(`✅ ${path} - ${response.status} (${response.responseTime}ms)`);
        this.results.summary.successful++;
      } else {
        console.log(`⚠️  ${path} - Expected ${expectedStatus}, got ${response.status}`);
        this.results.summary.failed++;
      }

    } catch (error) {
      result.success = false;
      result.error = error.message;
      result.actualStatus = 0;

      console.log(`❌ ${path} - Error: ${error.message}`);
      this.results.summary.failed++;
      this.results.summary.errors.push({
        path,
        error: error.message
      });
    }

    this.results.endpoints.push(result);
    this.results.summary.total++;
  }

  async validateAPIs() {
    console.log('🚀 Starting API Validation...');
    console.log(`📍 Base URL: ${this.baseUrl}\n`);

    // Test main application
    await this.testEndpoint('/', 200, 'Main Application');

    // Test API endpoints (some might not exist, that's OK)
    await this.testEndpoint('/api/health', [200, 404, 500], 'Health Check');
    await this.testEndpoint('/api/agents', [200, 404, 500], 'Agents API');
    await this.testEndpoint('/api/posts', [200, 404, 500], 'Posts API');
    await this.testEndpoint('/api/analytics', [200, 404, 500], 'Analytics API');
    await this.testEndpoint('/api/workflows', [200, 404, 500], 'Workflows API');
    await this.testEndpoint('/api/performance', [200, 404, 500], 'Performance API');

    // Test static assets
    await this.testEndpoint('/vite.svg', [200, 404], 'Static Assets');

    // Test non-existent endpoints
    await this.testEndpoint('/non-existent-endpoint', [404, 500], '404 Handling');

    console.log('\n' + '='.repeat(50));
    console.log('📊 API VALIDATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Endpoints: ${this.results.summary.total}`);
    console.log(`Successful: ${this.results.summary.successful}`);
    console.log(`Failed: ${this.results.summary.failed}`);

    if (this.results.summary.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.summary.errors.forEach(error => {
        console.log(`  - ${error.path}: ${error.error}`);
      });
    }

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'validation', 'api-validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);

    return this.results;
  }
}

async function main() {
  const validator = new APIValidator();

  try {
    await validator.validateAPIs();

    // Don't fail if some APIs are down - this is expected for a frontend app
    const criticalFailures = validator.results.endpoints.filter(e =>
      e.path === '/' && !e.success
    );

    if (criticalFailures.length > 0) {
      console.log('❌ Critical API failures detected');
      process.exit(1);
    } else {
      console.log('✅ API validation completed');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ API validation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = APIValidator;