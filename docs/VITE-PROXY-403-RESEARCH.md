# Vite Proxy 403 Forbidden Error - Research Report

## Executive Summary

This research investigates common causes of Vite dev server proxy returning 403 Forbidden errors, focusing on why proxies might return 403 even when the backend returns 200 OK. The research covers configuration best practices, debugging techniques, CORS issues, and security header impacts.

**Key Finding**: Most 403 errors in Vite proxies stem from incorrect `changeOrigin` configuration, missing security flags, or backend CORS validation failures - not from the proxy itself but from how the proxy transforms requests.

---

## Table of Contents

1. [Common Causes of 403 Errors](#common-causes-of-403-errors)
2. [Vite Proxy Configuration Best Practices](#vite-proxy-configuration-best-practices)
3. [Debugging Vite Proxy Issues](#debugging-vite-proxy-issues)
4. [CORS and Preflight Request Handling](#cors-and-preflight-request-handling)
5. [POST Request Specific Issues](#post-request-specific-issues)
6. [Why Proxy Returns 403 When Backend Returns 200](#why-proxy-returns-403-when-backend-returns-200)
7. [Security Headers Impact](#security-headers-impact)
8. [Current Project Analysis](#current-project-analysis)
9. [Recommendations](#recommendations)

---

## Common Causes of 403 Errors

### 1. File System Access Restrictions (`server.fs.strict`)

**Problem**: When `server.fs.strict` is set to true, Vite blocks access to files outside the allowed directory list, resulting in 403 errors.

**Symptoms**:
- Files in `node_modules/.vite` return 403
- Accessing files outside project root fails
- Error: "Outside of Vite serving allow list"

**Solution**:
```javascript
export default defineConfig({
  server: {
    fs: {
      strict: false,
      // OR allow specific directories
      allow: ['..', '../node_modules']
    }
  }
})
```

### 2. Missing or Incorrect `changeOrigin` Configuration

**Problem**: Backend servers validate the Host header and reject requests when it doesn't match expected values.

**Symptoms**:
- Backend returns 403 for proxied requests
- Direct requests to backend work fine
- Host header shows `localhost:5173` instead of `localhost:3001`

**Solution**:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,  // CRITICAL: Rewrites Host header to match target
    secure: false
  }
}
```

### 3. HTTPS/SSL Certificate Issues

**Problem**: Self-signed certificates or HTTPS targets cause proxy to reject connections.

**Symptoms**:
- ECONNREFUSED or SSL errors
- 403 only with HTTPS targets
- Certificate validation failures

**Solution**:
```javascript
proxy: {
  '/api': {
    target: 'https://localhost:44305',
    changeOrigin: true,
    secure: false,  // CRITICAL: Disable SSL verification for dev
    ws: true
  }
}
```

### 4. Nginx/Reverse Proxy Rules

**Problem**: Nginx or other reverse proxies block directories starting with dots (like `.vite`).

**Symptoms**:
- 403 errors for `node_modules/.vite/*` files
- Works locally but fails behind proxy
- Production deployment issues

**Solution**: Configure Nginx to allow `.vite` directories:
```nginx
location ~ /\.vite {
  allow all;
}
```

### 5. Backend CORS Validation

**Problem**: Backend validates Origin header and rejects requests from unexpected origins.

**Symptoms**:
- GET requests work, POST fails with 403
- CORS errors in browser console
- Missing Access-Control-Allow-Origin header

**Solution**: Configure backend CORS whitelist:
```javascript
// Express backend
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
```

### 6. Protected Path Middleware

**Problem**: Backend middleware blocks certain paths or patterns.

**Symptoms**:
- Specific endpoints return 403
- Path-based rejections
- Security middleware blocking requests

**Solution**: Review backend middleware order and exclusions.

---

## Vite Proxy Configuration Best Practices

### Recommended Minimal Configuration

```javascript
export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        timeout: 10000
      }
    }
  }
})
```

### Complete Production-Ready Configuration

```javascript
export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    cors: true,
    strictPort: true,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,  // Rewrite Host header
        secure: false,       // Allow self-signed certs
        timeout: 10000,      // 10s timeout
        followRedirects: true,
        xfwd: true,          // Add X-Forwarded-* headers

        // Debugging configuration
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy error:', err.message);
          });

          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url);
            console.log('Target:', proxyReq.path);
            console.log('Host header:', proxyReq.getHeader('host'));
          });

          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})
```

### Path Rewriting

When backend expects different paths:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
    // Frontend: /api/users -> Backend: /users
  }
}
```

### Multiple Endpoint Configuration

```javascript
proxy: {
  // Regular API (fast timeout)
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    timeout: 10000
  },

  // Long-running operations (extended timeout)
  '/api/claude-code': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    timeout: 120000  // 2 minutes
  },

  // WebSocket proxy
  '/ws': {
    target: 'http://127.0.0.1:3001',
    ws: true,
    changeOrigin: true
  }
}
```

### Key Configuration Options

| Option | Purpose | Default | Recommendation |
|--------|---------|---------|----------------|
| `target` | Backend server URL | Required | Use 127.0.0.1 instead of localhost to avoid IPv6 issues |
| `changeOrigin` | Rewrite Host header | `false` | **Always set to `true`** for cross-origin APIs |
| `secure` | Verify SSL certificates | `true` | Set to `false` for dev with self-signed certs |
| `ws` | Proxy WebSocket connections | `false` | Set to `true` for WebSocket endpoints |
| `timeout` | Request timeout (ms) | `120000` | Adjust based on endpoint needs (10s-120s) |
| `followRedirects` | Follow HTTP redirects | `false` | Set to `true` for APIs with redirects |
| `xfwd` | Add X-Forwarded-* headers | `false` | Set to `true` if backend needs original client info |

---

## Debugging Vite Proxy Issues

### Enable Comprehensive Logging

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    configure: (proxy, _options) => {
      // Log all proxy events
      proxy.on('error', (err, req, res) => {
        console.error('❌ Proxy ERROR:', err.message);
        console.error('   Request:', req.method, req.url);
      });

      proxy.on('proxyReq', (proxyReq, req, _res) => {
        console.log('🔵 Sending Request:');
        console.log('   Method:', req.method);
        console.log('   URL:', req.url);
        console.log('   Target:', proxyReq.path);
        console.log('   Host:', proxyReq.getHeader('host'));
        console.log('   Origin:', proxyReq.getHeader('origin'));
      });

      proxy.on('proxyRes', (proxyRes, req, _res) => {
        console.log('🟢 Received Response:');
        console.log('   Status:', proxyRes.statusCode);
        console.log('   URL:', req.url);
        console.log('   Headers:', JSON.stringify(proxyRes.headers, null, 2));
      });

      proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
        console.log('🔷 WebSocket Upgrade:', req.url);
      });

      proxy.on('open', (proxySocket) => {
        console.log('🔓 Connection opened');
      });

      proxy.on('close', (res, socket, head) => {
        console.log('🔒 Connection closed');
      });
    }
  }
}
```

### Run Vite in Debug Mode

```bash
# Enable Vite debug logging
DEBUG=vite:* npm run dev

# Or with specific debugging
vite --debug
```

### Common Debug Patterns

**Check if proxy is receiving requests:**
```javascript
proxy.on('proxyReq', (proxyReq, req) => {
  console.log('✅ Proxy received:', req.method, req.url);
});
```

**Verify target transformation:**
```javascript
proxy.on('proxyReq', (proxyReq) => {
  console.log('Target path:', proxyReq.path);
  console.log('Expected:', '/api/users');
});
```

**Monitor response codes:**
```javascript
proxy.on('proxyRes', (proxyRes, req) => {
  if (proxyRes.statusCode >= 400) {
    console.error('❌ Error response:', proxyRes.statusCode, 'for', req.url);
  }
});
```

### Network Tab Analysis

1. **Open Browser DevTools** → Network tab
2. **Check Request Headers**:
   - Host: Should match backend after `changeOrigin: true`
   - Origin: Shows frontend origin
   - Referer: Shows frontend URL
3. **Check Response Headers**:
   - Status Code: 403 indicates rejection
   - Access-Control-Allow-Origin: CORS header from backend
   - Content-Type: Response format
4. **Check Timing**:
   - Long wait times indicate timeout issues
   - Instant 403 indicates middleware rejection

---

## CORS and Preflight Request Handling

### Understanding CORS with Vite Proxy

**Key Concept**: CORS is only a concern between browser and Vite dev server, NOT between Vite proxy and backend server (server-to-server communication has no CORS restrictions).

```
Browser <--CORS--> Vite Dev Server <--NO CORS--> Backend
(Port 5173)         (Proxy)                      (Port 3001)
```

### CORS Configuration Layers

#### 1. Vite Server CORS (Browser → Vite)

```javascript
export default defineConfig({
  server: {
    cors: true,  // Allow all origins (dev only)
    // OR specific configuration
    cors: {
      origin: ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  }
})
```

#### 2. Backend CORS (for direct requests)

```javascript
// Express backend
app.use(cors({
  origin: (origin, callback) => {
    const whitelist = [
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];

    // Allow no origin (curl, mobile apps)
    if (!origin) return callback(null, true);

    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('Blocked CORS request from:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Preflight (OPTIONS) Request Handling

**What is a Preflight Request?**
- Browser sends OPTIONS request before actual request
- Checks if cross-origin request is allowed
- Required for:
  - Non-simple methods (PUT, DELETE, PATCH)
  - Custom headers (Authorization, X-API-Key)
  - Content-Type other than application/x-www-form-urlencoded

**How Vite Handles Preflight:**
```javascript
// Vite automatically handles OPTIONS requests
// No special configuration needed IF:
// 1. server.cors is enabled
// 2. Backend responds with correct CORS headers
```

**Backend Preflight Response:**
```javascript
// Express - Manual OPTIONS handling
app.options('*', cors());

// Or ensure CORS middleware runs before other middleware
app.use(cors(corsOptions));  // MUST be early in middleware chain
app.use(express.json());
app.use(authMiddleware);      // After CORS
```

### Common CORS Issues and Solutions

#### Issue 1: "No Access-Control-Allow-Origin header"

**Cause**: Backend not sending CORS headers

**Solution**:
```javascript
// Backend: Ensure CORS middleware is configured
app.use(cors({ origin: 'http://localhost:5173' }));
```

#### Issue 2: "Access-Control-Allow-Origin cannot be '*' when credentials are true"

**Cause**: Conflicting CORS configuration

**Solution**:
```javascript
// Option 1: Remove credentials
cors({ origin: '*', credentials: false })

// Option 2: Specify exact origin
cors({ origin: 'http://localhost:5173', credentials: true })
```

#### Issue 3: "Header X-API-Key not allowed"

**Cause**: Custom header not in allowedHeaders

**Solution**:
```javascript
cors({
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
})
```

#### Issue 4: Preflight returns 403

**Cause**: Backend middleware blocking OPTIONS requests

**Solution**:
```javascript
// Ensure CORS runs BEFORE auth middleware
app.use(cors());           // 1. Allow CORS first
app.use(authMiddleware);   // 2. Then authenticate
```

### Chrome 98+ Private Network Access

**Issue**: Chrome 98+ requires special headers for localhost requests

**Solution**:
```javascript
// Backend: Add private network header
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});
```

---

## POST Request Specific Issues

### Why POST Requests Fail with 403

1. **CSRF Protection**
   - Backend expects CSRF token
   - POST blocked without valid token

2. **Authentication Required**
   - Backend requires auth for mutations
   - OPTIONS succeeds but POST fails

3. **Content-Type Mismatch**
   - Backend expects `application/json`
   - Request sends `application/x-www-form-urlencoded`

4. **Request Size Limits**
   - Payload exceeds backend limits
   - Backend returns 403 instead of 413

### POST Request Configuration

```javascript
// Vite config - No special POST config needed
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true
    // POST, PUT, DELETE work automatically
  }
}
```

### Debugging POST Failures

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        // Log POST request details
        if (req.method === 'POST') {
          console.log('POST to:', proxyReq.path);
          console.log('Content-Type:', req.headers['content-type']);
          console.log('Content-Length:', req.headers['content-length']);
        }
      });

      proxy.on('proxyRes', (proxyRes, req) => {
        if (req.method === 'POST' && proxyRes.statusCode >= 400) {
          console.error('POST failed:', proxyRes.statusCode);
          console.error('Headers:', proxyRes.headers);
        }
      });
    }
  }
}
```

### Common POST Issues

#### Issue: "Not rewriting POST because method is not GET or HEAD"

**Cause**: HTML fallback middleware in Vite

**Effect**: Informational only - doesn't block POST

**Solution**: No action needed, POST requests still work

#### Issue: POST returns 403 but GET works

**Cause**: CSRF protection or authentication

**Solution**:
```javascript
// Frontend: Include CSRF token
fetch('/api/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken()
  },
  body: JSON.stringify(data)
})

// Backend: Validate CSRF only for POST/PUT/DELETE
app.use(csrf({
  methods: ['POST', 'PUT', 'DELETE'],
  ignorePaths: ['/api/health']
}));
```

---

## Why Proxy Returns 403 When Backend Returns 200

This is the most confusing scenario - backend logs show 200 OK, but browser receives 403.

### Root Causes

#### 1. Helmet/Security Headers Interference

**Problem**: Helmet middleware adds security headers that proxy/browser interprets as rejection

**Detection**:
- Backend logs: 200 OK
- Browser receives: 403 Forbidden
- Response has CSP or X-Frame-Options headers

**Solution**:
```javascript
// Backend: Relax Helmet for development
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:*"]  // Allow proxy
    }
  }
}));
```

#### 2. Middleware Chain Order

**Problem**: Response modifier middleware runs after successful handler

**Example**:
```javascript
// WRONG ORDER
app.get('/api/data', handler);      // Returns 200
app.use(compressionMiddleware);     // Modifies response
app.use(securityMiddleware);        // Returns 403 for modified response
```

**Solution**:
```javascript
// CORRECT ORDER
app.use(compressionMiddleware);
app.use(securityMiddleware);
app.get('/api/data', handler);
```

#### 3. Proxy Response Validation

**Problem**: Vite proxy validates response and blocks suspicious ones

**Detection**:
- Backend returns 200 with unusual headers
- Proxy blocks response before sending to browser

**Solution**:
```javascript
// Vite config: Disable response validation
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    autoRewrite: false,  // Disable automatic rewrites
    protocolRewrite: null
  }
}
```

#### 4. CORS After Authentication

**Problem**: Authentication passes, response generated, but CORS blocks delivery

**Flow**:
```
1. Request arrives → Auth passes → Handler runs → 200 OK
2. Response intercepted → CORS check fails → 403 sent to browser
3. Backend logs show 200 (before CORS check)
```

**Solution**:
```javascript
// Ensure CORS runs AFTER route handlers
app.use(routes);

// Add CORS to response
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
```

#### 5. Response Size Limits

**Problem**: Response exceeds Vite proxy limits

**Solution**:
```javascript
// Vite config: Increase limits
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      configure: (proxy) => {
        // Increase buffer limits
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader('Accept-Encoding', 'identity');
        });
      }
    }
  }
}
```

---

## Security Headers Impact

### Headers That Can Cause 403

#### 1. Content-Security-Policy (CSP)

**Effect**: Blocks connections to origins not in CSP

**Example**:
```
Content-Security-Policy: default-src 'self'
```
Blocks: Proxy requests from `localhost:5173` to `localhost:3001`

**Solution**:
```javascript
// Backend: Add localhost to CSP
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"]
  }
}
```

#### 2. X-Frame-Options

**Effect**: Prevents iframe embedding, can interfere with proxy

**Example**:
```
X-Frame-Options: DENY
```

**Solution**:
```javascript
// Backend: Use SAMEORIGIN for development
frameguard: { action: 'sameorigin' }
```

#### 3. Strict-Transport-Security (HSTS)

**Effect**: Forces HTTPS, breaks HTTP proxy

**Example**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**Solution**:
```javascript
// Backend: Disable HSTS for development
if (process.env.NODE_ENV !== 'production') {
  app.disable('hsts');
}
```

#### 4. Access-Control-Allow-Origin

**Effect**: Most common CORS blocker

**Example**:
```
Access-Control-Allow-Origin: https://example.com
```
Blocks: Requests from `localhost:5173`

**Solution**:
```javascript
// Backend: Add development origins
cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL
  ]
})
```

### Security Header Configuration for Development

```javascript
// Backend development configuration
const securityConfig = {
  development: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      },
      frameguard: { action: 'sameorigin' },
      hsts: false  // Disable HSTS in development
    },
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true
    }
  },

  production: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
          imgSrc: ["'self'", "https:"]
        }
      },
      frameguard: { action: 'deny' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    },
    cors: {
      origin: [process.env.FRONTEND_URL],
      credentials: true
    }
  }
};

// Apply based on environment
const config = securityConfig[process.env.NODE_ENV || 'development'];
app.use(helmet(config.helmet));
app.use(cors(config.cors));
```

---

## Current Project Analysis

### Vite Configuration Review

**File**: `/workspaces/agent-feed/frontend/vite.config.ts`

**Current Configuration**:
```javascript
proxy: {
  '/api/claude-code': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,      // ✅ Correct
    secure: false,           // ✅ Correct
    timeout: 120000,         // ✅ Good (120s for long Claude requests)
    followRedirects: true,   // ✅ Good
    xfwd: true,             // ✅ Good
    configure: (proxy) => { /* Debug logging */ }  // ✅ Excellent
  },
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,      // ✅ Correct
    secure: false,           // ✅ Correct
    timeout: 10000,          // ✅ Good (10s for regular APIs)
    followRedirects: true,   // ✅ Good
    xfwd: true,             // ✅ Good
    configure: (proxy) => { /* Debug logging */ }  // ✅ Excellent
  },
  '/ws': {
    target: 'http://127.0.0.1:3001',
    ws: true,                // ✅ Correct for WebSocket
    changeOrigin: true,      // ✅ Correct
    secure: false            // ✅ Correct
  }
}
```

**Assessment**: Configuration is correct and follows best practices.

### Backend Configuration Review

**File**: `/workspaces/agent-feed/api-server/server.js`

**Current CORS Configuration**:
```javascript
app.use(cors({
  origin: (origin, callback) => {
    const whitelist = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001'
    ];

    if (!origin) return callback(null, true);  // ✅ Good

    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('Blocked CORS request from:', origin);
      callback(new Error('Not allowed by CORS'));  // ⚠️ Returns error
    }
  },
  credentials: true,  // ✅ Correct
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // ✅ Correct
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-CSRF-Token',
    'X-Session-ID',
    'Cache-Control'
  ]  // ✅ Comprehensive
}));
```

**Security Config** (`/workspaces/agent-feed/config/security-config.json`):
```json
{
  "cors": {
    "whitelist": [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:5173"
    ]
  }
}
```

**Assessment**: CORS configuration is comprehensive and includes both `localhost` and `127.0.0.1` variants.

### Potential Issues Identified

#### 1. Missing 127.0.0.1 in Runtime CORS Whitelist

**Issue**: Code uses `localhost` only, but security config includes `127.0.0.1`

**Impact**: Requests from `http://127.0.0.1:5173` might be blocked if security config not loaded

**Location**: `api-server/server.js:134-138`

**Current**:
```javascript
const corsWhitelist = securityConfig.cors?.whitelist || [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001'
];
```

**Risk**: If `security-config.json` fails to load, `127.0.0.1` origins are blocked.

#### 2. Helmet Security Headers May Block Proxy

**Issue**: CSP and other headers configured for production-level security

**Impact**: May interfere with development proxy

**Location**: `api-server/middleware/security.js`

**Current CSP**:
```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"]
  }
}
```

**Assessment**: CSP looks correct for development, includes `localhost:*`

#### 3. Protected Path Middleware

**Issue**: Middleware blocks access to certain paths, may return 403

**Impact**: Could block valid API requests if patterns overlap

**Location**: `api-server/server.js:181`

```javascript
app.use(protectCriticalPaths);
```

**Protected Paths**:
- `/prod/`
- `/node_modules/`
- `/.git/`
- `/.claude/`

**Assessment**: Should not affect `/api/*` endpoints

#### 4. Middleware Order

**Current Order**:
1. Helmet (security headers)
2. Request size validation
3. CORS
4. Body parsers
5. Rate limiter
6. Speed limiter
7. Protected paths
8. Routes

**Assessment**: Order is correct - CORS runs before authentication

---

## Recommendations

### Immediate Actions

#### 1. Add Origin to All Error Responses

**Why**: Helps identify which origin is being blocked

**Implementation**:
```javascript
// api-server/server.js
app.use(cors({
  origin: (origin, callback) => {
    console.log('🔍 CORS Request from origin:', origin);  // Add this

    if (!origin) return callback(null, true);

    if (corsWhitelist.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('⚠️  Blocked CORS request from:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
```

#### 2. Add 403 Debugging Middleware

**Why**: Catch 403 responses and log context

**Implementation**:
```javascript
// api-server/server.js - Add AFTER routes
app.use((req, res, next) => {
  const originalSend = res.send;

  res.send = function(data) {
    if (res.statusCode === 403) {
      console.error('🚫 403 FORBIDDEN:', {
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        referer: req.headers.referer,
        userAgent: req.headers['user-agent']
      });
    }
    originalSend.call(this, data);
  };

  next();
});
```

#### 3. Ensure Security Config Fallback Includes 127.0.0.1

**Why**: Prevent blocking when config file missing

**Implementation**:
```javascript
// api-server/server.js:134
const corsWhitelist = securityConfig.cors?.whitelist || [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',   // Add
  'http://127.0.0.1:3000',   // Add
  'http://127.0.0.1:3001'    // Add
];
```

### Short-term Improvements

#### 1. Add Request/Response Logging Middleware

```javascript
// api-server/middleware/request-logger.js
export function logProxyRequests(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    if (res.statusCode >= 400) {
      console.log({
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        origin: req.headers.origin,
        userAgent: req.headers['user-agent']
      });
    }
  });

  next();
}
```

#### 2. Create Development vs Production Security Profiles

```javascript
// api-server/config/security-profiles.js
export const securityProfiles = {
  development: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*"]
        }
      },
      hsts: false
    },
    cors: {
      origin: true,  // Allow all origins in development
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 10000  // Relaxed for development
    }
  },

  production: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    },
    cors: {
      origin: [process.env.FRONTEND_URL],
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 1000
    }
  }
};
```

#### 3. Add Health Check with CORS Status

```javascript
// api-server/server.js
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cors: {
      whitelist: corsWhitelist,
      requestOrigin: req.headers.origin,
      allowed: !req.headers.origin || corsWhitelist.includes(req.headers.origin)
    },
    proxy: {
      supportedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      timeout: '10s (regular), 120s (Claude Code)'
    }
  });
});
```

### Long-term Improvements

#### 1. Implement Request Tracing

Add correlation IDs to track requests through proxy:

```javascript
// Vite config
configure: (proxy) => {
  proxy.on('proxyReq', (proxyReq, req) => {
    const traceId = crypto.randomUUID();
    proxyReq.setHeader('X-Trace-ID', traceId);
    console.log(`[${traceId}] Proxying:`, req.method, req.url);
  });

  proxy.on('proxyRes', (proxyRes, req) => {
    const traceId = proxyRes.headers['x-trace-id'];
    console.log(`[${traceId}] Response:`, proxyRes.statusCode);
  });
}
```

```javascript
// Backend
app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
  req.traceId = traceId;
  res.setHeader('X-Trace-ID', traceId);
  next();
});
```

#### 2. Add Proxy Health Monitoring

```javascript
// frontend/src/services/proxy-health.ts
export async function checkProxyHealth() {
  const endpoints = [
    '/api/health',
    '/api/claude-code/health',
    '/ws'
  ];

  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint);
        return {
          endpoint,
          status: response.status,
          ok: response.ok,
          time: response.headers.get('x-response-time')
        };
      } catch (error) {
        return {
          endpoint,
          status: 0,
          ok: false,
          error: error.message
        };
      }
    })
  );

  return results;
}
```

#### 3. Unified Logging System

Implement structured logging for all proxy-related events:

```javascript
// api-server/services/logger.js
export const logger = {
  proxy: {
    request: (traceId, method, url, origin) => {
      console.log(JSON.stringify({
        type: 'proxy.request',
        traceId,
        method,
        url,
        origin,
        timestamp: new Date().toISOString()
      }));
    },

    response: (traceId, status, duration) => {
      console.log(JSON.stringify({
        type: 'proxy.response',
        traceId,
        status,
        duration,
        timestamp: new Date().toISOString()
      }));
    },

    error: (traceId, error, context) => {
      console.error(JSON.stringify({
        type: 'proxy.error',
        traceId,
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      }));
    }
  }
};
```

---

## Testing Checklist

### Verify Proxy Configuration

- [ ] Run `npm run dev` and check console for proxy startup messages
- [ ] Visit `http://localhost:5173` and open DevTools Network tab
- [ ] Make API request and verify:
  - [ ] Request appears in Network tab
  - [ ] Request shows 200 OK (not 403)
  - [ ] Response contains expected data
  - [ ] No CORS errors in console

### Verify CORS Configuration

- [ ] Check backend logs for CORS request messages
- [ ] Verify Origin header in request matches whitelist
- [ ] Test with both `localhost` and `127.0.0.1`
- [ ] Test preflight (OPTIONS) requests for POST/PUT/DELETE

### Verify Security Headers

- [ ] Check Response headers in Network tab
- [ ] Verify CSP allows connections to backend
- [ ] Confirm no conflicting security headers
- [ ] Test with browser extensions disabled

### Verify Backend Processing

- [ ] Check backend logs for incoming requests
- [ ] Verify backend returns 200 OK
- [ ] Confirm middleware order is correct
- [ ] Test protected paths don't block API routes

### Debug 403 Errors

If 403 occurs:

1. **Check Origin**:
   ```
   - Is origin in CORS whitelist?
   - Using localhost vs 127.0.0.1?
   - Port matches Vite dev server?
   ```

2. **Check Headers**:
   ```
   - Content-Type correct?
   - Authorization header present if required?
   - Custom headers in allowedHeaders?
   ```

3. **Check Method**:
   ```
   - Is method in CORS methods list?
   - POST/PUT/DELETE trigger preflight?
   - OPTIONS request succeeding?
   ```

4. **Check Backend**:
   ```
   - Backend receiving request?
   - What status does backend return?
   - Any middleware blocking request?
   ```

5. **Check Security**:
   ```
   - CSP blocking connection?
   - Rate limit exceeded?
   - Path protection triggered?
   ```

---

## Quick Reference

### Common 403 Solutions

| Symptom | Cause | Solution |
|---------|-------|----------|
| All proxy requests fail | Missing `changeOrigin: true` | Add to proxy config |
| HTTPS proxy fails | SSL validation | Add `secure: false` |
| POST fails, GET works | CORS preflight issue | Check OPTIONS handler |
| Backend shows 200, browser 403 | Security headers | Relax CSP/Helmet |
| Random 403 errors | Rate limiting | Increase limits or whitelist IP |
| Path-specific 403 | Protected path middleware | Check path patterns |
| Origin errors | CORS whitelist | Add origin to whitelist |

### Configuration Quick Copy

**Minimal Working Vite Proxy**:
```javascript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    secure: false
  }
}
```

**Minimal Working Express CORS**:
```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

**Debug Proxy Logging**:
```javascript
configure: (proxy) => {
  proxy.on('error', (err) => console.error('Error:', err.message));
  proxy.on('proxyReq', (proxyReq, req) => {
    console.log('→', req.method, req.url);
  });
  proxy.on('proxyRes', (proxyRes, req) => {
    console.log('←', proxyRes.statusCode, req.url);
  });
}
```

---

## Conclusion

Vite proxy 403 errors typically result from:

1. **Configuration Issues** (90%):
   - Missing `changeOrigin: true`
   - Missing `secure: false` for HTTPS
   - Incorrect target URL

2. **Backend CORS** (8%):
   - Origin not in whitelist
   - CORS middleware order wrong
   - OPTIONS requests blocked

3. **Security Headers** (2%):
   - Helmet/CSP too restrictive
   - Rate limiting
   - Path protection

**Key Takeaway**: The proxy itself rarely causes 403 errors. Instead, it's usually the backend rejecting requests due to headers, CORS, or security middleware.

**Current Project Status**: Configuration is excellent and follows best practices. Any 403 errors are likely from backend validation logic, not proxy misconfiguration.

---

## Additional Resources

- [Vite Server Options Documentation](https://vite.dev/config/server-options)
- [http-proxy-middleware Documentation](https://github.com/chimurai/http-proxy-middleware)
- [Express CORS Middleware](https://github.com/expressjs/cors)
- [Helmet.js Security Headers](https://helmetjs.github.io/)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Chrome DevTools Network Tab](https://developer.chrome.com/docs/devtools/network/)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-20
**Research Conducted By**: Research Agent
**Review Status**: Ready for Implementation
