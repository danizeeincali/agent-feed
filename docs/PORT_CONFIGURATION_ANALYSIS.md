# Port Configuration Analysis & Resolution

## Executive Summary

The frontend was running on port 5173 instead of the intended port due to configuration conflicts between the Vite configuration (port 3001) and the WebSocket Hub (also port 3001). This caused Vite to fall back to its default port 5173.

## Issue Analysis

### Root Causes Identified

1. **Port Conflict**: Both frontend (Vite) and WebSocket Hub were configured for port 3001
2. **Inconsistent Environment Variables**: Multiple `.env` files with conflicting port assignments
3. **Missing Proxy Configuration**: Frontend wasn't properly proxying API calls to backend
4. **Service Dependencies**: Services expecting different ports than actually configured

### Current State (Before Fix)

| Service | Configured Port | Actual Port | Status |
|---------|----------------|-------------|--------|
| Backend API | 3000 | 3000 | ✅ Working |
| Frontend | 3001 | 5173 | ❌ Fallback |
| WebSocket Hub | 3001 | 3001 | ❌ Conflict |
| Dual Instance | 3002 | 3002 | ✅ Working |

## Resolution Strategy

### New Port Assignments

| Service | New Port | Purpose | Benefits |
|---------|----------|---------|----------|
| **Frontend** | 3000 | React dev server | Standard React port |
| **Backend API** | 3001 | Express server | Clear API separation |
| **WebSocket Hub** | 3004 | Real-time comms | Dedicated WebSocket port |
| **Dual Instance** | 3002 | Instance mgmt | No change needed |

### Configuration Changes Made

#### 1. Frontend Configuration
- **File**: `/frontend/vite.config.ts`
  - Changed port from 3001 → 3000
  - Enabled proxy for `/api` → `http://localhost:3001`
  - Enabled proxy for `/ws` → `ws://localhost:3004`

#### 2. Environment Variables
- **File**: `/frontend/.env`
  - Updated `VITE_WEBSOCKET_HUB_URL` from port 3003 → 3004
  - Kept `VITE_API_BASE_URL` as `http://localhost:3001`

- **File**: `/.env`
  - Changed backend `PORT` from 3000 → 3001
  - Added `WEBSOCKET_HUB_PORT=3004`
  - Updated CORS origins to include 3004

- **File**: `/.env.example`
  - Updated all port references for consistency
  - Changed `WEBSOCKET_HUB_PORT` from 3001 → 3004

#### 3. WebSocket Configuration
- **File**: `/src/websockets/websocket-hub-integration.ts`
  - Changed default port from 3001 → 3004

- **File**: `/src/websockets/hub-server.ts`
  - Changed default port from 3001 → 3004

- **File**: `/src/api/server.ts`
  - Updated `WEBSOCKET_HUB_PORT` default from 3001 → 3004

- **File**: `/src/nld/index.ts`
  - Updated Claude Flow MCP URL from port 3001 → 3004

## Benefits of New Configuration

### 1. Standard Port Usage
- **Port 3000**: Standard for React frontend development
- **Port 3001**: Clear separation for backend API
- **Port 3004**: Dedicated WebSocket communication

### 2. No More Conflicts
- Each service has its own dedicated port
- Vite won't fall back to random ports
- Services can start reliably

### 3. Proper Proxy Setup
- Frontend proxies API calls seamlessly
- WebSocket connections properly routed
- Development environment matches production expectations

### 4. Clear Service Boundaries
- Frontend: UI/UX on port 3000
- Backend: API/data on port 3001  
- WebSocket: Real-time on port 3004
- Dual Instance: Management on port 3002

## Verification Steps

### 1. Restart Services
```bash
# Stop current processes
pkill -f "vite|tsx"

# Start backend (should be port 3001)
npm run dev

# Start frontend (should be port 3000)
cd frontend && npm run dev
```

### 2. Verify Port Usage
```bash
# Check port assignments
netstat -tulpn | grep -E ':(3000|3001|3004)'
```

### 3. Test Connectivity
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/health
- WebSocket: ws://localhost:3004

## Migration Checklist

- [x] Update Vite configuration
- [x] Update all environment files
- [x] Update WebSocket server configurations
- [x] Update CORS origins
- [x] Update proxy configurations
- [x] Update documentation

## Next Steps

1. **Restart Development Servers**: Stop current processes and restart with new configuration
2. **Test All Connections**: Verify frontend can reach backend and WebSocket services
3. **Update Documentation**: Ensure all developer docs reflect new port assignments
4. **Production Configuration**: Apply similar changes to production environment files

## Troubleshooting

### If Frontend Still Uses 5173
- Ensure no other process is using port 3000
- Check for cached Vite processes: `pkill -f vite`
- Verify `vite.config.ts` has `strictPort: true`

### If Backend Connection Fails
- Verify backend is running on port 3001
- Check proxy configuration in `vite.config.ts`
- Ensure CORS allows port 3000

### If WebSocket Fails
- Verify WebSocket Hub is on port 3004
- Check `VITE_WEBSOCKET_HUB_URL` environment variable
- Ensure proxy routes `/ws` to correct port

## Performance Impact

### Positive Impacts
- **Reduced Port Conflicts**: Services start reliably
- **Better Development Experience**: Standard ports, clear separation
- **Improved Debugging**: Each service has dedicated port
- **Production Alignment**: Development matches production setup

### No Negative Impacts
- All changes are configuration-only
- No code logic changes required
- Backward compatibility maintained through proxy setup