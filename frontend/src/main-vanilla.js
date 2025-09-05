// Pure JavaScript test - no React imports
console.log('vanilla: Starting pure JS test...');

const rootElement = document.getElementById('root');
console.log('vanilla: Root element:', rootElement);

if (rootElement) {
  console.log('vanilla: Setting innerHTML...');
  rootElement.innerHTML = `
    <div style="background: blue; color: white; padding: 20px; font-size: 24px;">
      🎯 VANILLA JS WORKING!
      <br>This means the issue is with React imports or CSS.
    </div>
  `;
  console.log('vanilla: ✅ SUCCESS - Content set');
} else {
  console.error('vanilla: ❌ Root element not found');
  document.body.innerHTML = '<div style="color: red;">ROOT ELEMENT MISSING</div>';
}

console.log('vanilla: Script complete');
