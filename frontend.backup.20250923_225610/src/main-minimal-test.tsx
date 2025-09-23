import React from 'react'
import ReactDOM from 'react-dom/client'
import MinimalTestApp from './App-minimal-test'

console.log('🔍 Starting minimal React test...');

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('CRITICAL: Root element not found!');
} else {
  try {
    console.log('✅ Root element found, creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    
    console.log('✅ React root created, rendering minimal app...');
    root.render(<MinimalTestApp />);
    
    console.log('🎉 Minimal React app rendered successfully!');
  } catch (error) {
    console.error('❌ Failed to render minimal app:', error);
    
    // Emergency fallback
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: system-ui; background: #ffebee; border: 2px solid #ef4444; border-radius: 8px; margin: 20px;">
        <h1 style="color: #dc2626;">React Test Failed</h1>
        <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
        <p>This confirms the white screen is caused by a React/TypeScript issue.</p>
        <button onclick="window.location.reload()" style="background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
          Reload
        </button>
      </div>
    `;
  }
}