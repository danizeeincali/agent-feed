const crypto = require('crypto');
const { expect } = require('chai');

describe('CSRF Protection Tests', () => {
  let mockRequest;
  let mockResponse;
  let csrfToken;
  let sessionId;

  beforeEach(() => {
    // Generate test session and CSRF token
    sessionId = crypto.randomUUID();
    csrfToken = crypto.randomBytes(32).toString('hex');

    mockRequest = {
      headers: {},
      body: {},
      session: { id: sessionId, csrfToken },
      method: 'POST',
      url: '/api/sensitive-action'
    };

    mockResponse = {
      status: 200,
      headers: {},
      body: null,
      setHeader: function(name, value) {
        this.headers[name] = value;
      },
      getHeader: function(name) {
        return this.headers[name];
      }
    };
  });

  describe('CSRF Token Generation', () => {
    it('should generate unique CSRF tokens for each session', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();

      expect(token1).to.not.equal(token2);
      expect(token1).to.have.lengthOf(64); // 32 bytes in hex
      expect(token2).to.have.lengthOf(64);
    });

    it('should generate cryptographically secure tokens', () => {
      const tokens = new Set();

      // Generate 1000 tokens and ensure no collisions
      for (let i = 0; i < 1000; i++) {
        const token = generateCSRFToken();
        expect(tokens.has(token)).to.be.false;
        tokens.add(token);
      }

      expect(tokens.size).to.equal(1000);
    });

    it('should bind CSRF token to session', () => {
      const session = { id: sessionId };
      const token = bindCSRFTokenToSession(session);

      expect(session.csrfToken).to.equal(token);
      expect(token).to.match(/^[a-f0-9]{64}$/);
    });
  });

  describe('CSRF Token Validation', () => {
    it('should accept valid CSRF token in header', () => {
      mockRequest.headers['x-csrf-token'] = csrfToken;

      const result = validateCSRFToken(mockRequest);
      expect(result.valid).to.be.true;
      expect(result.source).to.equal('header');
    });

    it('should accept valid CSRF token in body', () => {
      mockRequest.body._csrf = csrfToken;

      const result = validateCSRFToken(mockRequest);
      expect(result.valid).to.be.true;
      expect(result.source).to.equal('body');
    });

    it('should accept valid CSRF token in query parameter', () => {
      mockRequest.url += `?_csrf=${csrfToken}`;

      const result = validateCSRFToken(mockRequest);
      expect(result.valid).to.be.true;
      expect(result.source).to.equal('query');
    });

    it('should reject missing CSRF token', () => {
      const result = validateCSRFToken(mockRequest);
      expect(result.valid).to.be.false;
      expect(result.error).to.equal('CSRF token missing');
    });

    it('should reject invalid CSRF token', () => {
      mockRequest.headers['x-csrf-token'] = 'invalid-token';

      const result = validateCSRFToken(mockRequest);
      expect(result.valid).to.be.false;
      expect(result.error).to.equal('Invalid CSRF token');
    });

    it('should reject expired CSRF token', () => {
      const expiredToken = generateExpiredCSRFToken();
      mockRequest.headers['x-csrf-token'] = expiredToken;
      mockRequest.session.csrfToken = expiredToken;

      const result = validateCSRFToken(mockRequest);
      expect(result.valid).to.be.false;
      expect(result.error).to.equal('CSRF token expired');
    });
  });

  describe('Double Submit Cookie Pattern', () => {
    it('should validate double submit cookie pattern', () => {
      const cookieToken = crypto.randomBytes(32).toString('hex');
      mockRequest.headers.cookie = `csrfToken=${cookieToken}`;
      mockRequest.headers['x-csrf-token'] = cookieToken;

      const result = validateDoubleSubmitCookie(mockRequest);
      expect(result.valid).to.be.true;
    });

    it('should reject mismatched cookie and header tokens', () => {
      const cookieToken = crypto.randomBytes(32).toString('hex');
      const headerToken = crypto.randomBytes(32).toString('hex');

      mockRequest.headers.cookie = `csrfToken=${cookieToken}`;
      mockRequest.headers['x-csrf-token'] = headerToken;

      const result = validateDoubleSubmitCookie(mockRequest);
      expect(result.valid).to.be.false;
      expect(result.error).to.equal('Token mismatch');
    });

    it('should handle secure cookie attributes', () => {
      const token = generateCSRFToken();
      const secureCookie = createSecureCSRFCookie(token);

      expect(secureCookie).to.include('Secure');
      expect(secureCookie).to.include('SameSite=Strict');
      expect(secureCookie).to.include('HttpOnly');
    });
  });

  describe('SameSite Cookie Protection', () => {
    const sameSiteValues = ['Strict', 'Lax', 'None'];

    sameSiteValues.forEach(value => {
      it(`should set SameSite=${value} cookie correctly`, () => {
        const cookie = createCSRFCookieWithSameSite(csrfToken, value);
        expect(cookie).to.include(`SameSite=${value}`);
      });
    });

    it('should use Strict SameSite for sensitive operations', () => {
      const cookie = createCSRFCookieForSensitiveOperation(csrfToken);
      expect(cookie).to.include('SameSite=Strict');
    });

    it('should handle cross-origin requests with SameSite=None', () => {
      mockRequest.headers.origin = 'https://external-site.com';
      mockRequest.headers['sec-fetch-site'] = 'cross-site';

      const cookie = handleCrossOriginCSRF(mockRequest, csrfToken);
      expect(cookie).to.include('SameSite=None');
      expect(cookie).to.include('Secure');
    });
  });

  describe('Origin Header Validation', () => {
    it('should validate Origin header matches expected domain', () => {
      mockRequest.headers.origin = 'https://myapp.com';

      const result = validateOriginHeader(mockRequest, ['https://myapp.com']);
      expect(result.valid).to.be.true;
    });

    it('should reject requests from unauthorized origins', () => {
      mockRequest.headers.origin = 'https://evil.com';

      const result = validateOriginHeader(mockRequest, ['https://myapp.com']);
      expect(result.valid).to.be.false;
      expect(result.error).to.equal('Unauthorized origin');
    });

    it('should handle missing Origin header for same-origin requests', () => {
      // No Origin header (typical for same-origin requests)
      const result = validateOriginHeader(mockRequest, ['https://myapp.com'], true);
      expect(result.valid).to.be.true;
    });

    it('should validate Referer header as fallback', () => {
      mockRequest.headers.referer = 'https://myapp.com/page';

      const result = validateRefererHeader(mockRequest, ['https://myapp.com']);
      expect(result.valid).to.be.true;
    });
  });

  describe('Custom Header Validation', () => {
    it('should require custom header for AJAX requests', () => {
      mockRequest.headers['x-requested-with'] = 'XMLHttpRequest';
      mockRequest.headers['x-csrf-token'] = csrfToken;

      const result = validateCustomHeader(mockRequest);
      expect(result.valid).to.be.true;
    });

    it('should reject requests without required custom header', () => {
      const result = validateCustomHeader(mockRequest);
      expect(result.valid).to.be.false;
      expect(result.error).to.equal('Custom header required');
    });
  });

  describe('CSRF Attack Simulation', () => {
    it('should detect and block basic CSRF attack', () => {
      // Simulate malicious request from different origin
      const maliciousRequest = {
        headers: {
          origin: 'https://evil.com',
          referer: 'https://evil.com/attack.html'
        },
        body: { action: 'transfer', amount: 1000 },
        method: 'POST',
        session: { id: 'victim-session' }
      };

      const result = detectCSRFAttack(maliciousRequest);
      expect(result.isAttack).to.be.true;
      expect(result.indicators).to.include('foreign-origin');
    });

    it('should detect CSRF via hidden iframe attack', () => {
      const iframeAttack = {
        headers: {
          'user-agent': 'Mozilla/5.0...',
          origin: null, // Hidden iframe often has null origin
          referer: 'https://evil.com'
        },
        method: 'POST',
        body: { sensitiveAction: 'true' }
      };

      const result = detectCSRFAttack(iframeAttack);
      expect(result.isAttack).to.be.true;
      expect(result.indicators).to.include('null-origin');
    });

    it('should detect CSRF via image tag attack', () => {
      const imageAttack = {
        headers: {
          accept: 'image/*',
          origin: 'https://evil.com'
        },
        method: 'GET',
        url: '/api/delete-account?confirm=yes'
      };

      const result = detectCSRFAttack(imageAttack);
      expect(result.isAttack).to.be.true;
      expect(result.indicators).to.include('suspicious-get-request');
    });
  });

  describe('Rate Limiting for CSRF Protection', () => {
    it('should implement rate limiting for token generation', async () => {
      const rateLimiter = new CSRFRateLimiter();
      const clientIP = '192.168.1.1';

      // First request should pass
      let result = await rateLimiter.checkTokenGeneration(clientIP);
      expect(result.allowed).to.be.true;

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkTokenGeneration(clientIP);
      }

      // Should now be rate limited
      result = await rateLimiter.checkTokenGeneration(clientIP);
      expect(result.allowed).to.be.false;
    });

    it('should implement rate limiting for failed CSRF validations', async () => {
      const rateLimiter = new CSRFRateLimiter();
      const clientIP = '192.168.1.1';

      // Multiple failed validations should trigger rate limiting
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordFailedValidation(clientIP);
      }

      const result = await rateLimiter.checkValidationAttempt(clientIP);
      expect(result.allowed).to.be.false;
      expect(result.reason).to.equal('too-many-failed-attempts');
    });
  });
});

// CSRF Protection Implementation
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

function bindCSRFTokenToSession(session) {
  const token = generateCSRFToken();
  session.csrfToken = token;
  session.csrfTokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  return token;
}

function validateCSRFToken(request) {
  const sessionToken = request.session?.csrfToken;
  if (!sessionToken) {
    return { valid: false, error: 'No session token' };
  }

  // Check token expiry
  const expiry = request.session.csrfTokenExpiry;
  if (expiry && Date.now() > expiry) {
    return { valid: false, error: 'CSRF token expired' };
  }

  // Check for token in various locations
  let providedToken = null;
  let source = null;

  if (request.headers['x-csrf-token']) {
    providedToken = request.headers['x-csrf-token'];
    source = 'header';
  } else if (request.body?._csrf) {
    providedToken = request.body._csrf;
    source = 'body';
  } else if (request.url.includes('_csrf=')) {
    const url = new URL(request.url, 'http://localhost');
    providedToken = url.searchParams.get('_csrf');
    source = 'query';
  }

  if (!providedToken) {
    return { valid: false, error: 'CSRF token missing' };
  }

  // Constant-time comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(sessionToken),
    Buffer.from(providedToken)
  );

  if (!isValid) {
    return { valid: false, error: 'Invalid CSRF token' };
  }

  return { valid: true, source };
}

function validateDoubleSubmitCookie(request) {
  const cookieHeader = request.headers.cookie || '';
  const cookieMatch = cookieHeader.match(/csrfToken=([^;]+)/);
  const cookieToken = cookieMatch ? cookieMatch[1] : null;

  const headerToken = request.headers['x-csrf-token'];

  if (!cookieToken || !headerToken) {
    return { valid: false, error: 'Missing tokens' };
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );

  if (!isValid) {
    return { valid: false, error: 'Token mismatch' };
  }

  return { valid: true };
}

function createSecureCSRFCookie(token) {
  const maxAge = 24 * 60 * 60; // 24 hours in seconds
  return `csrfToken=${token}; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Strict`;
}

function createCSRFCookieWithSameSite(token, sameSite) {
  return `csrfToken=${token}; SameSite=${sameSite}; Secure`;
}

function createCSRFCookieForSensitiveOperation(token) {
  return `csrfToken=${token}; SameSite=Strict; Secure; HttpOnly`;
}

function handleCrossOriginCSRF(request, token) {
  if (request.headers['sec-fetch-site'] === 'cross-site') {
    return `csrfToken=${token}; SameSite=None; Secure`;
  }
  return `csrfToken=${token}; SameSite=Strict; Secure`;
}

function validateOriginHeader(request, allowedOrigins, allowMissing = false) {
  const origin = request.headers.origin;

  if (!origin && allowMissing) {
    return { valid: true };
  }

  if (!origin) {
    return { valid: false, error: 'Missing Origin header' };
  }

  if (!allowedOrigins.includes(origin)) {
    return { valid: false, error: 'Unauthorized origin' };
  }

  return { valid: true };
}

function validateRefererHeader(request, allowedOrigins) {
  const referer = request.headers.referer;

  if (!referer) {
    return { valid: false, error: 'Missing Referer header' };
  }

  try {
    const refererOrigin = new URL(referer).origin;
    if (!allowedOrigins.includes(refererOrigin)) {
      return { valid: false, error: 'Unauthorized referer' };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid Referer header' };
  }
}

function validateCustomHeader(request) {
  const customHeader = request.headers['x-requested-with'];

  if (customHeader === 'XMLHttpRequest') {
    return { valid: true };
  }

  return { valid: false, error: 'Custom header required' };
}

function detectCSRFAttack(request) {
  const indicators = [];

  // Check for suspicious origins
  const origin = request.headers.origin;
  const referer = request.headers.referer;

  if (origin === null) {
    indicators.push('null-origin');
  }

  if (referer && origin && new URL(referer).origin !== origin) {
    indicators.push('origin-referer-mismatch');
  }

  // Check for suspicious request patterns
  if (request.method === 'GET' && request.url.includes('delete')) {
    indicators.push('suspicious-get-request');
  }

  // Check accept header for image-based attacks
  const accept = request.headers.accept;
  if (accept && accept.includes('image/*') && request.method !== 'GET') {
    indicators.push('image-based-attack');
  }

  return {
    isAttack: indicators.length > 0,
    indicators,
    confidence: indicators.length / 4 // Confidence score
  };
}

function generateExpiredCSRFToken() {
  const token = generateCSRFToken();
  // Mark as expired by setting past timestamp
  return token + '|' + (Date.now() - 86400000); // 24 hours ago
}

class CSRFRateLimiter {
  constructor() {
    this.tokenGeneration = new Map();
    this.failedValidations = new Map();
  }

  async checkTokenGeneration(clientIP) {
    const now = Date.now();
    const window = 60000; // 1 minute window
    const limit = 10; // 10 tokens per minute

    if (!this.tokenGeneration.has(clientIP)) {
      this.tokenGeneration.set(clientIP, []);
    }

    const attempts = this.tokenGeneration.get(clientIP);
    const recentAttempts = attempts.filter(time => now - time < window);

    if (recentAttempts.length >= limit) {
      return { allowed: false, reason: 'rate-limit-exceeded' };
    }

    recentAttempts.push(now);
    this.tokenGeneration.set(clientIP, recentAttempts);

    return { allowed: true };
  }

  async recordFailedValidation(clientIP) {
    const now = Date.now();

    if (!this.failedValidations.has(clientIP)) {
      this.failedValidations.set(clientIP, []);
    }

    const failures = this.failedValidations.get(clientIP);
    failures.push(now);
    this.failedValidations.set(clientIP, failures);
  }

  async checkValidationAttempt(clientIP) {
    const now = Date.now();
    const window = 300000; // 5 minutes
    const limit = 5; // 5 failed attempts per 5 minutes

    if (!this.failedValidations.has(clientIP)) {
      return { allowed: true };
    }

    const failures = this.failedValidations.get(clientIP);
    const recentFailures = failures.filter(time => now - time < window);

    if (recentFailures.length >= limit) {
      return { allowed: false, reason: 'too-many-failed-attempts' };
    }

    return { allowed: true };
  }
}

module.exports = {
  generateCSRFToken,
  bindCSRFTokenToSession,
  validateCSRFToken,
  validateDoubleSubmitCookie,
  createSecureCSRFCookie,
  validateOriginHeader,
  detectCSRFAttack,
  CSRFRateLimiter
};