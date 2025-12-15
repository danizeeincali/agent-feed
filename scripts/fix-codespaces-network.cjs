#!/usr/bin/env node

/**
 * SPARC Codespaces Network Fix
 * Automatically configure and test network settings for GitHub Codespaces
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class CodespacesNetworkFix {
  constructor() {
    this.viteConfigPath = path.join(__dirname, '..', 'frontend', 'vite.config.ts');
    this.packageJsonPath = path.join(__dirname, '..', 'frontend', 'package.json');
    this.isCodespaces = process.env.CODESPACES === 'true';
    this.codespaceUrl = this.isCodespaces ? 
      `https://${process.env.GITHUB_CODESPACE_TOKEN.slice(0, 8)}-5173.app.github.dev` : null;
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}`));
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  }

  async fixViteConfig() {
    console.log('🔧 Fixing Vite configuration for Codespaces...');

    const currentConfig = fs.readFileSync(this.viteConfigPath, 'utf8');
    
    // Check if already properly configured
    if (currentConfig.includes('host: "0.0.0.0"')) {
      console.log('✅ Vite config already has correct host binding');
      return false;
    }

    // Create the optimized configuration for Codespaces
    const optimizedConfig = currentConfig.replace(
      /host: true,/,
      `host: "0.0.0.0", // Fixed: Bind to all interfaces for Codespaces`
    ).replace(
      /clientPort: process\.env\.CODESPACES \? 443 : 5173,/,
      `clientPort: process.env.CODESPACES ? 443 : 5173,
        port: process.env.CODESPACES ? 443 : undefined, // Use HTTPS port for Codespaces`
    );

    fs.writeFileSync(this.viteConfigPath, optimizedConfig);
    console.log('✅ Updated Vite configuration for Codespaces compatibility');
    return true;
  }

  async checkPortForwarding() {
    console.log('🔍 Checking Codespaces port forwarding...');
    
    if (!this.isCodespaces) {
      console.log('ℹ️ Not running in Codespaces environment');
      return false;
    }

    try {
      // Use gh CLI to check port forwarding
      const result = await this.execCommand('gh codespace ports list --json');
      const ports = JSON.parse(result.stdout);
      
      const port5173 = ports.find(p => p.sourcePort === 5173);
      
      if (!port5173) {
        console.log('⚠️ Port 5173 not found in forwarding list');
        await this.forwardPort();
        return true;
      } else if (port5173.visibility !== 'public') {
        console.log('⚠️ Port 5173 is not public');
        await this.makePortPublic();
        return true;
      } else {
        console.log('✅ Port 5173 is properly forwarded and public');
        return false;
      }
    } catch (error) {
      console.log('⚠️ Could not check port forwarding via gh CLI, using manual method');
      return await this.manualPortForwarding();
    }
  }

  async forwardPort() {
    console.log('🔧 Setting up port forwarding...');
    
    try {
      await this.execCommand('gh codespace ports forward 5173:5173 --visibility public');
      console.log('✅ Port 5173 forwarded successfully');
    } catch (error) {
      console.log('⚠️ Failed to forward port via gh CLI, trying manual approach');
      await this.manualPortForwarding();
    }
  }

  async makePortPublic() {
    console.log('🔧 Making port 5173 public...');
    
    try {
      await this.execCommand('gh codespace ports visibility 5173:public');
      console.log('✅ Port 5173 is now public');
    } catch (error) {
      console.log('⚠️ Could not set port visibility');
    }
  }

  async manualPortForwarding() {
    console.log('🔧 Attempting manual port forwarding configuration...');
    
    // Kill any existing dev servers
    try {
      await this.execCommand('pkill -f "vite"');
      await this.execCommand('pkill -f "npm run dev"');
    } catch (e) {
      // Ignore errors - processes might not exist
    }

    // Wait a moment for processes to die
    await new Promise(resolve => setTimeout(resolve, 2000));

    return true;
  }

  async restartDevServer() {
    console.log('🚀 Restarting development server...');
    
    // Change to frontend directory and restart dev server
    const devProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..', 'frontend'),
      stdio: 'inherit',
      detached: true
    });

    // Give the server time to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Development server restarted');
    return devProcess;
  }

  async testConnectivity() {
    console.log('🧪 Testing connectivity...');
    
    const tests = [
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://0.0.0.0:5173'
    ];

    if (this.isCodespaces) {
      tests.push(this.codespaceUrl);
    }

    for (const url of tests) {
      try {
        const result = await this.execCommand(`curl -s -o /dev/null -w "%{http_code}" "${url}"`);
        const statusCode = result.stdout.trim();
        
        if (statusCode === '200') {
          console.log(`✅ ${url} - OK (${statusCode})`);
        } else {
          console.log(`⚠️ ${url} - ${statusCode}`);
        }
      } catch (error) {
        console.log(`❌ ${url} - Failed: ${error.message}`);
      }
    }
  }

  async createConnectivityScript() {
    const scriptPath = path.join(__dirname, 'test-connectivity.sh');
    const script = `#!/bin/bash

# SPARC Connectivity Test Script for Codespaces

echo "🔍 Testing all network interfaces..."

echo "1. Testing localhost..."
curl -s http://localhost:5173 > /dev/null && echo "✅ localhost:5173 OK" || echo "❌ localhost:5173 FAILED"

echo "2. Testing 127.0.0.1..."
curl -s http://127.0.0.1:5173 > /dev/null && echo "✅ 127.0.0.1:5173 OK" || echo "❌ 127.0.0.1:5173 FAILED"

echo "3. Testing 0.0.0.0..."
curl -s http://0.0.0.0:5173 > /dev/null && echo "✅ 0.0.0.0:5173 OK" || echo "❌ 0.0.0.0:5173 FAILED"

echo "4. Testing network interface..."
NETWORK_IP=$(ip route get 1.1.1.1 | awk '{print $7}' | head -1)
curl -s http://$NETWORK_IP:5173 > /dev/null && echo "✅ $NETWORK_IP:5173 OK" || echo "❌ $NETWORK_IP:5173 FAILED"

if [ "$CODESPACES" = "true" ]; then
    echo "5. Testing Codespaces URL..."
    CODESPACE_URL="https://$(echo $GITHUB_CODESPACE_TOKEN | cut -c1-8)-5173.app.github.dev"
    curl -s "$CODESPACE_URL" > /dev/null && echo "✅ Codespace URL OK" || echo "❌ Codespace URL FAILED"
    echo "🌐 Your app should be accessible at: $CODESPACE_URL"
fi

echo "📊 Port binding status:"
ss -tuln | grep :5173
`;

    fs.writeFileSync(scriptPath, script);
    await this.execCommand(`chmod +x ${scriptPath}`);
    console.log(`✅ Created connectivity test script: ${scriptPath}`);
  }

  async run() {
    console.log('🚀 Starting SPARC Codespaces Network Fix...\n');

    try {
      // Step 1: Fix Vite configuration
      const configChanged = await this.fixViteConfig();

      // Step 2: Check and fix port forwarding (Codespaces only)
      const portingChanged = await this.checkPortForwarding();

      // Step 3: Restart dev server if changes were made
      if (configChanged || portingChanged) {
        await this.restartDevServer();
      }

      // Step 4: Test connectivity
      await this.testConnectivity();

      // Step 5: Create helper scripts
      await this.createConnectivityScript();

      console.log('\n🎉 Network fix completed!');
      
      if (this.isCodespaces) {
        console.log(`\n🌐 Your app should be accessible at:`);
        console.log(`   ${this.codespaceUrl}`);
        console.log(`\n💡 If the app still doesn't load in your browser, try:`);
        console.log(`   1. Wait 30 seconds for port forwarding to activate`);
        console.log(`   2. Check the Codespaces ports tab`);
        console.log(`   3. Ensure port 5173 is set to "Public"`);
        console.log(`   4. Try a hard refresh (Ctrl+F5 or Cmd+Shift+R)`);
      }

    } catch (error) {
      console.error('❌ Fix failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the fix if called directly
if (require.main === module) {
  const fixer = new CodespacesNetworkFix();
  fixer.run().catch(console.error);
}

module.exports = CodespacesNetworkFix;