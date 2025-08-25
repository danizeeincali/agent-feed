// White Screen Debug Script - Run in Browser Console
// This script captures all JavaScript errors that cause white screen

console.log('🔍 Starting White Screen Diagnostics...');

// 1. Check if React root element exists
const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);
console.log('Root element content:', rootElement?.innerHTML || 'EMPTY');

// 2. Check for JavaScript errors in console
let errorCount = 0;
const originalConsoleError = console.error;
console.error = function(...args) {
  errorCount++;
  console.log(`❌ JavaScript Error #${errorCount}:`, ...args);
  originalConsoleError.apply(console, args);
};

// 3. Check module loading status
const checkModules = () => {
  console.log('📦 Checking module loading...');
  
  // Check if main.tsx is loaded
  const scripts = Array.from(document.querySelectorAll('script[type="module"]'));
  console.log('Module scripts found:', scripts.length);
  scripts.forEach((script, index) => {
    console.log(`Script ${index + 1}:`, script.src || 'inline');
  });
  
  // Check for React
  console.log('React loaded:', typeof window.React !== 'undefined');
  console.log('ReactDOM loaded:', typeof window.ReactDOM !== 'undefined');
};

// 4. Network request monitoring
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('🌐 Fetch request:', args[0]);
  return originalFetch.apply(this, args).catch(error => {
    console.log('❌ Fetch error:', error);
    throw error;
  });
};

// 5. Check for build assets
const checkAssets = () => {
  console.log('🎨 Checking assets...');
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  console.log('Stylesheets:', stylesheets.map(link => link.href));
  
  // Check for 404s
  stylesheets.forEach(link => {
    fetch(link.href).then(response => {
      if (!response.ok) {
        console.log(`❌ Stylesheet failed: ${link.href} - Status: ${response.status}`);
      }
    });
  });
};

// 6. Monitor DOM mutations
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      console.log('✅ DOM updated:', mutation.target);
    }
  });
});

if (rootElement) {
  observer.observe(rootElement, { childList: true, subtree: true });
}

// Run all checks
setTimeout(() => {
  checkModules();
  checkAssets();
  console.log(`📊 Total JS errors so far: ${errorCount}`);
  console.log('🔍 Diagnostics complete. Check output above for issues.');
}, 2000);

// Export functions for manual testing
window.debugWhiteScreen = {
  checkModules,
  checkAssets,
  errorCount: () => errorCount
};

console.log('✅ Debug script loaded. Run window.debugWhiteScreen.checkModules() to recheck modules.');