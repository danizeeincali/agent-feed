#!/usr/bin/env node
/**
 * Network Diagnostics Tool - Implementation following TDD London School contracts
 * Comprehensive network connectivity testing for Codespaces environments
 */

import os from 'os';
import net from 'net';
import dns from 'dns';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { promisify } from 'util';

const dnsPromises = dns.promises;

const execAsync = promisify(exec);

class NetworkDiagnostics {
  constructor(dependencies = {}) {
    // Dependency injection for testability (London School approach)
    this.os = dependencies.os || os;
    this.net = dependencies.net || net;
    this.dns = dependencies.dns || dnsPromises;
    this.childProcess = dependencies.childProcess || { exec: execAsync, execSync };
    this.fs = dependencies.fs || fs;
    this.httpClient = dependencies.http || http;
    this.httpsClient = dependencies.https || https;
  }

  /**
   * Discover all available network interfaces
   */
  async discoverNetworkInterfaces() {
    const interfaces = this.os.networkInterfaces();
    const result = {
      loopback: [],
      external: [],
      docker: [],
      codespaces: null
    };

    for (const [name, addresses] of Object.entries(interfaces)) {
      for (const address of addresses) {
        if (address.family !== 'IPv4') continue;

        const interfaceInfo = {
          name,
          address: address.address,
          netmask: address.netmask,
          internal: address.internal,
          cidr: address.cidr
        };

        if (address.internal) {
          result.loopback.push(interfaceInfo);
        } else {
          result.external.push(interfaceInfo);
          
          // Detect potential Codespaces network
          if (name.includes('eth') || address.address.startsWith('172.16')) {
            result.codespaces = interfaceInfo;
          }
        }

        // Detect Docker interfaces
        if (name.includes('docker') || address.address.startsWith('172.17')) {
          result.docker.push(interfaceInfo);
        }
      }
    }

    return result;
  }

  /**
   * Classify network interfaces for Codespaces compatibility
   */
  async classifyInterfaces() {
    const interfaces = await this.discoverNetworkInterfaces();
    
    return {
      internal: interfaces.loopback,
      external: interfaces.external,
      docker: interfaces.docker,
      codespaces: interfaces.codespaces,
      hasExternalInterface: interfaces.external.length > 0,
      codespacesReady: interfaces.codespaces !== null
    };
  }

  /**
   * Analyze port binding configuration
   */
  async analyzePortBinding(ports) {
    const bindingStatus = {};
    
    try {
      const { stdout } = await this.childProcess.exec('netstat -tlnp 2>/dev/null || ss -tlnp');
      
      for (const port of ports) {
        const portPattern = new RegExp(`:(${port})\\s`, 'g');
        const matches = [...stdout.matchAll(portPattern)];
        
        if (matches.length === 0) {
          bindingStatus[port] = {
            bound: false,
            interfaces: [],
            codespacesSafe: false,
            recommendation: `Port ${port} is not listening. Start the server first.`
          };
          continue;
        }

        const interfaces = [];
        let codespacesSafe = false;

        for (const match of matches) {
          const line = stdout.split('\n').find(l => l.includes(match[0]));
          if (line.includes('0.0.0.0:')) {
            interfaces.push('0.0.0.0');
            codespacesSafe = true;
          } else if (line.includes('127.0.0.1:')) {
            interfaces.push('127.0.0.1');
          } else if (line.includes(':::')) {
            interfaces.push('::');
            codespacesSafe = true;
          }
        }

        bindingStatus[port] = {
          bound: true,
          interfaces: [...new Set(interfaces)],
          codespacesSafe,
          recommendation: codespacesSafe 
            ? `Port ${port} is correctly bound to all interfaces.`
            : `Port ${port} should bind to 0.0.0.0 instead of localhost for Codespaces compatibility.`
        };
      }
    } catch (error) {
      console.error('Error analyzing port binding:', error.message);
    }

    return bindingStatus;
  }

  /**
   * Detect Codespaces environment and configuration
   */
  async detectCodespacesEnvironment() {
    const result = {
      isCodespaces: false,
      codespaceName: null,
      hasDevcontainer: false,
      workspaceFolder: null,
      environmentVars: {}
    };

    // Check environment variables
    result.isCodespaces = !!process.env.CODESPACES;
    result.codespaceName = process.env.CODESPACE_NAME || null;
    result.workspaceFolder = process.env.PWD || process.cwd();

    // Collect relevant environment variables
    const relevantVars = ['CODESPACES', 'CODESPACE_NAME', 'GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN'];
    for (const varName of relevantVars) {
      if (process.env[varName]) {
        result.environmentVars[varName] = process.env[varName];
      }
    }

    // Check for devcontainer configuration
    const devcontainerPaths = [
      path.join(result.workspaceFolder, '.devcontainer', 'devcontainer.json'),
      path.join(result.workspaceFolder, '.devcontainer.json')
    ];

    for (const configPath of devcontainerPaths) {
      if (this.fs.existsSync(configPath)) {
        result.hasDevcontainer = true;
        result.devcontainerPath = configPath;
        break;
      }
    }

    return result;
  }

  /**
   * Analyze port forwarding configuration
   */
  async analyzePortForwarding() {
    const environment = await this.detectCodespacesEnvironment();
    const result = {
      configured: false,
      ports: [],
      visibility: {},
      recommendations: []
    };

    if (!environment.hasDevcontainer) {
      result.recommendations.push('No devcontainer.json found. Consider adding port forwarding configuration.');
      return result;
    }

    try {
      const configContent = this.fs.readFileSync(environment.devcontainerPath, 'utf8');
      const config = JSON.parse(configContent);

      if (config.forwardPorts) {
        result.configured = true;
        result.ports = Array.isArray(config.forwardPorts) ? config.forwardPorts : [];
      }

      if (config.portsAttributes) {
        for (const [port, attrs] of Object.entries(config.portsAttributes)) {
          result.visibility[port] = attrs.visibility || 'private';
        }
      }

      // Generate recommendations
      if (!result.configured) {
        result.recommendations.push('Add "forwardPorts" array to devcontainer.json');
      }

      for (const port of result.ports) {
        if (!result.visibility[port] || result.visibility[port] === 'private') {
          result.recommendations.push(`Set port ${port} visibility to "public" in portsAttributes`);
        }
      }
    } catch (error) {
      result.recommendations.push(`Error reading devcontainer.json: ${error.message}`);
    }

    return result;
  }

  /**
   * Test DNS resolution for various hostname formats
   */
  async testDnsResolution(hostnames = ['localhost', '127.0.0.1', '0.0.0.0']) {
    const results = {};

    for (const hostname of hostnames) {
      try {
        const result = await this.dns.lookup(hostname);
        results[hostname] = {
          resolved: true,
          address: result.address,
          family: result.family,
          error: null
        };
      } catch (error) {
        results[hostname] = {
          resolved: false,
          address: null,
          family: null,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test HTTP connectivity to various URL formats
   */
  async testConnectivity(urls) {
    const results = {};

    for (const url of urls) {
      try {
        const result = await this.testSingleUrl(url);
        results[url] = {
          accessible: true,
          statusCode: result.statusCode,
          responseTime: result.responseTime,
          error: null
        };
      } catch (error) {
        results[url] = {
          accessible: false,
          statusCode: null,
          responseTime: null,
          error: error.message,
          recommendation: this.getConnectivityRecommendation(error)
        };
      }
    }

    return results;
  }

  /**
   * Test a single URL for connectivity
   */
  testSingleUrl(url) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const client = url.startsWith('https:') ? this.httpsClient : this.httpClient;
      
      const request = client.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'NetworkDiagnostics/1.0' }
      }, (response) => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: response.statusCode,
          responseTime,
          headers: response.headers
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Get connectivity recommendation based on error type
   */
  getConnectivityRecommendation(error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('econnrefused')) {
      return 'Server is not running or not accepting connections. Check if the server is started.';
    }
    if (errorMessage.includes('enotfound')) {
      return 'DNS resolution failed. Check hostname spelling and DNS configuration.';
    }
    if (errorMessage.includes('timeout')) {
      return 'Request timed out. Server may be overloaded or network connection is slow.';
    }
    if (errorMessage.includes('econnreset')) {
      return 'Connection was reset by server. Check server configuration and stability.';
    }
    
    return 'Unknown connectivity issue. Check network configuration and server status.';
  }

  /**
   * Generate Codespaces-specific test URLs
   */
  generateCodespacesUrls(ports) {
    const environment = this.detectCodespacesEnvironment();
    const urls = [];

    if (!environment.isCodespaces || !environment.codespaceName) {
      return urls;
    }

    const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'githubpreview.dev';
    
    for (const port of ports) {
      urls.push(`https://${environment.codespaceName}-${port}.${domain}`);
    }

    return urls;
  }

  /**
   * Run comprehensive diagnostics
   */
  async runComprehensiveDiagnostics(ports = [3000, 5173]) {
    console.log('🔍 Starting comprehensive network diagnostics...\n');

    const report = {
      timestamp: new Date().toISOString(),
      ports,
      environment: await this.detectCodespacesEnvironment(),
      interfaces: await this.classifyInterfaces(),
      portBinding: await this.analyzePortBinding(ports),
      portForwarding: await this.analyzePortForwarding(),
      dns: await this.testDnsResolution(),
      connectivity: {},
      recommendations: []
    };

    // Test local connectivity
    const localUrls = ports.flatMap(port => [
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`
    ]);

    report.connectivity.local = await this.testConnectivity(localUrls);

    // Test Codespaces URLs if applicable
    if (report.environment.isCodespaces) {
      const codespacesUrls = this.generateCodespacesUrls(ports);
      if (codespacesUrls.length > 0) {
        report.connectivity.codespaces = await this.testConnectivity(codespacesUrls);
      }
    }

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  /**
   * Generate actionable recommendations based on diagnostic results
   */
  generateRecommendations(report) {
    const recommendations = [];

    // Port binding recommendations
    for (const [port, status] of Object.entries(report.portBinding)) {
      if (!status.bound) {
        recommendations.push(`❌ Port ${port}: ${status.recommendation}`);
      } else if (!status.codespacesSafe) {
        recommendations.push(`⚠️  Port ${port}: ${status.recommendation}`);
      }
    }

    // Codespaces-specific recommendations
    if (report.environment.isCodespaces) {
      if (!report.environment.hasDevcontainer) {
        recommendations.push('📝 Consider adding .devcontainer/devcontainer.json for port forwarding configuration');
      }

      if (report.portForwarding.recommendations.length > 0) {
        recommendations.push(...report.portForwarding.recommendations.map(r => `🔧 ${r}`));
      }
    }

    // Connectivity recommendations
    for (const [category, results] of Object.entries(report.connectivity)) {
      for (const [url, result] of Object.entries(results)) {
        if (!result.accessible) {
          recommendations.push(`🌐 ${url}: ${result.recommendation || result.error}`);
        }
      }
    }

    return recommendations;
  }

  /**
   * Print formatted diagnostic report
   */
  printReport(report) {
    console.log('📊 NETWORK DIAGNOSTICS REPORT');
    console.log('='.repeat(50));
    console.log(`🕒 Timestamp: ${report.timestamp}`);
    console.log(`🖥️  Environment: ${report.environment.isCodespaces ? 'GitHub Codespaces' : 'Local'}`);
    
    if (report.environment.codespaceName) {
      console.log(`📦 Codespace: ${report.environment.codespaceName}`);
    }

    console.log('\n🔌 NETWORK INTERFACES:');
    console.log(`   External: ${report.interfaces.external.length} found`);
    console.log(`   Codespaces Ready: ${report.interfaces.codespacesReady ? '✅' : '❌'}`);

    console.log('\n🔗 PORT BINDING STATUS:');
    for (const [port, status] of Object.entries(report.portBinding)) {
      const icon = status.bound ? (status.codespacesSafe ? '✅' : '⚠️') : '❌';
      console.log(`   ${icon} Port ${port}: ${status.bound ? `Bound to ${status.interfaces.join(', ')}` : 'Not bound'}`);
    }

    console.log('\n🌐 CONNECTIVITY TESTS:');
    for (const [category, results] of Object.entries(report.connectivity)) {
      console.log(`   ${category.toUpperCase()}:`);
      for (const [url, result] of Object.entries(results)) {
        const icon = result.accessible ? '✅' : '❌';
        const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
        console.log(`     ${icon} ${url}${time}`);
      }
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`   ${rec}`));
    } else {
      console.log('\n🎉 All checks passed! Your network configuration looks good.');
    }

    console.log('\n' + '='.repeat(50));
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const diagnostics = new NetworkDiagnostics();
  
  const ports = process.argv.slice(2).map(p => parseInt(p)).filter(p => !isNaN(p));
  const defaultPorts = ports.length > 0 ? ports : [3000, 5173];

  diagnostics.runComprehensiveDiagnostics(defaultPorts)
    .then(report => {
      diagnostics.printReport(report);
      
      // Save report to file
      const reportPath = path.join(process.cwd(), 'network-diagnostics-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Full report saved to: ${reportPath}`);
      
      // Exit with appropriate code
      const hasIssues = report.recommendations.some(r => r.includes('❌'));
      process.exit(hasIssues ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Diagnostics failed:', error.message);
      process.exit(1);
    });
}

export default NetworkDiagnostics;