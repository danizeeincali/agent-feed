// Minimal main.tsx to test React bootstrapping
console.log('main-minimal: Starting...');

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App-Minimal'

console.log('main-minimal: Imports loaded');

const rootElement = document.getElementById('root');
console.log('main-minimal: Root element found:', !!rootElement);

if (rootElement) {
  try {
    console.log('main-minimal: Creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    
    console.log('main-minimal: Rendering app...');
    root.render(<App />);
    
    console.log('main-minimal: ✅ SUCCESS');
  } catch (error) {
    console.error('main-minimal: ERROR:', error);
    rootElement.innerHTML = `<div style="color: red;">ERROR: ${error.message}</div>`;
  }
}

console.log('main-minimal: Script complete');
