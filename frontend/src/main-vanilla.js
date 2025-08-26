// VANILLA JS TEST - No TypeScript, no complex imports
console.log('🔍 VANILLA JS TEST - Loading...');

import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('✅ React imports loaded successfully');
console.log('React version:', React.version);

function VanillaApp() {
  console.log('✅ VanillaApp function called');
  
  return React.createElement('div', 
    { 
      style: { 
        padding: '40px', 
        background: '#ff0000', 
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '18px'
      } 
    },
    React.createElement('h1', null, '🔥 VANILLA JS REACT APP WORKING!'),
    React.createElement('p', null, 'This proves React can load when complexity is removed.'),
    React.createElement('p', null, 'Timestamp: ' + new Date().toISOString()),
    React.createElement('button', 
      { 
        onClick: () => alert('Click works!'),
        style: { 
          padding: '10px 20px', 
          background: 'white', 
          color: 'red', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: 'pointer' 
        } 
      }, 
      'Test Click'
    )
  );
}

console.log('🔍 Creating React root...');
try {
  const rootElement = document.getElementById('root');
  console.log('Root element found:', rootElement);
  
  const root = ReactDOM.createRoot(rootElement);
  console.log('✅ React root created');
  
  console.log('🔍 Rendering VanillaApp...');
  root.render(React.createElement(VanillaApp));
  console.log('✅ VanillaApp should be visible now');
  
} catch (error) {
  console.error('❌ Vanilla JS test failed:', error);
  
  // Ultimate fallback
  document.getElementById('root').innerHTML = `
    <div style="padding: 20px; background: orange; color: black;">
      <h1>⚠️ Even Vanilla JS Failed</h1>
      <p>Error: ${error.message}</p>
      <p>This indicates a deeper system issue.</p>
    </div>
  `;
}