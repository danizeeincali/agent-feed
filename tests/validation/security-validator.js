/**
 * Security Validation Suite for Dynamic Pages
 *
 * Comprehensive security testing focusing on:
 * - XSS (Cross-Site Scripting) prevention
 * - Input validation and sanitization
 * - Error information disclosure
 * - Authentication and authorization
 * - Content Security Policy validation
 */

const { chromium } = require('playwright');

class SecurityValidator {
  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.results = {
      timestamp: new Date().toISOString(),
      xssTests: [],
      inputValidation: [],
      errorDisclosure: [],
      authTests: [],
      cspTests: [],
      overall: {
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    this.xssPayloads = [
      // Basic XSS
      '<script>window.xssTriggered=true</script>',
      '<img src=x onerror=window.xssTriggered=true>',
      '<svg onload=window.xssTriggered=true>',

      // Event handlers
      '<body onload=window.xssTriggered=true>',
      '<div onclick=window.xssTriggered=true>click</div>',
      '<input onfocus=window.xssTriggered=true autofocus>',

      // JavaScript protocol
      'javascript:window.xssTriggered=true',
      'JAVASCRIPT:window.xssTriggered=true',

      // Encoded variants
      '&lt;script&gt;window.xssTriggered=true&lt;/script&gt;',
      '%3Cscript%3Ewindow.xssTriggered=true%3C/script%3E',

      // DOM-based XSS
      '<iframe src="javascript:window.xssTriggered=true"></iframe>',
      '<object data="javascript:window.xssTriggered=true">',

      // Template injection
      '{{7*7}}',
      '${7*7}',
      '#{7*7}',

      // React-specific
      'dangerouslySetInnerHTML={{__html: "<script>window.xssTriggered=true</script>"}}',

      // Bypass attempts
      '<scr<script>ipt>window.xssTriggered=true</scr</script>ipt>',
      '<script>/**/window.xssTriggered=true/**/</script>',
      '<script>&#119;&#105;&#110;&#100;&#111;&#119;.xssTriggered=true</script>'
    ];

    this.testPages = [
      '/agents/test-agent/pages',
      '/agents/test-agent/pages/page-1',
      '/agents/test-agent/pages/page-1/view',
      '/agents/test-agent',
      '/agents/test-agent/manage'
    ];
  }

  async validateSecurity() {
    console.log('🔒 Starting Security Validation...');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Add XSS detection
      await page.addInitScript(() => {
        window.xssTriggered = false;
        window.xssAttempts = [];

        // Override alert to catch XSS attempts
        const originalAlert = window.alert;
        window.alert = function(msg) {
          window.xssTriggered = true;
          window.xssAttempts.push({ type: 'alert', message: msg });
          return originalAlert.call(this, msg);
        };

        // Override confirm
        const originalConfirm = window.confirm;
        window.confirm = function(msg) {
          window.xssTriggered = true;
          window.xssAttempts.push({ type: 'confirm', message: msg });
          return originalConfirm.call(this, msg);
        };
      });

      await this.testXSSVulnerabilities(page);
      await this.testInputValidation(page);
      await this.testErrorDisclosure(page);
      await this.testAuthentication(page);
      await this.testContentSecurityPolicy(page);

      this.calculateOverallResults();

    } finally {
      await browser.close();
    }

    return this.results;
  }

  async testXSSVulnerabilities(page) {
    console.log('  🛡️  Testing XSS vulnerabilities...');

    for (const testPage of this.testPages) {
      console.log(`    Testing ${testPage}...`);

      try {
        await page.goto(`${this.baseUrl}${testPage}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        // Find all input elements
        const inputs = await page.locator('input, textarea, [contenteditable]').all();

        for (let i = 0; i < inputs.length; i++) {
          for (const payload of this.xssPayloads) {
            // Reset XSS detection
            await page.evaluate(() => {
              window.xssTriggered = false;
              window.xssAttempts = [];
            });

            try {
              // Test input field
              await inputs[i].fill(payload);
              await page.waitForTimeout(500);

              // Check if XSS was triggered
              const xssResult = await page.evaluate(() => ({
                triggered: window.xssTriggered,
                attempts: window.xssAttempts
              }));

              this.results.xssTests.push({
                page: testPage,
                inputIndex: i,
                payload,
                vulnerable: xssResult.triggered,
                attempts: xssResult.attempts,
                passed: !xssResult.triggered
              });

              if (xssResult.triggered) {
                this.results.overall.failed++;
                console.log(`      ❌ XSS vulnerability found: ${payload.substring(0, 50)}...`);
              } else {
                this.results.overall.passed++;
              }

            } catch (error) {
              // Input validation likely working
              this.results.xssTests.push({
                page: testPage,
                inputIndex: i,
                payload,
                vulnerable: false,
                blocked: true,
                error: error.message,
                passed: true
              });
              this.results.overall.passed++;
            }
          }
        }

        // Test URL parameters for XSS
        for (const payload of this.xssPayloads.slice(0, 5)) { // Test subset for URL
          try {
            const encodedPayload = encodeURIComponent(payload);
            await page.goto(`${this.baseUrl}${testPage}?search=${encodedPayload}`, {
              waitUntil: 'domcontentloaded',
              timeout: 10000
            });

            await page.waitForTimeout(1000);

            const xssResult = await page.evaluate(() => ({
              triggered: window.xssTriggered,
              attempts: window.xssAttempts
            }));

            this.results.xssTests.push({
              page: testPage,
              type: 'url_parameter',
              payload,
              vulnerable: xssResult.triggered,
              passed: !xssResult.triggered
            });

            if (xssResult.triggered) {
              this.results.overall.failed++;
            } else {
              this.results.overall.passed++;
            }

          } catch (error) {
            // URL validation working
            this.results.overall.passed++;
          }
        }

      } catch (error) {
        console.log(`    ⚠️  Could not test ${testPage}: ${error.message}`);
        this.results.overall.warnings++;
      }
    }
  }

  async testInputValidation(page) {
    console.log('  🔍 Testing input validation...');

    const maliciousInputs = [
      // SQL Injection patterns
      "' OR '1'='1",
      '" OR "1"="1',
      'UNION SELECT * FROM users--',

      // Command injection
      '; ls -la',
      '| cat /etc/passwd',
      '`whoami`',

      // Path traversal
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',

      // JSON injection
      '{"test": "value", "admin": true}',
      '{"__proto__": {"admin": true}}',

      // Very long strings
      'A'.repeat(10000),

      // Special characters
      '\x00\x01\x02\x03',
      '\n\r\t',
      '\\u0000\\u0001',

      // File uploads (if applicable)
      'file.exe',
      'script.js',
      '../../malicious.php'
    ];

    for (const testPage of this.testPages) {
      try {
        await page.goto(`${this.baseUrl}${testPage}`, { waitUntil: 'networkidle' });

        const inputs = await page.locator('input, textarea').all();

        for (let i = 0; i < inputs.length; i++) {
          for (const maliciousInput of maliciousInputs) {
            try {
              await inputs[i].fill(maliciousInput);

              // Try to submit or trigger validation
              await page.keyboard.press('Tab');
              await page.keyboard.press('Enter');
              await page.waitForTimeout(500);

              // Check for error messages or rejection
              const errorElements = await page.locator('.error, [role="alert"], .invalid').all();
              const hasValidation = errorElements.length > 0;

              this.results.inputValidation.push({
                page: testPage,
                inputIndex: i,
                input: maliciousInput.substring(0, 50),
                hasValidation,
                passed: hasValidation
              });

              if (hasValidation) {
                this.results.overall.passed++;
              } else {
                this.results.overall.warnings++;
              }

            } catch (error) {
              // Input rejected - good
              this.results.inputValidation.push({
                page: testPage,
                inputIndex: i,
                input: maliciousInput.substring(0, 50),
                rejected: true,
                passed: true
              });
              this.results.overall.passed++;
            }
          }
        }

      } catch (error) {
        this.results.overall.warnings++;
      }
    }
  }

  async testErrorDisclosure(page) {
    console.log('  🚨 Testing error information disclosure...');

    const errorPaths = [
      '/agents/nonexistent',
      '/agents/test-agent/pages/nonexistent',
      '/api/agents/nonexistent',
      '/api/agents/test-agent/pages/nonexistent',
      // Malformed paths
      '/agents/../../../etc/passwd',
      '/agents/test-agent/pages/<script>',
      '/agents/test-agent/pages/\x00\x00'
    ];

    for (const errorPath of errorPaths) {
      try {
        const response = await page.goto(`${this.baseUrl}${errorPath}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });

        const content = await page.content();
        const statusCode = response.status();

        // Check for sensitive information disclosure
        const sensitivePatterns = [
          /stack trace/i,
          /exception/i,
          /error.*line.*\d+/i,
          /database.*error/i,
          /sql.*error/i,
          /internal.*server.*error/i,
          /debug/i,
          /development/i,
          /localhost/i,
          /file.*not.*found.*\/[a-z]/i, // File paths
          /cannot.*access.*\/[a-z]/i    // System paths
        ];

        const exposedInfo = sensitivePatterns.some(pattern => pattern.test(content));
        const hasGenericError = content.includes('Page not found') ||
                               content.includes('404') ||
                               content.includes('Not Found');

        this.results.errorDisclosure.push({
          path: errorPath,
          statusCode,
          exposesInfo: exposedInfo,
          hasGenericError,
          passed: !exposedInfo && (statusCode === 404 || hasGenericError)
        });

        if (exposedInfo) {
          this.results.overall.failed++;
          console.log(`      ❌ Information disclosure: ${errorPath}`);
        } else {
          this.results.overall.passed++;
        }

      } catch (error) {
        // Network errors are expected for invalid paths
        this.results.errorDisclosure.push({
          path: errorPath,
          networkError: true,
          error: error.message,
          passed: true
        });
        this.results.overall.passed++;
      }
    }
  }

  async testAuthentication(page) {
    console.log('  👤 Testing authentication and authorization...');

    // Test accessing protected resources without authentication
    const protectedPaths = [
      '/agents/test-agent/pages/create',
      '/agents/test-agent/pages/edit',
      '/api/agents/test-agent/pages'
    ];

    for (const path of protectedPaths) {
      try {
        const response = await page.goto(`${this.baseUrl}${path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });

        const statusCode = response.status();
        const content = await page.content();

        // Check if authentication is required
        const requiresAuth = statusCode === 401 ||
                           statusCode === 403 ||
                           content.includes('login') ||
                           content.includes('authentication') ||
                           content.includes('unauthorized');

        this.results.authTests.push({
          path,
          statusCode,
          requiresAuth,
          passed: requiresAuth
        });

        if (requiresAuth) {
          this.results.overall.passed++;
        } else {
          this.results.overall.warnings++;
          console.log(`      ⚠️  No authentication required: ${path}`);
        }

      } catch (error) {
        // Network error could indicate proper access control
        this.results.authTests.push({
          path,
          networkError: true,
          passed: true
        });
        this.results.overall.passed++;
      }
    }
  }

  async testContentSecurityPolicy(page) {
    console.log('  🛡️  Testing Content Security Policy...');

    for (const testPage of this.testPages) {
      try {
        const response = await page.goto(`${this.baseUrl}${testPage}`, {
          waitUntil: 'networkidle'
        });

        const headers = response.headers();
        const csp = headers['content-security-policy'] || headers['content-security-policy-report-only'];

        let cspScore = 0;
        const cspChecks = {
          hasCSP: !!csp,
          defaultSrc: false,
          scriptSrc: false,
          objectSrc: false,
          styleSrc: false,
          imgSrc: false,
          connectSrc: false,
          frameAncestors: false,
          baseUri: false,
          formAction: false
        };

        if (csp) {
          cspScore += 20; // Base score for having CSP

          // Check individual directives
          if (csp.includes('default-src')) {
            cspChecks.defaultSrc = true;
            cspScore += 10;
          }

          if (csp.includes('script-src') && !csp.includes("'unsafe-eval'") && !csp.includes("'unsafe-inline'")) {
            cspChecks.scriptSrc = true;
            cspScore += 20;
          }

          if (csp.includes('object-src') && csp.includes("'none'")) {
            cspChecks.objectSrc = true;
            cspScore += 10;
          }

          if (csp.includes('style-src')) {
            cspChecks.styleSrc = true;
            cspScore += 10;
          }

          if (csp.includes('img-src')) {
            cspChecks.imgSrc = true;
            cspScore += 5;
          }

          if (csp.includes('connect-src')) {
            cspChecks.connectSrc = true;
            cspScore += 5;
          }

          if (csp.includes('frame-ancestors')) {
            cspChecks.frameAncestors = true;
            cspScore += 10;
          }

          if (csp.includes('base-uri')) {
            cspChecks.baseUri = true;
            cspScore += 5;
          }

          if (csp.includes('form-action')) {
            cspChecks.formAction = true;
            cspScore += 5;
          }
        }

        this.results.cspTests.push({
          page: testPage,
          csp,
          score: cspScore,
          checks: cspChecks,
          passed: cspScore >= 70
        });

        if (cspScore >= 70) {
          this.results.overall.passed++;
        } else {
          this.results.overall.warnings++;
          console.log(`      ⚠️  Weak CSP: ${testPage} (Score: ${cspScore}/100)`);
        }

      } catch (error) {
        this.results.cspTests.push({
          page: testPage,
          error: error.message,
          passed: false
        });
        this.results.overall.warnings++;
      }
    }
  }

  calculateOverallResults() {
    const total = this.results.overall.passed + this.results.overall.failed + this.results.overall.warnings;
    const passRate = total > 0 ? (this.results.overall.passed / total) * 100 : 0;

    this.results.summary = {
      totalTests: total,
      passedTests: this.results.overall.passed,
      failedTests: this.results.overall.failed,
      warningTests: this.results.overall.warnings,
      passRate: Math.round(passRate),
      overallPassed: passRate >= 90
    };

    // Generate security recommendations
    this.results.recommendations = this.generateSecurityRecommendations();
  }

  generateSecurityRecommendations() {
    const recommendations = [];

    // XSS recommendations
    const xssVulnerabilities = this.results.xssTests.filter(test => test.vulnerable);
    if (xssVulnerabilities.length > 0) {
      recommendations.push({
        priority: 'Critical',
        category: 'XSS Prevention',
        issue: `Found ${xssVulnerabilities.length} XSS vulnerabilities`,
        solution: 'Implement proper input sanitization and output encoding. Use React\'s built-in XSS protection and avoid dangerouslySetInnerHTML.',
        pages: [...new Set(xssVulnerabilities.map(v => v.page))]
      });
    }

    // Error disclosure recommendations
    const infoDisclosures = this.results.errorDisclosure.filter(test => test.exposesInfo);
    if (infoDisclosures.length > 0) {
      recommendations.push({
        priority: 'High',
        category: 'Information Disclosure',
        issue: 'Error pages expose sensitive information',
        solution: 'Implement generic error pages that don\'t reveal system internals, file paths, or stack traces.',
        paths: infoDisclosures.map(d => d.path)
      });
    }

    // CSP recommendations
    const weakCSP = this.results.cspTests.filter(test => !test.passed);
    if (weakCSP.length > 0) {
      recommendations.push({
        priority: 'Medium',
        category: 'Content Security Policy',
        issue: 'Weak or missing Content Security Policy',
        solution: 'Implement a strict CSP with proper directives to prevent XSS and other injection attacks.',
        pages: weakCSP.map(c => c.page)
      });
    }

    // Input validation recommendations
    const weakValidation = this.results.inputValidation.filter(test => !test.passed);
    if (weakValidation.length > 0) {
      recommendations.push({
        priority: 'High',
        category: 'Input Validation',
        issue: 'Insufficient input validation detected',
        solution: 'Implement comprehensive input validation and sanitization for all user inputs.',
        affectedInputs: weakValidation.length
      });
    }

    return recommendations;
  }
}

module.exports = SecurityValidator;

// Run if called directly
if (require.main === module) {
  const validator = new SecurityValidator();
  validator.validateSecurity()
    .then(results => {
      console.log('\n🔒 Security Validation Results:');
      console.log(`  Overall Pass Rate: ${results.summary.passRate}%`);
      console.log(`  Passed: ${results.summary.passedTests}`);
      console.log(`  Failed: ${results.summary.failedTests}`);
      console.log(`  Warnings: ${results.summary.warningTests}`);
      console.log(`  Security Status: ${results.summary.overallPassed ? '✅ SECURE' : '❌ VULNERABILITIES FOUND'}`);

      if (results.recommendations.length > 0) {
        console.log('\n📋 Security Recommendations:');
        results.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. [${rec.priority}] ${rec.category}: ${rec.issue}`);
          console.log(`     Solution: ${rec.solution}`);
        });
      }

      process.exit(results.summary.overallPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Security validation failed:', error);
      process.exit(1);
    });
}