import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

/**
 * Global Teardown for Production E2E Validation
 * 
 * Cleanup and generate comprehensive test reports
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting production validation teardown...');
  
  try {
    // Generate comprehensive test report
    await generateTestReport();
    
    // Cleanup test artifacts (keep reports)
    await cleanupTestArtifacts();
    
    // Kill any hanging processes
    await killHangingProcesses();
    
    console.log('✅ Production validation teardown complete');
  } catch (error) {
    console.error('❌ Teardown error:', error);
  }
}

async function generateTestReport() {
  console.log('📊 Generating comprehensive test report...');
  
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    environment: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      env_vars: {
        NODE_ENV: process.env.NODE_ENV,
        has_claude_api_key: !!process.env.CLAUDE_API_KEY,
        ci: process.env.CI
      }
    },
    test_summary: {
      description: "Comprehensive E2E validation for 100% real functionality",
      focus_areas: [
        "Complete user workflow validation",
        "5+ minute WebSocket stability testing",
        "Real Claude API response validation (no mocks)",
        "Multiple concurrent connection testing",
        "Browser-based user scenario validation",
        "Production environment validation",
        "Load testing with concurrent users"
      ],
      validation_criteria: [
        "No 'Connection Error: Connection lost: Unknown error' messages",
        "Real Claude responses (not mocked/simulated)",
        "Sustained WebSocket connections for 5+ minutes",
        "Multiple concurrent connections work simultaneously",
        "Complete user workflows function end-to-end",
        "Browser-based validation passes",
        "Load testing handles concurrent users"
      ]
    },
    critical_notes: [
      "Tests are designed to FAIL until WebSocket stability is completely resolved",
      "All responses must be real Claude API responses, not mocks",
      "WebSocket connections must remain stable for extended periods",
      "The exact user scenario that was failing must pass completely",
      "Production environment must not contain mock/fake implementations"
    ]
  };
  
  try {
    await fs.writeFile(
      'tests/production-validation/reports/test-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('✅ Test report generated');
  } catch (error) {
    console.error('❌ Failed to generate test report:', error);
  }
}

async function cleanupTestArtifacts() {
  console.log('🧹 Cleaning up test artifacts...');
  
  try {
    // Keep reports but cleanup temporary files
    await execAsync('find tests/production-validation -name "*.tmp" -delete || true');
    await execAsync('find tests/production-validation -name "*.temp" -delete || true');
    console.log('✅ Test artifacts cleaned');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

async function killHangingProcesses() {
  console.log('🔪 Killing hanging processes...');
  
  try {
    // Kill any hanging node processes related to the test
    await execAsync('pkill -f "node.*3000" || true');
    await execAsync('pkill -f "npm start" || true');
    console.log('✅ Hanging processes cleaned');
  } catch (error) {
    console.error('❌ Process cleanup error:', error);
  }
}

export default globalTeardown;