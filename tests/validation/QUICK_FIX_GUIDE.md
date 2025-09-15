# Quick Fix Guide: Dynamic Pages Production Issues

**Time to Fix: 30-60 minutes**

## 🚨 Critical Issues Identified

1. **API Base URL Misconfiguration** - Frontend calls wrong port
2. **WebSocket Endpoint Issues** - Real-time features failing
3. **Health Check URL Problems** - Network validation failing

## 🔧 Step-by-Step Fixes

### Fix 1: Update API Configuration

**File:** `/workspaces/agent-feed/frontend/src/config/api.ts` (or equivalent)

```typescript
// BEFORE (incorrect)
const API_BASE_URL = 'http://localhost:5173';

// AFTER (correct)
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'http://localhost:3000'  // Production backend
  : process.env.VITE_API_URL || 'http://localhost:3000';
```

### Fix 2: WebSocket Configuration

**File:** `/workspaces/agent-feed/frontend/src/services/websocket.ts` (or equivalent)

```typescript
// BEFORE (incorrect)
const WS_URL = 'ws://localhost:5173/ws';

// AFTER (correct)
const WS_URL = process.env.NODE_ENV === 'production'
  ? 'ws://localhost:3000/ws'
  : 'ws://localhost:3000/ws';
```

### Fix 3: Health Check Endpoint

**File:** `/workspaces/agent-feed/frontend/public/network-connectivity-fix.js`

```javascript
// BEFORE (line ~146)
const HEALTH_URL = 'http://localhost:5173/health';

// AFTER
const HEALTH_URL = 'http://localhost:3000/health';
```

### Fix 4: Environment Variables

**File:** `/workspaces/agent-feed/frontend/.env.production`

```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
VITE_HEALTH_URL=http://localhost:3000/health
```

## 🧪 Validation Steps

After applying fixes:

1. **Rebuild production:**
   ```bash
   cd frontend && npm run build
   ```

2. **Restart servers:**
   ```bash
   npm run start
   ```

3. **Re-run validation:**
   ```bash
   node /workspaces/agent-feed/tests/validation/final-production-test.js
   ```

4. **Expected result:** All tests should pass with green checkmarks ✅

## 🎯 Success Criteria

After fixes, you should see:
- ✅ 5/5 pages loading successfully
- ✅ 0 console errors
- ✅ API calls returning 200 status
- ✅ WebSocket connections established
- ✅ Overall production readiness: 100%

## 🔍 Verification Commands

```bash
# Test frontend access
curl -f http://localhost:4173

# Test backend health
curl -f http://localhost:3000/health

# Test API endpoint
curl -f http://localhost:3000/api/agents

# Check WebSocket (if endpoint available)
curl -f http://localhost:3000/ws
```

## ⚡ Quick Test Script

```bash
#!/bin/bash
echo "🧪 Quick Production Validation..."

# Check servers
echo "1. Checking frontend..."
curl -s http://localhost:4173 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend down"

echo "2. Checking backend..."
curl -s http://localhost:3000/health > /dev/null && echo "✅ Backend OK" || echo "❌ Backend down"

echo "3. Checking API..."
curl -s http://localhost:3000/api/agents > /dev/null && echo "✅ API OK" || echo "❌ API down"

echo "4. Running validation..."
node /workspaces/agent-feed/tests/validation/final-production-test.js
```

Save as `quick-validate.sh`, make executable with `chmod +x quick-validate.sh`, then run with `./quick-validate.sh`

---

**These fixes should resolve all critical issues and make the dynamic pages feature production-ready within 1 hour.**