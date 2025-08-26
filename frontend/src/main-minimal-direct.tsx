import React from 'react'
import ReactDOM from 'react-dom/client'
import MinimalApp from './App-minimal'
import SimpleErrorBoundary from './components/SimpleErrorBoundary'
import './index.css'

// Direct import version - Phase 2 test
console.log('DEBUG: Starting minimal app with direct import...');

const rootElement = document.getElementById('root');
console.log('DEBUG: Root element found:', !!rootElement);

if (!rootElement) {
  console.error('DEBUG: ❌ Root element not found!');
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: system-ui;">
      <h1>Critical Error: Root Element Missing</h1>
      <p>Could not find element with id="root" in the DOM.</p>
      <p>Check your index.html file.</p>
    </div>
  `;
} else {
  try {
    console.log('DEBUG: Creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    
    console.log('DEBUG: Rendering minimal app...');
    root.render(
      <React.StrictMode>
        <SimpleErrorBoundary componentName="MinimalAppDirect">
          <MinimalApp />
        </SimpleErrorBoundary>
      </React.StrictMode>
    );
    
    console.log('DEBUG: ✅ Minimal app with routing rendered successfully');
  } catch (error) {
    console.error('DEBUG: ❌ Failed to render minimal app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: system-ui;">
        <h1>React Rendering Error</h1>
        <p>Failed to render the minimal React application.</p>
        <pre style="background: #fee2e2; padding: 12px; border-radius: 4px; font-size: 14px;">
${error instanceof Error ? error.message : String(error)}
        </pre>
        <button onclick="window.location.reload()" style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 10px 20px; cursor: pointer; margin-top: 12px;">
          Reload Page
        </button>
      </div>
    `;
  }
}