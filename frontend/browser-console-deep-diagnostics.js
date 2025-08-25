// COMPREHENSIVE BROWSER CONSOLE DIAGNOSTICS FOR WHITE SCREEN ISSUE
// Paste this entire script into your browser console when experiencing white screen

(function() {
  'use strict';

  console.log('🔍 COMPREHENSIVE WHITE SCREEN DIAGNOSTICS STARTED');
  console.log('==================================================');

  const diagnostics = {
    errors: [],
    warnings: [],
    moduleErrors: [],
    networkErrors: [],
    domIssues: [],
    reactIssues: []
  };

  // 1. CAPTURE ALL CONSOLE ERRORS AND WARNINGS
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = function(...args) {
    diagnostics.errors.push({
      timestamp: new Date().toISOString(),
      message: args.join(' '),
      stack: new Error().stack
    });
    originalError.apply(console, ['❌ ERROR CAPTURED:', ...args]);
  };
  
  console.warn = function(...args) {
    diagnostics.warnings.push({
      timestamp: new Date().toISOString(),
      message: args.join(' ')
    });
    originalWarn.apply(console, ['⚠️ WARNING CAPTURED:', ...args]);
  };

  // 2. DOM AND REACT ROOT ANALYSIS
  function analyzeDOM() {
    console.log('\n🏠 DOM ANALYSIS');
    console.log('===============');
    
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      diagnostics.domIssues.push('Root element #root not found!');
      console.error('❌ CRITICAL: Root element #root not found!');
      return false;
    }
    
    console.log('✅ Root element exists:', rootElement);
    console.log('📏 Root element dimensions:', {
      width: rootElement.offsetWidth,
      height: rootElement.offsetHeight,
      display: getComputedStyle(rootElement).display,
      visibility: getComputedStyle(rootElement).visibility
    });
    
    const rootContent = rootElement.innerHTML;
    console.log('📄 Root content length:', rootContent.length);
    console.log('📄 Root content preview:', rootContent.substring(0, 200));
    
    if (rootContent.length === 0) {
      diagnostics.domIssues.push('Root element is completely empty');
      console.error('❌ CRITICAL: Root element is completely empty!');
    } else if (rootContent.includes('Loading')) {
      console.log('🔄 App appears to be in loading state');
    } else {
      console.log('✅ Root element has content');
    }
    
    return true;
  }

  // 3. REACT AND REACTDOM DETECTION
  function analyzeReact() {
    console.log('\n⚛️ REACT ANALYSIS');
    console.log('==================');
    
    // Check if React is loaded globally
    const reactGlobal = window.React;
    const reactDOMGlobal = window.ReactDOM;
    
    console.log('🔍 React global object:', reactGlobal ? '✅ Found' : '❌ Not found');
    console.log('🔍 ReactDOM global object:', reactDOMGlobal ? '✅ Found' : '❌ Not found');
    
    // Check React DevTools
    const hasReactDevTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    console.log('🔍 React DevTools:', hasReactDevTools ? '✅ Available' : '❌ Not available');
    
    if (hasReactDevTools) {
      const reactVersion = hasReactDevTools.renderers?.get(1)?.version;
      console.log('📦 React version detected:', reactVersion || 'Unknown');
    }
    
    // Check for React Fiber nodes
    const rootContainer = document.querySelector('#root');
    if (rootContainer) {
      const fiberNode = rootContainer._reactInternalFiber || 
                       rootContainer._reactInternals ||
                       rootContainer.__reactInternalInstance;
      console.log('🔍 React Fiber node:', fiberNode ? '✅ Found' : '❌ Not found');
      
      if (!fiberNode) {
        diagnostics.reactIssues.push('React not properly mounted to DOM');
      }
    }
  }

  // 4. MODULE AND SCRIPT ANALYSIS
  function analyzeModules() {
    console.log('\n📦 MODULE ANALYSIS');
    console.log('==================');
    
    // Check all script tags
    const scripts = Array.from(document.querySelectorAll('script'));
    console.log(`📋 Total scripts found: ${scripts.length}`);
    
    scripts.forEach((script, index) => {
      const src = script.src || 'inline';
      const type = script.type || 'text/javascript';
      console.log(`📄 Script ${index + 1}: ${src} (type: ${type})`);
      
      if (script.src && !script.src.startsWith('http')) {
        // Test if the script is accessible
        fetch(script.src).catch(error => {
          diagnostics.moduleErrors.push(`Failed to load script: ${script.src}`);
          console.error('❌ Script load error:', script.src, error);
        });
      }
    });
    
    // Check module scripts specifically
    const moduleScripts = scripts.filter(s => s.type === 'module');
    console.log(`🎯 Module scripts: ${moduleScripts.length}`);
    
    moduleScripts.forEach((script, index) => {
      console.log(`🔄 Module ${index + 1}:`, script.src || 'inline');
    });
    
    // Check if main.tsx is referenced
    const mainScript = scripts.find(s => s.src && s.src.includes('main.tsx'));
    console.log('🎯 Main script found:', mainScript ? '✅ Yes' : '❌ No');
  }

  // 5. CSS AND STYLING ANALYSIS
  function analyzeCSS() {
    console.log('\n🎨 CSS ANALYSIS');
    console.log('===============');
    
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
    console.log(`📋 Total stylesheets: ${stylesheets.length}`);
    
    stylesheets.forEach((stylesheet, index) => {
      if (stylesheet.tagName === 'LINK') {
        const href = stylesheet.href;
        console.log(`🔗 Stylesheet ${index + 1}: ${href}`);
        
        // Test stylesheet loading
        if (href) {
          fetch(href).then(response => {
            if (!response.ok) {
              diagnostics.networkErrors.push(`Stylesheet failed: ${href} (${response.status})`);
              console.error(`❌ Stylesheet load error: ${href} - ${response.status}`);
            } else {
              console.log(`✅ Stylesheet loaded: ${href}`);
            }
          }).catch(error => {
            diagnostics.networkErrors.push(`Stylesheet error: ${href} - ${error.message}`);
            console.error(`❌ Stylesheet fetch error: ${href}`, error);
          });
        }
      } else {
        console.log(`📝 Inline style ${index + 1}: ${stylesheet.textContent.length} characters`);
      }
    });
    
    // Check if body has any styling that might hide content
    const body = document.body;
    const bodyStyles = getComputedStyle(body);
    console.log('👤 Body styles:', {
      display: bodyStyles.display,
      visibility: bodyStyles.visibility,
      opacity: bodyStyles.opacity,
      height: bodyStyles.height,
      overflow: bodyStyles.overflow
    });
  }

  // 6. NETWORK REQUESTS MONITORING
  function monitorNetwork() {
    console.log('\n🌐 NETWORK MONITORING');
    console.log('=====================');
    
    // Override fetch to monitor API calls
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      console.log('🔄 Fetch request:', url);
      
      return originalFetch.apply(this, args)
        .then(response => {
          if (!response.ok) {
            diagnostics.networkErrors.push(`Fetch failed: ${url} (${response.status})`);
            console.error(`❌ Fetch error: ${url} - ${response.status}`);
          } else {
            console.log(`✅ Fetch success: ${url} - ${response.status}`);
          }
          return response;
        })
        .catch(error => {
          diagnostics.networkErrors.push(`Fetch error: ${url} - ${error.message}`);
          console.error(`❌ Fetch exception: ${url}`, error);
          throw error;
        });
    };
    
    // Monitor XMLHttpRequest
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      
      xhr.open = function(method, url, ...args) {
        console.log(`🔄 XHR request: ${method} ${url}`);
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 400) {
            diagnostics.networkErrors.push(`XHR failed: ${method} ${url} (${xhr.status})`);
            console.error(`❌ XHR error: ${method} ${url} - ${xhr.status}`);
          } else {
            console.log(`✅ XHR success: ${method} ${url} - ${xhr.status}`);
          }
        });
        
        xhr.addEventListener('error', () => {
          diagnostics.networkErrors.push(`XHR error: ${method} ${url}`);
          console.error(`❌ XHR exception: ${method} ${url}`);
        });
        
        return originalOpen.apply(this, [method, url, ...args]);
      };
      
      return xhr;
    };
  }

  // 7. VITE HOT MODULE REPLACEMENT ANALYSIS
  function analyzeViteHMR() {
    console.log('\n🔥 VITE HMR ANALYSIS');
    console.log('====================');
    
    const vite = window.__vite__;
    if (vite) {
      console.log('✅ Vite HMR client detected');
      console.log('🔍 Vite client version:', vite.version || 'unknown');
      
      // Check HMR connection
      if (vite.ws) {
        console.log('🔌 HMR WebSocket state:', vite.ws.readyState);
        console.log('🔌 HMR WebSocket URL:', vite.ws.url);
      } else {
        console.log('❌ No HMR WebSocket found');
      }
    } else {
      console.log('❌ Vite HMR client not found (production build?)');
    }
    
    // Check for import.meta.hot
    try {
      console.log('🔍 import.meta.hot available:', typeof import !== 'undefined' && import.meta?.hot ? 'Yes' : 'No');
    } catch (e) {
      console.log('❌ Cannot check import.meta.hot:', e.message);
    }
  }

  // 8. REACT STRICT MODE AND ERROR BOUNDARY ANALYSIS
  function analyzeReactErrors() {
    console.log('\n🛡️ REACT ERROR ANALYSIS');
    console.log('========================');
    
    // Check for unhandled promise rejections
    let unhandledRejections = 0;
    window.addEventListener('unhandledrejection', (event) => {
      unhandledRejections++;
      diagnostics.reactIssues.push(`Unhandled Promise Rejection: ${event.reason}`);
      console.error('❌ Unhandled Promise Rejection:', event.reason);
    });
    
    // Check for React error boundaries
    setTimeout(() => {
      const errorBoundaries = document.querySelectorAll('[data-error-boundary]');
      console.log(`🛡️ Error boundaries found: ${errorBoundaries.length}`);
      
      errorBoundaries.forEach((boundary, index) => {
        console.log(`🛡️ Error boundary ${index + 1}:`, boundary);
      });
      
      console.log(`📊 Unhandled rejections so far: ${unhandledRejections}`);
    }, 1000);
  }

  // 9. PERFORMANCE MONITORING
  function analyzePerformance() {
    console.log('\n⚡ PERFORMANCE ANALYSIS');
    console.log('======================');
    
    if (window.performance) {
      const navigation = performance.navigation || performance.getEntriesByType('navigation')[0];
      const timing = performance.timing;
      
      if (timing) {
        console.log('📊 Page timing:', {
          domLoading: timing.domLoading - timing.navigationStart + 'ms',
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart + 'ms',
          domComplete: timing.domComplete - timing.navigationStart + 'ms',
          loadComplete: timing.loadEventEnd - timing.navigationStart + 'ms'
        });
      }
      
      // Check for memory usage (if available)
      if (performance.memory) {
        console.log('💾 Memory usage:', {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        });
      }
      
      // Get resource loading times
      const resources = performance.getEntriesByType('resource');
      const slowResources = resources.filter(r => r.duration > 1000);
      
      if (slowResources.length > 0) {
        console.log('🐌 Slow resources (>1s):');
        slowResources.forEach(resource => {
          console.log(`  - ${resource.name}: ${Math.round(resource.duration)}ms`);
        });
      }
    }
  }

  // 10. COMPONENT TREE ANALYSIS
  function analyzeComponentTree() {
    console.log('\n🌳 COMPONENT TREE ANALYSIS');
    console.log('==========================');
    
    // Try to find React components in DOM
    const elementsWithReactProps = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const keys = Object.keys(el);
        return keys.some(key => key.startsWith('__reactInternalFiber') || 
                               key.startsWith('__reactInternalInstance') ||
                               key.startsWith('_reactInternals'));
      });
    
    console.log(`🔍 Elements with React props: ${elementsWithReactProps.length}`);
    
    // Check for Suspense boundaries
    const suspenseBoundaries = document.querySelectorAll('[data-suspense-boundary]');
    console.log(`⏳ Suspense boundaries: ${suspenseBoundaries.length}`);
    
    // Look for loading indicators
    const loadingElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent?.includes('Loading') || el.className?.includes('loading') || el.className?.includes('spinner'));
    
    console.log(`🔄 Loading elements found: ${loadingElements.length}`);
    loadingElements.forEach((el, index) => {
      console.log(`  Loading ${index + 1}:`, el.textContent?.trim() || el.className);
    });
  }

  // 11. GENERATE COMPREHENSIVE REPORT
  function generateReport() {
    console.log('\n📋 DIAGNOSTIC REPORT');
    console.log('====================');
    
    const report = {
      timestamp: new Date().toISOString(),
      diagnostics,
      summary: {
        totalErrors: diagnostics.errors.length,
        totalWarnings: diagnostics.warnings.length,
        moduleErrors: diagnostics.moduleErrors.length,
        networkErrors: diagnostics.networkErrors.length,
        domIssues: diagnostics.domIssues.length,
        reactIssues: diagnostics.reactIssues.length
      },
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('📊 SUMMARY:', report.summary);
    
    if (report.summary.totalErrors > 0) {
      console.group('❌ CRITICAL ERRORS:');
      diagnostics.errors.forEach(error => {
        console.error(error.message);
      });
      console.groupEnd();
    }
    
    if (report.summary.domIssues.length > 0) {
      console.group('🏠 DOM ISSUES:');
      diagnostics.domIssues.forEach(issue => {
        console.error(issue);
      });
      console.groupEnd();
    }
    
    if (report.summary.reactIssues.length > 0) {
      console.group('⚛️ REACT ISSUES:');
      diagnostics.reactIssues.forEach(issue => {
        console.error(issue);
      });
      console.groupEnd();
    }
    
    if (report.summary.networkErrors.length > 0) {
      console.group('🌐 NETWORK ERRORS:');
      diagnostics.networkErrors.forEach(error => {
        console.error(error);
      });
      console.groupEnd();
    }
    
    // Export report to global scope for external access
    window.whiteScreenDiagnostics = report;
    console.log('💾 Full report saved to window.whiteScreenDiagnostics');
    
    return report;
  }

  // RUN ALL DIAGNOSTICS
  async function runDiagnostics() {
    console.time('⏱️ Diagnostics Runtime');
    
    // Run immediate checks
    analyzeDOM();
    analyzeReact();
    analyzeModules();
    analyzeCSS();
    analyzeViteHMR();
    analyzeReactErrors();
    analyzePerformance();
    analyzeComponentTree();
    
    // Start monitoring
    monitorNetwork();
    
    // Wait a bit for async operations to complete
    setTimeout(() => {
      const report = generateReport();
      console.timeEnd('⏱️ Diagnostics Runtime');
      
      // Provide recommendations
      console.log('\n💡 RECOMMENDATIONS');
      console.log('==================');
      
      if (report.summary.totalErrors > 0) {
        console.log('1. ❌ Fix JavaScript errors first - they are likely preventing React from mounting');
      }
      
      if (diagnostics.domIssues.some(issue => issue.includes('empty'))) {
        console.log('2. 🏠 Root element is empty - React app failed to mount');
      }
      
      if (diagnostics.moduleErrors.length > 0) {
        console.log('3. 📦 Fix module loading errors - check network tab for 404s');
      }
      
      if (diagnostics.networkErrors.length > 0) {
        console.log('4. 🌐 Fix network errors - API or asset loading failures');
      }
      
      if (diagnostics.reactIssues.length > 0) {
        console.log('5. ⚛️ Fix React-specific issues - check error boundaries and component mounting');
      }
      
      console.log('\n✅ DIAGNOSTICS COMPLETE');
      console.log('Run window.whiteScreenDiagnostics to see full report');
      
    }, 3000); // Wait 3 seconds for all async operations
  }

  // EXPORT UTILITIES
  window.whiteScreenDebug = {
    runDiagnostics,
    analyzeDOM,
    analyzeReact,
    analyzeModules,
    analyzeCSS,
    analyzeViteHMR,
    generateReport,
    getDiagnostics: () => diagnostics
  };

  // AUTO-RUN DIAGNOSTICS
  runDiagnostics();

})();