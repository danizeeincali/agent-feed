console.log('WorkingApp: Loading...');

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import StreamingTickerWorking from './StreamingTickerWorking';

console.log('WorkingApp: Imports completed');

const WorkingApp: React.FC = () => {
  const [showTicker, setShowTicker] = useState(true);
  const [testMessages, setTestMessages] = useState<number>(0);

  const sendTestMessage = async () => {
    try {
      const response = await fetch('/api/streaming-ticker/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Test message ${testMessages + 1}: ${new Date().toLocaleTimeString()}`,
          priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
          type: 'tool_activity',
          tool: ['thinking', 'read', 'search', 'write', 'edit', 'bash'][Math.floor(Math.random() * 6)]
        }),
      });

      if (response.ok) {
        setTestMessages(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to send test message:', error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px', color: '#1f2937' }}>
        🚀 Streaming Ticker Demo
      </h1>

      {/* Control Panel */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto 20px',
        padding: '15px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setShowTicker(!showTicker)}
          style={{
            padding: '8px 16px',
            background: showTicker ? '#10b981' : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {showTicker ? '✅ Ticker ON' : '❌ Ticker OFF'}
        </button>

        <button
          onClick={sendTestMessage}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          📤 Send Test Message ({testMessages})
        </button>

        <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: '14px' }}>
          Backend: http://localhost:3000 | Frontend: http://localhost:5173
        </span>
      </div>

      {/* Streaming Ticker Demo */}
      {showTicker && (
        <div style={{
          maxWidth: '800px',
          margin: '0 auto 20px',
          padding: '20px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '15px', color: '#374151' }}>
            📊 Streaming Ticker (Live Demo)
          </h2>
          <StreamingTickerWorking
            enabled={true}
            demo={true}
            userId="demo-user"
            maxMessages={5}
          />
        </div>
      )}

      {/* Status Info */}
      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '8px',
        maxWidth: '800px',
        margin: '20px auto'
      }}>
        <h3 style={{ color: '#10b981', marginBottom: '10px' }}>
          ✅ System Status
        </h3>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>
          <div>🔌 SSE Endpoint: /api/streaming-ticker/stream</div>
          <div>📤 Message API: /api/streaming-ticker/message</div>
          <div>📡 Real-time Updates: Active</div>
          <div>⚡ React: {React.version}</div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        maxWidth: '800px',
        margin: '20px auto',
        padding: '15px',
        background: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px'
      }}>
        <h3 style={{ color: '#92400e', marginBottom: '10px' }}>
          🎯 How to Test:
        </h3>
        <ul style={{ color: '#92400e', fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
          <li>Click "📤 Send Test Message" to simulate Claude activity</li>
          <li>Watch the ticker animate with real-time updates</li>
          <li>Toggle the ticker ON/OFF to test controls</li>
          <li>Messages auto-expire and show timestamps</li>
        </ul>
      </div>
    </div>
  );
};

// Render the app when this module loads
console.log('WorkingApp: Setting up render...');

const renderApp = () => {
  try {
    console.log('WorkingApp: Looking for root element...');
    const rootElement = document.getElementById('root');

    if (!rootElement) {
      console.error('WorkingApp: Root element not found!');
      return;
    }

    console.log('WorkingApp: Creating React root...');
    const root = ReactDOM.createRoot(rootElement);

    console.log('WorkingApp: Rendering WorkingApp...');
    root.render(React.createElement(WorkingApp));

    console.log('WorkingApp: ✅ Render complete!');
  } catch (error) {
    console.error('WorkingApp: Render error:', error);

    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; background: #ef4444; color: white;">
          <h1>WorkingApp Render Error</h1>
          <pre>${error}</pre>
        </div>
      `;
    }
  }
};

// Execute render
renderApp();

export default WorkingApp;