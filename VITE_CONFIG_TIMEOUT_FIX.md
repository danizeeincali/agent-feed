# Vite Config Timeout Fix Required

## Issue
The current `vite.config.ts` has a 10-second timeout on line 36:
```typescript
timeout: 10000, // Reduced timeout for faster failure detection
```

This causes Claude Code API requests to timeout since they typically take 14+ seconds.

## Solution
Update `/workspaces/agent-feed/frontend/vite.config.ts`:

### Current Configuration (Line 30-52):
```typescript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    secure: false,
    timeout: 10000, // ❌ TOO SHORT - causes timeout errors
    // ... rest of config
  }
}
```

### Required Fix:
Add a specific configuration for Claude Code endpoints with 120s timeout:

```typescript
proxy: {
  // Claude Code API proxy - INCREASED TIMEOUT for long-running requests
  '/api/claude-code': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    secure: false,
    timeout: 120000, // ✅ 120 seconds - allows Claude responses to complete
    followRedirects: true,
    xfwd: true,
    configure: (proxy, _options) => {
      proxy.on('proxyReq', (proxyReq, req, _res) => {
        console.log('🔍 Claude Code API proxy request:', req.method, req.url);
      });
      proxy.on('error', (err, _req, _res) => {
        console.log('🔍 Claude Code API proxy error:', err.message);
      });
      proxy.on('proxyRes', (proxyRes, req, _res) => {
        console.log('🔍 Claude Code API proxy response:', req.url, '->', proxyRes.statusCode);
      });
    }
  },
  // HTTP API proxy (existing - keep 10s timeout for other endpoints)
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    secure: false,
    timeout: 10000,
    // ... rest of existing config
  },
  // ... rest of proxy config
}
```

## Why This Works
1. **Specific route matching:** `/api/claude-code` is matched before `/api` due to specificity
2. **Long timeout:** 120 seconds allows Claude Code to complete even complex requests
3. **Preserves existing behavior:** Other API routes keep the 10s timeout for fast failure detection

## Implementation Steps
1. Open `/workspaces/agent-feed/frontend/vite.config.ts`
2. Add the `/api/claude-code` proxy configuration **before** the `/api` configuration
3. Save the file
4. Restart the Vite dev server: `npm run dev`
5. Test Avi DM chat - timeouts should be resolved

## Validation
After applying the fix, run:
```bash
cd /workspaces/agent-feed/frontend/tests/e2e
./validate-test-setup.sh
```

Should show:
```
✓ Timeout fix found in vite.config.ts
```

## Testing
Run the comprehensive test suite:
```bash
./run-avi-timeout-tests.sh all
```

All 70+ tests should pass with no timeout errors.

## Expected Results

### Before Fix (10s timeout):
- ❌ Fast messages (5s): Work
- ❌ Medium messages (14s): **TIMEOUT ERROR**
- ❌ Slow messages (30s): **TIMEOUT ERROR**

### After Fix (120s timeout):
- ✅ Fast messages (5s): Work
- ✅ Medium messages (14s): **Work**
- ✅ Slow messages (30s): **Work**

## Notes
- The 10s timeout was intentionally set for "faster failure detection" but this causes issues with Claude Code
- Claude Code responses average 14-20 seconds for typical requests
- Complex analysis can take 30-60 seconds
- 120s timeout is a safe upper bound that still provides failure detection

## Related Files
- Test Suite: `/workspaces/agent-feed/frontend/src/tests/integration/AviDMTimeout.test.tsx`
- Component: `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`
- Documentation: `/workspaces/agent-feed/frontend/tests/e2e/AVI_DM_TIMEOUT_TESTS_README.md`
