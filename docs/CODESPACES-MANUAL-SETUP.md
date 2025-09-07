# Manual Codespaces Port Forwarding Setup

## Quick Fix Instructions

If the application is not accessible via the Codespaces URL, follow these steps:

### Method 1: VS Code Ports Tab (Recommended)

1. **Open the Ports Tab**:
   - In VS Code, look at the bottom panel
   - Click on "PORTS" tab (next to Terminal, Problems, etc.)

2. **Find Port 5173**:
   - Look for port 5173 in the list
   - It should show "Local Address: localhost:5173"

3. **Make Port Public**:
   - Right-click on port 5173
   - Select "Port Visibility" → "Public"
   - The port should now show a globe icon 🌐

4. **Copy the Public URL**:
   - Right-click on port 5173
   - Select "Copy Local Address" or "Open in Browser"
   - The URL format will be: `https://[TOKEN]-5173.app.github.dev`

### Method 2: GitHub CLI

```bash
# List current ports
gh codespace ports list

# Forward port 5173 publicly
gh codespace ports forward 5173:5173 --visibility public

# Check if port is now forwarded
gh codespace ports list --json | jq '.[] | select(.sourcePort == 5173)'
```

### Method 3: Command Line Check

```bash
# Run the connectivity test script
./scripts/test-connectivity.sh

# Or run comprehensive diagnostics
node scripts/network-diagnostics.cjs
```

## Current Status

- ✅ **Local Server**: Running on `http://localhost:5173`
- ✅ **Network Binding**: Correctly bound to `0.0.0.0:5173`
- ✅ **Vite Configuration**: Fixed for Codespaces compatibility
- ⚠️ **Port Forwarding**: May require manual setup

## Your Application URLs

- **Local (within Codespace)**: `http://localhost:5173`
- **Public (browser access)**: `https://BI4VR75Y-5173.app.github.dev`

## Troubleshooting

### If Port Forwarding Fails

1. **Restart the development server**:
   ```bash
   # Kill existing server
   pkill -f "vite"
   
   # Restart server
   cd frontend && npm run dev
   ```

2. **Check server binding**:
   ```bash
   ss -tuln | grep :5173
   # Should show: 0.0.0.0:5173 (not 127.0.0.1:5173)
   ```

3. **Manual port forward**:
   - Go to Ports tab in VS Code
   - Click "Forward a Port" button
   - Enter "5173"
   - Set visibility to "Public"

### If Browser Shows 404

- Wait 30-60 seconds for port forwarding to activate
- Try hard refresh: `Ctrl+F5` or `Cmd+Shift+R`
- Check that port 5173 shows "Public" in Ports tab
- Verify the Codespace URL format is correct

### Common Issues

1. **Port not public**: Ensure visibility is set to "Public" not "Private"
2. **Forwarding delay**: GitHub port forwarding can take 30-60 seconds
3. **Wrong URL format**: URL should be `https://[8-char-token]-5173.app.github.dev`
4. **Server binding**: Ensure Vite binds to `0.0.0.0` not `localhost`

## Success Indicators

When everything is working correctly, you should see:

```
🔍 Testing all network interfaces...
✅ localhost:5173 OK
✅ 127.0.0.1:5173 OK  
✅ 0.0.0.0:5173 OK
✅ 10.0.2.129:5173 OK
✅ Codespace URL OK
```

And the Ports tab should show:
- Port 5173 with a globe icon 🌐
- Visibility: Public
- Status: Running

---

**Next Steps**: Try the VS Code Ports tab method first - it's the most reliable way to configure Codespaces port forwarding.