const { expect } = require('chai');
const puppeteer = require('puppeteer');
const crypto = require('crypto');

describe('Content Security Policy (CSP) Validation Tests', () => {
  let browser;
  let page;
  let violations = [];

  before(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    violations = [];

    // Listen for CSP violations
    page.on('securitypolicyviolation', (violation) => {
      violations.push({
        blockedURI: violation.blockedURI,
        disposition: violation.disposition,
        documentURI: violation.documentURI,
        effectiveDirective: violation.effectiveDirective,
        originalPolicy: violation.originalPolicy,
        referrer: violation.referrer,
        violatedDirective: violation.violatedDirective,
        lineNumber: violation.lineNumber,
        columnNumber: violation.columnNumber,
        sourceFile: violation.sourceFile,
        timestamp: new Date().toISOString()
      });
    });

    // Listen for console errors that might indicate CSP issues
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        violations.push({
          type: 'console-error',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('Basic CSP Header Validation', () => {
    it('should have CSP header present on all pages', async () => {
      const testPages = [
        '/',
        '/login',
        '/dashboard',
        '/api/health',
        '/static/index.html'
      ];

      for (const pagePath of testPages) {
        const response = await page.goto(`http://localhost:3000${pagePath}`, {
          waitUntil: 'networkidle0'
        });

        const cspHeader = response.headers()['content-security-policy'] ||
                         response.headers()['content-security-policy-report-only'];

        expect(cspHeader, `CSP header missing on ${pagePath}`).to.exist;
        expect(cspHeader).to.be.a('string');
        expect(cspHeader.length).to.be.greaterThan(0);
      }
    });

    it('should have restrictive default-src directive', async () => {
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];

      expect(csp).to.include("default-src 'self'");
      expect(csp).not.to.include("default-src *");
      expect(csp).not.to.include("default-src 'unsafe-inline'");
      expect(csp).not.to.include("default-src 'unsafe-eval'");
    });

    it('should prohibit unsafe inline scripts', async () => {
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];

      // script-src should not allow unsafe-inline
      if (csp.includes('script-src')) {
        const scriptSrcMatch = csp.match(/script-src[^;]*/);
        if (scriptSrcMatch) {
          expect(scriptSrcMatch[0]).not.to.include("'unsafe-inline'");
        }
      }
    });

    it('should prohibit unsafe eval', async () => {
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];

      expect(csp).not.to.include("'unsafe-eval'");
    });
  });

  describe('Script Source Policy Tests', () => {
    it('should block inline script execution', async () => {
      await page.goto('http://localhost:3000');

      // Try to inject inline script
      try {
        await page.evaluate(() => {
          const script = document.createElement('script');
          script.textContent = 'window.testCSPViolation = true;';
          document.head.appendChild(script);
        });

        // Wait a bit for potential violation
        await page.waitForTimeout(100);

        // Check if script was blocked
        const testVariableExists = await page.evaluate(() => {
          return typeof window.testCSPViolation !== 'undefined';
        });

        expect(testVariableExists).to.be.false;
      } catch (error) {
        // CSP should prevent script execution
        expect(error.message).to.include('Content Security Policy');
      }
    });

    it('should block eval() and similar functions', async () => {
      await page.goto('http://localhost:3000');

      const dangerousFunctions = [
        'eval("window.testEval = true")',
        'new Function("window.testFunction = true")()',
        'setTimeout("window.testTimeout = true", 0)',
        'setInterval("window.testInterval = true", 0)'
      ];

      for (const dangerousCode of dangerousFunctions) {
        try {
          await page.evaluate(dangerousCode);

          // Wait for potential execution
          await page.waitForTimeout(100);

          // Check if code was executed
          const wasExecuted = await page.evaluate(() => {
            return window.testEval || window.testFunction ||
                   window.testTimeout || window.testInterval;
          });

          expect(wasExecuted).to.be.false;
        } catch (error) {
          // Expected - CSP should block these
          expect(error.message).to.match(/Content Security Policy|EvalError|CSP/);
        }
      }
    });

    it('should allow whitelisted script sources', async () => {
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];

      // If there are allowed script sources, test them
      const scriptSrcMatch = csp.match(/script-src[^;]*/);
      if (scriptSrcMatch) {
        const allowedSources = scriptSrcMatch[0].split(' ').slice(1);

        for (const source of allowedSources) {
          if (source.startsWith('https://') || source.startsWith('http://')) {
            // Test that whitelisted external scripts can load
            const scriptLoaded = await page.evaluate((src) => {
              return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = src + '/test.js';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.head.appendChild(script);

                // Timeout after 5 seconds
                setTimeout(() => resolve(false), 5000);
              });
            }, source);

            // Note: This test may fail if the external source doesn't exist
            // In real implementation, you'd test with actual whitelisted sources
          }
        }
      }
    });
  });

  describe('Style Source Policy Tests', () => {
    it('should control inline styles appropriately', async () => {
      await page.goto('http://localhost:3000');

      try {
        await page.evaluate(() => {
          const div = document.createElement('div');
          div.style.cssText = 'color: red; background: url(javascript:alert(1))';
          document.body.appendChild(div);
        });

        // Check for CSP violations
        await page.waitForTimeout(100);

        const styleViolations = violations.filter(v =>
          v.effectiveDirective === 'style-src' ||
          v.violatedDirective?.includes('style-src')
        );

        // Should have violations for unsafe inline styles
        if (styleViolations.length === 0) {
          // If no violations, check that dangerous CSS was blocked
          const dangerousStyleApplied = await page.evaluate(() => {
            const divs = document.querySelectorAll('div');
            return Array.from(divs).some(div =>
              div.style.background && div.style.background.includes('javascript:')
            );
          });

          expect(dangerousStyleApplied).to.be.false;
        }
      } catch (error) {
        // Expected if CSP blocks inline styles
        expect(error.message).to.include('Content Security Policy');
      }
    });

    it('should prevent CSS injection attacks', async () => {
      await page.goto('http://localhost:3000');

      const maliciousCSS = [
        'background: url(javascript:alert(1))',
        'background-image: url("javascript:alert(1)")',
        'expression(alert(1))',
        '@import "javascript:alert(1)"'
      ];

      for (const css of maliciousCSS) {
        try {
          await page.evaluate((cssCode) => {
            const style = document.createElement('style');
            style.textContent = `.malicious { ${cssCode} }`;
            document.head.appendChild(style);
          }, css);

          await page.waitForTimeout(100);

          // Check if dangerous CSS was applied
          const maliciousElementExists = await page.evaluate(() => {
            const testEl = document.createElement('div');
            testEl.className = 'malicious';
            document.body.appendChild(testEl);

            const computedStyle = window.getComputedStyle(testEl);
            const backgroundImage = computedStyle.backgroundImage;

            document.body.removeChild(testEl);

            return backgroundImage && backgroundImage.includes('javascript:');
          });

          expect(maliciousElementExists).to.be.false;

        } catch (error) {
          // Expected if CSP blocks the malicious CSS
          expect(error.message).to.include('Content Security Policy');
        }
      }
    });
  });

  describe('Image Source Policy Tests', () => {
    it('should control image sources', async () => {
      await page.goto('http://localhost:3000');

      const testImages = [
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        'javascript:alert(1)',
        'vbscript:alert(1)',
        'data:text/html,<script>alert(1)</script>'
      ];

      for (const imageSrc of testImages) {
        try {
          await page.evaluate((src) => {
            const img = document.createElement('img');
            img.src = src;
            img.onerror = () => console.log('Image blocked by CSP');
            document.body.appendChild(img);
          }, imageSrc);

          await page.waitForTimeout(100);

          // Check for violations
          const imageViolations = violations.filter(v =>
            v.effectiveDirective === 'img-src' ||
            v.blockedURI === imageSrc
          );

          // Dangerous image sources should be blocked
          if (imageSrc.includes('javascript:') || imageSrc.includes('vbscript:')) {
            expect(imageViolations.length).to.be.greaterThan(0);
          }

        } catch (error) {
          // Expected for dangerous image sources
          if (imageSrc.includes('javascript:') || imageSrc.includes('vbscript:')) {
            expect(error.message).to.include('Content Security Policy');
          }
        }
      }
    });
  });

  describe('Object and Embed Policy Tests', () => {
    it('should restrict object and embed sources', async () => {
      await page.goto('http://localhost:3000');

      const dangerousObjects = [
        { tag: 'object', src: 'data:text/html,<script>alert(1)</script>' },
        { tag: 'embed', src: 'javascript:alert(1)' },
        { tag: 'object', data: 'data:application/x-shockwave-flash,<script>alert(1)</script>' }
      ];

      for (const obj of dangerousObjects) {
        try {
          await page.evaluate((objData) => {
            const element = document.createElement(objData.tag);
            if (objData.src) element.src = objData.src;
            if (objData.data) element.data = objData.data;
            document.body.appendChild(element);
          }, obj);

          await page.waitForTimeout(100);

          // Check for violations
          const objectViolations = violations.filter(v =>
            v.effectiveDirective === 'object-src' ||
            v.blockedURI === obj.src || v.blockedURI === obj.data
          );

          // Should block dangerous object sources
          expect(objectViolations.length).to.be.greaterThan(0);

        } catch (error) {
          // Expected for dangerous object sources
          expect(error.message).to.include('Content Security Policy');
        }
      }
    });
  });

  describe('Frame Policy Tests', () => {
    it('should control frame sources', async () => {
      await page.goto('http://localhost:3000');

      const frameSources = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'https://evil.com/',
        'about:blank'
      ];

      for (const frameSrc of frameSources) {
        try {
          await page.evaluate((src) => {
            const iframe = document.createElement('iframe');
            iframe.src = src;
            document.body.appendChild(iframe);
          }, frameSrc);

          await page.waitForTimeout(200);

          // Check for violations
          const frameViolations = violations.filter(v =>
            v.effectiveDirective === 'frame-src' ||
            v.effectiveDirective === 'child-src' ||
            v.blockedURI === frameSrc
          );

          if (frameSrc.includes('javascript:') || frameSrc.includes('evil.com')) {
            expect(frameViolations.length).to.be.greaterThan(0);
          }

        } catch (error) {
          // Expected for dangerous frame sources
          if (frameSrc.includes('javascript:') || frameSrc.includes('evil.com')) {
            expect(error.message).to.include('Content Security Policy');
          }
        }
      }
    });

    it('should prevent clickjacking with frame-ancestors', async () => {
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];

      // Should have frame-ancestors directive to prevent clickjacking
      expect(csp).to.match(/frame-ancestors\s+('none'|'self')/);
      expect(csp).not.to.include("frame-ancestors *");
    });
  });

  describe('Connect Source Policy Tests', () => {
    it('should control AJAX and WebSocket connections', async () => {
      await page.goto('http://localhost:3000');

      const connectionTests = [
        {
          type: 'fetch',
          url: 'https://evil.com/steal-data',
          method: 'GET'
        },
        {
          type: 'xhr',
          url: 'javascript:alert(1)',
          method: 'POST'
        },
        {
          type: 'websocket',
          url: 'ws://evil.com/socket'
        }
      ];

      for (const test of connectionTests) {
        try {
          if (test.type === 'fetch') {
            await page.evaluate(async (url, method) => {
              try {
                await fetch(url, { method });
              } catch (e) {
                console.log('Fetch blocked:', e.message);
              }
            }, test.url, test.method);
          } else if (test.type === 'xhr') {
            await page.evaluate((url, method) => {
              try {
                const xhr = new XMLHttpRequest();
                xhr.open(method, url);
                xhr.send();
              } catch (e) {
                console.log('XHR blocked:', e.message);
              }
            }, test.url, test.method);
          } else if (test.type === 'websocket') {
            await page.evaluate((url) => {
              try {
                const ws = new WebSocket(url);
              } catch (e) {
                console.log('WebSocket blocked:', e.message);
              }
            }, test.url);
          }

          await page.waitForTimeout(100);

          // Check for violations
          const connectViolations = violations.filter(v =>
            v.effectiveDirective === 'connect-src' ||
            v.blockedURI === test.url
          );

          if (test.url.includes('evil.com') || test.url.includes('javascript:')) {
            expect(connectViolations.length).to.be.greaterThan(0);
          }

        } catch (error) {
          // Expected for blocked connections
          if (test.url.includes('evil.com') || test.url.includes('javascript:')) {
            expect(error.message).to.include('Content Security Policy');
          }
        }
      }
    });
  });

  describe('Media Source Policy Tests', () => {
    it('should control audio and video sources', async () => {
      await page.goto('http://localhost:3000');

      const mediaSources = [
        { tag: 'audio', src: 'javascript:alert(1)' },
        { tag: 'video', src: 'data:text/html,<script>alert(1)</script>' },
        { tag: 'audio', src: 'https://evil.com/malicious.mp3' },
        { tag: 'video', src: 'https://evil.com/malicious.mp4' }
      ];

      for (const media of mediaSources) {
        try {
          await page.evaluate((mediaData) => {
            const element = document.createElement(mediaData.tag);
            element.src = mediaData.src;
            element.controls = true;
            document.body.appendChild(element);
          }, media);

          await page.waitForTimeout(100);

          // Check for violations
          const mediaViolations = violations.filter(v =>
            v.effectiveDirective === 'media-src' ||
            v.blockedURI === media.src
          );

          if (media.src.includes('javascript:') || media.src.includes('evil.com')) {
            expect(mediaViolations.length).to.be.greaterThan(0);
          }

        } catch (error) {
          // Expected for dangerous media sources
          if (media.src.includes('javascript:') || media.src.includes('evil.com')) {
            expect(error.message).to.include('Content Security Policy');
          }
        }
      }
    });
  });

  describe('Font Source Policy Tests', () => {
    it('should control font sources', async () => {
      await page.goto('http://localhost:3000');

      try {
        await page.evaluate(() => {
          const style = document.createElement('style');
          style.textContent = `
            @font-face {
              font-family: 'MaliciousFont';
              src: url('javascript:alert(1)');
            }
            @font-face {
              font-family: 'EvilFont';
              src: url('https://evil.com/font.woff');
            }
          `;
          document.head.appendChild(style);
        });

        await page.waitForTimeout(100);

        // Check for violations
        const fontViolations = violations.filter(v =>
          v.effectiveDirective === 'font-src' ||
          v.blockedURI?.includes('javascript:') ||
          v.blockedURI?.includes('evil.com')
        );

        expect(fontViolations.length).to.be.greaterThan(0);

      } catch (error) {
        // Expected for dangerous font sources
        expect(error.message).to.include('Content Security Policy');
      }
    });
  });

  describe('Worker Policy Tests', () => {
    it('should control web worker sources', async () => {
      await page.goto('http://localhost:3000');

      const workerSources = [
        'javascript:self.postMessage("hacked");',
        'data:text/javascript,self.postMessage("hacked");',
        'https://evil.com/malicious-worker.js'
      ];

      for (const workerSrc of workerSources) {
        try {
          await page.evaluate((src) => {
            try {
              const worker = new Worker(src);
              worker.onmessage = (e) => console.log('Worker message:', e.data);
            } catch (e) {
              console.log('Worker blocked:', e.message);
            }
          }, workerSrc);

          await page.waitForTimeout(100);

          // Check for violations
          const workerViolations = violations.filter(v =>
            v.effectiveDirective === 'worker-src' ||
            v.effectiveDirective === 'script-src' ||
            v.blockedURI === workerSrc
          );

          expect(workerViolations.length).to.be.greaterThan(0);

        } catch (error) {
          // Expected for dangerous worker sources
          expect(error.message).to.include('Content Security Policy');
        }
      }
    });
  });

  describe('Manifest Policy Tests', () => {
    it('should control web app manifest sources', async () => {
      await page.goto('http://localhost:3000');

      try {
        await page.evaluate(() => {
          const link = document.createElement('link');
          link.rel = 'manifest';
          link.href = 'https://evil.com/malicious-manifest.json';
          document.head.appendChild(link);
        });

        await page.waitForTimeout(100);

        // Check for violations
        const manifestViolations = violations.filter(v =>
          v.effectiveDirective === 'manifest-src' ||
          v.blockedURI?.includes('evil.com')
        );

        // If manifest-src is defined, should block evil.com
        const response = await page.goto('http://localhost:3000');
        const csp = response.headers()['content-security-policy'];

        if (csp.includes('manifest-src')) {
          expect(manifestViolations.length).to.be.greaterThan(0);
        }

      } catch (error) {
        // May be blocked by CSP
      }
    });
  });

  describe('Nonce and Hash-based CSP Tests', () => {
    it('should support nonce-based script execution', async () => {
      // This test requires the server to implement nonce-based CSP
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];

      if (csp.includes('nonce-')) {
        const nonceMatch = csp.match(/nonce-([a-zA-Z0-9+/=]+)/);
        if (nonceMatch) {
          const nonce = nonceMatch[1];

          // Test that script with correct nonce executes
          await page.evaluate((nonceValue) => {
            const script = document.createElement('script');
            script.nonce = nonceValue;
            script.textContent = 'window.nonceTestPassed = true;';
            document.head.appendChild(script);
          }, nonce);

          await page.waitForTimeout(100);

          const nonceTestPassed = await page.evaluate(() => window.nonceTestPassed);
          expect(nonceTestPassed).to.be.true;

          // Test that script without nonce is blocked
          await page.evaluate(() => {
            const script = document.createElement('script');
            script.textContent = 'window.noNonceTestFailed = true;';
            document.head.appendChild(script);
          });

          await page.waitForTimeout(100);

          const noNonceTestFailed = await page.evaluate(() => window.noNonceTestFailed);
          expect(noNonceTestFailed).to.be.undefined;
        }
      }
    });

    it('should support hash-based script execution', async () => {
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];

      if (csp.includes('sha256-') || csp.includes('sha384-') || csp.includes('sha512-')) {
        // Test a known script hash
        const scriptContent = 'console.log("Hash-based script executed");';
        const hash = crypto.createHash('sha256').update(scriptContent).digest('base64');

        // If this hash is whitelisted in CSP, script should execute
        if (csp.includes(`sha256-${hash}`)) {
          await page.evaluate((content) => {
            const script = document.createElement('script');
            script.textContent = content;
            document.head.appendChild(script);
          }, scriptContent);

          await page.waitForTimeout(100);

          // Check console for the expected message
          const consoleMessages = await page.evaluate(() => {
            return window.consoleMessages || [];
          });

          // This would require custom console message tracking
          // In a real implementation, you'd set up console message capture
        }
      }
    });
  });

  describe('CSP Reporting Tests', () => {
    it('should have CSP reporting configured', async () => {
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];
      const cspReportOnly = response.headers()['content-security-policy-report-only'];

      // Should have report-uri or report-to directive
      const hasReporting = (csp && (csp.includes('report-uri') || csp.includes('report-to'))) ||
                          (cspReportOnly && (cspReportOnly.includes('report-uri') || cspReportOnly.includes('report-to')));

      expect(hasReporting).to.be.true;
    });

    it('should generate violation reports', async () => {
      await page.goto('http://localhost:3000');

      // Trigger a CSP violation
      try {
        await page.evaluate(() => {
          eval('window.cspViolationTest = true;');
        });
      } catch (error) {
        // Expected
      }

      await page.waitForTimeout(200);

      // Check if violations were captured
      expect(violations.length).to.be.greaterThan(0);

      const evalViolations = violations.filter(v =>
        v.violatedDirective?.includes('script-src') ||
        v.effectiveDirective === 'script-src'
      );

      expect(evalViolations.length).to.be.greaterThan(0);
    });
  });

  describe('CSP Best Practices Tests', () => {
    it('should not use wildcard sources for critical directives', async () => {
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];

      const criticalDirectives = ['script-src', 'object-src', 'base-uri'];

      for (const directive of criticalDirectives) {
        if (csp.includes(directive)) {
          const directiveMatch = csp.match(new RegExp(`${directive}[^;]*`));
          if (directiveMatch) {
            expect(directiveMatch[0]).not.to.include(' *');
            expect(directiveMatch[0]).not.to.include('*.');
          }
        }
      }
    });

    it('should have strict base-uri directive', async () => {
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];

      // base-uri should be 'self' or 'none'
      if (csp.includes('base-uri')) {
        const baseUriMatch = csp.match(/base-uri[^;]*/);
        if (baseUriMatch) {
          expect(baseUriMatch[0]).to.match(/'self'|'none'/);
          expect(baseUriMatch[0]).not.to.include(' *');
        }
      }
    });

    it('should have object-src set to none', async () => {
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];

      // object-src should be 'none' for security
      if (csp.includes('object-src')) {
        const objectSrcMatch = csp.match(/object-src[^;]*/);
        if (objectSrcMatch) {
          expect(objectSrcMatch[0]).to.include("'none'");
        }
      }
    });

    it('should upgrade insecure requests', async () => {
      const response = await page.goto('http://localhost:3000');
      const csp = response.headers()['content-security-policy'];

      // Should include upgrade-insecure-requests directive
      expect(csp).to.include('upgrade-insecure-requests');
    });
  });
});

// CSP Testing Utilities
class CSPValidator {
  constructor() {
    this.violations = [];
    this.recommendations = [];
  }

  parseCSP(cspHeader) {
    const directives = {};
    const parts = cspHeader.split(';').map(p => p.trim()).filter(p => p);

    for (const part of parts) {
      const [directive, ...values] = part.split(/\s+/);
      directives[directive] = values;
    }

    return directives;
  }

  validateCSP(cspHeader) {
    const directives = this.parseCSP(cspHeader);
    const issues = [];

    // Check for dangerous directives
    if (directives['script-src']?.includes('*')) {
      issues.push({
        severity: 'high',
        directive: 'script-src',
        issue: 'Wildcard source allows any script',
        recommendation: 'Use specific hostnames or nonces/hashes'
      });
    }

    if (directives['script-src']?.includes("'unsafe-inline'")) {
      issues.push({
        severity: 'high',
        directive: 'script-src',
        issue: 'unsafe-inline allows inline scripts',
        recommendation: 'Use nonces, hashes, or external scripts'
      });
    }

    if (directives['script-src']?.includes("'unsafe-eval'")) {
      issues.push({
        severity: 'high',
        directive: 'script-src',
        issue: 'unsafe-eval allows eval() and similar functions',
        recommendation: 'Remove unsafe-eval and avoid dynamic code execution'
      });
    }

    if (!directives['object-src'] || !directives['object-src'].includes("'none'")) {
      issues.push({
        severity: 'medium',
        directive: 'object-src',
        issue: 'object-src not set to none',
        recommendation: 'Set object-src to none to prevent plugin execution'
      });
    }

    if (!directives['base-uri'] || directives['base-uri'].includes('*')) {
      issues.push({
        severity: 'medium',
        directive: 'base-uri',
        issue: 'base-uri not restricted',
        recommendation: 'Set base-uri to self or none'
      });
    }

    if (!cspHeader.includes('upgrade-insecure-requests')) {
      issues.push({
        severity: 'low',
        directive: 'upgrade-insecure-requests',
        issue: 'Not upgrading insecure requests',
        recommendation: 'Add upgrade-insecure-requests directive'
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'high').length === 0,
      issues,
      score: this.calculateCSPScore(directives, issues)
    };
  }

  calculateCSPScore(directives, issues) {
    let score = 100;

    // Deduct points for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Bonus points for good practices
    if (directives['script-src']?.includes("'strict-dynamic'")) {
      score += 5;
    }

    if (directives['script-src']?.some(src => src.startsWith('nonce-'))) {
      score += 5;
    }

    if (directives['script-src']?.some(src => src.startsWith('sha256-'))) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  generateRecommendations(cspHeader) {
    const issues = this.validateCSP(cspHeader).issues;
    const recommendations = [];

    for (const issue of issues) {
      recommendations.push({
        priority: issue.severity,
        directive: issue.directive,
        current: this.getCurrentDirectiveValue(cspHeader, issue.directive),
        recommended: issue.recommendation,
        impact: this.getSecurityImpact(issue.directive)
      });
    }

    return recommendations;
  }

  getCurrentDirectiveValue(cspHeader, directive) {
    const directives = this.parseCSP(cspHeader);
    return directives[directive] ? directives[directive].join(' ') : 'not set';
  }

  getSecurityImpact(directive) {
    const impacts = {
      'script-src': 'Prevents XSS attacks through script injection',
      'object-src': 'Prevents plugin-based attacks',
      'base-uri': 'Prevents base tag injection attacks',
      'frame-ancestors': 'Prevents clickjacking attacks',
      'upgrade-insecure-requests': 'Prevents mixed content vulnerabilities'
    };

    return impacts[directive] || 'Improves overall security posture';
  }
}

module.exports = {
  CSPValidator
};