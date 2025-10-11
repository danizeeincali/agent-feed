# Security Hardening Guide

## Overview

This guide documents the comprehensive security hardening implementation for the Agent Feed application. All security measures are **REAL implementations**, not simulations or mocks.

**Last Updated:** 2025-10-10
**Security Level:** Production-Ready
**Implementation Status:** ✅ Complete

---

## Table of Contents

1. [Security Features Implemented](#security-features-implemented)
2. [Architecture Overview](#architecture-overview)
3. [Security Middleware](#security-middleware)
4. [Authentication & Authorization](#authentication--authorization)
5. [Configuration Guide](#configuration-guide)
6. [Testing Security](#testing-security)
7. [Security Audit](#security-audit)
8. [Best Practices](#best-practices)
9. [Incident Response](#incident-response)
10. [Compliance & Standards](#compliance--standards)

---

## Security Features Implemented

### ✅ Core Security Features

#### 1. Security Headers (Helmet.js)
- **HTTP Strict Transport Security (HSTS)**: Forces HTTPS connections
- **Content Security Policy (CSP)**: Prevents XSS and injection attacks
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Browser-level XSS protection
- **Referrer-Policy**: Controls referrer information
- **X-Powered-By Hidden**: Removes server fingerprinting

#### 2. Rate Limiting
- **Global Rate Limiter**: 1000 requests per 15 minutes per IP
- **Authentication Rate Limiter**: 5 failed attempts per 15 minutes
- **API Rate Limiter**: 100 requests per minute
- **User Rate Limiter**: 100 requests per minute per authenticated user
- **Speed Limiter**: Progressive delay for excessive requests

#### 3. Input Validation & Sanitization
- **SQL Injection Prevention**: Pattern-based detection and blocking
- **XSS Prevention**: Script tag and event handler filtering
- **NoSQL Injection Prevention**: MongoDB operator sanitization
- **Parameter Pollution Prevention**: Duplicate parameter handling
- **Request Size Limits**: 10MB maximum payload size

#### 4. Authentication
- **JWT Tokens**: Secure access and refresh tokens
- **API Keys**: Long-lived programmatic access
- **Session Management**: 30-minute timeout with activity tracking
- **Password Hashing**: bcrypt with 12 rounds
- **Token Refresh**: Secure token renewal mechanism

#### 5. Authorization
- **Role-Based Access Control (RBAC)**: 5-tier role hierarchy
- **Permission-Based Access**: Granular permission system
- **Resource Ownership**: Validate user owns resources
- **Admin Protection**: Separate admin-only routes

#### 6. Monitoring & Logging
- **Suspicious Activity Detection**: Tracks security violations
- **Security Event Logging**: All security events logged
- **Attack Pattern Recognition**: Identifies attack attempts
- **Real-time Alerts**: Console warnings for security issues

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Security Layer                            │
├─────────────────────────────────────────────────────────────┤
│  1. Helmet Security Headers                                  │
│  2. Request Size Validation                                  │
│  3. CORS Protection                                          │
│  4. Global Rate Limiting                                     │
│  5. Speed Limiting                                           │
│  6. Input Sanitization                                       │
│  7. SQL Injection Prevention                                 │
│  8. XSS Prevention                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Authentication & Authorization                  │
├─────────────────────────────────────────────────────────────┤
│  - JWT Token Validation                                      │
│  - API Key Validation                                        │
│  - Session Management                                        │
│  - Role-Based Access Control                                 │
│  - Permission Verification                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Routes                         │
├─────────────────────────────────────────────────────────────┤
│  - Public Routes (no auth)                                   │
│  - Protected Routes (JWT required)                           │
│  - Admin Routes (admin role required)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Middleware

### File: `/api-server/middleware/security.js`

#### Key Components

##### 1. Security Headers Configuration

```javascript
import security from './middleware/security.js';

app.use(security.securityHeaders);
```

**Headers Applied:**
- `Strict-Transport-Security`: max-age=31536000; includeSubDomains; preload
- `Content-Security-Policy`: Restrictive CSP preventing XSS
- `X-Frame-Options`: DENY
- `X-Content-Type-Options`: nosniff
- `X-XSS-Protection`: 1; mode=block
- `Referrer-Policy`: strict-origin-when-cross-origin

##### 2. Rate Limiting

```javascript
// Global rate limiter
app.use(security.globalRateLimiter);

// Authentication rate limiter
app.post('/api/auth/login',
  security.authRateLimiter,
  // ... route handler
);
```

**Rate Limits:**
- Global: 1000 req/15min
- Auth: 5 failed attempts/15min
- API: 100 req/min
- User: 100 req/min (authenticated)

##### 3. Input Validation

```javascript
app.post('/api/example',
  security.validators.email(),
  security.validators.password(),
  security.handleValidationErrors,
  async (req, res) => {
    // req.validatedData contains only validated inputs
  }
);
```

**Built-in Validators:**
- `email()` - Valid email format
- `password()` - Strong password (8+ chars, uppercase, lowercase, number, special)
- `username()` - Alphanumeric 3-30 chars
- `uuid()` - Valid UUID
- `integer()` - Integer with optional min/max
- `string()` - String with length limits
- `url()` - Valid URL
- `boolean()` - Boolean value
- `date()` - ISO 8601 date

##### 4. SQL Injection Prevention

```javascript
app.use(security.preventSQLInjection);
```

**Patterns Detected:**
- UNION SELECT statements
- OR 1=1 attacks
- Comment injection (--, /*, */)
- SQL keywords in suspicious contexts

##### 5. XSS Prevention

```javascript
app.use(security.preventXSS);
```

**Patterns Blocked:**
- `<script>` tags
- `javascript:` protocol
- Event handlers (`onclick`, `onerror`, etc.)
- `<iframe>`, `<object>`, `<embed>` tags
- `eval()` calls
- VBScript

##### 6. Suspicious Activity Monitoring

```javascript
// Get security report (admin only)
app.get('/api/security/report',
  auth.authenticateJWT,
  auth.requireRole(auth.ROLES.ADMIN),
  security.getSuspiciousActivityReport
);
```

**Tracked Events:**
- Rate limit exceeded
- SQL injection attempts
- XSS attempts
- NoSQL injection attempts
- Validation failures
- Authentication failures
- CSRF violations

---

## Authentication & Authorization

### File: `/api-server/middleware/auth.js`

#### JWT Authentication

##### Generate Token

```javascript
const accessToken = auth.generateAccessToken({
  userId: user.id,
  username: user.username,
  email: user.email,
  role: user.role
});

const refreshToken = auth.generateRefreshToken({
  userId: user.id,
  username: user.username,
  email: user.email,
  role: user.role
});
```

##### Validate Token

```javascript
app.get('/api/protected',
  auth.authenticateJWT,
  (req, res) => {
    // req.user contains decoded token data
    res.json({ user: req.user });
  }
);
```

##### Optional Authentication

```javascript
app.get('/api/public-or-protected',
  auth.authenticateJWTOptional,
  (req, res) => {
    // req.user is null if not authenticated
    if (req.user) {
      // User is logged in
    } else {
      // Anonymous user
    }
  }
);
```

#### Role-Based Access Control

##### Role Hierarchy

```javascript
const ROLES = {
  SUPER_ADMIN: 'super_admin',  // Level 5
  ADMIN: 'admin',              // Level 4
  MODERATOR: 'moderator',      // Level 3
  USER: 'user',                // Level 2
  GUEST: 'guest'               // Level 1
};
```

##### Require Role

```javascript
// Admin or higher
app.get('/api/admin',
  auth.authenticateJWT,
  auth.requireRole(auth.ROLES.ADMIN),
  (req, res) => {
    res.json({ message: 'Admin access granted' });
  }
);

// Moderator or higher
app.post('/api/moderate',
  auth.authenticateJWT,
  auth.requireRole(auth.ROLES.MODERATOR),
  (req, res) => {
    res.json({ message: 'Moderation action performed' });
  }
);
```

#### Permission-Based Access

##### Permissions

```javascript
const PERMISSIONS = {
  READ_PUBLIC: 'read:public',
  READ_PRIVATE: 'read:private',
  WRITE_OWN: 'write:own',
  WRITE_ANY: 'write:any',
  DELETE_OWN: 'delete:own',
  DELETE_ANY: 'delete:any',
  ADMIN_ACCESS: 'admin:access',
  SUPER_ADMIN_ACCESS: 'super_admin:access'
};
```

##### Require Permission

```javascript
app.post('/api/content',
  auth.authenticateJWT,
  auth.requirePermission(auth.PERMISSIONS.WRITE_OWN),
  (req, res) => {
    res.json({ message: 'Content created' });
  }
);

app.delete('/api/content/:id',
  auth.authenticateJWT,
  auth.requirePermission(auth.PERMISSIONS.DELETE_ANY),
  (req, res) => {
    res.json({ message: 'Content deleted' });
  }
);
```

#### Resource Ownership

```javascript
app.put('/api/posts/:postId',
  auth.authenticateJWT,
  auth.requireOwnership((req) => req.params.postId),
  (req, res) => {
    // Only owner or admin can update
    res.json({ message: 'Post updated' });
  }
);
```

#### API Key Authentication

```javascript
// Generate API key
app.post('/api/auth/api-key',
  auth.authenticateJWT,
  (req, res) => {
    const apiKey = auth.generateAPIKey(
      req.user.userId,
      req.body.description
    );
    res.json({ apiKey });
  }
);

// Use API key
app.get('/api/data',
  auth.authenticateAPIKey,
  (req, res) => {
    res.json({ data: 'Protected data' });
  }
);
```

#### Password Security

```javascript
// Hash password (bcrypt, 12 rounds)
const hash = await auth.hashPassword(plainPassword);

// Verify password
const isValid = await auth.verifyPassword(plainPassword, hash);
```

**Password Requirements:**
- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

---

## Configuration Guide

### File: `/config/security-config.json`

#### Structure

```json
{
  "rateLimits": {
    "global": { "windowMs": 900000, "max": 1000 },
    "auth": { "windowMs": 900000, "max": 5 },
    "api": { "windowMs": 60000, "max": 100 }
  },
  "cors": {
    "whitelist": [
      "http://localhost:3000",
      "http://localhost:5173"
    ]
  },
  "helmet": { /* Helmet configuration */ },
  "jwt": {
    "accessTokenExpiry": "1h",
    "refreshTokenExpiry": "7d"
  },
  "password": {
    "minLength": 8,
    "requireUppercase": true,
    "requireNumbers": true
  }
}
```

#### Environment Variables

Create a `.env` file (DO NOT commit to git):

```bash
# JWT Secrets (REQUIRED - Generate with: openssl rand -hex 64)
JWT_SECRET=your_64_character_random_string_here
JWT_REFRESH_SECRET=your_64_character_random_string_here

# Token Expiry
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Server Configuration
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=sqlite:../database.db

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
```

**Generate Secrets:**

```bash
# Generate JWT secret
openssl rand -hex 64

# Or with Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### CORS Configuration

**Development:**
```javascript
whitelist: [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173'
]
```

**Production:**
```javascript
whitelist: [
  'https://yourdomain.com',
  'https://api.yourdomain.com'
]
```

---

## Testing Security

### Running Security Tests

```bash
# Run all security tests
cd /workspaces/agent-feed
npm test tests/security/security-tests.js

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Coverage

The security test suite validates:

1. **SQL Injection Prevention** ✓
   - UNION SELECT attacks
   - OR 1=1 attacks
   - Comment injection
   - Semicolon termination

2. **XSS Prevention** ✓
   - Script tag injection
   - Event handler injection
   - JavaScript protocol
   - Iframe injection
   - Eval injection

3. **Rate Limiting** ✓
   - Request counting
   - Window enforcement
   - Header validation

4. **Security Headers** ✓
   - All required headers present
   - Correct header values
   - X-Powered-By hidden

5. **Authentication** ✓
   - JWT generation
   - JWT validation
   - Token expiry
   - Invalid token rejection

6. **Authorization** ✓
   - Role-based access
   - Permission checking
   - Ownership validation

7. **Password Security** ✓
   - Bcrypt hashing
   - Salt generation
   - Verification

8. **Input Validation** ✓
   - Email format
   - Password strength
   - Field sanitization

### Manual Testing with cURL

#### Test Rate Limiting

```bash
# Make multiple requests quickly to trigger rate limiting
for i in {1..10}; do
  curl http://localhost:3001/api/health
  sleep 0.1
done
```

#### Test SQL Injection Prevention

```bash
# This should be blocked (400 Bad Request)
curl -X POST http://localhost:3001/api/test/input \
  -H "Content-Type: application/json" \
  -d '{"username": "admin'\'' OR '\''1'\''='\''1", "password": "test"}'
```

#### Test XSS Prevention

```bash
# This should be blocked (400 Bad Request)
curl -X POST http://localhost:3001/api/test/input \
  -H "Content-Type: application/json" \
  -d '{"comment": "<script>alert('\''XSS'\'')</script>"}'
```

#### Test Authentication

```bash
# Login to get token
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com", "password": "Demo123!"}' \
  | jq -r '.accessToken')

# Use token to access protected endpoint
curl http://localhost:3001/api/protected/example \
  -H "Authorization: Bearer $TOKEN"

# Try without token (should fail)
curl http://localhost:3001/api/protected/example
```

#### Test Security Headers

```bash
# Check security headers
curl -I http://localhost:3001/api/health
```

Expected headers:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

#### Test CORS

```bash
# Valid origin (should succeed)
curl http://localhost:3001/api/health \
  -H "Origin: http://localhost:3000" \
  -v

# Invalid origin (should fail)
curl http://localhost:3001/api/health \
  -H "Origin: http://evil.com" \
  -v
```

---

## Security Audit

### Running the Security Audit Script

```bash
# Run comprehensive security audit
/workspaces/agent-feed/scripts/security-audit.sh
```

### Audit Checks

The security audit script performs:

1. **Exposed Secrets Detection**
   - .env files in git
   - Hardcoded API keys
   - Private key files
   - Token exposure

2. **Dependency Vulnerabilities**
   - npm audit results
   - Critical vulnerabilities
   - High severity issues
   - Outdated packages

3. **File Permissions**
   - World-writable files
   - Database permissions
   - Script executability

4. **SSL/TLS Configuration**
   - HTTPS enabled
   - TLS version
   - Certificate expiry

5. **Security Headers**
   - Required headers present
   - Header values correct
   - Information disclosure

6. **Open Ports**
   - Exposed services
   - Database ports
   - Unnecessary services

7. **Code Vulnerabilities**
   - eval() usage
   - SQL concatenation
   - innerHTML usage
   - Console.log statements

### Audit Report

After running the audit, a detailed report is generated:

```
/workspaces/agent-feed/security-audit-report-YYYYMMDD-HHMMSS.txt
```

**Report Sections:**
- Critical Issues
- High Priority Issues
- Medium Priority Issues
- Low Priority Issues
- Recommendations
- Summary Statistics

---

## Best Practices

### 1. Environment Variables

✅ **DO:**
- Store secrets in `.env` files
- Use different secrets for dev/prod
- Rotate secrets regularly
- Use strong random secrets (64+ chars)

❌ **DON'T:**
- Commit `.env` to version control
- Share secrets via email/chat
- Use weak or default secrets
- Hardcode secrets in code

### 2. Password Management

✅ **DO:**
- Use bcrypt with 12+ rounds
- Enforce strong password requirements
- Implement account lockout
- Use password reset tokens

❌ **DON'T:**
- Store plaintext passwords
- Use weak hashing (MD5, SHA1)
- Allow weak passwords
- Send passwords via email

### 3. Token Management

✅ **DO:**
- Use short-lived access tokens (1 hour)
- Implement refresh tokens
- Rotate tokens regularly
- Validate token on every request

❌ **DON'T:**
- Use long-lived access tokens
- Store tokens in localStorage (XSS risk)
- Share tokens between users
- Skip token validation

### 4. Rate Limiting

✅ **DO:**
- Implement multiple rate limit tiers
- Use stricter limits for sensitive endpoints
- Monitor rate limit violations
- Implement exponential backoff

❌ **DON'T:**
- Skip rate limiting
- Use same limits for all endpoints
- Ignore rate limit violations
- Allow unlimited retries

### 5. Input Validation

✅ **DO:**
- Validate all user inputs
- Sanitize before processing
- Use whitelist validation
- Reject invalid inputs

❌ **DON'T:**
- Trust client-side validation
- Use blacklist validation only
- Skip validation for "trusted" inputs
- Accept unchecked file uploads

### 6. HTTPS/TLS

✅ **DO:**
- Use HTTPS in production
- Enforce HSTS
- Use TLS 1.2 or higher
- Keep certificates up to date

❌ **DON'T:**
- Use HTTP in production
- Allow mixed content
- Use self-signed certs in prod
- Ignore certificate warnings

### 7. Database Security

✅ **DO:**
- Use parameterized queries
- Implement least privilege
- Encrypt sensitive data
- Regular backups

❌ **DON'T:**
- Concatenate SQL queries
- Use root database account
- Store sensitive data plaintext
- Skip backups

### 8. Error Handling

✅ **DO:**
- Log errors securely
- Return generic error messages
- Monitor error rates
- Implement error recovery

❌ **DON'T:**
- Expose stack traces
- Return detailed error info
- Ignore errors silently
- Log sensitive data

---

## Incident Response

### Security Incident Detection

Monitor for:
- Multiple failed authentication attempts
- Unusual traffic patterns
- SQL injection attempts
- XSS attempts
- Suspicious user behavior
- Unauthorized access attempts

### Response Procedure

1. **Detection**
   - Security monitoring alerts
   - Audit log analysis
   - User reports

2. **Containment**
   - Block malicious IPs
   - Revoke compromised tokens
   - Disable affected accounts
   - Isolate affected systems

3. **Investigation**
   - Review audit logs
   - Analyze attack vectors
   - Identify compromised data
   - Document timeline

4. **Remediation**
   - Patch vulnerabilities
   - Update security rules
   - Reset compromised credentials
   - Restore from backups if needed

5. **Recovery**
   - Restore normal operations
   - Monitor for recurrence
   - Verify system integrity
   - Update security measures

6. **Post-Incident**
   - Document lessons learned
   - Update security policies
   - Improve monitoring
   - Train team

### Contact Information

**Security Team:**
- Email: security@yourcompany.com
- Phone: +1-XXX-XXX-XXXX
- On-Call: Use PagerDuty/equivalent

**Escalation:**
1. Development Lead
2. Security Officer
3. CTO
4. CEO

---

## Compliance & Standards

### Standards Compliance

This implementation follows:

- **OWASP Top 10** - Web application security risks
- **NIST Cybersecurity Framework** - Security best practices
- **PCI DSS** - Payment card industry standards (if applicable)
- **GDPR** - Data protection regulations (if applicable)
- **SOC 2** - Security, availability, and confidentiality

### Security Checklist

- [x] Security headers implemented
- [x] Rate limiting enforced
- [x] Input validation implemented
- [x] SQL injection prevention
- [x] XSS prevention
- [x] CSRF protection
- [x] Authentication (JWT)
- [x] Authorization (RBAC)
- [x] Password hashing (bcrypt)
- [x] Session management
- [x] Security logging
- [x] Dependency scanning
- [x] Security testing
- [ ] HTTPS/TLS (configure for production)
- [ ] Web Application Firewall (recommended for production)
- [ ] Intrusion Detection System (recommended)
- [ ] Regular security audits
- [ ] Penetration testing

---

## Maintenance & Updates

### Regular Tasks

**Daily:**
- Monitor security logs
- Review suspicious activity

**Weekly:**
- Run security audit script
- Review access logs
- Check for security alerts

**Monthly:**
- Update dependencies (`npm audit fix`)
- Review and update security policies
- Security team meeting

**Quarterly:**
- Rotate secrets and keys
- Full security audit
- Penetration testing
- Security training

**Annually:**
- Third-party security assessment
- Compliance audit
- Disaster recovery drill
- Security policy review

---

## Support & Resources

### Documentation

- `/api-server/middleware/security.js` - Security middleware
- `/api-server/middleware/auth.js` - Authentication middleware
- `/config/security-config.json` - Security configuration
- `/tests/security/security-tests.js` - Security tests
- `/scripts/security-audit.sh` - Security audit script

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)

---

## Changelog

### Version 1.0.0 (2025-10-10)

**Initial Release:**
- Implemented Helmet.js security headers
- Added rate limiting (global, auth, API, user)
- Implemented SQL injection prevention
- Implemented XSS prevention
- Added JWT authentication
- Implemented RBAC authorization
- Added password hashing (bcrypt)
- Created security audit script
- Created comprehensive test suite
- Created security documentation

---

## License

This security implementation is part of the Agent Feed application.
All rights reserved.

---

**For security concerns or to report vulnerabilities, please contact:**
security@yourcompany.com

**This is a living document. Please keep it updated as security measures evolve.**
