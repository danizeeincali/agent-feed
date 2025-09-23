/**
 * Browser Console Debugging Commands for React White Screen Issues
 * 
 * Usage: Copy and paste these functions into your browser console
 * when experiencing white screen issues with React/Vite applications
 */

// =============================================================================
// INSTANT DIAGNOSTIC SCRIPT
// =============================================================================

/**
 * Main diagnostic function - run this first for quick overview
 */
function diagnoseWhiteScreen() {
    console.group('🔍 React White Screen Diagnostic');
    console.log('Running diagnostic at:', new Date().toLocaleString());
    
    // Check React ecosystem
    try {
        console.log('✅ React loaded:', typeof React !== 'undefined' ? React.version : 'Not loaded');
        console.log('✅ ReactDOM loaded:', typeof ReactDOM !== 'undefined');
    } catch(e) {
        console.error('❌ React/ReactDOM error:', e.message);
    }
    
    // Check DOM structure
    const root = document.getElementById('root');
    console.log('✅ Root element exists:', !!root);
    console.log('✅ Root innerHTML length:', root ? root.innerHTML.length : 0);
    if (root && root.innerHTML.length > 0) {
        console.log('✅ Root content preview:', root.innerHTML.substring(0, 200) + '...');
    }
    
    // Check for Vite
    if (typeof __vite__ !== 'undefined' || document.querySelector('[data-vite-dev-id]')) {
        console.log('✅ Vite detected');
    }
    
    // Check for error boundaries
    const errorElements = document.querySelectorAll('[data-error-boundary]');
    console.log('⚠️  Error boundaries active:', errorElements.length);
    
    // Check for console errors
    console.log('📝 Check Console tab for JavaScript errors (red messages)');
    console.log('📝 Check Network tab for failed resource loading (red requests)');
    console.log('📝 Check Sources tab to set breakpoints in main.tsx/App.tsx');
    
    console.groupEnd();
}

// =============================================================================
// ERROR MONITORING FUNCTIONS
// =============================================================================

/**
 * Set up comprehensive error monitoring
 */
function setupErrorMonitoring() {
    console.log('🔧 Setting up error monitoring...');
    
    // Vite preload errors
    window.addEventListener('vite:preloadError', (event) => {
        console.group('🚨 Vite Preload Error');
        console.error('Failed to load module:', event.payload);
        console.log('Consider refreshing the page or checking network connectivity');
        console.groupEnd();
    });
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.group('🚨 Unhandled Promise Rejection');
        console.error('Reason:', event.reason);
        console.log('This might indicate async loading issues');
        console.groupEnd();
    });
    
    // Generic errors
    window.addEventListener('error', (event) => {
        if (event.message.includes('hydration')) {
            console.group('🚨 React Hydration Error');
            console.error('Hydration failed:', event.error);
            console.log('Check for server-client markup mismatches');
            console.groupEnd();
        } else if (event.message.includes('module')) {
            console.group('🚨 Module Loading Error');
            console.error('Module error:', event.error);
            console.log('Check import statements and file paths');
            console.groupEnd();
        }
    });
    
    console.log('✅ Error monitoring active');
}

// =============================================================================
// REACT-SPECIFIC DEBUG FUNCTIONS
// =============================================================================

/**
 * Check React component mounting
 */
function checkReactComponents() {
    console.group('⚛️ React Component Analysis');
    
    const root = document.getElementById('root');
    if (!root) {
        console.error('❌ No root element found');
        console.groupEnd();
        return;
    }
    
    // Check if React has mounted anything
    const hasReactElements = root.querySelectorAll('[data-reactroot], [data-react-*]').length > 0;
    console.log('React elements found:', hasReactElements);
    
    // Check for React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('✅ React DevTools available');
        const renderers = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers;
        console.log('Active renderers:', renderers.size);
    } else {
        console.log('⚠️  React DevTools not available');
    }
    
    // Try to access React components
    try {
        const reactFiber = root._reactInternalFiber || root._reactInternalInstance;
        if (reactFiber) {
            console.log('✅ React fiber tree exists');
        }
    } catch (e) {
        console.log('ℹ️  Cannot access React internals (normal in production)');
    }
    
    console.groupEnd();
}

/**
 * Test React Router functionality
 */
function testReactRouter() {
    console.group('🛣️  React Router Analysis');
    
    console.log('Current URL:', window.location.href);
    console.log('Pathname:', window.location.pathname);
    console.log('Hash:', window.location.hash);
    console.log('Search:', window.location.search);
    
    // Check for router elements
    const routerElements = document.querySelectorAll('[data-react-router], nav, [role="navigation"]');
    console.log('Potential router elements:', routerElements.length);
    
    // Test navigation
    console.log('📝 Try manual navigation: window.history.pushState({}, "", "/test-path")');
    
    console.groupEnd();
}

// =============================================================================
// VITE-SPECIFIC DEBUG FUNCTIONS
// =============================================================================

/**
 * Analyze Vite development server status
 */
function analyzeViteStatus() {
    console.group('⚡ Vite Development Server Analysis');
    
    // Check for Vite client
    if (import.meta && import.meta.hot) {
        console.log('✅ Vite HMR active');
        
        // Setup HMR error monitoring
        import.meta.hot.on('vite:error', (payload) => {
            console.error('Vite Error:', payload);
        });
        
        import.meta.hot.on('vite:invalidate', (payload) => {
            console.log('Vite Invalidate:', payload);
        });
    } else {
        console.log('ℹ️  Not running in Vite dev mode');
    }
    
    // Check Vite environment
    if (import.meta && import.meta.env) {
        console.log('Environment:', import.meta.env.MODE);
        console.log('Dev mode:', import.meta.env.DEV);
        console.log('Prod mode:', import.meta.env.PROD);
        console.log('Base URL:', import.meta.env.BASE_URL);
    }
    
    // Check for Vite dev overlay
    const viteOverlay = document.querySelector('vite-error-overlay');
    if (viteOverlay) {
        console.log('⚠️  Vite error overlay present - check for compilation errors');
    }
    
    console.groupEnd();
}

// =============================================================================
// NETWORK AND MODULE DEBUG FUNCTIONS
// =============================================================================

/**
 * Analyze network requests for failed resources
 */
function analyzeNetworkRequests() {
    console.group('🌐 Network Request Analysis');
    
    console.log('📝 Manual steps:');
    console.log('1. Open Network tab in DevTools');
    console.log('2. Refresh the page (F5 or Ctrl+R)');
    console.log('3. Look for RED entries (failed requests)');
    console.log('4. Common failures:');
    console.log('   - 404: File not found');
    console.log('   - CORS: Cross-origin request blocked');
    console.log('   - Syntax Error: Invalid JavaScript/CSS');
    
    // Check for common resource issues
    const scripts = document.querySelectorAll('script[src]');
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    const images = document.querySelectorAll('img[src]');
    
    console.log('Resources loaded:');
    console.log('- Scripts:', scripts.length);
    console.log('- Stylesheets:', stylesheets.length);
    console.log('- Images:', images.length);
    
    console.groupEnd();
}

/**
 * Test module imports dynamically
 */
async function testModuleImports() {
    console.group('📦 Module Import Testing');
    
    const testModules = [
        'react',
        'react-dom',
        'react-router-dom',
        './App.tsx'
    ];
    
    for (const moduleName of testModules) {
        try {
            if (moduleName.startsWith('./')) {
                console.log(`⏳ Testing relative import: ${moduleName}`);
                // Note: Dynamic import of relative modules may not work from console
                console.log('ℹ️  Relative imports should be tested from source code');
            } else {
                console.log(`⏳ Testing npm package: ${moduleName}`);
                const module = await import(moduleName);
                console.log(`✅ Successfully imported ${moduleName}:`, Object.keys(module));
            }
        } catch (error) {
            console.error(`❌ Failed to import ${moduleName}:`, error.message);
        }
    }
    
    console.groupEnd();
}

// =============================================================================
// TYPESCRIPT AND BUILD DEBUG FUNCTIONS
// =============================================================================

/**
 * Check for TypeScript compilation issues
 */
function checkTypeScriptIssues() {
    console.group('🔷 TypeScript Compilation Analysis');
    
    console.log('📝 To check TypeScript compilation:');
    console.log('1. Run in terminal: npx tsc --noEmit');
    console.log('2. Run in terminal: npm run build');
    console.log('3. Look for .d.ts files in node_modules for type definitions');
    
    // Check for common TS error indicators in browser
    const scriptErrors = document.querySelectorAll('script[type="module"][src*="tsx"], script[type="module"][src*="ts"]');
    console.log('TypeScript module scripts:', scriptErrors.length);
    
    // Check for source maps
    const hasSourceMaps = Array.from(document.querySelectorAll('script')).some(script => 
        script.src && script.src.includes('.map')
    );
    console.log('Source maps available:', hasSourceMaps);
    
    console.groupEnd();
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Force refresh with cache clear
 */
function forceRefresh() {
    console.log('🔄 Force refreshing page...');
    window.location.reload(true);
}

/**
 * Clear all storage and refresh
 */
function clearAndRefresh() {
    console.log('🧹 Clearing storage and refreshing...');
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
    }
    window.location.reload(true);
}

/**
 * Enable verbose console logging
 */
function enableVerboseLogging() {
    console.log('📝 Enabling verbose logging...');
    
    // Enable React debugging
    localStorage.setItem('debug', 'react*');
    
    // Enable Vite debugging
    localStorage.setItem('vite:debug', 'true');
    
    console.log('✅ Verbose logging enabled - refresh page to take effect');
}

// =============================================================================
// QUICK COMMANDS REFERENCE
// =============================================================================

/**
 * Show quick reference of all available commands
 */
function showDebugCommands() {
    console.group('🚀 Available Debug Commands');
    console.log('📋 Copy and paste these commands:');
    console.log('');
    console.log('🔍 DIAGNOSTIC:');
    console.log('diagnoseWhiteScreen()     - Quick overview of potential issues');
    console.log('setupErrorMonitoring()    - Monitor errors in real-time');
    console.log('');
    console.log('⚛️  REACT:');
    console.log('checkReactComponents()    - Analyze React component status');
    console.log('testReactRouter()         - Check React Router functionality');
    console.log('');
    console.log('⚡ VITE:');
    console.log('analyzeViteStatus()       - Check Vite dev server status');
    console.log('');
    console.log('🌐 NETWORK:');
    console.log('analyzeNetworkRequests()  - Guide for network analysis');
    console.log('testModuleImports()       - Test dynamic module loading');
    console.log('');
    console.log('🔷 BUILD:');
    console.log('checkTypeScriptIssues()   - TypeScript compilation guidance');
    console.log('');
    console.log('🛠️  UTILITIES:');
    console.log('forceRefresh()            - Hard refresh page');
    console.log('clearAndRefresh()         - Clear storage and refresh');
    console.log('enableVerboseLogging()    - Enable debug logging');
    console.log('');
    console.log('📝 QUICK START: Run diagnoseWhiteScreen() first!');
    console.groupEnd();
}

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

// Show available commands when this script loads
console.log('🎯 React White Screen Debug Tools loaded!');
console.log('📝 Type showDebugCommands() to see all available functions');
console.log('🚀 Quick start: diagnoseWhiteScreen()');

// Export functions for easier access
window.debugWhiteScreen = {
    diagnose: diagnoseWhiteScreen,
    setupErrorMonitoring,
    checkReact: checkReactComponents,
    testRouter: testReactRouter,
    analyzeVite: analyzeViteStatus,
    analyzeNetwork: analyzeNetworkRequests,
    testModules: testModuleImports,
    checkTypeScript: checkTypeScriptIssues,
    forceRefresh,
    clearAndRefresh,
    enableVerboseLogging,
    showCommands: showDebugCommands
};

console.log('✅ All functions available via window.debugWhiteScreen object');