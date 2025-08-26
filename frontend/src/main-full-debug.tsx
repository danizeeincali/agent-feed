import React from 'react'
import ReactDOM from 'react-dom/client'
import SimpleErrorBoundary from './components/SimpleErrorBoundary'
import './index.css'

// Full app test version - Phase 3
console.log('DEBUG: Starting full app with enhanced error handling...');

// Test import strategy - load components progressively
async function loadApp() {
  console.log('DEBUG: Step 1 - Testing basic imports...');
  
  try {
    // Test basic React components first
    console.log('DEBUG: Testing ErrorBoundary import...');
    const { ErrorBoundary } = await import('./components/ErrorBoundary');
    console.log('DEBUG: ✅ ErrorBoundary imported successfully');

    console.log('DEBUG: Testing FallbackComponents import...');
    const FallbackComponents = await import('./components/FallbackComponents');
    console.log('DEBUG: ✅ FallbackComponents imported successfully');

    console.log('DEBUG: Testing router imports...');
    const { BrowserRouter } = await import('react-router-dom');
    console.log('DEBUG: ✅ React Router imported successfully');

    console.log('DEBUG: Testing query client import...');
    const { QueryClient } = await import('@tanstack/react-query');
    console.log('DEBUG: ✅ Query Client imported successfully');

    console.log('DEBUG: All basic imports successful, loading full App...');
    const App = (await import('./App')).default;
    console.log('DEBUG: ✅ Full App imported successfully');

    return App;
  } catch (error) {
    console.error('DEBUG: ❌ Failed to import components:', error);
    throw error;
  }
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
    </div>
  `;
} else {
  // Progressive loading with detailed error reporting
  loadApp()
    .then(App => {
      console.log('DEBUG: Creating React root for full app...');
      const root = ReactDOM.createRoot(rootElement);
      
      console.log('DEBUG: Rendering full app...');
      root.render(
        <React.StrictMode>
          <SimpleErrorBoundary componentName="FullAppTest">
            <App />
          </SimpleErrorBoundary>
        </React.StrictMode>
      );
      
      console.log('DEBUG: ✅ Full app rendered successfully');
    })
    .catch(error => {
      console.error('DEBUG: ❌ Failed to load full app, rendering emergency fallback:', error);
      
      // Emergency fallback component
      const EmergencyApp = () => (
        <div style={{ 
          padding: '20px', 
          fontFamily: 'system-ui',
          backgroundColor: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h1 style={{ color: '#dc2626', marginBottom: '16px' }}>
            Full App Loading Failed
          </h1>
          <p style={{ color: '#374151', marginBottom: '12px' }}>
            Could not load the full application. Error details:
          </p>
          <pre style={{ 
            backgroundColor: '#fee2e2',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '14px',
            overflow: 'auto',
            marginBottom: '16px'
          }}>
            {error instanceof Error ? error.message : String(error)}
            {error instanceof Error && error.stack ? '\n\n' + error.stack.split('\n').slice(0, 10).join('\n') : ''}
          </pre>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                console.log('DEBUG: Loading minimal app fallback...');
                import('./App-minimal').then(module => {
                  const MinimalApp = module.default;
                  const root = ReactDOM.createRoot(rootElement);
                  root.render(
                    <React.StrictMode>
                      <SimpleErrorBoundary componentName="MinimalFallback">
                        <MinimalApp />
                      </SimpleErrorBoundary>
                    </React.StrictMode>
                  );
                }).catch(err => {
                  console.error('DEBUG: Even minimal app failed:', err);
                  alert('Complete application failure. Please reload the page.');
                });
              }}
              style={{
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                cursor: 'pointer'
              }}
            >
              Try Minimal App
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );

      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <SimpleErrorBoundary componentName="EmergencyFallback">
            <EmergencyApp />
          </SimpleErrorBoundary>
        </React.StrictMode>
      );
    });
}