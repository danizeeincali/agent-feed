#!/usr/bin/env node
/**
 * Quick Connectivity Test Script - Implementation following TDD contracts
 * Rapid validation tool for immediate connectivity testing
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

class ConnectivityTester {
  constructor(dependencies = {}) {
    // Dependency injection for testability (London School)
    this.childProcess = dependencies.childProcess || { execSync, spawn };
    this.fs = dependencies.fs || fs;
  }

  /**
   * Quick health check using curl
   */
  async quickHealthCheck(urls) {
    const results = {};
    
    for (const url of urls) {
      try {
        console.log(`🔍 Testing ${url}...`);
        
        // Use curl with timeout for quick check
        const curlCommand = `curl -I -s --max-time 5 "${url}" 2>&1`;
        const output = this.childProcess.execSync(curlCommand, { encoding: 'utf8' });
        
        if (output.includes('HTTP/') && (output.includes('200') || output.includes('404'))) {
          results[url] = {
            accessible: true,
            status: output.split('\n')[0].trim(),
            method: 'curl HEAD request'
          };
          console.log(`   ✅ Accessible - ${results[url].status}`);
        } else {
          throw new Error(output);
        }
      } catch (error) {
        results[url] = {
          accessible: false,
          error: error.message,
          recommendation: this.getQuickRecommendation(error.message, url)
        };
        console.log(`   ❌ Failed - ${error.message.split('\n')[0]}`);
      }
    }
    
    return results;
  }

  /**
   * Test port availability and binding
   */
  async testPortAvailability(ports) {
    const results = {};
    
    try {
      console.log('🔍 Checking port availability...');
      
      // Get netstat output
      const netstatCmd = 'netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null';
      const netstatOutput = this.childProcess.execSync(netstatCmd, { encoding: 'utf8' });
      
      for (const port of ports) {
        const portRegex = new RegExp(`:(${port})\\s+.*LISTEN`, 'gm');
        const matches = [...netstatOutput.matchAll(portRegex)];
        
        if (matches.length === 0) {
          results[port] = {
            listening: false,
            error: `Port ${port} is not listening`,
            recommendation: `Start the server on port ${port}`
          };
          console.log(`   ❌ Port ${port}: Not listening`);
          continue;
        }
        
        // Determine binding
        const line = matches[0].input.split('\n').find(l => l.includes(`:${port} `));
        let binding = 'unknown';
        let codespacesSafe = false;
        
        if (line.includes('0.0.0.0:')) {
          binding = '0.0.0.0';
          codespacesSafe = true;
        } else if (line.includes('127.0.0.1:')) {
          binding = '127.0.0.1';
          codespacesSafe = false;
        } else if (line.includes(':::')) {
          binding = '::';
          codespacesSafe = true;
        }
        
        results[port] = {
          listening: true,
          binding,
          codespacesSafe,
          warning: !codespacesSafe ? `Port ${port} bound to localhost only - may not work in Codespaces` : null
        };
        
        const icon = codespacesSafe ? '✅' : '⚠️';
        console.log(`   ${icon} Port ${port}: Listening on ${binding}`);
      }
    } catch (error) {
      console.error('Error checking ports:', error.message);
    }
    
    return results;
  }

  /**
   * Test network interfaces accessibility
   */
  async testNetworkInterfaces(port) {
    const results = {};
    
    try {
      console.log('🔍 Testing network interfaces...');
      
      // Get network interfaces
      const ifconfigCmd = 'ifconfig 2>/dev/null || ip addr show 2>/dev/null';
      const ifconfigOutput = this.childProcess.execSync(ifconfigCmd, { encoding: 'utf8' });
      
      // Extract IP addresses
      const ipRegex = /inet (\d+\.\d+\.\d+\.\d+)/g;
      const ips = [...ifconfigOutput.matchAll(ipRegex)].map(match => match[1]);
      
      // Test each IP
      for (const ip of ips) {
        try {
          const curlCmd = `curl -I -s --max-time 3 "http://${ip}:${port}" 2>&1`;
          const output = this.childProcess.execSync(curlCmd, { encoding: 'utf8' });
          
          results[ip] = {
            accessible: output.includes('HTTP/'),
            response: output.split('\n')[0].trim(),
            isLoopback: ip === '127.0.0.1',
            isExternal: !ip.startsWith('127.') && !ip.startsWith('172.17.')
          };
          
          const icon = results[ip].accessible ? '✅' : '❌';
          console.log(`   ${icon} ${ip}: ${results[ip].accessible ? 'Accessible' : 'Not accessible'}`);
        } catch (error) {
          results[ip] = {
            accessible: false,
            error: error.message,
            isLoopback: ip === '127.0.0.1',
            isExternal: !ip.startsWith('127.') && !ip.startsWith('172.17.')
          };
          console.log(`   ❌ ${ip}: Connection failed`);
        }
      }
    } catch (error) {
      console.error('Error testing interfaces:', error.message);
    }
    
    return results;
  }

  /**
   * Test Codespaces-specific access
   */
  async testCodespacesAccess(port) {
    const result = {
      isCodespaces: !!process.env.CODESPACES,
      codespaceName: process.env.CODESPACE_NAME,
      url: null,
      accessible: false,
      recommendation: null
    };
    
    if (!result.isCodespaces) {
      result.recommendation = 'Not running in Codespaces environment';
      return result;
    }
    
    console.log('🔍 Testing Codespaces access...');
    
    // Generate Codespaces URL
    const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'githubpreview.dev';
    result.url = `https://${result.codespaceName}-${port}.${domain}`;
    
    try {
      const curlCmd = `curl -I -s --max-time 10 "${result.url}" 2>&1`;
      const output = this.childProcess.execSync(curlCmd, { encoding: 'utf8' });
      
      if (output.includes('HTTP/') && !output.includes('403')) {
        result.accessible = true;
        result.recommendation = 'Codespaces URL is publicly accessible';
        console.log(`   ✅ ${result.url}: Accessible`);
      } else if (output.includes('403')) {
        result.accessible = false;
        result.isPrivate = true;
        result.recommendation = 'Port is private - set port visibility to public in VS Code';
        console.log(`   ⚠️  ${result.url}: Private (403 Forbidden)`);
      } else {
        throw new Error(output);
      }
    } catch (error) {
      result.accessible = false;
      result.error = error.message;
      result.recommendation = 'Check if server is running and port forwarding is configured';
      console.log(`   ❌ ${result.url}: ${error.message.split('\n')[0]}`);
    }
    
    return result;
  }

  /**
   * Get quick recommendation for common issues
   */
  getQuickRecommendation(error, url) {
    if (error.includes('Connection refused')) {
      return 'Server is not running - start your development server';
    }
    if (error.includes('Could not resolve host')) {
      return 'DNS resolution failed - check hostname';
    }
    if (error.includes('timeout')) {
      return 'Request timed out - server may be overloaded';
    }
    if (error.includes('403')) {
      return 'Access forbidden - check port visibility settings in Codespaces';
    }
    return 'Unknown connection issue - check server status and network configuration';
  }

  /**
   * Run comprehensive connectivity test
   */
  async runComprehensiveTest(ports = [3000, 5173]) {
    console.log('🚀 QUICK CONNECTIVITY TEST');
    console.log('='.repeat(40));
    console.log(`📅 ${new Date().toISOString()}`);
    console.log(`🔍 Testing ports: ${ports.join(', ')}\n`);

    const report = {
      timestamp: new Date().toISOString(),
      ports,
      environment: {
        isCodespaces: !!process.env.CODESPACES,
        codespaceName: process.env.CODESPACE_NAME,
        nodeVersion: process.version,
        platform: process.platform
      },
      healthCheck: {},
      portAvailability: {},
      networkInterfaces: {},
      codespaces: {},
      summary: {},
      recommendations: []
    };

    // 1. Quick health check
    console.log('1️⃣ HEALTH CHECK');
    const healthUrls = ports.map(p => `http://localhost:${p}`);
    report.healthCheck = await this.quickHealthCheck(healthUrls);
    console.log();

    // 2. Port availability
    console.log('2️⃣ PORT AVAILABILITY');
    report.portAvailability = await this.testPortAvailability(ports);
    console.log();

    // 3. Network interfaces (test first port)
    if (ports.length > 0) {
      console.log('3️⃣ NETWORK INTERFACES');
      report.networkInterfaces = await this.testNetworkInterfaces(ports[0]);
      console.log();
    }

    // 4. Codespaces access
    if (report.environment.isCodespaces) {
      console.log('4️⃣ CODESPACES ACCESS');
      for (const port of ports) {
        report.codespaces[port] = await this.testCodespacesAccess(port);
      }
      console.log();
    }

    // Generate summary
    report.summary = this.generateSummary(report);
    report.recommendations = this.generateQuickRecommendations(report);

    return report;
  }

  /**
   * Generate test summary
   */
  generateSummary(report) {
    const summary = {
      allPortsListening: Object.values(report.portAvailability).every(p => p.listening),
      allHealthy: Object.values(report.healthCheck).every(h => h.accessible),
      codespacesReady: report.environment.isCodespaces ? 
        Object.values(report.codespaces).every(c => c.accessible) : null,
      issuesFound: []
    };

    // Identify issues
    for (const [url, result] of Object.entries(report.healthCheck)) {
      if (!result.accessible) {
        summary.issuesFound.push(`Health check failed: ${url}`);
      }
    }

    for (const [port, result] of Object.entries(report.portAvailability)) {
      if (!result.listening) {
        summary.issuesFound.push(`Port ${port} not listening`);
      } else if (!result.codespacesSafe) {
        summary.issuesFound.push(`Port ${port} binding issue`);
      }
    }

    return summary;
  }

  /**
   * Generate quick recommendations
   */
  generateQuickRecommendations(report) {
    const recommendations = [];

    // Port binding issues
    for (const [port, result] of Object.entries(report.portAvailability)) {
      if (!result.listening) {
        recommendations.push(`❌ Start server on port ${port}`);
      } else if (result.warning) {
        recommendations.push(`⚠️  Server binding issue: ${result.warning}`);
      }
    }

    // Health check failures
    for (const [url, result] of Object.entries(report.healthCheck)) {
      if (!result.accessible && result.recommendation) {
        recommendations.push(`🔧 ${result.recommendation}`);
      }
    }

    // Codespaces issues
    if (report.environment.isCodespaces) {
      for (const [port, result] of Object.entries(report.codespaces)) {
        if (!result.accessible && result.recommendation) {
          recommendations.push(`🌐 Port ${port}: ${result.recommendation}`);
        }
      }
    }

    // General recommendations
    if (report.summary.issuesFound.length === 0) {
      recommendations.push('🎉 All connectivity tests passed!');
    }

    return recommendations;
  }

  /**
   * Print quick test results
   */
  printQuickResults(report) {
    console.log('📊 QUICK TEST RESULTS');
    console.log('='.repeat(40));

    // Summary
    console.log('📋 SUMMARY:');
    console.log(`   Ports Listening: ${report.summary.allPortsListening ? '✅' : '❌'}`);
    console.log(`   Health Checks: ${report.summary.allHealthy ? '✅' : '❌'}`);
    
    if (report.environment.isCodespaces) {
      console.log(`   Codespaces Ready: ${report.summary.codespacesReady ? '✅' : '❌'}`);
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`   ${rec}`));
    }

    console.log('\n' + '='.repeat(40));
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ConnectivityTester();
  
  const ports = process.argv.slice(2).map(p => parseInt(p)).filter(p => !isNaN(p));
  const defaultPorts = ports.length > 0 ? ports : [3000, 5173];

  tester.runComprehensiveTest(defaultPorts)
    .then(report => {
      tester.printQuickResults(report);
      
      // Save report
      const reportPath = path.join(process.cwd(), 'connectivity-test-report.json');
      tester.fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Report saved: ${reportPath}`);
      
      // Exit with status
      process.exit(report.summary.issuesFound.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Connectivity test failed:', error.message);
      process.exit(1);
    });
}

export default ConnectivityTester;