// Quick browser test to identify white screen root cause
console.log('🔍 Starting white screen diagnosis...');

// Test 1: Check if root element exists
const rootElement = document.getElementById('root');
console.log('Root element exists:', !!rootElement);
console.log('Root element innerHTML length:', rootElement ? rootElement.innerHTML.length : 0);

// Test 2: Try to load React manually
async function testReactLoading() {
  try {
    console.log('Attempting to load React from Vite...');
    
    // Import React modules
    const reactModule = await import('http://localhost:5173/node_modules/.vite/deps/react.js?v=45f8d52c');
    const reactDOMModule = await import('http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=820c1cbf');
    
    console.log('✅ React loaded successfully');
    console.log('React version:', reactModule.default.version);
    
    // Try to create a simple React element
    const React = reactModule.default;
    const ReactDOM = reactDOMModule.default;
    
    const testElement = React.createElement('div', {
      style: { 
        padding: '20px', 
        background: 'lightgreen', 
        border: '2px solid green',
        fontFamily: 'system-ui'
      }
    }, '🎉 React is working! White screen issue is in app components, not React itself.');
    
    const root = ReactDOM.createRoot(rootElement);
    root.render(testElement);
    
    console.log('✅ React rendered successfully - issue is in app components');
    
  } catch (error) {
    console.error('❌ React loading failed:', error);
    
    // If React fails, try to inject error info into DOM
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; background: #ffebee; border: 2px solid red; font-family: system-ui;">
          <h2>🚨 React Loading Failed</h2>
          <p><strong>Error:</strong> ${error.message}</p>
          <p><strong>Stack:</strong></p>
          <pre style="font-size: 12px; overflow: auto;">${error.stack}</pre>
        </div>
      `;
    }
  }
}

// Run the test
testReactLoading();