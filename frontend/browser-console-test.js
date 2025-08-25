// Paste this into browser console at http://localhost:5173/
// This will diagnose the white screen issue

console.log('🔍 Starting white screen diagnosis...');

// Check if basic DOM is loaded
console.log('1. HTML Elements:');
console.log('- Title:', document.title);
console.log('- Root div exists:', !!document.getElementById('root'));
console.log('- Root div content length:', document.getElementById('root')?.innerHTML?.length || 0);

// Check if React is loaded
console.log('2. React Status:');
console.log('- React DevTools Hook:', typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
console.log('- React on window:', typeof window.React);

// Check for JavaScript errors
console.log('3. Script Loading:');
const scripts = Array.from(document.querySelectorAll('script[src]'));
console.log('- Script count:', scripts.length);
scripts.forEach((script, i) => {
  console.log(`- Script ${i+1}:`, script.src, script.type);
});

// Check network requests
console.log('4. Network Status:');
fetch('/api/claude/check')
  .then(r => r.json())
  .then(data => console.log('- API proxy works:', data))
  .catch(err => console.error('- API proxy error:', err));

// Check for common React mounting issues
console.log('5. React Mounting Check:');
setTimeout(() => {
  const rootContent = document.getElementById('root')?.innerHTML;
  if (!rootContent || rootContent.length < 50) {
    console.error('❌ WHITE SCREEN CONFIRMED: React not mounting');
    console.log('Root div content:', rootContent);
  } else {
    console.log('✅ React appears to be mounted');
    console.log('Root content preview:', rootContent.substring(0, 200) + '...');
  }
}, 2000);

// Monitor for errors
window.addEventListener('error', (e) => {
  console.error('🚨 JavaScript Error:', e.error?.message, 'at', e.filename + ':' + e.lineno);
});

console.log('✅ Diagnostic complete - check results above');
console.log('📋 Copy these results and share them for analysis');