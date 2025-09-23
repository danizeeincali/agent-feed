/**
 * Manual Production Validation Script
 * Tests white screen fix and core functionality using DOM inspection
 */

console.log('🔍 PRODUCTION VALIDATION: White Screen Fix Verification');
console.log('='.repeat(60));

// Test 1: Check if React root is mounting properly
setTimeout(() => {
  console.log('\n1. 🔍 Testing React Root Element...');
  
  const root = document.getElementById('root');
  if (root && root.innerHTML.trim() !== '') {
    console.log('✅ Root element has content');
    console.log('   Content length:', root.innerHTML.length, 'characters');
  } else {
    console.log('❌ Root element is empty or missing');
    return;
  }

  // Test 2: Check for main application elements
  console.log('\n2. 🔍 Testing Main Application Elements...');
  
  const header = document.querySelector('[data-testid="header"]');
  const mainContent = document.querySelector('[data-testid="agent-feed"]');
  
  if (header) {
    console.log('✅ Header element found');
  } else {
    console.log('⚠️ Header element missing');
  }
  
  if (mainContent) {
    console.log('✅ Main content area found');
  } else {
    console.log('⚠️ Main content area missing');
  }

  // Test 3: Check for SimpleLauncher content
  console.log('\n3. 🔍 Testing SimpleLauncher Component...');
  
  const launcherTitle = document.querySelector('h1');
  const launcherButtons = document.querySelectorAll('button');
  const statusSection = document.querySelector('.status-section, .status');
  
  if (launcherTitle && launcherTitle.textContent.includes('Claude')) {
    console.log('✅ SimpleLauncher title found:', launcherTitle.textContent.trim());
  } else {
    console.log('⚠️ SimpleLauncher title not found');
  }
  
  if (launcherButtons.length > 0) {
    console.log('✅ Launcher buttons found:', launcherButtons.length);
    launcherButtons.forEach((btn, i) => {
      if (i < 3) console.log('   -', btn.textContent.trim());
    });
  } else {
    console.log('⚠️ No launcher buttons found');
  }
  
  if (statusSection) {
    console.log('✅ Status section found');
  } else {
    console.log('⚠️ Status section missing');
  }

  // Test 4: Check navigation elements
  console.log('\n4. 🔍 Testing Navigation Elements...');
  
  const navLinks = document.querySelectorAll('nav a, .nav a, [role="navigation"] a');
  const sidebar = document.querySelector('.sidebar, nav, [role="navigation"]');
  
  if (navLinks.length > 0) {
    console.log('✅ Navigation links found:', navLinks.length);
    navLinks.forEach((link, i) => {
      if (i < 5) console.log('   -', link.textContent.trim());
    });
  } else {
    console.log('⚠️ No navigation links found');
  }
  
  if (sidebar) {
    console.log('✅ Sidebar/navigation container found');
  } else {
    console.log('⚠️ Sidebar/navigation container missing');
  }

  // Test 5: Check for error states
  console.log('\n5. 🔍 Testing Error States...');
  
  const errorBoundary = document.querySelector('[data-testid="error-boundary"], .error-boundary');
  const errorMessages = document.querySelectorAll('.error, [role="alert"]');
  const whiteScreenIndicators = document.querySelectorAll('.white-screen, .loading-error');
  
  if (errorBoundary) {
    console.log('⚠️ Error boundary element present');
  } else {
    console.log('✅ No error boundary active');
  }
  
  if (errorMessages.length === 0) {
    console.log('✅ No error messages displayed');
  } else {
    console.log('⚠️ Error messages found:', errorMessages.length);
  }
  
  if (whiteScreenIndicators.length === 0) {
    console.log('✅ No white screen indicators');
  } else {
    console.log('❌ White screen indicators found:', whiteScreenIndicators.length);
  }

  // Test 6: Test interactivity
  console.log('\n6. 🔍 Testing Basic Interactivity...');
  
  const clickableButtons = document.querySelectorAll('button:not([disabled])');
  const clickableLinks = document.querySelectorAll('a[href]');
  
  if (clickableButtons.length > 0) {
    console.log('✅ Interactive buttons found:', clickableButtons.length);
  } else {
    console.log('⚠️ No interactive buttons found');
  }
  
  if (clickableLinks.length > 0) {
    console.log('✅ Interactive links found:', clickableLinks.length);
  } else {
    console.log('⚠️ No interactive links found');
  }

  // Test 7: Check Claude availability indicator
  console.log('\n7. 🔍 Testing Claude Availability Indicator...');
  
  const claudeAvailability = document.querySelector('[data-testid="claude-availability"]');
  
  if (claudeAvailability) {
    console.log('✅ Claude availability indicator found:', claudeAvailability.textContent.trim());
  } else {
    console.log('⚠️ Claude availability indicator missing');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  const allChecks = [
    root && root.innerHTML.trim() !== '',
    header || mainContent,
    launcherButtons.length > 0,
    navLinks.length > 0,
    errorMessages.length === 0,
    clickableButtons.length > 0
  ];
  
  const passedChecks = allChecks.filter(Boolean).length;
  const totalChecks = allChecks.length;
  
  console.log('✅ Checks passed:', passedChecks, '/', totalChecks);
  
  if (passedChecks >= totalChecks * 0.8) {
    console.log('🎉 WHITE SCREEN FIX VALIDATION: SUCCESSFUL');
    console.log('   The application is loading and rendering properly');
  } else if (passedChecks >= totalChecks * 0.6) {
    console.log('⚠️ WHITE SCREEN FIX VALIDATION: PARTIAL SUCCESS');
    console.log('   Most components are working but some issues remain');
  } else {
    console.log('❌ WHITE SCREEN FIX VALIDATION: FAILED');
    console.log('   Multiple critical issues detected');
  }
  
  console.log('\n📌 Next steps:');
  console.log('   1. Test navigation functionality');
  console.log('   2. Test Claude launcher functionality');
  console.log('   3. Test WebSocket connections');
  console.log('   4. Verify responsive design');

}, 2000); // Give React time to mount

// Also run immediately in case React has already mounted
console.log('🚀 Starting immediate validation...');
if (document.readyState === 'complete') {
  console.log('✅ Document ready state: complete');
} else {
  console.log('⏳ Document ready state:', document.readyState);
}