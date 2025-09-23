// 🚨 CRITICAL WHITE SCREEN DIAGNOSTIC SCRIPT
// Open http://localhost:5173/ and paste this into browser console (F12)

console.log('🚨 CRITICAL WHITE SCREEN ANALYSIS STARTING...');

// Global error collection
window.criticalErrors = [];
window.addEventListener('error', (e) => {
  window.criticalErrors.push({
    type: 'error',
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    error: e.error
  });
});

window.addEventListener('unhandledrejection', (e) => {
  window.criticalErrors.push({
    type: 'promise_rejection',
    reason: e.reason,
    promise: e.promise
  });
});

// 1. BASIC DOM VALIDATION
console.log('1️⃣ DOM VALIDATION:');
console.log('- Document ready state:', document.readyState);
console.log('- Title:', document.title);
console.log('- Root element exists:', !!document.getElementById('root'));
const rootEl = document.getElementById('root');
console.log('- Root innerHTML length:', rootEl?.innerHTML?.length || 0);
console.log('- Root children count:', rootEl?.children?.length || 0);
if (rootEl && rootEl.innerHTML.length < 50) {
  console.error('❌ ROOT IS EMPTY - WHITE SCREEN CONFIRMED');
  console.log('Root content:', rootEl.innerHTML);
}

// 2. SCRIPT LOADING VALIDATION
console.log('2️⃣ SCRIPT LOADING:');
const scripts = Array.from(document.querySelectorAll('script[src]'));
console.log('- Total scripts:', scripts.length);
scripts.forEach((script, i) => {
  console.log(`- Script ${i+1}:`, {
    src: script.src,
    type: script.type || 'text/javascript',
    loaded: !script.hasAttribute('async') || script.readyState === 'complete'
  });
});

// 3. MODULE LOADING TEST
console.log('3️⃣ MODULE LOADING TEST:');
const moduleScripts = Array.from(document.querySelectorAll('script[type="module"]'));
console.log('- Module scripts:', moduleScripts.length);
moduleScripts.forEach((script, i) => {
  console.log(`- Module ${i+1}:`, script.src || script.innerHTML.substring(0, 100));
});

// 4. REACT MOUNTING ANALYSIS
console.log('4️⃣ REACT MOUNTING ANALYSIS:');
console.log('- React DevTools Hook:', typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
console.log('- React on window:', typeof window.React);
console.log('- ReactDOM on window:', typeof window.ReactDOM);

// Check if React components are in DOM
setTimeout(() => {
  console.log('5️⃣ DELAYED REACT CHECK (2s):');
  const rootContent = document.getElementById('root')?.innerHTML;
  if (!rootContent || rootContent.trim() === '') {
    console.error('❌ REACT NOT MOUNTED AFTER 2 SECONDS');
    console.log('Possible causes:');
    console.log('- JavaScript error preventing React from running');
    console.log('- Module import failure');
    console.log('- CSS blocking render');
    console.log('- React StrictMode issues');
  } else {
    console.log('✅ React appears mounted');
    console.log('Content length:', rootContent.length);
  }
}, 2000);

// 5. NETWORK REQUESTS ANALYSIS
console.log('6️⃣ NETWORK ANALYSIS:');
fetch('/api/claude/check')
  .then(r => r.json())
  .then(data => console.log('✅ API Proxy working:', data))
  .catch(err => console.error('❌ API Proxy failed:', err));

// Test main.tsx loading
fetch('/src/main.tsx')
  .then(r => r.text())
  .then(code => {
    console.log('✅ main.tsx loaded, length:', code.length);
    if (code.includes('import') && code.includes('React')) {
      console.log('✅ main.tsx has React imports');
    } else {
      console.error('❌ main.tsx missing React imports');
    }
  })
  .catch(err => console.error('❌ main.tsx failed to load:', err));

// 6. CSS LOADING CHECK
console.log('7️⃣ CSS ANALYSIS:');
const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
console.log('- Stylesheets:', stylesheets.length);
stylesheets.forEach((link, i) => {
  console.log(`- CSS ${i+1}:`, link.href);
});

// 7. VITE SPECIFIC CHECKS
console.log('8️⃣ VITE DEV SERVER CHECKS:');
if (window.__vite_plugin_react_preamble_installed__) {
  console.log('✅ Vite React plugin loaded');
} else {
  console.error('❌ Vite React plugin not detected');
}

// 8. ERROR SUMMARY
setTimeout(() => {
  console.log('9️⃣ ERROR SUMMARY:');
  if (window.criticalErrors.length > 0) {
    console.error('❌ CRITICAL ERRORS FOUND:');
    window.criticalErrors.forEach((error, i) => {
      console.error(`Error ${i+1}:`, error);
    });
  } else {
    console.log('✅ No critical JavaScript errors detected');
  }
  
  console.log('🎯 DIAGNOSIS COMPLETE');
  console.log('📋 Copy all output above and share for analysis');
}, 3000);

console.log('✅ White screen diagnostic script loaded');
console.log('⏳ Analysis running... check results above in 3 seconds');