const axios = require('axios');
const crypto = require('crypto');
const { expect } = require('chai');

describe('API Security Testing Suite', () => {
  const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
  let apiClient;
  let authToken;
  let testUser;

  beforeEach(async () => {
    apiClient = axios.create({
      baseURL,
      timeout: 10000,
      validateStatus: () => true // Don't throw on 4xx/5xx
    });

    // Setup test user and authentication
    testUser = {
      username: 'securitytest',
      email: 'security@test.com',
      password: 'SecureTestP@ss123!'
    };
  });

  describe('Authentication Security Tests', () => {
    it('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        '/api/user/profile',
        '/api/admin/users',
        '/api/posts/create',
        '/api/settings/update',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await apiClient.get(endpoint);
        expect([401, 403]).to.include(response.status);
        expect(response.headers).to.not.have.property('set-cookie');
      }
    });

    it('should validate JWT tokens properly', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '', // Empty token
        'Bearer invalid-format',
        'malformed-token-structure',
      ];

      for (const token of invalidTokens) {
        const response = await apiClient.get('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });

        expect(response.status).to.equal(401);
        expect(response.data).to.have.property('error');
      }
    });

    it('should implement proper rate limiting', async () => {
      const loginEndpoint = '/api/auth/login';
      const requests = [];

      // Send multiple requests rapidly
      for (let i = 0; i < 20; i++) {
        requests.push(
          apiClient.post(loginEndpoint, {
            username: 'test',
            password: 'wrong'
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).to.be.greaterThan(0);
      expect(rateLimitedResponses[0].headers).to.have.property('retry-after');
    });

    it('should prevent brute force attacks', async () => {
      const attempts = [];

      for (let i = 0; i < 10; i++) {
        attempts.push(
          apiClient.post('/api/auth/login', {
            username: 'admin',
            password: `wrong-password-${i}`
          })
        );
      }

      const responses = await Promise.all(attempts);

      // Should get rate limited or locked out
      const lastResponse = responses[responses.length - 1];
      expect([423, 429]).to.include(lastResponse.status);
    });
  });

  describe('Input Validation Security Tests', () => {
    it('should prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO admin (user) VALUES ('hacker'); --",
        "' UNION SELECT * FROM passwords --",
      ];

      const endpoints = [
        { method: 'get', url: '/api/users', param: 'search' },
        { method: 'post', url: '/api/posts', field: 'content' },
        { method: 'put', url: '/api/user/profile', field: 'bio' },
      ];

      for (const payload of sqlInjectionPayloads) {
        for (const endpoint of endpoints) {
          let response;

          if (endpoint.method === 'get') {
            response = await apiClient.get(`${endpoint.url}?${endpoint.param}=${encodeURIComponent(payload)}`);
          } else {
            const data = { [endpoint.field]: payload };
            response = await apiClient[endpoint.method](endpoint.url, data);
          }

          // Should not return database errors or execute injection
          expect(response.status).not.to.equal(500);
          if (response.data && response.data.error) {
            expect(response.data.error).not.to.match(/sql|database|mysql|postgres/i);
          }
        }
      }
    });

    it('should sanitize XSS attempts in API responses', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
      ];

      for (const payload of xssPayloads) {
        const response = await apiClient.post('/api/posts', {
          title: payload,
          content: payload
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        if (response.status === 200 || response.status === 201) {
          const responseText = JSON.stringify(response.data);
          expect(responseText).not.to.contain('<script>');
          expect(responseText).not.to.contain('javascript:');
          expect(responseText).not.to.contain('onerror=');
          expect(responseText).not.to.contain('onload=');
        }
      }
    });

    it('should validate file upload security', async () => {
      const maliciousFiles = [
        { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
        { name: 'evil.exe', content: 'MZ\x90\x00...', type: 'application/x-executable' },
        { name: 'shell.jsp', content: '<%@ page import="java.io.*" %>', type: 'application/java-archive' },
        { name: '..\\..\\..\\etc\\passwd', content: 'root:x:0:0:', type: 'text/plain' },
      ];

      for (const file of maliciousFiles) {
        const formData = new FormData();
        const blob = new Blob([file.content], { type: file.type });
        formData.append('file', blob, file.name);

        const response = await apiClient.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${authToken}`
          }
        });

        expect(response.status).to.be.oneOf([400, 415, 422]); // Bad Request, Unsupported Media Type, or Unprocessable Entity
      }
    });

    it('should prevent command injection', async () => {
      const commandInjectionPayloads = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '&& whoami',
        '`id`',
        '$(cat /etc/passwd)',
      ];

      for (const payload of commandInjectionPayloads) {
        const response = await apiClient.post('/api/process', {
          command: payload,
          filename: payload
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        // Should not execute commands
        expect(response.status).to.be.oneOf([400, 422]);

        if (response.data && response.data.output) {
          expect(response.data.output).not.to.match(/root:|uid=|total \d+/);
        }
      }
    });
  });

  describe('Authorization Security Tests', () => {
    it('should enforce role-based access control', async () => {
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/settings',
        '/api/admin/logs',
        '/api/admin/system',
      ];

      // Test with regular user token
      for (const endpoint of adminEndpoints) {
        const response = await apiClient.get(endpoint, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(response.status).to.equal(403);
      }
    });

    it('should prevent horizontal privilege escalation', async () => {
      // Create two test users
      const user1 = await createTestUser('user1');
      const user2 = await createTestUser('user2');

      // User 1 tries to access User 2's resources
      const response = await apiClient.get(`/api/users/${user2.id}/profile`, {
        headers: { Authorization: `Bearer ${user1.token}` }
      });

      expect(response.status).to.be.oneOf([403, 404]);
    });

    it('should validate resource ownership', async () => {
      // Create a post as one user
      const post = await apiClient.post('/api/posts', {
        title: 'Test Post',
        content: 'Test content'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Create another user and try to modify the post
      const otherUser = await createTestUser('otheruser');
      const updateResponse = await apiClient.put(`/api/posts/${post.data.id}`, {
        title: 'Hacked Title',
        content: 'Hacked content'
      }, {
        headers: { Authorization: `Bearer ${otherUser.token}` }
      });

      expect(updateResponse.status).to.be.oneOf([403, 404]);
    });
  });

  describe('Information Disclosure Tests', () => {
    it('should not expose sensitive information in error messages', async () => {
      const sensitiveEndpoints = [
        '/api/database/config',
        '/api/server/info',
        '/api/admin/debug',
        '/api/.env',
        '/api/config.json',
      ];

      for (const endpoint of sensitiveEndpoints) {
        const response = await apiClient.get(endpoint);

        if (response.data && typeof response.data === 'object') {
          const responseText = JSON.stringify(response.data);

          // Should not contain sensitive information
          expect(responseText).not.to.match(/password|secret|key|token|database|mysql|postgres/i);
          expect(responseText).not.to.contain('process.env');
          expect(responseText).not.to.contain('stack trace');
        }
      }
    });

    it('should not expose stack traces in production', async () => {
      // Trigger various error conditions
      const errorEndpoints = [
        '/api/nonexistent',
        '/api/posts/99999999',
        '/api/users/invalid-id',
      ];

      for (const endpoint of errorEndpoints) {
        const response = await apiClient.get(endpoint);

        if (response.data && response.data.error) {
          expect(response.data.error).not.to.contain('at ');
          expect(response.data.error).not.to.contain('.js:');
          expect(response.data.error).not.to.contain('node_modules');
        }
      }
    });

    it('should implement proper CORS configuration', async () => {
      const response = await apiClient.options('/api/posts', {
        headers: {
          'Origin': 'https://evil.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      // Should not allow arbitrary origins
      expect(response.headers['access-control-allow-origin']).not.to.equal('*');

      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.to.equal('https://evil.com');
      }
    });
  });

  describe('Business Logic Security Tests', () => {
    it('should prevent race conditions in concurrent requests', async () => {
      // Test concurrent balance updates or similar operations
      const initialBalance = 1000;
      const withdrawAmount = 100;
      const concurrentRequests = 10;

      const requests = Array(concurrentRequests).fill().map(() =>
        apiClient.post('/api/account/withdraw', {
          amount: withdrawAmount
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      );

      const responses = await Promise.all(requests);
      const successfulRequests = responses.filter(r => r.status === 200);

      // Should not allow overdrawing
      expect(successfulRequests.length).to.be.lessThanOrEqual(Math.floor(initialBalance / withdrawAmount));
    });

    it('should validate business rules consistently', async () => {
      const invalidBusinessLogicTests = [
        // Negative quantities
        { endpoint: '/api/orders', data: { quantity: -5, productId: 1 } },
        // Future dates where not allowed
        { endpoint: '/api/bookings', data: { date: '2025-01-01', service: 'past-only' } },
        // Invalid combinations
        { endpoint: '/api/products', data: { price: -100, category: 'premium' } },
      ];

      for (const test of invalidBusinessLogicTests) {
        const response = await apiClient.post(test.endpoint, test.data, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        expect(response.status).to.be.oneOf([400, 422]);
      }
    });

    it('should prevent timing attacks', async () => {
      const validEmail = 'valid@example.com';
      const invalidEmail = 'invalid@example.com';
      const password = 'password123';

      // Measure response times
      const validUserStartTime = Date.now();
      await apiClient.post('/api/auth/login', {
        email: validEmail,
        password: 'wrongpassword'
      });
      const validUserTime = Date.now() - validUserStartTime;

      const invalidUserStartTime = Date.now();
      await apiClient.post('/api/auth/login', {
        email: invalidEmail,
        password: 'wrongpassword'
      });
      const invalidUserTime = Date.now() - invalidUserStartTime;

      // Response times should be similar to prevent user enumeration
      const timeDifference = Math.abs(validUserTime - invalidUserTime);
      expect(timeDifference).to.be.lessThan(100); // Less than 100ms difference
    });
  });

  describe('Security Header Tests', () => {
    it('should implement proper security headers', async () => {
      const response = await apiClient.get('/api/health');

      // Check for important security headers
      const securityHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': /max-age=\d+/,
        'referrer-policy': 'strict-origin-when-cross-origin',
      };

      Object.entries(securityHeaders).forEach(([header, expectedValue]) => {
        expect(response.headers).to.have.property(header);

        if (expectedValue instanceof RegExp) {
          expect(response.headers[header]).to.match(expectedValue);
        } else {
          expect(response.headers[header]).to.equal(expectedValue);
        }
      });
    });

    it('should implement Content Security Policy', async () => {
      const response = await apiClient.get('/');

      expect(response.headers).to.have.property('content-security-policy');

      const csp = response.headers['content-security-policy'];
      expect(csp).to.contain("default-src 'self'");
      expect(csp).not.to.contain("'unsafe-eval'");
      expect(csp).not.to.contain("'unsafe-inline'");
    });
  });

  describe('API Version and Deprecation Tests', () => {
    it('should handle API versioning securely', async () => {
      const versions = ['v1', 'v2', 'latest'];

      for (const version of versions) {
        const response = await apiClient.get(`/api/${version}/users`);

        // Should not expose version-specific vulnerabilities
        expect(response.headers).to.have.property('api-version');

        if (response.status === 200) {
          expect(response.data).not.to.have.property('debug');
          expect(response.data).not.to.have.property('internal');
        }
      }
    });

    it('should properly deprecate old API versions', async () => {
      const deprecatedVersions = ['v0', 'beta', 'alpha'];

      for (const version of deprecatedVersions) {
        const response = await apiClient.get(`/api/${version}/users`);

        expect([404, 410, 426]).to.include(response.status);

        if (response.headers['sunset']) {
          expect(new Date(response.headers['sunset'])).to.be.a('date');
        }
      }
    });
  });

  describe('Automated Security Scanning Integration', () => {
    it('should run OWASP ZAP baseline scan', async function() {
      this.timeout(60000); // Extended timeout for security scan

      const zapScanResults = await runOWASPZAPScan(baseURL);

      // Check for high-severity vulnerabilities
      const highSeverityVulns = zapScanResults.filter(v => v.severity === 'High');
      expect(highSeverityVulns).to.have.lengthOf(0);

      // Report medium and low severity issues
      const mediumSeverityVulns = zapScanResults.filter(v => v.severity === 'Medium');
      if (mediumSeverityVulns.length > 0) {
        console.warn('Medium severity vulnerabilities found:', mediumSeverityVulns);
      }
    });

    it('should check for known vulnerabilities with npm audit', async () => {
      const auditResults = await runNPMAudit();

      // Should have no high or critical vulnerabilities
      expect(auditResults.metadata.vulnerabilities.high).to.equal(0);
      expect(auditResults.metadata.vulnerabilities.critical).to.equal(0);
    });

    it('should validate SSL/TLS configuration', async () => {
      if (baseURL.startsWith('https://')) {
        const sslResults = await checkSSLConfiguration(baseURL);

        expect(sslResults.grade).to.be.oneOf(['A+', 'A', 'A-']);
        expect(sslResults.protocols).to.include('TLS 1.3');
        expect(sslResults.vulnerabilities).to.be.empty;
      }
    });
  });

  // Helper functions
  async function createTestUser(username) {
    const user = {
      username,
      email: `${username}@test.com`,
      password: 'TestPassword123!'
    };

    const registerResponse = await apiClient.post('/api/auth/register', user);
    const loginResponse = await apiClient.post('/api/auth/login', {
      username: user.username,
      password: user.password
    });

    return {
      ...user,
      id: registerResponse.data.id,
      token: loginResponse.data.token
    };
  }

  async function runOWASPZAPScan(targetURL) {
    // Mock OWASP ZAP integration
    // In real implementation, this would integrate with ZAP API
    return [
      {
        name: 'Cross Site Scripting',
        severity: 'Medium',
        confidence: 'High',
        url: `${targetURL}/api/posts`
      }
    ];
  }

  async function runNPMAudit() {
    // Mock npm audit results
    return {
      metadata: {
        vulnerabilities: {
          critical: 0,
          high: 0,
          moderate: 2,
          low: 5,
          info: 1
        }
      }
    };
  }

  async function checkSSLConfiguration(url) {
    // Mock SSL Labs API integration
    return {
      grade: 'A',
      protocols: ['TLS 1.2', 'TLS 1.3'],
      vulnerabilities: [],
      cipherSuites: ['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256']
    };
  }
});

// Security Testing Utilities
class APISecurityScanner {
  constructor(baseURL, options = {}) {
    this.baseURL = baseURL;
    this.options = {
      timeout: 10000,
      maxRetries: 3,
      userAgent: 'API-Security-Scanner/1.0',
      ...options
    };
    this.results = [];
  }

  async scan() {
    const tests = [
      this.testAuthentication(),
      this.testAuthorization(),
      this.testInputValidation(),
      this.testInformationDisclosure(),
      this.testSecurityHeaders(),
      this.testRateLimiting(),
      this.testSSLConfiguration(),
    ];

    const results = await Promise.allSettled(tests);

    return {
      summary: this.generateSummary(results),
      details: results,
      recommendations: this.generateRecommendations(results)
    };
  }

  async testAuthentication() {
    // Test various authentication vulnerabilities
    const tests = [
      this.testWeakPasswordPolicy(),
      this.testBruteForceProtection(),
      this.testSessionManagement(),
      this.testTokenSecurity(),
    ];

    return Promise.allSettled(tests);
  }

  async testAuthorization() {
    // Test authorization bypasses
    const tests = [
      this.testVerticalPrivilegeEscalation(),
      this.testHorizontalPrivilegeEscalation(),
      this.testDirectObjectReferences(),
      this.testMissingFunctionLevelAccess(),
    ];

    return Promise.allSettled(tests);
  }

  async testInputValidation() {
    // Test for injection vulnerabilities
    const tests = [
      this.testSQLInjection(),
      this.testXSSPrevention(),
      this.testCommandInjection(),
      this.testXXEPrevention(),
      this.testPathTraversal(),
    ];

    return Promise.allSettled(tests);
  }

  generateSummary(results) {
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      criticalIssues: [],
      highIssues: [],
      mediumIssues: [],
      lowIssues: []
    };

    results.forEach(result => {
      if (result.status === 'rejected' && result.reason) {
        const severity = this.assessSeverity(result.reason);
        summary[`${severity}Issues`].push(result.reason);
      }
    });

    return summary;
  }

  assessSeverity(issue) {
    const criticalPatterns = ['sql injection', 'command injection', 'authentication bypass'];
    const highPatterns = ['xss', 'privilege escalation', 'information disclosure'];
    const mediumPatterns = ['missing headers', 'weak validation', 'rate limiting'];

    const issueText = issue.message ? issue.message.toLowerCase() : String(issue).toLowerCase();

    if (criticalPatterns.some(pattern => issueText.includes(pattern))) {
      return 'critical';
    } else if (highPatterns.some(pattern => issueText.includes(pattern))) {
      return 'high';
    } else if (mediumPatterns.some(pattern => issueText.includes(pattern))) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  generateRecommendations(results) {
    const recommendations = [];

    // Analyze results and provide security recommendations
    results.forEach(result => {
      if (result.status === 'rejected') {
        const issue = result.reason;
        const severity = this.assessSeverity(issue);

        switch (severity) {
          case 'critical':
            recommendations.push({
              priority: 'IMMEDIATE',
              issue: issue.message || issue,
              solution: 'Implement input validation and parameterized queries'
            });
            break;
          case 'high':
            recommendations.push({
              priority: 'HIGH',
              issue: issue.message || issue,
              solution: 'Implement proper access controls and output encoding'
            });
            break;
          case 'medium':
            recommendations.push({
              priority: 'MEDIUM',
              issue: issue.message || issue,
              solution: 'Add security headers and improve validation'
            });
            break;
          default:
            recommendations.push({
              priority: 'LOW',
              issue: issue.message || issue,
              solution: 'Review and improve security practices'
            });
        }
      }
    });

    return recommendations;
  }
}

module.exports = {
  APISecurityScanner
};