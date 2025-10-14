# Security Validation Quick Reference

## Quick Start

```javascript
import { PathValidator, FileOperationValidator, RateLimiter } from './worker/security/index.js';

// Initialize
const pathValidator = new PathValidator({
  allowedWorkspace: '/workspaces/agent-feed/prod/agent_workspace'
});

const fileValidator = new FileOperationValidator({
  allowedWorkspace: '/workspaces/agent-feed/prod/agent_workspace',
  maxFileSize: 10 * 1024 * 1024 // 10MB
});

const rateLimiter = new RateLimiter({
  maxOperations: 10,
  windowMs: 60000 // 1 minute
});
```

## Common Use Cases

### 1. Validate a File Path

```javascript
const result = await pathValidator.validate('/path/to/file.txt');

if (result.valid) {
  console.log('Safe path:', result.normalizedPath);
} else {
  console.error('Rejected:', result.reason);
}
```

### 2. Write a File Safely

```javascript
try {
  const result = await fileValidator.safeWrite(
    '/path/to/file.txt',
    'Hello, World!'
  );
  console.log('File written:', result.path);
  if (result.contentModified) {
    console.log('Content was sanitized');
  }
} catch (error) {
  console.error('Write failed:', error.message);
}
```

### 3. Read a File Safely

```javascript
try {
  const content = await fileValidator.safeRead('/path/to/file.txt');
  console.log('File content:', content);
} catch (error) {
  console.error('Read failed:', error.message);
}
```

### 4. Check Rate Limit

```javascript
const result = rateLimiter.recordOperation('user123');

if (result.success) {
  console.log('Operation allowed');
  console.log('Remaining:', result.remaining);
} else {
  console.error('Rate limited');
  console.log('Retry after:', result.retryAfter, 'seconds');
}
```

### 5. Complete Secure Operation

```javascript
async function secureWrite(userId, filePath, content) {
  // 1. Check rate limit
  const rateCheck = rateLimiter.recordOperation(userId);
  if (!rateCheck.success) {
    throw new Error(`Rate limited: retry after ${rateCheck.retryAfter}s`);
  }

  // 2. Validate and write (includes path validation)
  try {
    const result = await fileValidator.safeWrite(filePath, content);
    return {
      success: true,
      path: result.path,
      sanitized: result.contentModified
    };
  } catch (error) {
    throw new Error(`Write failed: ${error.message}`);
  }
}
```

## Security Checks Overview

### PathValidator Checks

| Check | Description | Example Blocked |
|-------|-------------|-----------------|
| Traversal | Directory traversal patterns | `../../../etc/passwd` |
| Workspace | Outside allowed workspace | `/etc/passwd` |
| Hidden | Files starting with dot | `.env`, `.git/config` |
| Sensitive | Sensitive file patterns | `password.txt`, `id_rsa` |
| Symlinks | Symbolic links | Any symlink path |
| Null Bytes | Null byte injection | `file\0.txt` |

### FileOperationValidator Checks

| Check | Description | Limit |
|-------|-------------|-------|
| Size | File size limit | 10MB default |
| Extension | Allowed file types | .txt, .js, .json, etc. |
| Content | Null bytes, control chars | Sanitized |
| Encoding | UTF-8 validation | Invalid UTF-8 rejected |
| Binary | Binary file detection | Detected and flagged |

### RateLimiter Checks

| Tier | Default Limit | Window |
|------|---------------|--------|
| Read | 20 ops | 1 minute |
| Write | 10 ops | 1 minute |
| Delete | 5 ops | 1 minute |

## Statistics & Monitoring

### Get Statistics

```javascript
// Path validation stats
const pathStats = pathValidator.getStats();
console.log('Validations:', pathStats.validations);
console.log('Rejections:', pathStats.rejections);
console.log('Rejection rate:', pathStats.rejectionRate);

// File operation stats
const fileStats = fileValidator.getStats();
console.log('Size limit exceeded:', fileStats.sizeLimitExceeded);
console.log('Content sanitized:', fileStats.contentSanitized);

// Rate limiter stats
const rateStats = rateLimiter.getStats();
console.log('Total requests:', rateStats.totalRequests);
console.log('Blocked requests:', rateStats.blockedRequests);
console.log('Block rate:', rateStats.blockRate);
```

### Monitor Security Events

```javascript
setInterval(() => {
  const stats = pathValidator.getStats();

  // Alert on high rejection rate
  if (parseFloat(stats.rejectionRate) > 10) {
    console.warn('⚠️ High rejection rate detected:', stats);
  }

  // Alert on attack patterns
  if (stats.traversalAttempts > 5) {
    console.error('🚨 Multiple traversal attempts:', stats.traversalAttempts);
  }
}, 60000); // Check every minute
```

## Error Handling

### Standard Error Messages

```javascript
// Path validation errors
"Invalid path: path must be a non-empty string"
"Invalid path: contains null byte"
"Path traversal attempt detected"
"Path outside allowed workspace"
"Hidden files not allowed"
"Sensitive file pattern detected"
"Symlinks not allowed"

// File validation errors
"Content required for write operation"
"File extension .exe not allowed"
"Content size 12345678 exceeds maximum 10485760 bytes"
"Invalid UTF-8 encoding detected"
"File not found"

// Rate limiting errors
"Rate limit exceeded. Retry after 45 seconds"
```

### Try-Catch Pattern

```javascript
async function handleFileOperation(userId, operation, path, content) {
  try {
    // Rate limit check
    const rateCheck = rateLimiter.recordOperation(userId, operation);
    if (!rateCheck.success) {
      return {
        success: false,
        error: 'RATE_LIMITED',
        retryAfter: rateCheck.retryAfter
      };
    }

    // Execute operation
    let result;
    if (operation === 'write') {
      result = await fileValidator.safeWrite(path, content);
    } else if (operation === 'read') {
      result = await fileValidator.safeRead(path);
    }

    return {
      success: true,
      data: result
    };

  } catch (error) {
    // Parse error type
    if (error.message.includes('traversal')) {
      return { success: false, error: 'INVALID_PATH', message: 'Path traversal detected' };
    }
    if (error.message.includes('size exceeds')) {
      return { success: false, error: 'FILE_TOO_LARGE', message: 'File exceeds 10MB limit' };
    }
    if (error.message.includes('not found')) {
      return { success: false, error: 'NOT_FOUND', message: 'File not found' };
    }

    return { success: false, error: 'UNKNOWN', message: error.message };
  }
}
```

## Testing

### Run Security Tests

```bash
# All security tests
npm test -- __tests__/worker/security/

# Specific test suite
npm test -- __tests__/worker/security/PathValidator.test.js
npm test -- __tests__/worker/security/AttackScenarios.test.js

# Watch mode
npm test -- __tests__/worker/security/ --watch
```

### Test Coverage

```bash
# Generate coverage report
npm test -- __tests__/worker/security/ --coverage
```

## Configuration Examples

### Strict Security (Production)

```javascript
const strictConfig = {
  allowedWorkspace: '/var/app/workspace',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxOperations: 5,              // 5 ops/min
  windowMs: 60000
};
```

### Relaxed Security (Development)

```javascript
const devConfig = {
  allowedWorkspace: '/tmp/dev-workspace',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxOperations: 50,              // 50 ops/min
  windowMs: 60000
};
```

### Custom File Extensions

```javascript
const validator = new FileOperationValidator({
  allowedWorkspace: '/workspace',
  allowedExtensions: [
    '.txt', '.md', '.json',
    '.js', '.ts', '.jsx', '.tsx',
    '.py', '.java', '.go'
  ]
});
```

## Troubleshooting

### Issue: "Path outside allowed workspace"

**Cause**: Path resolves outside configured workspace
**Solution**: Ensure path is within `/workspaces/agent-feed/prod/agent_workspace`

### Issue: "Rate limit exceeded"

**Cause**: Too many operations in time window
**Solution**: Wait for retry period or increase limits

### Issue: "Content size exceeds maximum"

**Cause**: File/content larger than 10MB
**Solution**: Reduce file size or increase `maxFileSize` config

### Issue: "Hidden files not allowed"

**Cause**: Path includes hidden files (starting with .)
**Solution**: Use non-hidden files or adjust validation rules

## Best Practices

1. ✅ **Always validate paths** before file operations
2. ✅ **Check rate limits** at the start of operations
3. ✅ **Use safe operations** (`safeRead`, `safeWrite`, `safeDelete`)
4. ✅ **Monitor statistics** for security events
5. ✅ **Log rejected operations** for audit trail
6. ✅ **Handle errors gracefully** with user-friendly messages
7. ✅ **Reset rate limits** only when necessary
8. ✅ **Keep configurations strict** in production

## Additional Resources

- [Full Documentation](./SECURITY.md)
- [Test Examples](./__tests__/worker/security/)
- [Attack Scenarios](./__tests__/worker/security/AttackScenarios.test.js)
