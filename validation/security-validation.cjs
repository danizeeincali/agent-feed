#!/usr/bin/env node

/**
 * Security Validation Script
 * Tests security measures and vulnerabilities
 */

const http = require('http');
const fs = require('fs').promises;

class SecurityValidator {
  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      vulnerabilities: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        critical: 0
      }
    };
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(url, {
        method: 'GET',
        timeout: 5000,
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async testSecurityHeaders() {
    console.log('🔒 Testing security headers...');

    const response = await this.makeRequest(this.baseUrl);
    const headers = response.headers;

    const securityTests = [
      {
        name: 'X-Content-Type-Options',
        present: !!headers['x-content-type-options'],
        expected: 'nosniff',
        actual: headers['x-content-type-options'],
        critical: false
      },
      {
        name: 'X-Frame-Options',
        present: !!headers['x-frame-options'],
        expected: 'DENY or SAMEORIGIN',
        actual: headers['x-frame-options'],
        critical: true
      },
      {
        name: 'X-XSS-Protection',
        present: !!headers['x-xss-protection'],
        expected: '1; mode=block',
        actual: headers['x-xss-protection'],
        critical: false
      },
      {
        name: 'Strict-Transport-Security',
        present: !!headers['strict-transport-security'],
        expected: 'Present for HTTPS',
        actual: headers['strict-transport-security'],
        critical: false // Not critical for localhost
      },
      {
        name: 'Content-Security-Policy',
        present: !!headers['content-security-policy'],
        expected: 'Restrictive policy',
        actual: headers['content-security-policy'],
        critical: true
      }
    ];

    securityTests.forEach(test => {
      this.results.tests.push(test);
      this.results.summary.total++;

      if (test.present) {
        this.results.summary.passed++;
        console.log(`✅ ${test.name}: ${test.actual}`);
      } else {
        this.results.summary.failed++;
        if (test.critical) {
          this.results.summary.critical++;
          this.results.vulnerabilities.push({
            type: 'missing_security_header',
            header: test.name,
            severity: 'high',
            description: `Missing critical security header: ${test.name}`
          });
        }
        console.log(`❌ ${test.name}: Missing`);
      }
    });
  }

  async testXSSProtection() {
    console.log('🔒 Testing XSS protection...');

    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '"><script>alert("xss")</script>',
      '\';alert("xss");//'
    ];

    for (const payload of xssPayloads) {
      try {
        const url = `${this.baseUrl}?search=${encodeURIComponent(payload)}`;
        const response = await this.makeRequest(url);

        // Check if payload appears unescaped in response
        if (response.data.includes(payload)) {
          this.results.vulnerabilities.push({
            type: 'xss_vulnerability',
            payload: payload,
            severity: 'critical',
            description: 'XSS payload found unescaped in response'
          });
          this.results.summary.critical++;
        }
      } catch (error) {
        // Error is fine, means server rejected the request
      }
    }

    console.log(`✅ XSS protection tested with ${xssPayloads.length} payloads`);
  }

  async testSQLInjection() {
    console.log('🔒 Testing SQL injection protection...');

    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "'; WAITFOR DELAY '00:00:05'--"
    ];

    for (const payload of sqlPayloads) {
      try {
        const url = `${this.baseUrl}/api/users?id=${encodeURIComponent(payload)}`;
        const response = await this.makeRequest(url);

        // Check for SQL error messages
        const sqlErrors = [
          'sql syntax',
          'mysql_fetch',
          'ora-',
          'microsoft jet database',
          'sqlite_',
          'postgresql'
        ];

        const responseText = response.data.toLowerCase();
        if (sqlErrors.some(error => responseText.includes(error))) {
          this.results.vulnerabilities.push({
            type: 'sql_injection_vulnerability',
            payload: payload,
            severity: 'critical',
            description: 'SQL error message exposed, potential injection point'
          });
          this.results.summary.critical++;
        }
      } catch (error) {
        // Error is expected for invalid requests
      }
    }

    console.log(`✅ SQL injection protection tested`);
  }

  async testDirectoryTraversal() {
    console.log('🔒 Testing directory traversal protection...');

    const traversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc//passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
    ];

    for (const payload of traversalPayloads) {
      try {
        const url = `${this.baseUrl}/${payload}`;
        const response = await this.makeRequest(url);

        // Check for system file content
        if (response.data.includes('root:') || response.data.includes('[boot loader]')) {
          this.results.vulnerabilities.push({
            type: 'directory_traversal_vulnerability',
            payload: payload,
            severity: 'critical',
            description: 'System files accessible via directory traversal'
          });
          this.results.summary.critical++;
        }
      } catch (error) {
        // Error is expected
      }
    }

    console.log(`✅ Directory traversal protection tested`);
  }

  async runAllTests() {
    console.log('🛡️ Starting Security Validation...');

    try {
      await this.testSecurityHeaders();
      await this.testXSSProtection();
      await this.testSQLInjection();
      await this.testDirectoryTraversal();

      // Summary
      console.log('\n' + '='.repeat(50));
      console.log('🛡️ SECURITY VALIDATION SUMMARY');
      console.log('='.repeat(50));
      console.log(`Total Tests: ${this.results.summary.total}`);
      console.log(`Passed: ${this.results.summary.passed}`);
      console.log(`Failed: ${this.results.summary.failed}`);
      console.log(`Critical Issues: ${this.results.summary.critical}`);

      if (this.results.vulnerabilities.length > 0) {
        console.log('\n⚠️ VULNERABILITIES FOUND:');
        this.results.vulnerabilities.forEach((vuln, i) => {
          console.log(`  ${i + 1}. ${vuln.type} (${vuln.severity}): ${vuln.description}`);
        });
      } else {
        console.log('\n✅ No critical vulnerabilities found');
      }

      // Save report
      const reportPath = 'validation/security-validation-report.json';
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`\n📄 Security report saved to: ${reportPath}`);

      return this.results.summary.critical === 0;

    } catch (error) {
      console.error('❌ Security validation failed:', error);
      return false;
    }
  }
}

async function main() {
  const validator = new SecurityValidator();
  const passed = await validator.runAllTests();
  process.exit(passed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = SecurityValidator;