import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import SimpleErrorBoundary from './components/SimpleErrorBoundary'
import './index.css'

// Production version with error handling and fallback
console.log('AgentLink: Starting application...');

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('CRITICAL: Root element not found!');
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: system-ui;">
      <h1>Critical Error: Root Element Missing</h1>
      <p>Could not find element with id="root" in the DOM.</p>
      <p>Please check your index.html file.</p>
      <button onclick="window.location.reload()" style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 10px 20px; cursor: pointer; margin-top: 12px;">
        Reload Page
      </button>
    </div>
  `;
} else {
  try {
    console.log('AgentLink: Creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    
    console.log('AgentLink: Rendering application...');
    root.render(
      <React.StrictMode>
        <SimpleErrorBoundary componentName="Application">
          <App />
        </SimpleErrorBoundary>
      </React.StrictMode>
    );
    
    console.log('AgentLink: ✅ Application started successfully');
  } catch (error) {
    console.error('CRITICAL: Failed to render application:', error);
    
    // Emergency fallback
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: system-ui; background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; margin: 20px;">
        <h1 style="color: #dc2626; margin-bottom: 16px;">Application Failed to Start</h1>
        <p style="color: #374151; margin-bottom: 12px;">
          There was a critical error starting the application.
        </p>
        <pre style="background: #fee2e2; padding: 12px; border-radius: 4px; font-size: 14px; overflow: auto; margin-bottom: 16px;">
${error instanceof Error ? error.message : String(error)}
        </pre>
        <div style="display: flex; gap: 12px;">
          <button onclick="window.location.reload()" style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 10px 20px; cursor: pointer;">
            Reload Page
          </button>
          <button onclick="localStorage.clear(); window.location.reload();" style="background: #059669; color: white; border: none; border-radius: 6px; padding: 10px 20px; cursor: pointer;">
            Clear Cache & Reload
          </button>
        </div>
      </div>
    `;
  }
}