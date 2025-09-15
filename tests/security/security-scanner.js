#!/usr/bin/env node

const crypto = require('crypto');
const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ComprehensiveSecurityScanner {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'http://localhost:3000';
    this.outputDir = options.outputDir || './security-reports';
    this.scanConfig = {
      timeout: 30000,
      maxRetries: 3,
      userAgent: 'Security-Scanner/1.0',
      ...options.scanConfig
    };

    this.results = {
      timestamp: new Date().toISOString(),
      baseURL: this.baseURL,
      scans: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      }
    };
  }

  async runFullScan() {
    console.log('🔍 Starting comprehensive security scan...');
    console.log(`Target: ${this.baseURL}`);
    console.log(`Output: ${this.outputDir}`);

    await this.ensureOutputDir();

    try {
      // Run all security scans
      await Promise.all([
        this.scanSSLTLS(),
        this.scanOWASPTop10(),
        this.scanSecurityHeaders(),
        this.scanAuthentication(),
        this.scanInputValidation(),
        this.scanSessionManagement(),
        this.scanCORS(),
        this.scanCSP(),
        this.scanRateLimiting(),
        this.scanInformationDisclosure(),
        this.scanBusinessLogic(),
        this.scanDependencyVulnerabilities(),
        this.scanInfrastructure()
      ]);

      await this.generateReports();
      await this.saveResults();

      console.log('✅ Security scan completed');
      this.printSummary();

    } catch (error) {
      console.error('❌ Security scan failed:', error.message);
      throw error;
    }
  }

  async scanSSLTLS() {
    console.log('🔒 Scanning SSL/TLS configuration...');

    if (!this.baseURL.startsWith('https://')) {
      this.addResult('ssl-tls', 'high', 'SSL/TLS not enabled', {
        issue: 'Site does not use HTTPS',
        recommendation: 'Enable HTTPS with valid SSL certificate',
        impact: 'Data transmitted in plain text, vulnerable to interception'
      });
      return;
    }

    const url = new URL(this.baseURL);
    const sslScanResults = await this.performSSLScan(url.hostname, url.port || 443);

    // Check SSL/TLS version
    if (sslScanResults.protocols.includes('TLSv1.0') || sslScanResults.protocols.includes('TLSv1.1')) {
      this.addResult('ssl-tls', 'high', 'Weak TLS versions enabled', {
        protocols: sslScanResults.protocols,
        recommendation: 'Disable TLS 1.0 and 1.1, use TLS 1.2+ only'
      });
    }

    // Check certificate validity
    if (sslScanResults.certificate.daysUntilExpiry < 30) {
      this.addResult('ssl-tls', 'medium', 'Certificate expires soon', {
        expiryDate: sslScanResults.certificate.expiryDate,
        daysUntilExpiry: sslScanResults.certificate.daysUntilExpiry
      });
    }

    // Check cipher suites
    const weakCiphers = sslScanResults.cipherSuites.filter(cipher =>
      cipher.includes('RC4') || cipher.includes('DES') || cipher.includes('MD5')
    );

    if (weakCiphers.length > 0) {
      this.addResult('ssl-tls', 'high', 'Weak cipher suites enabled', {
        weakCiphers,
        recommendation: 'Disable weak cipher suites and use strong encryption'
      });
    }

    this.results.scans['ssl-tls'] = sslScanResults;
  }

  async scanOWASPTop10() {
    console.log('🛡️ Scanning OWASP Top 10 vulnerabilities...');

    const owaspTests = [
      this.testInjection(),
      this.testBrokenAuthentication(),
      this.testSensitiveDataExposure(),
      this.testXXE(),
      this.testBrokenAccessControl(),
      this.testSecurityMisconfiguration(),
      this.testXSS(),
      this.testInsecureDeserialization(),
      this.testComponentsWithKnownVulns(),
      this.testInsufficientLogging()
    ];

    const owaspResults = await Promise.allSettled(owaspTests);

    owaspResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.addResult('owasp-top-10', 'high', `OWASP Test ${index + 1} failed`, {
          error: result.reason.message,
          test: ['Injection', 'Broken Auth', 'Data Exposure', 'XXE', 'Access Control',
                 'Misconfiguration', 'XSS', 'Deserialization', 'Known Vulns', 'Logging'][index]
        });
      }
    });

    this.results.scans['owasp-top-10'] = owaspResults;
  }

  async scanSecurityHeaders() {
    console.log('📋 Scanning HTTP security headers...');

    const response = await this.makeRequest('GET', '/');
    const headers = response.headers;

    const requiredHeaders = {
      'strict-transport-security': {
        severity: 'high',
        description: 'HSTS header missing',
        recommendation: 'Add Strict-Transport-Security header'
      },
      'x-content-type-options': {
        severity: 'medium',
        description: 'X-Content-Type-Options header missing',
        recommendation: 'Add X-Content-Type-Options: nosniff'
      },
      'x-frame-options': {
        severity: 'medium',
        description: 'X-Frame-Options header missing',
        recommendation: 'Add X-Frame-Options: DENY or SAMEORIGIN'
      },
      'x-xss-protection': {
        severity: 'low',
        description: 'X-XSS-Protection header missing',
        recommendation: 'Add X-XSS-Protection: 1; mode=block'
      },
      'content-security-policy': {
        severity: 'high',
        description: 'Content-Security-Policy header missing',
        recommendation: 'Implement comprehensive CSP policy'
      },
      'referrer-policy': {
        severity: 'low',
        description: 'Referrer-Policy header missing',
        recommendation: 'Add Referrer-Policy: strict-origin-when-cross-origin'
      }
    };

    for (const [headerName, config] of Object.entries(requiredHeaders)) {
      if (!headers[headerName] && !headers[headerName.toLowerCase()]) {
        this.addResult('security-headers', config.severity, config.description, {
          header: headerName,
          recommendation: config.recommendation
        });
      }
    }

    // Check for information disclosure headers
    const dangerousHeaders = ['server', 'x-powered-by', 'x-aspnet-version'];
    for (const header of dangerousHeaders) {
      if (headers[header] || headers[header.toLowerCase()]) {
        this.addResult('security-headers', 'low', 'Information disclosure in headers', {
          header: header,
          value: headers[header] || headers[header.toLowerCase()],
          recommendation: 'Remove or obfuscate server information headers'
        });
      }
    }

    this.results.scans['security-headers'] = { headers, analysis: 'completed' };
  }

  async scanAuthentication() {
    console.log('🔐 Scanning authentication mechanisms...');

    const authTests = [
      this.testPasswordPolicy(),
      this.testBruteForceProtection(),
      this.testSessionSecurity(),
      this.testTwoFactorAuth(),
      this.testPasswordResetSecurity(),
      this.testAccountLockout()
    ];

    const authResults = await Promise.allSettled(authTests);
    this.results.scans['authentication'] = authResults;
  }

  async scanInputValidation() {
    console.log('🔍 Scanning input validation...');

    const endpoints = await this.discoverEndpoints();
    const payloads = this.getInjectionPayloads();

    for (const endpoint of endpoints) {
      for (const payload of payloads) {
        try {
          const response = await this.testInjectionPayload(endpoint, payload);

          if (this.detectInjectionVulnerability(response, payload)) {
            this.addResult('input-validation', 'critical', 'Injection vulnerability detected', {
              endpoint: endpoint.path,
              method: endpoint.method,
              payload: payload.name,
              response: {
                status: response.status,
                headers: response.headers,
                bodySnippet: response.body.substring(0, 200)
              }
            });
          }
        } catch (error) {
          // Expected for most payloads
        }
      }
    }
  }

  async scanCSP() {
    console.log('🛡️ Scanning Content Security Policy...');

    const response = await this.makeRequest('GET', '/');
    const csp = response.headers['content-security-policy'] ||
                response.headers['content-security-policy-report-only'];

    if (!csp) {
      this.addResult('csp', 'high', 'Content Security Policy not implemented', {
        recommendation: 'Implement comprehensive CSP to prevent XSS attacks'
      });
      return;
    }

    const cspAnalysis = this.analyzeCSP(csp);

    for (const issue of cspAnalysis.issues) {
      this.addResult('csp', issue.severity, issue.description, {
        directive: issue.directive,
        current: issue.current,
        recommendation: issue.recommendation
      });
    }

    this.results.scans['csp'] = { policy: csp, analysis: cspAnalysis };
  }

  async scanRateLimiting() {
    console.log('⏱️ Scanning rate limiting...');

    const endpoints = ['/api/login', '/api/register', '/api/forgot-password'];

    for (const endpoint of endpoints) {
      const requests = [];
      const startTime = Date.now();

      // Send burst of requests
      for (let i = 0; i < 20; i++) {
        requests.push(this.makeRequest('POST', endpoint, {
          username: 'test',
          password: 'test'
        }).catch(() => ({ status: 0 })));
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const endTime = Date.now();

      if (rateLimitedResponses.length === 0) {
        this.addResult('rate-limiting', 'medium', 'No rate limiting detected', {
          endpoint,
          requests: responses.length,
          timespan: endTime - startTime,
          recommendation: 'Implement rate limiting to prevent abuse'
        });
      } else {
        // Check if rate limiting is properly configured
        const firstRateLimited = responses.findIndex(r => r.status === 429);
        if (firstRateLimited > 10) {
          this.addResult('rate-limiting', 'low', 'Rate limiting threshold too high', {
            endpoint,
            threshold: firstRateLimited,
            recommendation: 'Consider lowering rate limit threshold'
          });
        }
      }
    }
  }

  async scanDependencyVulnerabilities() {
    console.log('📦 Scanning dependency vulnerabilities...');

    try {
      const { stdout } = await execAsync('npm audit --json', {
        cwd: process.cwd(),
        timeout: 30000
      });

      const auditResults = JSON.parse(stdout);

      if (auditResults.metadata.vulnerabilities.critical > 0) {
        this.addResult('dependencies', 'critical', 'Critical vulnerabilities in dependencies', {
          critical: auditResults.metadata.vulnerabilities.critical,
          high: auditResults.metadata.vulnerabilities.high,
          recommendation: 'Update vulnerable dependencies immediately'
        });
      }

      if (auditResults.metadata.vulnerabilities.high > 0) {
        this.addResult('dependencies', 'high', 'High severity vulnerabilities in dependencies', {
          high: auditResults.metadata.vulnerabilities.high,
          recommendation: 'Update vulnerable dependencies'
        });
      }

      this.results.scans['dependencies'] = auditResults.metadata;

    } catch (error) {
      this.addResult('dependencies', 'info', 'Could not scan dependencies', {
        error: error.message,
        recommendation: 'Ensure npm audit can run in the project directory'
      });
    }
  }

  // Helper methods for specific vulnerability tests

  async testInjection() {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM passwords --"
    ];

    for (const payload of sqlPayloads) {
      const response = await this.makeRequest('POST', '/api/search', {
        query: payload
      });

      if (response.body.includes('mysql_') ||
          response.body.includes('ORA-') ||
          response.body.includes('PostgreSQL')) {
        throw new Error('SQL injection vulnerability detected');
      }
    }
  }

  async testXSS() {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")'
    ];

    for (const payload of xssPayloads) {
      const response = await this.makeRequest('POST', '/api/comment', {
        content: payload
      });

      if (response.body.includes(payload) && !response.body.includes('&lt;script&gt;')) {
        throw new Error('XSS vulnerability detected');
      }
    }
  }

  async testBrokenAuthentication() {
    // Test weak password policy
    const weakPasswords = ['password', '123456', 'admin'];

    for (const password of weakPasswords) {
      const response = await this.makeRequest('POST', '/api/register', {
        username: 'testuser',
        password: password,
        email: 'test@example.com'
      });

      if (response.status === 200 || response.status === 201) {
        throw new Error('Weak password accepted');
      }
    }
  }

  async performSSLScan(hostname, port) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port,
        method: 'GET',
        path: '/',
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        const cert = res.connection.getPeerCertificate();
        const cipher = res.connection.getCipher();

        resolve({
          protocols: [res.connection.getProtocol()],
          certificate: {
            subject: cert.subject,
            issuer: cert.issuer,
            expiryDate: cert.valid_to,
            daysUntilExpiry: Math.floor((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24))
          },
          cipherSuites: [cipher.name]
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('SSL scan timeout')));
      req.setTimeout(10000);
      req.end();
    });
  }

  getInjectionPayloads() {
    return [
      { name: 'SQL Injection', payload: "'; DROP TABLE users; --" },
      { name: 'XSS', payload: '<script>alert("XSS")</script>' },
      { name: 'Command Injection', payload: '; rm -rf /' },
      { name: 'LDAP Injection', payload: '*)(&(objectClass=*)' },
      { name: 'XML Injection', payload: '<?xml version="1.0"?><!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>' }
    ];
  }

  detectInjectionVulnerability(response, payload) {
    const indicators = {
      'SQL Injection': ['mysql_', 'ORA-', 'PostgreSQL', 'sqlite_', 'SQL syntax'],
      'XSS': [payload.payload],
      'Command Injection': ['root:', 'daemon:', '/bin/bash'],
      'LDAP Injection': ['LDAP Error', 'javax.naming'],
      'XML Injection': ['root:x:', 'xml version']
    };

    const payloadIndicators = indicators[payload.name] || [];
    return payloadIndicators.some(indicator =>
      response.body.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  analyzeCSP(csp) {
    const issues = [];
    const directives = this.parseCSP(csp);

    // Check for unsafe-inline
    if (directives['script-src']?.includes("'unsafe-inline'")) {
      issues.push({
        severity: 'high',
        directive: 'script-src',
        description: 'unsafe-inline allows XSS attacks',
        current: directives['script-src'].join(' '),
        recommendation: 'Use nonces or hashes instead of unsafe-inline'
      });
    }

    // Check for unsafe-eval
    if (directives['script-src']?.includes("'unsafe-eval'")) {
      issues.push({
        severity: 'high',
        directive: 'script-src',
        description: 'unsafe-eval allows code injection',
        current: directives['script-src'].join(' '),
        recommendation: 'Remove unsafe-eval directive'
      });
    }

    // Check for wildcard sources
    if (directives['script-src']?.includes('*')) {
      issues.push({
        severity: 'medium',
        directive: 'script-src',
        description: 'Wildcard source allows any external script',
        current: directives['script-src'].join(' '),
        recommendation: 'Specify exact domains instead of wildcards'
      });
    }

    return { issues, score: this.calculateCSPScore(directives) };
  }

  parseCSP(csp) {
    const directives = {};
    const parts = csp.split(';').map(p => p.trim()).filter(p => p);

    for (const part of parts) {
      const [directive, ...values] = part.split(/\s+/);
      directives[directive] = values;
    }

    return directives;
  }

  calculateCSPScore(directives) {
    let score = 100;

    if (directives['script-src']?.includes("'unsafe-inline'")) score -= 30;
    if (directives['script-src']?.includes("'unsafe-eval'")) score -= 25;
    if (directives['script-src']?.includes('*')) score -= 20;
    if (!directives['object-src']?.includes("'none'")) score -= 15;
    if (!directives['base-uri']) score -= 10;

    return Math.max(0, score);
  }

  async discoverEndpoints() {
    // Basic endpoint discovery - in real implementation, this would be more comprehensive
    return [
      { path: '/api/login', method: 'POST' },
      { path: '/api/register', method: 'POST' },
      { path: '/api/search', method: 'GET' },
      { path: '/api/users', method: 'GET' },
      { path: '/api/comments', method: 'POST' }
    ];
  }

  async testInjectionPayload(endpoint, payload) {
    const data = endpoint.method === 'GET'
      ? undefined
      : { query: payload.payload, input: payload.payload };

    return this.makeRequest(endpoint.method, endpoint.path, data);
  }

  async makeRequest(method, path, data = null) {
    const url = new URL(path, this.baseURL);

    const options = {
      method,
      headers: {
        'User-Agent': this.scanConfig.userAgent,
        'Accept': 'application/json, text/html, */*'
      },
      timeout: this.scanConfig.timeout
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
    }

    return new Promise((resolve, reject) => {
      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(url, options, (res) => {
        let body = '';

        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  addResult(category, severity, description, details) {
    if (!this.results.scans[category]) {
      this.results.scans[category] = { issues: [] };
    }

    this.results.scans[category].issues.push({
      severity,
      description,
      details,
      timestamp: new Date().toISOString()
    });

    this.results.summary.total++;
    this.results.summary[severity]++;

    if (['critical', 'high'].includes(severity)) {
      this.results.summary.failed++;
    } else {
      this.results.summary.passed++;
    }
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  async saveResults() {
    const resultsFile = path.join(this.outputDir, `security-scan-${Date.now()}.json`);
    await fs.writeFile(resultsFile, JSON.stringify(this.results, null, 2));

    console.log(`📄 Results saved to: ${resultsFile}`);
  }

  async generateReports() {
    // Generate HTML report
    const htmlReport = this.generateHTMLReport();
    const htmlFile = path.join(this.outputDir, `security-report-${Date.now()}.html`);
    await fs.writeFile(htmlFile, htmlReport);

    // Generate CSV report
    const csvReport = this.generateCSVReport();
    const csvFile = path.join(this.outputDir, `security-issues-${Date.now()}.csv`);
    await fs.writeFile(csvFile, csvReport);

    console.log(`📊 Reports generated: ${htmlFile}, ${csvFile}`);
  }

  generateHTMLReport() {
    const issues = [];

    for (const [category, scan] of Object.entries(this.results.scans)) {
      if (scan.issues) {
        issues.push(...scan.issues.map(issue => ({ ...issue, category })));
      }
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Security Scan Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .critical { border-left: 5px solid #dc3545; }
        .high { border-left: 5px solid #fd7e14; }
        .medium { border-left: 5px solid #ffc107; }
        .low { border-left: 5px solid #28a745; }
        .issue { margin: 10px 0; padding: 15px; border-radius: 5px; background: #f8f9fa; }
        .details { margin-top: 10px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Scan Report</h1>
        <p><strong>Target:</strong> ${this.results.baseURL}</p>
        <p><strong>Scan Date:</strong> ${this.results.timestamp}</p>
    </div>

    <div class="summary">
        <div class="stat">
            <h3>${this.results.summary.total}</h3>
            <p>Total Issues</p>
        </div>
        <div class="stat">
            <h3>${this.results.summary.critical}</h3>
            <p>Critical</p>
        </div>
        <div class="stat">
            <h3>${this.results.summary.high}</h3>
            <p>High</p>
        </div>
        <div class="stat">
            <h3>${this.results.summary.medium}</h3>
            <p>Medium</p>
        </div>
        <div class="stat">
            <h3>${this.results.summary.low}</h3>
            <p>Low</p>
        </div>
    </div>

    <h2>Security Issues</h2>
    ${issues.map(issue => `
        <div class="issue ${issue.severity}">
            <h3>${issue.description}</h3>
            <p><strong>Category:</strong> ${issue.category}</p>
            <p><strong>Severity:</strong> ${issue.severity.toUpperCase()}</p>
            <div class="details">
                <pre>${JSON.stringify(issue.details, null, 2)}</pre>
            </div>
        </div>
    `).join('')}

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6;">
        <p><em>Generated by Comprehensive Security Scanner</em></p>
    </footer>
</body>
</html>`;
  }

  generateCSVReport() {
    const headers = ['Category', 'Severity', 'Description', 'Details', 'Timestamp'];
    const rows = [headers.join(',')];

    for (const [category, scan] of Object.entries(this.results.scans)) {
      if (scan.issues) {
        for (const issue of scan.issues) {
          const row = [
            category,
            issue.severity,
            `"${issue.description}"`,
            `"${JSON.stringify(issue.details).replace(/"/g, '""')}"`,
            issue.timestamp
          ];
          rows.push(row.join(','));
        }
      }
    }

    return rows.join('\n');
  }

  printSummary() {
    console.log('\n📊 SECURITY SCAN SUMMARY');
    console.log('========================');
    console.log(`Target: ${this.results.baseURL}`);
    console.log(`Total Issues: ${this.results.summary.total}`);
    console.log(`Critical: ${this.results.summary.critical}`);
    console.log(`High: ${this.results.summary.high}`);
    console.log(`Medium: ${this.results.summary.medium}`);
    console.log(`Low: ${this.results.summary.low}`);
    console.log(`Info: ${this.results.summary.info}`);

    if (this.results.summary.critical > 0) {
      console.log('\n❌ CRITICAL ISSUES FOUND - IMMEDIATE ACTION REQUIRED');
    } else if (this.results.summary.high > 0) {
      console.log('\n⚠️  HIGH SEVERITY ISSUES FOUND - ACTION REQUIRED');
    } else {
      console.log('\n✅ No critical or high severity issues found');
    }
  }

  // Placeholder methods for comprehensive testing
  async testPasswordPolicy() { /* Implementation */ }
  async testBruteForceProtection() { /* Implementation */ }
  async testSessionSecurity() { /* Implementation */ }
  async testTwoFactorAuth() { /* Implementation */ }
  async testPasswordResetSecurity() { /* Implementation */ }
  async testAccountLockout() { /* Implementation */ }
  async testSensitiveDataExposure() { /* Implementation */ }
  async testXXE() { /* Implementation */ }
  async testBrokenAccessControl() { /* Implementation */ }
  async testSecurityMisconfiguration() { /* Implementation */ }
  async testInsecureDeserialization() { /* Implementation */ }
  async testComponentsWithKnownVulns() { /* Implementation */ }
  async testInsufficientLogging() { /* Implementation */ }
  async scanSessionManagement() { /* Implementation */ }
  async scanCORS() { /* Implementation */ }
  async scanInformationDisclosure() { /* Implementation */ }
  async scanBusinessLogic() { /* Implementation */ }
  async scanInfrastructure() { /* Implementation */ }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const scanType = args[0] || 'full';
  const baseURL = args[1] || process.env.SCAN_TARGET || 'http://localhost:3000';

  const scanner = new ComprehensiveSecurityScanner({ baseURL });

  switch (scanType) {
    case 'ssl':
      scanner.scanSSLTLS().then(() => scanner.printSummary());
      break;
    case 'owasp':
      scanner.scanOWASPTop10().then(() => scanner.printSummary());
      break;
    case 'headers':
      scanner.scanSecurityHeaders().then(() => scanner.printSummary());
      break;
    case 'full':
    default:
      scanner.runFullScan();
      break;
  }
}

module.exports = { ComprehensiveSecurityScanner };