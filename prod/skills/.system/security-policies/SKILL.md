---
name: Security Policies
description: Security standards and policies including authentication patterns, authorization, data protection, input validation, and vulnerability prevention
version: "1.0.0"
category: system
_protected: true
_allowed_agents: ["meta-agent", "security-agent", "production-validator"]
_last_updated: "2025-10-18"
---

# Security Policies Skill

## Purpose

Provides comprehensive security standards and policies for building secure applications including authentication patterns, authorization strategies, data protection, input validation, XSS/SQL injection prevention, and security best practices across the entire technology stack.

## When to Use This Skill

- Implementing authentication systems
- Designing authorization models
- Securing API endpoints
- Protecting user data
- Validating and sanitizing inputs
- Preventing common vulnerabilities
- Conducting security reviews
- Responding to security incidents

## Core Security Policies

### 1. Authentication Policies

**Password Security Requirements**:
```
MINIMUM PASSWORD STANDARDS:

LENGTH:
  - Minimum: 12 characters
  - Recommended: 16+ characters
  - Maximum: 128 characters (prevent DoS)

COMPLEXITY:
  ✓ At least one uppercase letter (A-Z)
  ✓ At least one lowercase letter (a-z)
  ✓ At least one number (0-9)
  ✓ At least one special character (!@#$%^&*)
  ✗ No common passwords (check against breach databases)
  ✗ No username in password
  ✗ No sequential characters (abc123, 111111)

PASSWORD STORAGE:
  - Use bcrypt with cost factor ≥ 12
  - Or Argon2id (preferred for new systems)
  - Or PBKDF2 with ≥ 100,000 iterations
  - Add unique salt per password
  - Never store plaintext passwords
  - Never log passwords (even hashed)

PASSWORD RESET:
  - Generate secure random token (32+ bytes)
  - Token valid for maximum 15 minutes
  - Single-use tokens only
  - Require old password for logged-in users
  - Send reset link via verified email
  - Rate limit reset requests (max 3 per hour)
```

**Multi-Factor Authentication (MFA)**:
```
MFA REQUIREMENTS:

WHEN TO REQUIRE MFA:
  ✓ High-privilege accounts (admins, developers)
  ✓ Financial transactions
  ✓ Account settings changes
  ✓ API key generation
  ✓ Sensitive data access

MFA METHODS (in order of security):
  1. Hardware security keys (FIDO2/WebAuthn)
  2. Authenticator apps (TOTP)
  3. SMS codes (least secure, use only as backup)

MFA IMPLEMENTATION:
  - Backup codes: 10 single-use codes on setup
  - Recovery options: Security questions + email
  - Grace period: 7 days before enforcement
  - Device trust: Remember device for 30 days (optional)

BACKUP AND RECOVERY:
  - Generate 10 backup codes on MFA setup
  - Allow download/print of backup codes
  - Invalidate old backups when new ones generated
  - Account recovery via support with identity verification
```

**Session Management**:
```
SESSION SECURITY POLICIES:

SESSION TOKENS:
  - Use cryptographically secure random tokens (32+ bytes)
  - Sign tokens with HMAC-SHA256 or better
  - Include expiration in token payload
  - Rotate tokens on privilege escalation

SESSION LIFETIME:
  - Idle timeout: 30 minutes (web), 7 days (mobile)
  - Absolute timeout: 24 hours (web), 30 days (mobile)
  - Admin sessions: 15 minutes idle, 8 hours absolute
  - Extend on activity, but respect absolute limit

SESSION STORAGE:
  - Server-side session store (Redis, database)
  - Never trust client-side session data
  - Encrypt sensitive session data
  - Clear sessions on logout (server and client)

SESSION COOKIES:
  - HttpOnly flag: ✓ (prevent JavaScript access)
  - Secure flag: ✓ (HTTPS only)
  - SameSite: Strict or Lax
  - Domain: Specific domain, not wildcard
  - Path: Specific path when possible

LOGOUT:
  - Clear server-side session immediately
  - Clear client-side tokens/cookies
  - Redirect to login page
  - Optionally invalidate all user sessions (global logout)
```

### 2. Authorization Policies

**Role-Based Access Control (RBAC)**:
```
RBAC IMPLEMENTATION:

ROLES HIERARCHY:
  GUEST (lowest privilege)
    └─ Can view public content
    └─ Cannot modify data

  USER (authenticated)
    └─ Can manage own data
    └─ Can create/edit own resources
    └─ Cannot access others' private data

  MODERATOR (elevated)
    └─ All USER permissions
    └─ Can review flagged content
    └─ Can suspend users temporarily

  ADMIN (high privilege)
    └─ All MODERATOR permissions
    └─ Can manage system settings
    └─ Can delete any content
    └─ Cannot access other admins' sessions

  SUPERADMIN (highest privilege)
    └─ All ADMIN permissions
    └─ Can manage admin accounts
    └─ Can access system internals
    └─ Requires MFA for all actions

PERMISSION CHECK PATTERN:

async function checkPermission(
  userId: string,
  resource: Resource,
  action: Action
): Promise<boolean> {
  // 1. Get user's roles
  const userRoles = await getUserRoles(userId);

  // 2. Check if any role has permission
  for (const role of userRoles) {
    const permissions = await getRolePermissions(role);
    if (permissions.includes({ resource, action })) {
      return true;
    }
  }

  // 3. Check resource-specific permissions
  const resourceOwner = await getResourceOwner(resource);
  if (resourceOwner === userId && action === 'edit') {
    return true;
  }

  return false;
}

// Usage in API endpoint
app.put('/api/tasks/:id', async (req, res) => {
  const hasPermission = await checkPermission(
    req.user.id,
    { type: 'task', id: req.params.id },
    'edit'
  );

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Process request...
});
```

**Attribute-Based Access Control (ABAC)**:
```
ABAC POLICY EXAMPLE:

POLICY: Task Editing

ALLOW IF:
  (user.id === task.owner_id)
  OR
  (user.role === 'admin')
  OR
  (user.role === 'moderator' AND task.status === 'flagged')
  OR
  (user.id IN task.collaborators AND task.collaboration_mode === 'enabled')

DENY IF:
  (task.locked === true AND user.role !== 'admin')
  OR
  (task.archived === true)
  OR
  (user.suspended === true)

DEFAULT: DENY

IMPLEMENTATION:

interface PolicyContext {
  user: User;
  resource: Resource;
  action: Action;
  environment: Environment;
}

async function evaluatePolicy(
  policy: Policy,
  context: PolicyContext
): Promise<boolean> {
  // Evaluate each condition in policy
  for (const condition of policy.conditions) {
    if (await evaluateCondition(condition, context)) {
      return policy.effect === 'ALLOW';
    }
  }

  // Default deny
  return false;
}
```

### 3. Input Validation and Sanitization

**Validation Rules**:
```typescript
/**
 * Input validation schema
 */
const taskValidationSchema = {
  title: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-_.,!?]+$/, // Alphanumeric + basic punctuation
    sanitize: true
  },

  description: {
    type: 'string',
    required: false,
    maxLength: 5000,
    sanitize: true, // Remove HTML tags, scripts
    allowedTags: ['b', 'i', 'u', 'a', 'p'], // If allowing some HTML
  },

  priority: {
    type: 'number',
    required: true,
    min: 0,
    max: 8,
    enum: [0, 1, 2, 3, 5, 8], // Fibonacci values only
  },

  dueDate: {
    type: 'date',
    required: false,
    min: new Date(), // Cannot be in past
    max: new Date('2030-12-31'), // Reasonable future limit
  },

  tags: {
    type: 'array',
    items: {
      type: 'string',
      pattern: /^[a-z0-9-]+$/, // Lowercase alphanumeric + hyphens
      maxLength: 50
    },
    maxItems: 10, // Limit number of tags
  },

  metadata: {
    type: 'object',
    maxProperties: 20,
    propertyValidation: 'strict', // No arbitrary properties
    allowedKeys: ['source', 'project_id', 'external_id']
  }
};

/**
 * Validation function
 */
function validateInput(data: unknown, schema: Schema): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Required check
    if (rules.required && !value) {
      errors.push({ field, message: `${field} is required` });
      continue;
    }

    // Type check
    if (value && typeof value !== rules.type) {
      errors.push({ field, message: `${field} must be ${rules.type}` });
      continue;
    }

    // String validation
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field,
          message: `${field} must be at least ${rules.minLength} characters`
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field,
          message: `${field} must not exceed ${rules.maxLength} characters`
        });
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push({
          field,
          message: `${field} contains invalid characters`
        });
      }
    }

    // Number validation
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field,
          message: `${field} must be at least ${rules.min}`
        });
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field,
          message: `${field} must not exceed ${rules.max}`
        });
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          field,
          message: `${field} must be one of: ${rules.enum.join(', ')}`
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

**SQL Injection Prevention**:
```typescript
// ❌ DANGEROUS: Never concatenate user input
function getTaskUnsafe(userId: string, taskId: string) {
  const query = `SELECT * FROM tasks WHERE user_id = '${userId}' AND id = '${taskId}'`;
  return db.query(query); // VULNERABLE TO SQL INJECTION
}

// ✅ SAFE: Use parameterized queries
function getTaskSafe(userId: string, taskId: string) {
  const query = 'SELECT * FROM tasks WHERE user_id = $1 AND id = $2';
  return db.query(query, [userId, taskId]); // SAFE - parameters escaped
}

// ✅ SAFE: Use ORM with parameter binding
async function getTaskORM(userId: string, taskId: string) {
  return await Task.findOne({
    where: {
      userId: userId, // ORM handles escaping
      id: taskId
    }
  });
}

// ❌ DANGEROUS: Dynamic column/table names
function getTasksUnsafe(sortBy: string) {
  const query = `SELECT * FROM tasks ORDER BY ${sortBy}`;
  return db.query(query); // VULNERABLE
}

// ✅ SAFE: Whitelist allowed values
function getTasksSafe(sortBy: string) {
  const allowedSort = ['created_at', 'priority', 'title'];

  if (!allowedSort.includes(sortBy)) {
    throw new Error('Invalid sort field');
  }

  const query = `SELECT * FROM tasks ORDER BY ${sortBy}`;
  return db.query(query); // Safe - validated against whitelist
}
```

**XSS (Cross-Site Scripting) Prevention**:
```typescript
// ❌ DANGEROUS: Rendering user input as HTML
function renderCommentUnsafe(comment: string) {
  return <div dangerouslySetInnerHTML={{ __html: comment }} />;
  // Allows <script> tags to execute
}

// ✅ SAFE: Render as text (React default)
function renderCommentSafe(comment: string) {
  return <div>{comment}</div>;
  // Automatically escapes HTML
}

// ✅ SAFE: Sanitize HTML if you must allow some tags
import DOMPurify from 'dompurify';

function renderCommentWithHTML(comment: string) {
  const clean = DOMPurify.sanitize(comment, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'a', 'p'],
    ALLOWED_ATTR: ['href', 'target']
  });

  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// ✅ SAFE: Content Security Policy headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://api.example.com; " +
    "frame-ancestors 'none';"
  );
  next();
});
```

### 4. Data Protection Policies

**Data Encryption**:
```
ENCRYPTION REQUIREMENTS:

DATA AT REST:
  ✓ Database encryption (transparent data encryption)
  ✓ File system encryption (LUKS, BitLocker, FileVault)
  ✓ Backup encryption (AES-256)
  ✓ Encryption keys stored in key management system (KMS)

DATA IN TRANSIT:
  ✓ TLS 1.2+ for all connections (prefer TLS 1.3)
  ✓ Strong cipher suites only (no RC4, DES, 3DES)
  ✓ Valid SSL/TLS certificates (no self-signed in production)
  ✓ HTTP Strict Transport Security (HSTS) header
  ✓ Certificate pinning for mobile apps

SENSITIVE DATA FIELDS:
  - Passwords: bcrypt/Argon2 (never reversible)
  - PII: AES-256-GCM encryption
  - API keys: AES-256-GCM + access control
  - Payment data: Never store (use tokenization)
  - Health data: HIPAA-compliant encryption

KEY MANAGEMENT:
  - Use AWS KMS, Azure Key Vault, or HashiCorp Vault
  - Rotate encryption keys annually
  - Never hardcode keys in source code
  - Use separate keys for dev/staging/production
  - Backup keys securely (split key recovery)
```

**Personally Identifiable Information (PII)**:
```
PII HANDLING POLICY:

CLASSIFICATION:
  - HIGH SENSITIVITY: SSN, credit card, medical records
  - MEDIUM SENSITIVITY: Email, phone, address
  - LOW SENSITIVITY: Name, public profile info

COLLECTION:
  - Collect only necessary PII (data minimization)
  - Obtain explicit consent before collection
  - Provide clear privacy policy
  - Allow opt-out options where possible

STORAGE:
  - Encrypt all PII at rest
  - Hash/pseudonymize where possible
  - Limit access to need-to-know basis
  - Log all PII access (audit trail)

TRANSMISSION:
  - Encrypt all PII in transit (TLS 1.2+)
  - Avoid sending PII in URLs/query parameters
  - Redact PII in logs and error messages
  - Use secure protocols (HTTPS, SFTP, not FTP/HTTP)

RETENTION:
  - Delete PII when no longer needed
  - Implement automated deletion schedules
  - Honor user deletion requests (GDPR "right to be forgotten")
  - Securely delete backups containing PII

GDPR COMPLIANCE:
  ✓ Right to access (data export)
  ✓ Right to rectification (data correction)
  ✓ Right to erasure (data deletion)
  ✓ Right to data portability (machine-readable export)
  ✓ Consent management (opt-in/opt-out)
  ✓ Breach notification (within 72 hours)
```

### 5. API Security

**API Authentication**:
```typescript
// JWT (JSON Web Token) Authentication
interface JWTPayload {
  sub: string; // Subject (user ID)
  iat: number; // Issued at
  exp: number; // Expiration
  scope: string[]; // Permissions
}

function generateJWT(userId: string, scopes: string[]): string {
  return jwt.sign(
    {
      sub: userId,
      scope: scopes,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    },
    process.env.JWT_SECRET,
    { algorithm: 'HS256' }
  );
}

// API Key Authentication
interface APIKey {
  key: string; // Hash of actual key
  userId: string;
  scopes: string[];
  rateLimit: number; // Requests per minute
  expiresAt: Date;
  lastUsedAt: Date;
}

async function validateAPIKey(apiKey: string): Promise<APIKey | null> {
  const hashedKey = sha256(apiKey);

  const key = await APIKey.findOne({ key: hashedKey });

  if (!key) return null;
  if (key.expiresAt < new Date()) return null;

  // Update last used
  await key.update({ lastUsedAt: new Date() });

  return key;
}
```

**Rate Limiting**:
```typescript
import rateLimit from 'express-rate-limit';

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Per-user rate limiting
const perUserLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    const user = await getUser(req.user.id);
    return user.plan === 'premium' ? 1000 : 100;
  },
  keyGenerator: (req) => req.user.id, // Rate limit per user ID
});

// Apply to routes
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/*', authenticate, perUserLimiter);
```

**CORS (Cross-Origin Resource Sharing)**:
```typescript
import cors from 'cors';

// Development: Allow specific origins
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://app.example.com',
      'https://www.example.com',
      'http://localhost:3000', // Development only
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Production: Strict CORS
const productionCorsOptions: cors.CorsOptions = {
  origin: 'https://app.example.com', // Single origin only
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};
```

### 6. Security Headers

**Essential Security Headers**:
```typescript
import helmet from 'helmet';

app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Avoid unsafe-inline if possible
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.example.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny' // Prevent clickjacking
  },

  // X-Content-Type-Options
  noSniff: true, // Prevent MIME type sniffing

  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// Additional custom headers
app.use((req, res, next) => {
  // Permissions Policy (formerly Feature-Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  // X-XSS-Protection (legacy, CSP preferred)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  next();
});
```

### 7. Logging and Monitoring

**Security Event Logging**:
```typescript
enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PERMISSION_DENIED = 'permission_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_ACCESS = 'data_access',
  API_KEY_USED = 'api_key_used',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  resource?: string;
  action?: string;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

async function logSecurityEvent(event: SecurityEvent) {
  // Log to security log (separate from application logs)
  await securityLogger.log({
    level: event.success ? 'info' : 'warn',
    message: `Security event: ${event.type}`,
    ...event
  });

  // Alert on critical events
  if (shouldAlert(event)) {
    await sendSecurityAlert(event);
  }

  // Store in database for audit trail
  await SecurityLog.create(event);
}

function shouldAlert(event: SecurityEvent): boolean {
  return (
    event.type === SecurityEventType.SUSPICIOUS_ACTIVITY ||
    (event.type === SecurityEventType.LOGIN_FAILURE &&
     await getRecentFailures(event.userId) > 5) ||
    event.type === SecurityEventType.PERMISSION_DENIED
  );
}

// Usage in authentication
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findByEmail(email);

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    await logSecurityEvent({
      type: SecurityEventType.LOGIN_FAILURE,
      userId: user?.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: false,
      timestamp: new Date()
    });

    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await logSecurityEvent({
    type: SecurityEventType.LOGIN_SUCCESS,
    userId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    success: true,
    timestamp: new Date()
  });

  // Continue with successful login...
});
```

## Best Practices

### For Authentication:
1. **Use Strong Password Hashing**: bcrypt or Argon2id, never MD5/SHA1
2. **Implement MFA**: Require for admin accounts at minimum
3. **Secure Session Management**: HttpOnly, Secure, SameSite cookies
4. **Rate Limit Auth Endpoints**: Prevent brute force attacks
5. **Monitor Failed Logins**: Alert on suspicious patterns

### For Authorization:
1. **Principle of Least Privilege**: Grant minimum necessary permissions
2. **Default Deny**: Explicit permission required, deny by default
3. **Check Permissions Server-Side**: Never trust client
4. **Regular Access Audits**: Review who has access to what
5. **Time-Bound Permissions**: Expire elevated privileges

### For Input Validation:
1. **Validate Everything**: Never trust user input
2. **Whitelist Over Blacklist**: Allow known good, not block known bad
3. **Sanitize for Context**: Different escaping for HTML, SQL, etc.
4. **Length Limits**: Prevent DoS via oversized inputs
5. **Use Validation Libraries**: Don't roll your own

### For Data Protection:
1. **Encrypt Sensitive Data**: At rest and in transit
2. **Minimize PII Collection**: Only collect what you need
3. **Secure Key Management**: Use KMS, never hardcode keys
4. **Regular Data Audits**: Know what data you have and where
5. **Secure Deletion**: Properly delete data when no longer needed

## Integration with Other Skills

- **code-standards**: Enforce security standards in code
- **testing-patterns**: Security testing and penetration testing
- **update-protocols**: Security patches and vulnerability updates
- **monitoring-frameworks**: Security event monitoring
- **documentation-standards**: Document security policies

## Success Metrics

- **Zero Critical Vulnerabilities**: No critical security issues in production
- **MFA Adoption**: 100% of admin accounts using MFA
- **Encryption Coverage**: 100% of sensitive data encrypted
- **Authentication Success Rate**: <1% failed login attempts
- **Incident Response Time**: <1 hour to respond to security incidents
- **Compliance**: 100% compliance with security standards (GDPR, SOC 2)

## References

- [owasp-top-10.md](owasp-top-10.md) - OWASP Top 10 vulnerabilities and mitigations
- [authentication-guide.md](authentication-guide.md) - Authentication implementation guide
- [encryption-standards.md](encryption-standards.md) - Encryption requirements and examples
- [security-checklist.md](security-checklist.md) - Pre-deployment security checklist
- [incident-response.md](incident-response.md) - Security incident response procedures

---

**Remember**: Security is not optional—it's a fundamental requirement. Build security in from the start, not as an afterthought. Assume breach: defense in depth, least privilege, zero trust. Every line of code is a potential vulnerability. Review, test, monitor, and continuously improve your security posture. The cost of prevention is always less than the cost of a breach.
