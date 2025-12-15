// REACT MOUNTING DIAGNOSTICS - Specialized for React Component Analysis
// Paste this script in browser console to test React mounting step-by-step

(function() {
  'use strict';

  console.log('⚛️ REACT MOUNTING DIAGNOSTICS');
  console.log('===============================');

  const reactTests = {
    results: {},
    issues: []
  };

  // 1. TEST BASIC REACT AVAILABILITY
  function testReactAvailability() {
    console.log('\n🔍 Testing React Availability...');
    
    const tests = {
      windowReact: typeof window.React !== 'undefined',
      windowReactDOM: typeof window.ReactDOM !== 'undefined',
      reactDevTools: typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined',
      strictMode: false,
      concurrent: false
    };

    if (tests.windowReact) {
      tests.reactVersion = window.React.version;
      tests.strictMode = typeof window.React.StrictMode !== 'undefined';
      tests.concurrent = typeof window.React.startTransition !== 'undefined';
    }

    if (tests.windowReactDOM) {
      tests.reactDOMVersion = window.ReactDOM.version;
      tests.createRoot = typeof window.ReactDOM.createRoot !== 'undefined';
      tests.render = typeof window.ReactDOM.render !== 'undefined';
    }

    reactTests.results.availability = tests;
    
    console.log('✅ React availability results:', tests);
    
    if (!tests.windowReact) {
      reactTests.issues.push('CRITICAL: React not loaded globally');
    }
    if (!tests.windowReactDOM) {
      reactTests.issues.push('CRITICAL: ReactDOM not loaded globally');
    }
    if (!tests.createRoot && !tests.render) {
      reactTests.issues.push('CRITICAL: No React rendering method available');
    }
  }

  // 2. TEST DOM ROOT ELEMENT
  function testDOMRoot() {
    console.log('\n🏠 Testing DOM Root Element...');
    
    const rootElement = document.getElementById('root');
    const tests = {
      exists: !!rootElement,
      isEmpty: false,
      hasReactContainer: false,
      computedStyles: null,
      reactFiberNode: false
    };

    if (rootElement) {
      tests.isEmpty = rootElement.innerHTML.trim() === '';
      tests.computedStyles = {
        display: getComputedStyle(rootElement).display,
        visibility: getComputedStyle(rootElement).visibility,
        opacity: getComputedStyle(rootElement).opacity,
        width: rootElement.offsetWidth + 'px',
        height: rootElement.offsetHeight + 'px'
      };

      // Check for React container
      tests.hasReactContainer = !!(
        rootElement._reactRootContainer ||
        rootElement._reactInternalFiber ||
        rootElement._reactInternals ||
        rootElement.__reactInternalInstance
      );

      // Check for React Fiber
      tests.reactFiberNode = !!(
        rootElement._reactInternalFiber ||
        rootElement._reactInternals ||
        rootElement.__reactContainer ||
        rootElement.__reactInternalInstance
      );
    }

    reactTests.results.domRoot = tests;
    
    console.log('✅ DOM Root results:', tests);
    
    if (!tests.exists) {
      reactTests.issues.push('CRITICAL: Root element #root does not exist');
    } else if (tests.isEmpty && !tests.hasReactContainer) {
      reactTests.issues.push('WARNING: Root element is empty and has no React container');
    } else if (!tests.reactFiberNode) {
      reactTests.issues.push('WARNING: No React Fiber node detected on root element');
    }
  }

  // 3. TEST REACT COMPONENT MOUNTING
  async function testComponentMounting() {
    console.log('\n🧪 Testing React Component Mounting...');
    
    const rootElement = document.getElementById('root');
    if (!rootElement || !window.React || !window.ReactDOM) {
      console.error('❌ Cannot test mounting - missing prerequisites');
      return;
    }

    try {
      // Create a simple test component
      const TestComponent = window.React.createElement('div', {
        style: { 
          padding: '10px', 
          background: '#e0f7fa', 
          border: '2px solid #00acc1',
          margin: '10px 0',
          borderRadius: '4px'
        }
      }, 'React Test Component Successfully Mounted! 🎉');

      // Try creating a temporary root for testing
      const testContainer = document.createElement('div');
      testContainer.id = 'react-mount-test';
      testContainer.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;background:white;border:2px solid green;padding:10px;';
      document.body.appendChild(testContainer);

      if (window.ReactDOM.createRoot) {
        // React 18+ mounting
        const root = window.ReactDOM.createRoot(testContainer);
        root.render(TestComponent);
        
        setTimeout(() => {
          if (testContainer.innerHTML.includes('React Test Component')) {
            console.log('✅ React 18 mounting works correctly');
            reactTests.results.mounting = { method: 'createRoot', success: true };
          } else {
            console.error('❌ React 18 mounting failed - component not rendered');
            reactTests.issues.push('CRITICAL: React 18 createRoot mounting failed');
          }
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(testContainer);
          }, 3000);
        }, 1000);

      } else if (window.ReactDOM.render) {
        // React 17 mounting
        window.ReactDOM.render(TestComponent, testContainer);
        
        setTimeout(() => {
          if (testContainer.innerHTML.includes('React Test Component')) {
            console.log('✅ React 17 mounting works correctly');
            reactTests.results.mounting = { method: 'render', success: true };
          } else {
            console.error('❌ React 17 mounting failed - component not rendered');
            reactTests.issues.push('CRITICAL: React 17 render mounting failed');
          }
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(testContainer);
          }, 3000);
        }, 1000);
      }

    } catch (error) {
      console.error('❌ Component mounting test failed:', error);
      reactTests.issues.push(`CRITICAL: Component mounting exception - ${error.message}`);
      reactTests.results.mounting = { success: false, error: error.message };
    }
  }

  // 4. TEST REACT STRICT MODE EFFECTS
  function testStrictModeEffects() {
    console.log('\n🛡️ Testing React StrictMode Effects...');
    
    const tests = {
      strictModeEnabled: false,
      doubleRenderDetection: false,
      developmentMode: false
    };

    // Check if we're in development mode
    tests.developmentMode = process?.env?.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';

    // Check for StrictMode indicators
    if (window.React && window.React.StrictMode) {
      tests.strictModeEnabled = true;
    }

    // Look for StrictMode in DOM
    const strictModeElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.toString().includes('StrictMode') || el.constructor.name === 'StrictMode');
    
    if (strictModeElements.length > 0) {
      tests.doubleRenderDetection = true;
    }

    reactTests.results.strictMode = tests;
    console.log('✅ StrictMode results:', tests);

    if (tests.strictModeEnabled && tests.developmentMode) {
      console.log('ℹ️ StrictMode is enabled - components may render twice in development');
    }
  }

  // 5. TEST ERROR BOUNDARIES
  function testErrorBoundaries() {
    console.log('\n🛡️ Testing Error Boundaries...');
    
    const errorBoundaryElements = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const props = Object.keys(el);
        return props.some(prop => prop.includes('ErrorBoundary') || 
                                 prop.includes('errorBoundary') ||
                                 el.className?.includes('error-boundary'));
      });

    const tests = {
      errorBoundariesFound: errorBoundaryElements.length,
      globalErrorHandler: typeof window.onerror === 'function',
      unhandledRejectionHandler: typeof window.onunhandledrejection === 'function',
      reactErrorHandler: false
    };

    // Check for React error handling
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      tests.reactErrorHandler = true;
    }

    reactTests.results.errorBoundaries = tests;
    console.log('✅ Error Boundary results:', tests);

    if (tests.errorBoundariesFound === 0) {
      reactTests.issues.push('WARNING: No Error Boundaries detected - errors may cause white screen');
    }
  }

  // 6. TEST SUSPENSE BOUNDARIES
  function testSuspenseBoundaries() {
    console.log('\n⏳ Testing Suspense Boundaries...');
    
    const suspenseElements = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const props = Object.keys(el);
        return props.some(prop => prop.includes('Suspense') || 
                                 prop.includes('suspense')) ||
               el.className?.includes('suspense') ||
               el.textContent?.includes('Loading');
      });

    const tests = {
      suspenseBoundariesFound: suspenseElements.length,
      loadingStates: 0,
      suspenseSupported: !!(window.React && window.React.Suspense)
    };

    // Look for loading indicators that might indicate stuck Suspense
    const loadingElements = Array.from(document.querySelectorAll('*'))
      .filter(el => 
        el.textContent?.toLowerCase().includes('loading') ||
        el.className?.includes('loading') ||
        el.className?.includes('spinner') ||
        el.className?.includes('skeleton')
      );

    tests.loadingStates = loadingElements.length;

    reactTests.results.suspense = tests;
    console.log('✅ Suspense results:', tests);

    if (tests.loadingStates > 0 && suspenseElements.length > 0) {
      console.warn('⚠️ Potential stuck Suspense boundary - found loading states');
      reactTests.issues.push('WARNING: Potential stuck Suspense boundary with loading states');
    }
  }

  // 7. TEST COMPONENT TREE ANALYSIS
  function analyzeComponentTree() {
    console.log('\n🌳 Analyzing Component Tree...');
    
    const allElements = Array.from(document.querySelectorAll('*'));
    const reactElements = allElements.filter(el => {
      const keys = Object.keys(el);
      return keys.some(key => 
        key.startsWith('__reactInternalFiber') || 
        key.startsWith('__reactInternalInstance') ||
        key.startsWith('_reactInternalFiber') ||
        key.startsWith('_reactInternals') ||
        key.startsWith('__reactContainer')
      );
    });

    const tests = {
      totalElements: allElements.length,
      reactElements: reactElements.length,
      componentRatio: reactElements.length / allElements.length,
      hasComponents: reactElements.length > 0
    };

    // Analyze component types
    const componentTypes = new Set();
    reactElements.forEach(el => {
      if (el.constructor && el.constructor.name !== 'HTMLDivElement') {
        componentTypes.add(el.constructor.name);
      }
    });

    tests.componentTypes = Array.from(componentTypes);

    reactTests.results.componentTree = tests;
    console.log('✅ Component tree analysis:', tests);

    if (!tests.hasComponents) {
      reactTests.issues.push('CRITICAL: No React components detected in DOM tree');
    } else if (tests.componentRatio < 0.1) {
      reactTests.issues.push('WARNING: Very low ratio of React components to DOM elements');
    }
  }

  // 8. GENERATE REACT-SPECIFIC REPORT
  function generateReactReport() {
    console.log('\n📋 REACT DIAGNOSTICS REPORT');
    console.log('============================');

    const report = {
      timestamp: new Date().toISOString(),
      results: reactTests.results,
      issues: reactTests.issues,
      summary: {
        totalIssues: reactTests.issues.length,
        criticalIssues: reactTests.issues.filter(i => i.startsWith('CRITICAL')).length,
        warnings: reactTests.issues.filter(i => i.startsWith('WARNING')).length,
        reactAvailable: !!reactTests.results.availability?.windowReact,
        domRootExists: !!reactTests.results.domRoot?.exists,
        componentsDetected: !!reactTests.results.componentTree?.hasComponents
      }
    };

    console.log('📊 React Summary:', report.summary);

    if (report.summary.criticalIssues > 0) {
      console.group('❌ CRITICAL REACT ISSUES:');
      reactTests.issues
        .filter(i => i.startsWith('CRITICAL'))
        .forEach(issue => console.error(issue));
      console.groupEnd();
    }

    if (report.summary.warnings > 0) {
      console.group('⚠️ REACT WARNINGS:');
      reactTests.issues
        .filter(i => i.startsWith('WARNING'))
        .forEach(warning => console.warn(warning));
      console.groupEnd();
    }

    // Specific recommendations
    console.log('\n💡 REACT-SPECIFIC RECOMMENDATIONS');
    console.log('=================================');

    if (!report.summary.reactAvailable) {
      console.log('1. ❌ React is not loaded - check if main.tsx is loading correctly');
      console.log('2. 🔍 Check browser Network tab for failed module loads');
      console.log('3. 📦 Verify Vite dev server is running and accessible');
    } else if (!report.summary.domRootExists) {
      console.log('1. 🏠 Root element missing - check if index.html has <div id="root">');
    } else if (!report.summary.componentsDetected) {
      console.log('1. ⚛️ React loaded but no components rendered - check App.tsx mounting');
      console.log('2. 🛡️ Check Error Boundaries - may be catching render errors silently');
      console.log('3. ⏳ Check Suspense boundaries - may be stuck in loading state');
    }

    window.reactDiagnosticsReport = report;
    console.log('💾 Report saved to window.reactDiagnosticsReport');

    return report;
  }

  // RUN ALL REACT TESTS
  async function runAllReactTests() {
    console.time('⏱️ React Diagnostics Runtime');

    testReactAvailability();
    testDOMRoot();
    await testComponentMounting();
    testStrictModeEffects();
    testErrorBoundaries();
    testSuspenseBoundaries();
    analyzeComponentTree();

    setTimeout(() => {
      generateReactReport();
      console.timeEnd('⏱️ React Diagnostics Runtime');
      console.log('\n✅ REACT DIAGNOSTICS COMPLETE');
    }, 2000);
  }

  // EXPORT UTILITIES
  window.reactMountingDebug = {
    runAllTests: runAllReactTests,
    testReactAvailability,
    testDOMRoot,
    testComponentMounting,
    testStrictModeEffects,
    testErrorBoundaries,
    testSuspenseBoundaries,
    analyzeComponentTree,
    generateReport: generateReactReport,
    getResults: () => reactTests.results,
    getIssues: () => reactTests.issues
  };

  // AUTO-RUN
  runAllReactTests();

})();