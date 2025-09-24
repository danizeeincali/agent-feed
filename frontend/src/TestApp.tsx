import React from 'react';
// Removed AviDirectChatSDK import - test app simplified

const TestApp: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)',
      padding: '20px'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Streaming Ticker Test
      </h1>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        height: '600px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
          Test app simplified - chat functionality in main feed
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        color: '#6b7280'
      }}>
        Backend: http://localhost:3000 | Frontend: http://localhost:5173
      </div>
    </div>
  );
};

export default TestApp;