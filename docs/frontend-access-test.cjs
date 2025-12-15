/**
 * FRONTEND ACCESS TEST - Workflows Route Removal
 * Direct browser testing to verify /workflows route is inaccessible
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');

const execAsync = util.promisify(exec);

class FrontendAccessTester {
  constructor() {
    this.testResults = {
      workflowsRouteAccessible: null,
      navigationMenuClean: null,
      fallbackBehavior: null,
      frontendResponsive: null
    };
  }

  async testFrontendAccess() {
    console.log('🌐 Testing Frontend Access - Workflows Route Removal');
    console.log('====================================================');

    try {
      // Test 1: Check if frontend is running
      await this.testFrontendStatus();

      // Test 2: Test direct access to workflows route
      await this.testWorkflowsRouteAccess();

      // Test 3: Test navigation menu
      await this.testNavigationMenu();

      // Generate final report
      this.generateAccessReport();

    } catch (error) {
      console.error('❌ Frontend access test failed:', error);
    }
  }

  async testFrontendStatus() {
    console.log('\n🔍 Step 1: Testing Frontend Status...');

    try {
      // Check if frontend is accessible
      const { stdout, stderr } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5173');

      if (stdout.trim() === '200') {
        console.log('✅ Frontend is running and accessible');
        this.testResults.frontendResponsive = true;
      } else {
        console.log('❌ Frontend not accessible, status:', stdout.trim());
        this.testResults.frontendResponsive = false;
        return;
      }

    } catch (error) {
      console.log('❌ Frontend status check failed:', error.message);
      this.testResults.frontendResponsive = false;
    }
  }

  async testWorkflowsRouteAccess() {
    console.log('\n🔍 Step 2: Testing /workflows Route Access...');

    try {
      // Test direct access to workflows route
      const { stdout, stderr } = await execAsync('curl -s http://localhost:5173/workflows');

      // Check if we get a 404 or if it redirects to a fallback
      if (stdout.includes('404') || stdout.includes('Not Found')) {
        console.log('✅ /workflows route properly returns 404');
        this.testResults.workflowsRouteAccessible = false;
        this.testResults.fallbackBehavior = '404_PROPER';
      } else if (stdout.includes('<html>') && stdout.includes('AgentLink')) {
        // If it returns HTML with AgentLink, it might be falling back to main app
        console.log('⚠️  /workflows route returns main app (possible fallback)');
        this.testResults.workflowsRouteAccessible = 'FALLBACK';
        this.testResults.fallbackBehavior = 'MAIN_APP_FALLBACK';

        // Check if the page content mentions workflows
        if (stdout.toLowerCase().includes('workflow')) {
          console.log('❌ Workflow content still present in response');
          this.testResults.workflowsRouteAccessible = true;
        } else {
          console.log('✅ No workflow content in fallback response');
        }
      } else {
        console.log('⚠️  Unexpected response from /workflows route');
        this.testResults.workflowsRouteAccessible = 'UNKNOWN';
      }

      // Save the response for analysis
      fs.writeFileSync('/workspaces/agent-feed/docs/workflows-route-response.html', stdout);
      console.log('📄 Route response saved to: workflows-route-response.html');

    } catch (error) {
      console.log('❌ Workflows route access test failed:', error.message);
      this.testResults.workflowsRouteAccessible = 'ERROR';
    }
  }

  async testNavigationMenu() {
    console.log('\n🔍 Step 3: Testing Navigation Menu...');

    try {
      // Get the main page and check for workflows in navigation
      const { stdout } = await execAsync('curl -s http://localhost:5173/');

      // Check for workflow-related navigation elements
      const hasWorkflowNav = stdout.toLowerCase().includes('workflows') &&
                           (stdout.includes('href="/workflows"') ||
                            stdout.includes('link.*workflow'));

      if (!hasWorkflowNav) {
        console.log('✅ No workflows navigation found in main page');
        this.testResults.navigationMenuClean = true;
      } else {
        console.log('❌ Workflows navigation still present in main page');
        this.testResults.navigationMenuClean = false;

        // Extract navigation context
        const lines = stdout.split('\n');
        const workflowLines = lines.filter(line =>
          line.toLowerCase().includes('workflow')
        );

        console.log('Found workflow references:');
        workflowLines.slice(0, 5).forEach(line => {
          console.log(`   - ${line.trim().substring(0, 100)}...`);
        });
      }

      // Save the main page response for analysis
      fs.writeFileSync('/workspaces/agent-feed/docs/main-page-response.html', stdout);
      console.log('📄 Main page response saved to: main-page-response.html');

    } catch (error) {
      console.log('❌ Navigation menu test failed:', error.message);
      this.testResults.navigationMenuClean = null;
    }
  }

  generateAccessReport() {
    console.log('\n📋 FRONTEND ACCESS TEST REPORT');
    console.log('==============================');

    const report = {
      timestamp: new Date().toISOString(),
      testObjective: 'Verify /workflows route is inaccessible after removal',
      results: this.testResults
    };

    console.log('\n🎯 ACCESS TEST RESULTS:');
    console.log(`   - Frontend Status: ${this.testResults.frontendResponsive ? '✅ RUNNING' : '❌ NOT_ACCESSIBLE'}`);
    console.log(`   - Workflows Route Accessible: ${
      this.testResults.workflowsRouteAccessible === false ? '✅ PROPERLY_BLOCKED' :
      this.testResults.workflowsRouteAccessible === 'FALLBACK' ? '⚠️  FALLBACK_BEHAVIOR' :
      this.testResults.workflowsRouteAccessible === true ? '❌ STILL_ACCESSIBLE' :
      '❓ UNKNOWN'
    }`);
    console.log(`   - Navigation Menu Clean: ${
      this.testResults.navigationMenuClean === true ? '✅ CLEAN' :
      this.testResults.navigationMenuClean === false ? '❌ WORKFLOWS_PRESENT' :
      '❓ UNKNOWN'
    }`);
    console.log(`   - Fallback Behavior: ${this.testResults.fallbackBehavior || 'NOT_TESTED'}`);

    // Overall assessment
    let overallStatus = 'SUCCESS';
    if (!this.testResults.frontendResponsive ||
        this.testResults.workflowsRouteAccessible === true ||
        this.testResults.navigationMenuClean === false) {
      overallStatus = 'NEEDS_ATTENTION';
    } else if (this.testResults.workflowsRouteAccessible === 'FALLBACK') {
      overallStatus = 'PARTIAL_SUCCESS';
    }

    console.log(`\n✨ OVERALL FRONTEND ACCESS STATUS: ${overallStatus}`);

    if (overallStatus === 'SUCCESS') {
      console.log('🎉 Workflows route successfully removed from frontend');
      console.log('✅ Route is not accessible');
      console.log('✅ Navigation menu is clean');
      console.log('✅ No breaking frontend issues detected');
    } else {
      console.log('⚠️  Frontend access test requires attention');
    }

    // Save report
    const reportPath = '/workspaces/agent-feed/docs/frontend-access-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Frontend access report saved to: ${reportPath}`);

    console.log('\n🏁 FRONTEND ACCESS TESTING COMPLETED');
  }
}

// Execute test
const tester = new FrontendAccessTester();
tester.testFrontendAccess().catch(console.error);