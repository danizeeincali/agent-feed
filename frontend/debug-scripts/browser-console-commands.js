// PASTE THESE COMMANDS INTO BROWSER CONSOLE at http://localhost:5173
// Run each section separately to diagnose the white screen issue

console.group('🔍 AGENT FEED DEBUG - Step 1: Basic Checks');

// Check if main.tsx loaded and executed
console.log('1. AgentLink logs should appear above this line');

// Check root element
const rootElement = document.getElementById('root');
console.log('2. Root element found:', rootElement ? 'YES' : 'NO');

if (rootElement) {
    console.log('   Root innerHTML length:', rootElement.innerHTML.length);
    console.log('   Root children count:', rootElement.children.length);
    
    if (rootElement.innerHTML.length === 0) {
        console.log('   ❌ ROOT IS EMPTY - React not mounted');
    } else {
        console.log('   ✅ Root has content');
    }
} else {
    console.log('   ❌ CRITICAL: Root element missing from DOM');
}

// Check React libraries
console.log('3. React loaded:', typeof React !== 'undefined');
console.log('4. ReactDOM loaded:', typeof ReactDOM !== 'undefined');

console.groupEnd();

console.group('🔍 AGENT FEED DEBUG - Step 2: Module Loading');

// Check if main script loaded
const mainScript = document.querySelector('script[src*="main.tsx"]');
console.log('5. Main script tag found:', mainScript ? 'YES' : 'NO');

if (mainScript) {
    console.log('   Script src:', mainScript.src);
}

// Check all module scripts
const moduleScripts = Array.from(document.querySelectorAll('script[type="module"]'));
console.log('6. Total module scripts:', moduleScripts.length);

moduleScripts.forEach((script, index) => {
    console.log(`   Script ${index + 1}:`, script.src || 'inline');
});

console.groupEnd();

console.group('🔍 AGENT FEED DEBUG - Step 3: Network Check');

// Check if Vite dev server is responding
fetch('/vite.svg')
    .then(response => {
        console.log('7. Vite server responding:', response.ok);
    })
    .catch(error => {
        console.log('7. Vite server error:', error.message);
    });

// Check main.tsx specifically
fetch('/src/main.tsx')
    .then(response => {
        console.log('8. main.tsx accessible:', response.ok);
        console.log('   Content-Type:', response.headers.get('content-type'));
    })
    .catch(error => {
        console.log('8. main.tsx error:', error.message);
    });

console.groupEnd();

console.group('🔍 AGENT FEED DEBUG - Step 4: Performance Check');

// Check resource loading
const entries = performance.getEntriesByType('resource');
console.log('9. Total resources loaded:', entries.length);

// Look for failed resources (transferSize 0 usually means failed)
const failedResources = entries.filter(entry => 
    entry.transferSize === 0 && 
    entry.decodedBodySize === 0 && 
    !entry.name.includes('chrome-extension')
);

console.log('10. Potentially failed resources:', failedResources.length);

if (failedResources.length > 0) {
    console.log('    Failed resources:');
    failedResources.forEach(resource => {
        console.log('      -', resource.name);
    });
}

// Check specifically for your main.tsx
const mainResource = entries.find(entry => entry.name.includes('main.tsx'));
if (mainResource) {
    console.log('11. main.tsx resource found:');
    console.log('    Duration:', mainResource.duration, 'ms');
    console.log('    Transfer size:', mainResource.transferSize, 'bytes');
    console.log('    Status: Loaded successfully');
} else {
    console.log('11. ❌ main.tsx resource NOT found in performance entries');
}

console.groupEnd();

console.group('🔍 AGENT FEED DEBUG - Step 5: Error Detection');

// Listen for any new errors
window.addEventListener('error', (event) => {
    console.log('🚨 JavaScript Error:', event.error?.message || event.message);
    console.log('   Source:', event.filename, 'Line:', event.lineno);
});

window.addEventListener('unhandledrejection', (event) => {
    console.log('🚨 Unhandled Promise Rejection:', event.reason);
});

console.log('12. Error listeners attached - any future errors will be logged above');

console.groupEnd();

console.group('🔍 AGENT FEED DEBUG - Step 6: React DevTools Check');

// Check React DevTools
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('13. React DevTools available');
    
    // Try to access React fiber
    if (rootElement && rootElement._reactInternalFiber) {
        console.log('    React fiber found (legacy)');
    } else if (rootElement && rootElement._reactInternalInstance) {
        console.log('    React instance found (legacy)');
    } else {
        console.log('    React 18 concurrent features - checking root');
        
        // React 18 uses different internal structure
        const reactProps = Object.keys(rootElement).find(key => key.startsWith('__reactInternalInstance'));
        if (reactProps) {
            console.log('    React 18 internal instance found');
        } else {
            console.log('    ❌ No React internal instance found');
        }
    }
} else {
    console.log('13. React DevTools not available');
}

console.groupEnd();

// Final summary
console.group('📊 SUMMARY');
console.log('Check the results above for:');
console.log('• Root element exists and has content');
console.log('• React/ReactDOM are loaded');
console.log('• main.tsx script loaded successfully');
console.log('• No failed network resources');
console.log('• AgentLink console messages appeared');
console.log('');
console.log('If all checks pass but screen is white:');
console.log('1. Check App.tsx for render errors');
console.log('2. Check SimpleErrorBoundary component');
console.log('3. Try: localStorage.clear(); location.reload();');
console.groupEnd();

console.log('🏁 Browser console debug complete!');
console.log('💡 Tip: If issues persist, run the Playwright capture script from terminal');