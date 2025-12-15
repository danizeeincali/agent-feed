console.log('ClaudeCodeWithTicker: Loading...');

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import StreamingTickerWorking from './StreamingTickerWorking';

console.log('ClaudeCodeWithTicker: Imports completed');

const ClaudeCodeWithTicker: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{role: string, content: string, timestamp: number}>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendToClaudeCode = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = { role: 'user', content: message, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Send to Claude Code SDK
      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          conversation_id: `claude-ticker-${Date.now()}`,
          stream: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Claude Code Response:', data);

        let responseContent = 'Response received';
        if (data.message) {
          responseContent = data.message;
        } else if (data.responses?.response) {
          responseContent = data.responses.response;
        } else if (data.responses?.message) {
          responseContent = data.responses.message;
        } else if (typeof data.responses === 'string') {
          responseContent = data.responses;
        }

        const assistantMessage = {
          role: 'assistant',
          content: responseContent,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Claude Code API Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setMessage('');
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
        🤖 Claude Code SDK with Live Streaming Ticker
      </h1>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '20px'
      }}>
        {/* Chat Interface */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          height: '600px'
        }}>
          {/* Chat Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(to right, #3b82f6, #8b5cf6)'
          }}>
            <h2 style={{ color: 'white', margin: 0 }}>
              🔒 Claude Code SDK Chat
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: '5px 0 0 0', fontSize: '14px' }}>
              With file system access and tool execution
            </p>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {messages.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                padding: '40px'
              }}>
                <p>Send a message to Claude Code and watch the streaming ticker show real-time tool execution!</p>
                <p style={{ fontSize: '14px', marginTop: '10px' }}>
                  Try: "List the files in the current directory" or "What's in package.json?"
                </p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: msg.role === 'user' ? '#3b82f6' : '#f3f4f6',
                  color: msg.role === 'user' ? 'white' : '#1f2937',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  {msg.role === 'user' ? 'You' : '🤖 Claude Code'}
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                  {msg.content}
                </div>
                <div style={{
                  fontSize: '11px',
                  opacity: 0.7,
                  marginTop: '4px'
                }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#f3f4f6',
                alignSelf: 'flex-start',
                maxWidth: '80%'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  🤖 Claude Code
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Executing tools... (watch the ticker →)
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: '20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '10px'
          }}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendToClaudeCode()}
              placeholder="Ask Claude Code to do something with tools..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={sendToClaudeCode}
              disabled={!message.trim() || isLoading}
              style={{
                padding: '12px 20px',
                background: message.trim() && !isLoading ? '#3b82f6' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: message.trim() && !isLoading ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              {isLoading ? '⏳' : '📤'} Send
            </button>
          </div>
        </div>

        {/* Streaming Ticker Sidebar */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          padding: '20px',
          height: '600px',
          overflow: 'hidden'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#374151' }}>
            📊 Live Tool Execution
          </h3>
          <StreamingTickerWorking
            enabled={true}
            userId="claude-code-user"
            maxMessages={8}
          />
        </div>
      </div>

      {/* Status Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '8px',
        maxWidth: '1200px',
        margin: '20px auto'
      }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>
          <span style={{ color: '#10b981' }}>●</span> Claude Code SDK Connected
          <span style={{ margin: '0 15px' }}>|</span>
          <span style={{ color: '#10b981' }}>●</span> Streaming Ticker Active
          <span style={{ margin: '0 15px' }}>|</span>
          Backend: http://localhost:3000
        </div>
      </div>
    </div>
  );
};

// Render the app when this module loads
console.log('ClaudeCodeWithTicker: Setting up render...');

const renderApp = () => {
  try {
    console.log('ClaudeCodeWithTicker: Looking for root element...');
    const rootElement = document.getElementById('root');

    if (!rootElement) {
      console.error('ClaudeCodeWithTicker: Root element not found!');
      return;
    }

    console.log('ClaudeCodeWithTicker: Creating React root...');
    const root = ReactDOM.createRoot(rootElement);

    console.log('ClaudeCodeWithTicker: Rendering app...');
    root.render(React.createElement(ClaudeCodeWithTicker));

    console.log('ClaudeCodeWithTicker: ✅ Render complete!');
  } catch (error) {
    console.error('ClaudeCodeWithTicker: Render error:', error);

    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; background: #ef4444; color: white;">
          <h1>ClaudeCodeWithTicker Render Error</h1>
          <pre>${error}</pre>
        </div>
      `;
    }
  }
};

// Execute render
renderApp();

export default ClaudeCodeWithTicker;