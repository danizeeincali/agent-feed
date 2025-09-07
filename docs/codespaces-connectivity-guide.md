# Codespaces Network Connectivity Guide

## Overview
This guide helps diagnose and resolve network connectivity issues in GitHub Codespaces environments, particularly the common ERR_SOCKET_NOT_CONNECTED error when accessing development servers from browsers.

## Quick Diagnostics

### 1. Immediate Testing
Use the provided quick connectivity test:
```bash
# Test default ports (3000, 5173)
./scripts/test-connectivity.sh

# Test specific ports
./scripts/test-connectivity.sh 3000 8080 4000
```

### 2. Comprehensive Analysis
Run the full network diagnostics:
```bash
# Detailed network analysis
node scripts/network-diagnostics.js

# Test specific ports
node scripts/network-diagnostics.js 3000 5173
```

### 3. Browser Testing
Automated browser connectivity validation:
```bash
# Playwright regression tests
node scripts/playwright-connectivity-tests.js
```

## Common Issues and Solutions

### 1. Server Binding Issues

**Problem**: Server bound to localhost/127.0.0.1 only
```
❌ Port 3000: bound to localhost only - may not work in Codespaces
```

**Solution**: Configure server to bind to all interfaces (0.0.0.0)

#### Vite Configuration (Frontend)
```javascript
// vite.config.js
export default {
  server: {
    host: '0.0.0.0',  // Bind to all interfaces
    port: 5173
  }
}
```

#### Express/Node.js Configuration (Backend)
```javascript
// server.js
const app = express();
const port = process.env.PORT || 3000;

// Bind to all interfaces
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
```

#### Next.js Configuration
```javascript
// next.config.js
module.exports = {
  // Development server configuration
  async rewrites() {
    return []
  }
}

// Or use CLI flag
// npm run dev -- -H 0.0.0.0
```

### 2. Port Forwarding Configuration

**Problem**: Ports not forwarded or marked as private

**Solution A**: Configure in .devcontainer/devcontainer.json
```json
{
  "name": "Development Environment",
  "forwardPorts": [3000, 5173, 8080],
  "portsAttributes": {
    "3000": {
      "visibility": "public",
      "label": "Backend API"
    },
    "5173": {
      "visibility": "public", 
      "label": "Frontend Dev Server"
    }
  }
}
```

**Solution B**: Configure in VS Code Ports Panel
1. Open Command Palette (Ctrl+Shift+P)
2. Run "Ports: Focus on Ports View"
3. Right-click on your port
4. Select "Port Visibility" > "Public"

### 3. DNS Resolution Issues

**Problem**: Browser cannot resolve localhost or 127.0.0.1

**Solution**: Use Codespaces-generated URLs
```
Format: https://{codespace-name}-{port}.{domain}
Example: https://myproject-5173.githubpreview.dev
```

The diagnostics script automatically detects and tests these URLs.

## Codespaces-Specific Configuration

### Environment Variables
Codespaces provides these helpful environment variables:
```bash
CODESPACES=true
CODESPACE_NAME=your-codespace-name
GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN=githubpreview.dev
```

### Automatic Port Detection
Codespaces automatically detects servers running on common ports, but manual configuration ensures reliability.

### Port Visibility Levels
- **Private**: Only accessible to you when authenticated
- **Organization**: Accessible to organization members
- **Public**: Accessible to anyone with the URL

## Troubleshooting Workflow

### Step 1: Verify Server Status
```bash
# Check if servers are running
netstat -tlnp | grep -E ':(3000|5173|8080)'

# Or using ss
ss -tlnp | grep -E ':(3000|5173|8080)'
```

### Step 2: Test Local Connectivity
```bash
# Test localhost access
curl -I http://localhost:3000
curl -I http://localhost:5173

# Test all interfaces
curl -I http://127.0.0.1:3000
curl -I http://0.0.0.0:3000
```

### Step 3: Check Network Interfaces
```bash
# List network interfaces
ip addr show

# Or using ifconfig
ifconfig
```

### Step 4: Test Codespaces URLs
```bash
# Test public access (replace with your codespace name)
curl -I https://yourcodespace-3000.githubpreview.dev
curl -I https://yourcodespace-5173.githubpreview.dev
```

## Prevention Best Practices

### 1. Default Configuration
Always configure servers for Codespaces compatibility:

```javascript
// Universal server configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const isCodespaces = process.env.CODESPACES === 'true';

const serverConfig = {
  host: isDevelopment ? '0.0.0.0' : 'localhost',
  port: process.env.PORT || 3000
};
```

### 2. Environment Detection
```javascript
function getServerUrl() {
  if (process.env.CODESPACES) {
    const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'githubpreview.dev';
    return `https://${process.env.CODESPACE_NAME}-${port}.${domain}`;
  }
  return `http://localhost:${port}`;
}
```

### 3. Health Checks
Implement server health endpoints:
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.CODESPACES ? 'codespaces' : 'local'
  });
});
```

## Error Patterns and Solutions

### ERR_SOCKET_NOT_CONNECTED
**Causes**:
- Server not running
- Server bound to localhost only
- Port forwarding misconfigured
- Network interface issues

**Diagnostics**:
1. Run connectivity tests
2. Check server binding
3. Verify port forwarding
4. Test network interfaces

### ERR_CONNECTION_REFUSED
**Causes**:
- Server not started
- Wrong port number
- Firewall blocking connection

**Solutions**:
1. Start development servers
2. Verify correct port numbers
3. Check server logs for errors

### 403 Forbidden (Codespaces)
**Causes**:
- Port marked as private
- Authentication required

**Solutions**:
1. Change port visibility to public
2. Access via authenticated browser

## Advanced Diagnostics

### Network Interface Analysis
```bash
# View all network connections
sudo netstat -tuln

# Check routing table
ip route show

# Test specific interface binding
nc -l -p 8080 0.0.0.0  # Bind to all interfaces
nc -l -p 8080 127.0.0.1  # Bind to localhost only
```

### DNS Resolution Testing
```bash
# Test DNS resolution
nslookup localhost
nslookup 127.0.0.1

# Test with dig
dig localhost
dig 127.0.0.1
```

## Automated Monitoring

### Continuous Health Checks
```javascript
// health-monitor.js
setInterval(async () => {
  try {
    const response = await fetch('http://localhost:3000/health');
    console.log('✅ Server healthy:', await response.json());
  } catch (error) {
    console.error('❌ Server unhealthy:', error.message);
  }
}, 30000); // Check every 30 seconds
```

### Integration with CI/CD
```yaml
# .github/workflows/connectivity-test.yml
name: Connectivity Test
on: [push, pull_request]

jobs:
  test-connectivity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Start servers
        run: |
          npm run dev:backend &
          npm run dev:frontend &
          
      - name: Test connectivity
        run: |
          ./scripts/test-connectivity.sh
          node scripts/network-diagnostics.js
```

## Support and Resources

### Diagnostic Files Generated
- `network-diagnostics-report.json` - Comprehensive network analysis
- `connectivity-test-report.json` - Quick connectivity results
- `playwright-connectivity-report.json` - Browser-based test results
- `connectivity-screenshots/` - Failure screenshots for debugging

### Additional Resources
- [GitHub Codespaces Documentation](https://docs.github.com/en/codespaces)
- [Port Forwarding Guide](https://docs.github.com/en/codespaces/developing-in-codespaces/forwarding-ports-in-your-codespace)
- [Devcontainer Configuration](https://containers.dev/implementors/json_reference/)

### Getting Help
1. Check diagnostic reports for specific error patterns
2. Review server logs for binding and startup errors
3. Verify devcontainer.json configuration
4. Test with different browsers and network conditions
5. Contact support with diagnostic report output

## Summary

The key to resolving Codespaces connectivity issues is:
1. **Proper server binding** (0.0.0.0 instead of localhost)
2. **Correct port forwarding** configuration
3. **Public port visibility** settings
4. **Comprehensive testing** across different access methods

Use the provided diagnostic tools to identify specific issues and follow the targeted solutions above.