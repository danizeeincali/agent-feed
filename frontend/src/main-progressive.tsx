import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Progressive loading version - gradually add complexity
console.log('DEBUG: Starting progressive React application...');

// Import strategy: Start minimal, add complexity step by step
let AppComponent: React.ComponentType;

try {
  console.log('DEBUG: Step 1 - Loading minimal app...');
  // Direct import instead of dynamic import for now
  AppComponent = (await import('./App-minimal')).default;
  console.log('DEBUG: ✅ Minimal app loaded successfully');
} catch (error) {
  console.error('DEBUG: ❌ Failed to load app components:', error);
  
  // Fallback to absolute minimal component
  AppComponent = () => (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'system-ui',
      backgroundColor: '#fef2f2',
      border: '2px solid #ef4444',
      borderRadius: '8px',
      margin: '20px'
    }}>
      <h1 style={{ color: '#dc2626', marginBottom: '16px' }}>
        Component Loading Failed
      </h1>
      <p style={{ color: '#374151', marginBottom: '12px' }}>
        There was an error loading the application components.
      </p>
      <pre style={{ 
        backgroundColor: '#fee2e2',
        padding: '12px',
        borderRadius: '4px',
        fontSize: '14px',
        overflow: 'auto'
      }}>
        {error instanceof Error ? error.message : String(error)}
      </pre>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 20px',
          cursor: 'pointer',
          marginTop: '12px'
        }}
      >
        Reload Page
      </button>
    </div>
  );
}

// Root element verification
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
    
    console.log('DEBUG: Rendering app component...');
    root.render(
      <React.StrictMode>
        <AppComponent />
      </React.StrictMode>
    );
    
    console.log('DEBUG: ✅ React application rendered successfully');
  } catch (error) {
    console.error('DEBUG: ❌ Failed to render React application:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: system-ui;">
        <h1>React Rendering Error</h1>
        <p>Failed to render the React application.</p>
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