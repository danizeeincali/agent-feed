import React from 'react'
import ReactDOM from 'react-dom/client'
import SimpleErrorBoundary from './components/SimpleErrorBoundary'
import './index.css'

// Test version - static imports for Phase 2
console.log('DEBUG: Starting test React application...');

let AppComponent: React.ComponentType;

try {
  console.log('DEBUG: Attempting to load minimal app...');
  // Static import for testing
  import('./App-minimal').then(module => {
    const MinimalApp = module.default;
    console.log('DEBUG: ✅ Minimal app loaded successfully');
    
    // Render after successful import
    const rootElement = document.getElementById('root');
    if (rootElement) {
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <SimpleErrorBoundary componentName="MinimalAppTest">
            <MinimalApp />
          </SimpleErrorBoundary>
        </React.StrictMode>
      );
      console.log('DEBUG: ✅ Minimal app rendered successfully');
    }
  }).catch(error => {
    console.error('DEBUG: ❌ Failed to load minimal app:', error);
    renderFallback();
  });
} catch (error) {
  console.error('DEBUG: ❌ Failed to setup app loading:', error);
  renderFallback();
}

function renderFallback() {
  console.log('DEBUG: Rendering fallback component...');
  
  const FallbackApp = () => (
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
      <p style={{ color: '#374151', marginBottom: '12px' }}>
        Using fallback emergency component.
      </p>
      <button
        onClick={() => {
          console.log('DEBUG: Fallback button clicked');
          alert('Fallback component is working!');
        }}
        style={{
          background: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 20px',
          cursor: 'pointer',
          marginRight: '12px'
        }}
      >
        Test Fallback
      </button>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#059669',
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
  );

  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <SimpleErrorBoundary componentName="FallbackApp">
          <FallbackApp />
        </SimpleErrorBoundary>
      </React.StrictMode>
    );
    console.log('DEBUG: ✅ Fallback app rendered successfully');
  }
}