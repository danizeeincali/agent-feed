import React from 'react';

const SimpleTestApp: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px', color: '#1f2937' }}>
        ✅ React App is Working!
      </h1>

      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h2>Streaming Ticker System Test</h2>
        <p>If you can see this, React is loading correctly.</p>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f0f9ff',
          border: '1px solid #3b82f6',
          borderRadius: '6px'
        }}>
          <p><strong>Status:</strong></p>
          <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li>✅ Backend API: http://localhost:3000</li>
            <li>✅ Frontend Dev: http://localhost:5173</li>
            <li>✅ React: Rendering successfully</li>
          </ul>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '10px',
          background: '#fef2f2',
          border: '1px solid #ef4444',
          borderRadius: '6px'
        }}>
          <p>Next step: Load the AviDirectChatSDK component with streaming ticker.</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleTestApp;