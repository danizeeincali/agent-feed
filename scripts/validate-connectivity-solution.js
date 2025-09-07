#!/usr/bin/env node
/**
 * Connectivity Solution Validator
 * Validates that the user's connectivity issues have been resolved
 */

import NetworkDiagnostics from './network-diagnostics.js';
import ConnectivityTester from './test-connectivity.js';

class ConnectivityValidator {
  constructor() {
    this.diagnostics = new NetworkDiagnostics();
    this.tester = new ConnectivityTester();
  }

  /**
   * Validate that servers are properly configured for Codespaces
   */
  async validateCodespacesConfiguration(ports = [3000, 5173]) {
    console.log('🔍 VALIDATING CODESPACES CONNECTIVITY SOLUTION');
    console.log('='.repeat(55));
    
    const results = {
      timestamp: new Date().toISOString(),
      ports,
      serverBinding: {},
      localConnectivity: {},
      codespacesAccess: {},
      dnsResolution: {},
      summary: {
        allServersProperlyBound: true,
        allLocallyAccessible: true,
        allCodespacesReady: true,
        resolved: true,
        issues: []
      },
      recommendations: []
    };

    // 1. Validate server binding
    console.log('1️⃣ Validating Server Binding Configuration...');
    results.serverBinding = await this.diagnostics.analyzePortBinding(ports);
    
    for (const [port, binding] of Object.entries(results.serverBinding)) {
      if (!binding.bound) {
        results.summary.allServersProperlyBound = false;
        results.summary.resolved = false;
        results.summary.issues.push(`Port ${port} is not listening`);
        console.log(`   ❌ Port ${port}: Not listening`);
      } else if (!binding.codespacesSafe) {
        results.summary.allServersProperlyBound = false;
        results.summary.resolved = false;
        results.summary.issues.push(`Port ${port} bound to localhost only`);
        console.log(`   ⚠️  Port ${port}: ${binding.recommendation}`);
      } else {
        console.log(`   ✅ Port ${port}: Properly bound to ${binding.interfaces.join(', ')}`);
      }
    }

    // 2. Validate local connectivity
    console.log('\n2️⃣ Validating Local Connectivity...');
    const localUrls = ports.map(port => `http://localhost:${port}`);
    results.localConnectivity = await this.diagnostics.testConnectivity(localUrls);
    
    for (const [url, result] of Object.entries(results.localConnectivity)) {
      if (!result.accessible) {
        results.summary.allLocallyAccessible = false;
        results.summary.resolved = false;
        results.summary.issues.push(`Local access failed: ${url}`);
        console.log(`   ❌ ${url}: ${result.error}`);
      } else {
        console.log(`   ✅ ${url}: Accessible (${result.responseTime}ms)`);
      }
    }

    // 3. Validate Codespaces access (if in Codespaces environment)
    if (process.env.CODESPACES) {
      console.log('\n3️⃣ Validating Codespaces Public Access...');
      
      const codespacesUrls = this.diagnostics.generateCodespacesUrls(ports);
      if (codespacesUrls.length > 0) {
        results.codespacesAccess = await this.diagnostics.testConnectivity(codespacesUrls);
        
        for (const [url, result] of Object.entries(results.codespacesAccess)) {
          if (!result.accessible) {
            results.summary.allCodespacesReady = false;
            results.summary.resolved = false;
            results.summary.issues.push(`Codespaces access failed: ${url}`);
            console.log(`   ❌ ${url}: ${result.error}`);
            
            if (result.error.includes('403') || result.error.includes('Forbidden')) {
              results.recommendations.push('Set port visibility to "Public" in VS Code Ports panel');
            }
          } else {
            console.log(`   ✅ ${url}: Publicly accessible (${result.responseTime}ms)`);
          }
        }
      }
    } else {
      console.log('\n3️⃣ Not in Codespaces environment - skipping public access validation');
    }

    // 4. Validate DNS resolution
    console.log('\n4️⃣ Validating DNS Resolution...');
    results.dnsResolution = await this.diagnostics.testDnsResolution(['localhost', '127.0.0.1']);
    
    for (const [hostname, result] of Object.entries(results.dnsResolution)) {
      if (!result.resolved) {
        console.log(`   ⚠️  ${hostname}: DNS resolution failed - ${result.error}`);
      } else {
        console.log(`   ✅ ${hostname}: Resolves to ${result.address}`);
      }
    }

    // Generate final recommendations
    this.generateValidationRecommendations(results);

    return results;
  }

  /**
   * Generate recommendations based on validation results
   */
  generateValidationRecommendations(results) {
    // Server binding recommendations
    for (const [port, binding] of Object.entries(results.serverBinding)) {
      if (!binding.bound) {
        results.recommendations.push(`❌ Start server on port ${port}`);
      } else if (!binding.codespagesSafe) {
        results.recommendations.push(`⚠️  Configure server on port ${port} to bind to 0.0.0.0 instead of localhost`);
      }
    }

    // Connectivity recommendations
    if (!results.summary.allLocallyAccessible) {
      results.recommendations.push('🔧 Check server configuration and ensure servers are running');
    }

    if (process.env.CODESPACES && !results.summary.allCodespacesReady) {
      results.recommendations.push('🌐 Configure Codespaces port forwarding and set ports to public');
      results.recommendations.push('📝 Update .devcontainer/devcontainer.json with proper port configuration');
    }

    // Success message
    if (results.summary.resolved) {
      results.recommendations.push('🎉 All connectivity issues have been resolved!');
      results.recommendations.push('✅ Your servers are properly configured for Codespaces');
    }
  }

  /**
   * Print validation results
   */
  printValidationResults(results) {
    console.log('\n📊 CONNECTIVITY SOLUTION VALIDATION RESULTS');
    console.log('='.repeat(55));
    
    console.log('📋 VALIDATION SUMMARY:');
    console.log(`   Server Binding: ${results.summary.allServersProperlyBound ? '✅ Correct' : '❌ Issues Found'}`);
    console.log(`   Local Connectivity: ${results.summary.allLocallyAccessible ? '✅ Working' : '❌ Issues Found'}`);
    
    if (process.env.CODESPACES) {
      console.log(`   Codespaces Access: ${results.summary.allCodespacesReady ? '✅ Working' : '❌ Issues Found'}`);
    }
    
    console.log(`   Overall Status: ${results.summary.resolved ? '✅ RESOLVED' : '❌ ISSUES REMAIN'}`);

    if (results.summary.issues.length > 0) {
      console.log('\n🚨 ISSUES FOUND:');
      results.summary.issues.forEach(issue => console.log(`   • ${issue}`));
    }

    if (results.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      results.recommendations.forEach(rec => console.log(`   ${rec}`));
    }

    console.log('\n' + '='.repeat(55));
  }

  /**
   * Provide step-by-step guidance for remaining issues
   */
  async provideGuidance(results) {
    if (results.summary.resolved) {
      console.log('🎉 No guidance needed - all connectivity issues are resolved!');
      return;
    }

    console.log('\n🔧 STEP-BY-STEP RESOLUTION GUIDANCE');
    console.log('='.repeat(45));

    let step = 1;

    // Server binding guidance
    const bindingIssues = Object.entries(results.serverBinding)
      .filter(([_, binding]) => !binding.bound || !binding.codespacesSafe);
    
    if (bindingIssues.length > 0) {
      console.log(`${step}. Fix Server Binding Issues:`);
      for (const [port, binding] of bindingIssues) {
        if (!binding.bound) {
          console.log(`   • Start your server on port ${port}`);
        } else if (!binding.codespacesSafe) {
          console.log(`   • Configure server on port ${port} to bind to 0.0.0.0`);
          console.log(`     Example: app.listen(${port}, '0.0.0.0')`);
        }
      }
      step++;
    }

    // Codespaces configuration guidance
    if (process.env.CODESPACES && !results.summary.allCodespacesReady) {
      console.log(`${step}. Configure Codespaces Port Forwarding:`);
      console.log('   • Open VS Code Command Palette (Ctrl+Shift+P)');
      console.log('   • Run "Ports: Focus on Ports View"');
      console.log('   • Right-click on your ports and set visibility to "Public"');
      console.log('   • Or add to .devcontainer/devcontainer.json:');
      console.log('     {');
      console.log(`       "forwardPorts": [${results.ports.join(', ')}],`);
      console.log('       "portsAttributes": {');
      results.ports.forEach(port => {
        console.log(`         "${port}": {"visibility": "public"},`);
      });
      console.log('       }');
      console.log('     }');
      step++;
    }

    console.log(`${step}. Verify Resolution:`);
    console.log('   • Run: ./scripts/test-connectivity.sh');
    console.log('   • Run: node scripts/network-diagnostics.js');
    console.log('   • Test in browser with both localhost and Codespaces URLs');

    console.log('\n📖 For detailed troubleshooting: docs/codespaces-connectivity-guide.md');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ConnectivityValidator();
  
  const ports = process.argv.slice(2).map(p => parseInt(p)).filter(p => !isNaN(p));
  const defaultPorts = ports.length > 0 ? ports : [3000, 5173];

  validator.validateCodespacesConfiguration(defaultPorts)
    .then(async results => {
      validator.printValidationResults(results);
      await validator.provideGuidance(results);
      
      // Save validation report
      import('fs').then(fs => {
        const reportPath = '/workspaces/agent-feed/connectivity-validation-report.json';
        fs.default.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        console.log(`\n📄 Validation report saved: ${reportPath}`);
      });
      
      // Exit with appropriate code
      process.exit(results.summary.resolved ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Connectivity validation failed:', error.message);
      process.exit(1);
    });
}

export default ConnectivityValidator;