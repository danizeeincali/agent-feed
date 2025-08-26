import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Debug version of main.tsx to verify React is working
console.log('DEBUG: Starting React application...');

// Simple test component to verify React is working
const DebugApp: React.FC = () => {
  console.log('DEBUG: DebugApp component rendering...');
  
  React.useEffect(() => {
    console.log('DEBUG: DebugApp mounted successfully!');
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>
        React Debug Test - SUCCESS!
      </h1>
      <div style={{ 
        background: '#f0f9ff', 
        border: '2px solid #2563eb', 
        borderRadius: '8px', 
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>Status: React is Working</h2>
        <p style={{ margin: '0', color: '#374151' }}>
          ✅ React is rendering correctly<br/>
          ✅ DOM mounting successful<br/>
          ✅ CSS styles loading<br/>
          ✅ Console logging working
        </p>
      </div>
      
      <div style={{ 
        background: '#ecfdf5', 
        border: '2px solid #10b981', 
        borderRadius: '8px', 
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#059669' }}>Next Steps:</h3>
        <ol style={{ margin: '0', paddingLeft: '20px', color: '#374151' }}>
          <li>Progressively add routing</li>
          <li>Add error boundaries</li>
          <li>Import components one by one</li>
          <li>Test each addition</li>
        </ol>
      </div>

      <button
        onClick={() => {
          console.log('DEBUG: Button clicked!');
          alert('React event handling working!');
        }}
        style={{
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '12px 24px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Test Interaction
      </button>
    </div>
  );
};

// Verify DOM element exists
const rootElement = document.getElementById('root');
console.log('DEBUG: Root element found:', !!rootElement);

if (!rootElement) {
  console.error('DEBUG: Root element not found!');
  document.body.innerHTML = `
    <div style="padding: 20px; color: red;">
      ERROR: Root element with id="root" not found in DOM!
      <br>Check your index.html file.
    </div>
  `;
} else {
  console.log('DEBUG: Creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('DEBUG: Rendering DebugApp...');
  root.render(
    <React.StrictMode>
      <DebugApp />
    </React.StrictMode>
  );
  
  console.log('DEBUG: React root render called successfully');
}