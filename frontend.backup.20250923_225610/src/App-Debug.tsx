import React from 'react';

// TDD London School - Minimal App to isolate the white screen issue
console.log('DEBUG: App-Debug.tsx loading...');

const App: React.FC = () => {
  console.log('DEBUG: App-Debug component rendering...');
  
  React.useEffect(() => {
    console.log('DEBUG: App-Debug component mounted successfully!');
  }, []);
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'white',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '2rem',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          🚀 App-Debug Working!
        </h1>
        <p style={{ marginBottom: '1rem' }}>
          This minimal app is working, which means the issue is in a specific component.
        </p>
        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
          Check the browser console for any additional debug messages.
        </p>
      </div>
    </div>
  );
};

console.log('DEBUG: App-Debug.tsx loaded successfully');
export default App;