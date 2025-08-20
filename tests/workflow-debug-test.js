#!/usr/bin/env node

/**
 * SPARC:DEBUG - Workflow Route Debug Test
 * Deep analysis of /workflows route white screen
 */

const { execSync } = require('child_process');

async function debugWorkflowRoute() {
  console.log('🔍 SPARC:DEBUG - WORKFLOW ROUTE ANALYSIS');
  console.log('========================================');
  console.log('Testing http://127.0.0.1:3001/workflows for white screen');
  console.log('');
  
  try {
    // Test the route directly
    console.log('📍 Step 1: Testing HTTP Response');
    const html = execSync('curl -s http://127.0.0.1:3001/workflows', { 
      encoding: 'utf8', 
      timeout: 10000 
    });
    
    const status = execSync('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/workflows', {
      encoding: 'utf8',
      timeout: 10000
    }).trim();
    
    console.log(`   HTTP Status: ${status}`);
    console.log(`   Content Length: ${html.length} characters`);
    console.log(`   Basic HTML: ${html.includes('<!doctype html>') ? 'Yes' : 'No'}`);
    console.log(`   React Root: ${html.includes('id="root"') ? 'Yes' : 'No'}`);
    console.log(`   Scripts Loading: ${html.includes('/src/main.tsx') ? 'Yes' : 'No'}`);
    console.log('');
    
    // Test the component file exists and is readable
    console.log('📍 Step 2: Component File Analysis');
    const componentExists = execSync('test -f /workspaces/agent-feed/frontend/src/components/WorkflowVisualization.tsx && echo "exists" || echo "missing"', {
      encoding: 'utf8'
    }).trim();
    
    console.log(`   Component File: ${componentExists}`);
    
    if (componentExists === 'exists') {
      const componentSize = execSync('wc -l < /workspaces/agent-feed/frontend/src/components/WorkflowVisualization.tsx', {
        encoding: 'utf8'
      }).trim();
      console.log(`   Component Size: ${componentSize} lines`);
      
      // Check if it has default export
      const hasExport = execSync('grep -q "export default" /workspaces/agent-feed/frontend/src/components/WorkflowVisualization.tsx && echo "yes" || echo "no"', {
        encoding: 'utf8'
      }).trim();
      console.log(`   Default Export: ${hasExport}`);
    }
    console.log('');
    
    // Check TypeScript compilation
    console.log('📍 Step 3: TypeScript Compilation Check');
    try {
      const tscOutput = execSync('cd /workspaces/agent-feed/frontend && npm run typecheck 2>&1 | grep -i workflow || echo "No workflow-related errors"', {
        encoding: 'utf8',
        timeout: 30000
      });
      console.log(`   TypeScript: ${tscOutput.includes('error') ? 'Has Errors' : 'Clean'}`);
      if (tscOutput.includes('error')) {
        console.log(`   Errors: ${tscOutput.split('\n').slice(0, 3).join(' | ')}`);
      }
    } catch (e) {
      console.log(`   TypeScript: Check failed - ${e.message}`);
    }
    console.log('');
    
    // Check App.tsx routing
    console.log('📍 Step 4: Route Configuration Check');
    const routeExists = execSync('grep -n "workflows" /workspaces/agent-feed/frontend/src/App.tsx || echo "Route not found"', {
      encoding: 'utf8'
    }).trim();
    console.log(`   Route Config: ${routeExists.includes('not found') ? 'Missing' : 'Present'}`);
    if (!routeExists.includes('not found')) {
      console.log(`   Route Details: ${routeExists.split('\n')[0]}`);
    }
    console.log('');
    
    // Final diagnosis
    console.log('📍 Step 5: White Screen Diagnosis');
    const isWhiteScreen = html.length < 1000 || !html.includes('id="root"');
    const hasSPAStructure = html.includes('<!doctype html>') && html.includes('id="root"') && html.includes('script');
    
    console.log(`   White Screen: ${isWhiteScreen ? 'YES - DETECTED' : 'No'}`);
    console.log(`   SPA Structure: ${hasSPAStructure ? 'Valid' : 'Invalid'}`);
    console.log(`   React Loading: ${html.includes('/src/main.tsx') ? 'Yes' : 'No'}`);
    
    if (isWhiteScreen) {
      console.log('\n❌ CRITICAL: White screen confirmed on /workflows');
      console.log('🔧 Likely causes:');
      console.log('   - Component runtime error preventing render');
      console.log('   - Missing dependencies or imports');
      console.log('   - React hooks usage issues');
      console.log('   - useWebSocket hook errors');
    } else {
      console.log('\n✅ Route appears to be loading HTML properly');
      console.log('   Issue may be client-side React rendering');
    }
    
    return !isWhiteScreen;
    
  } catch (error) {
    console.log(`❌ ERROR: Failed to analyze /workflows route - ${error.message}`);
    return false;
  }
}

if (require.main === module) {
  debugWorkflowRoute().then(success => {
    console.log('\n' + (success ? '✅ Analysis complete' : '❌ Critical issues detected'));
    process.exit(success ? 0 : 1);
  });
}

module.exports = { debugWorkflowRoute };