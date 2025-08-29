# GitHub Codespaces Web Connectivity Solutions Research Report

## Executive Summary

**Issue**: ERR_SOCKET_NOT_CONNECTED errors in GitHub Codespaces when accessing Vite development server through browser, despite curl requests succeeding.

**Root Cause**: WebSocket (HMR) connection failures due to GitHub Codespaces port forwarding complexities and browser security policies.

**Environment Confirmed**:
- Codespaces: `true`
- Codespace Name: `animated-guacamole-4jgqg976v49pcqwqv`
- Port Forwarding Domain: `app.github.dev`
- Vite Server: Running on `0.0.0.0:5173` ✅
- HTTP Responses: Working (curl returns 200 OK) ✅

---

## Root Cause Analysis

### 1. WebSocket Connection Failures (Primary Issue)

**Problem**: Vite's Hot Module Replacement (HMR) uses WebSockets to communicate with the browser. In GitHub Codespaces:
- Port forwarding converts `localhost:5173` to `https://codespace-name-5173.app.github.dev`
- WebSocket connections fail because they attempt to connect to the original port rather than the proxied URL
- Browser security policies block mixed HTTP/HTTPS content

**Citation**: [Vite GitHub Issue #16448](https://github.com/vitejs/vite/issues/16448) - "Codespace will forward eg. port 3000 to an xxxx.apps.codespaces.githubusercontent.com (port 80). Vite tries to connect to the port which is a global constant and is different than the proxied port"

### 2. Browser Security Policies

**CORS and Mixed Content**: Modern browsers implement strict security policies:
- Cross-Origin Resource Sharing (CORS) restrictions
- Mixed content blocking (HTTPS pages requesting HTTP resources)
- Chrome's Private Network Access (CORS-RFC1918) preventing public networks from accessing private networks

**Citation**: [MDN Mixed Content Documentation](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)

### 3. Port Forwarding Configuration Issues

**GitHub Codespaces Port Forwarding**:
- Automatic forwarding detects localhost URLs in console output
- Default protocol is HTTP, but can be changed to HTTPS
- Port visibility can be private (organization) or public

---

## Step-by-Step Fix Procedures

### Solution 1: Configure Vite HMR Client Port (RECOMMENDED)

**For GitHub Codespaces specifically:**

1. **Update `vite.config.ts`** with Codespaces-aware configuration:

```typescript
export default defineConfig({
  server: {
    host: true, // Already configured ✅
    port: 5173,
    hmr: {
      clientPort: process.env.CODESPACES ? 443 : 5173,
      host: process.env.CODESPACES ? 'localhost' : undefined
    }
  }
})
```

2. **Alternative Environment-Based Configuration**:

```typescript
server: {
  hmr: {
    clientPort: process.env.CODESPACES ? 443 : undefined,
    // Force WSS in production-like environments
    protocol: process.env.CODESPACES ? 'wss' : 'ws'
  }
}
```

**Citation**: [Vite GitHub Discussion #16451](https://github.com/vitejs/vite/discussions/16451)

### Solution 2: Clear Vite Cache and Restart

If configuration changes don't take effect:

```bash
# Clear Vite cache
rm -rf ./node_modules/.vite
# Restart Vite process
npm run dev
```

### Solution 3: Configure Port as HTTPS in Codespaces

1. Open the PORTS tab in VS Code
2. Right-click port 5173
3. Select "Change Port Protocol" → "HTTPS"
4. Update Vite config to match:

```typescript
server: {
  https: process.env.CODESPACES ? true : false
}
```

### Solution 4: Make Port Public (If Needed)

1. Right-click port 5173 in PORTS tab
2. Select "Port Visibility" → "Public"
3. Share the generated `*.app.github.dev` URL

---

## Alternative Access Methods

### 1. Codespaces Preview Tab
- **Access**: Click globe icon in PORTS tab
- **Benefits**: Integrated viewing within VS Code
- **Limitations**: Browser-based editor only supports HTTP/HTTPS

### 2. Direct Port Access
- **URL Format**: `https://codespace-name-5173.app.github.dev`
- **Benefits**: Full browser functionality
- **Requirements**: Port must be public for external access

### 3. VS Code Desktop Connection
- **Access**: Connect via VS Code desktop application
- **Benefits**: Full TCP connection support
- **Limitations**: Requires VS Code installation

---

## Best Practices for Codespaces Development

### 1. Development Server Configuration

```typescript
// Recommended vite.config.ts for Codespaces
export default defineConfig({
  server: {
    host: true, // Allow external connections
    port: 5173,
    cors: true, // Enable CORS
    hmr: {
      clientPort: process.env.CODESPACES ? 443 : 5173,
      host: process.env.CODESPACES ? undefined : 'localhost'
    }
  }
})
```

### 2. Environment Detection

```typescript
const isCodespaces = process.env.CODESPACES === 'true'
const codespaceName = process.env.CODESPACE_NAME
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
```

### 3. DevContainer Configuration

Add to `.devcontainer/devcontainer.json`:

```json
{
  "forwardPorts": [5173, 3000],
  "portsAttributes": {
    "5173": {
      "label": "Vite Dev Server",
      "protocol": "https"
    }
  }
}
```

---

## Security Considerations

### 1. Port Visibility
- **Private**: Accessible within organization only
- **Public**: Accessible to anyone with URL
- **Recommendation**: Use private for development, public only when necessary

### 2. HTTPS Configuration
- **Mixed Content**: Avoid HTTP resources on HTTPS pages
- **WebSocket Security**: Use WSS (WebSocket Secure) for HTTPS sites
- **CORS**: Configure proper origins for cross-domain requests

---

## Troubleshooting Checklist

### ✅ Server Status
- [x] Vite server running on 0.0.0.0:5173
- [x] Port listening and accepting connections
- [x] HTTP requests return 200 OK

### 🔧 Configuration Fixes Needed
- [ ] HMR client port configured for Codespaces
- [ ] Port protocol set to HTTPS in Codespaces
- [ ] WebSocket connections using WSS protocol

### 🔍 Debug Steps
1. Check browser developer console for specific WebSocket errors
2. Verify port forwarding in VS Code PORTS tab
3. Test direct access via Codespaces-generated URL
4. Clear Vite cache and restart server

---

## Authoritative Sources

1. **GitHub Codespaces Documentation**
   - [Port Forwarding Guide](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)
   - [Troubleshooting Port Forwarding](https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-port-forwarding-for-github-codespaces)

2. **Vite Documentation**
   - [Server Options](https://vite.dev/config/server-options)
   - [Troubleshooting Guide](https://vite.dev/guide/troubleshooting)

3. **Browser Security**
   - [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors)
   - [Mixed Content Security](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)

4. **Community Solutions**
   - [Vite Issue #16448](https://github.com/vitejs/vite/issues/16448)
   - [Stack Overflow: Vite Server localhost issues](https://stackoverflow.com/questions/70694187/vite-server-is-running-but-not-working-on-localhost)

---

## Next Steps

1. Implement HMR client port configuration
2. Test WebSocket connections in browser developer tools
3. Configure port protocol as HTTPS if needed
4. Verify access through both preview tab and direct URL
5. Document final working configuration for team reference

---

*Report generated: 2025-08-29*  
*Environment: GitHub Codespaces (animated-guacamole-4jgqg976v49pcqwqv)*  
*Research conducted by: Research and Analysis Agent*