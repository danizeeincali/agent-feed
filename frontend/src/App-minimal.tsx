import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SimpleErrorBoundary from './components/SimpleErrorBoundary';
import './index.css';

console.log('DEBUG: App-minimal.tsx loading...');

// Minimal loading component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#374151'
  }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid #e5e7eb',
      borderTop: '3px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '12px'
    }}></div>
    Loading...
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

// Simple test page
const TestPage = () => {
  console.log('DEBUG: TestPage rendering...');
  
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#1f2937', marginBottom: '20px' }}>
        Minimal App Test - SUCCESS!
      </h1>
      
      <div style={{
        background: '#f0f9ff',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '0 0 12px 0', color: '#1e40af' }}>Routing Test</h2>
        <p style={{ margin: '0', color: '#374151' }}>
          ✅ React Router is working<br/>
          ✅ Component loading successful<br/>
          ✅ Error boundary active<br/>
          ✅ Suspense fallback ready
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => console.log('Test button clicked!')}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            cursor: 'pointer'
          }}
        >
          Test Button
        </button>
        
        <button
          onClick={() => {
            throw new Error('Test error for error boundary');
          }}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            cursor: 'pointer'
          }}
        >
          Test Error Boundary
        </button>
      </div>
    </div>
  );
};

const MinimalApp: React.FC = () => {
  console.log('DEBUG: MinimalApp component rendering...');
  
  React.useEffect(() => {
    console.log('DEBUG: MinimalApp mounted successfully!');
  }, []);

  return (
    <SimpleErrorBoundary componentName="MinimalApp">
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route 
              path="/" 
              element={
                <SimpleErrorBoundary componentName="TestPage">
                  <TestPage />
                </SimpleErrorBoundary>
              } 
            />
            <Route 
              path="*" 
              element={
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>404 - Page Not Found</h2>
                  <p>The page you're looking for doesn't exist.</p>
                  <a href="/" style={{ color: '#3b82f6' }}>Go Home</a>
                </div>
              } 
            />
          </Routes>
        </Suspense>
      </Router>
    </SimpleErrorBoundary>
  );
};

export default MinimalApp;