import React, { useState } from 'react';
import StreamingTicker from './components/StreamingTicker';
import { AviDirectChatSDK } from './components/posting-interface/AviDirectChatSDK';

const WorkingTestApp: React.FC = () => {
  const [showChat, setShowChat] = useState(true);
  const [showTicker, setShowTicker] = useState(true);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px', color: '#1f2937' }}>
        🚀 Claude Code SDK with Streaming Ticker
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
        alignItems: 'center'
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
          onClick={() => setShowChat(!showChat)}
          style={{
            padding: '8px 16px',
            background: showChat ? '#10b981' : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {showChat ? '✅ Chat ON' : '❌ Chat OFF'}
        </button>

        <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: '14px' }}>
          Backend: http://localhost:3000 | Frontend: http://localhost:5173
        </span>
      </div>

      {/* Standalone Ticker Demo */}
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
            📊 Streaming Ticker (Standalone Demo)
          </h2>
          <StreamingTicker
            enabled={true}
            demo={true}
            userId="demo-user"
            maxMessages={5}
          />
        </div>
      )}

      {/* Chat Interface with Integrated Ticker */}
      {showChat && (
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          height: '600px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <AviDirectChatSDK />
        </div>
      )}

      {/* Status Footer */}
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
          <div>🤖 Claude Code SDK: /api/claude-code/streaming-chat</div>
          <div>📡 Real-time Updates: Active</div>
        </div>
      </div>
    </div>
  );
};

export default WorkingTestApp;