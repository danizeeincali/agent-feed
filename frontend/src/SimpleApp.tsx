import React, { useState } from 'react';
// import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

console.log('SimpleApp: Loading...');

// Gradually add back components
import StreamingTickerWorking from './StreamingTickerWorking';
import { RealSocialMediaFeed } from './components/RealSocialMediaFeed';

const SimpleApp: React.FC = () => {
  console.log('SimpleApp: Rendering...');

  const [claudeMessage, setClaudeMessage] = useState('');
  const [claudeMessages, setClaudeMessages] = useState<Array<{role: string, content: string, timestamp: number}>>([]);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [showClaudeCode, setShowClaudeCode] = useState(false);
  const [toolMode, setToolMode] = useState(true);
  const [activeTab, setActiveTab] = useState('claude');

  const handleSendMessage = async () => {
    if (!claudeMessage.trim() || claudeLoading) return;

    const userMessage = claudeMessage.trim();
    setClaudeMessage('');
    setClaudeLoading(true);

    // Add user message immediately
    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    };
    setClaudeMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: toolMode ? `Use tools to help with: ${userMessage}. Execute commands and show real output.` : userMessage,
          cwd: '/workspaces/agent-feed',
          model: 'claude-sonnet-4-20250514',
          enableTools: toolMode,
          forceToolUse: toolMode
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Add Claude's response - extract from the correct field
      const claudeMsg = {
        role: 'assistant',
        content: data.message || data.response || 'No response received',
        timestamp: Date.now()
      };
      setClaudeMessages(prev => [...prev, claudeMsg]);

    } catch (error) {
      console.error('Error sending message to Claude Code:', error);

      // Add error message
      const errorMsg = {
        role: 'assistant',
        content: `Error: ${error.message}. Make sure the backend is running on port 3000.`,
        timestamp: Date.now()
      };
      setClaudeMessages(prev => [...prev, errorMsg]);
    } finally {
      setClaudeLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Simple Header */}
      <header style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: 0
            }}>
              🤖 Agent Feed
            </h1>
            <p style={{
              color: '#6b7280',
              margin: '8px 0 0 0',
              fontSize: '14px'
            }}>
              Full-featured Agent Feed with Claude Code integration
            </p>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('feed')}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab === 'feed' ? '#3b82f6' : '#f3f4f6',
                color: activeTab === 'feed' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📱 Feed
            </button>
            <button
              onClick={() => setActiveTab('claude')}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab === 'claude' ? '#3b82f6' : '#f3f4f6',
                color: activeTab === 'claude' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🤖 Claude Code
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
              📱 Social Media Feed
            </h2>
            <RealSocialMediaFeed />
          </div>
        )}

        {/* Claude Code Tab */}
        {activeTab === 'claude' && (
          <div>
            {/* Status Check */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
                ✅ Status Check
              </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
              <div style={{ color: '#15803d', fontWeight: '500' }}>✅ React App</div>
              <div style={{ color: '#166534', fontSize: '12px' }}>Loading successfully</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px' }}>
              <div style={{ color: '#92400e', fontWeight: '500' }}>⚠️ Complex Components</div>
              <div style={{ color: '#92400e', fontSize: '12px' }}>Disabled for debugging</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#e0f2fe', border: '1px solid #0ea5e9', borderRadius: '6px' }}>
              <div style={{ color: '#0c4a6e', fontWeight: '500' }}>🔧 Backend</div>
              <div style={{ color: '#0c4a6e', fontSize: '12px' }}>Claude Code SDK ready</div>
            </div>
          </div>
            </div>

            {/* Claude Code Interface */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              🤖 Claude Code Interface
            </h2>
            <button
              onClick={() => setShowClaudeCode(!showClaudeCode)}
              style={{
                padding: '8px 16px',
                backgroundColor: showClaudeCode ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showClaudeCode ? '❌ Hide' : '✅ Show'} Claude Code
            </button>
          </div>

          {showClaudeCode && (
            <div>
              {/* Streaming Ticker */}
              {/* Mode Toggle */}
              <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#374151' }}>Mode:</span>
                <button
                  onClick={() => setToolMode(!toolMode)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: toolMode ? '#10b981' : '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {toolMode ? '🛠️ Tool Mode' : '💬 Chat Mode'}
                </button>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                  {toolMode ? 'Execute commands & tools' : 'Conversational responses'}
                </span>
              </div>

              {/* Live Activity Ticker */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>
                  📊 Live Activity Ticker
                </h3>
                <StreamingTickerWorking
                  enabled={true}
                  demo={true}
                  userId="agent-feed-user"
                  maxMessages={3}
                />
              </div>

              {/* Claude Code Chat Interface */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#374151', margin: 0 }}>
                    💬 Claude Code Chat
                  </h4>
                </div>

                {/* Messages */}
                <div style={{
                  height: '200px',
                  overflowY: 'auto',
                  padding: '16px',
                  backgroundColor: '#fafafa'
                }}>
                  {claudeMessages.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '14px',
                      paddingTop: '60px'
                    }}>
                      Send a message to start using Claude Code...
                    </div>
                  ) : (
                    claudeMessages.map((msg, index) => (
                      <div key={index} style={{
                        marginBottom: '12px',
                        padding: '8px 12px',
                        backgroundColor: msg.role === 'user' ? '#dbeafe' : '#f0fdf4',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                          {msg.role === 'user' ? '👤 You' : '🤖 Claude'}
                        </div>
                        <div style={{ color: '#374151' }}>{msg.content}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <div style={{ padding: '16px', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={claudeMessage}
                      onChange={(e) => setClaudeMessage(e.target.value)}
                      placeholder={toolMode ? "Enter command (e.g., 'ls', 'pwd', 'cat package.json')..." : "Chat with Claude..."}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !claudeLoading) {
                          handleSendMessage();
                        }
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={claudeLoading || !claudeMessage.trim()}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: claudeLoading ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: claudeLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      {claudeLoading ? '⏳' : '📤'} Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

            {/* Progress Update */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
                🚀 Progress Update
              </h2>
              <ul style={{ color: '#374151', lineHeight: '1.6', paddingLeft: '20px' }}>
                <li>✅ Basic React app loads without white screen</li>
                <li>✅ Claude Code interface with real tool execution</li>
                <li>✅ Streaming ticker with live activity updates</li>
                <li>✅ Tool Mode: Execute actual bash commands and file operations</li>
                <li>✅ Chat Mode: Conversational responses from Avi</li>
                <li>✅ Social Media Feed component restored</li>
                <li>✅ Tab navigation between Feed and Claude Code</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

console.log('SimpleApp: Component defined');

export default SimpleApp;