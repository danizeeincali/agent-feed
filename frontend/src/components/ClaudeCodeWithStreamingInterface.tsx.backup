import React, { useState } from 'react';
import StreamingTickerWorking from '../StreamingTickerWorking';

const ClaudeCodeWithStreamingInterface: React.FC = () => {
  const [claudeMessage, setClaudeMessage] = useState('');
  const [claudeMessages, setClaudeMessages] = useState<Array<{role: string, content: string, timestamp: number}>>([]);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [toolMode, setToolMode] = useState(true);

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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🤖 Claude Code Interface</h1>
            <p className="text-gray-600 mt-1">Real-time tool execution with official Anthropic SDK</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">Mode:</span>
            <button
              onClick={() => setToolMode(!toolMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                toolMode
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              {toolMode ? '🛠️ Tool Mode' : '💬 Chat Mode'}
            </button>
            <span className="text-xs text-gray-500">
              {toolMode ? 'Execute commands & tools' : 'Conversational responses'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Claude Code Chat */}
        <div className="flex-1 flex flex-col">
          {/* Live Activity Ticker */}
          <div className="bg-white border-b p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Live Activity Ticker</h3>
            <StreamingTickerWorking
              enabled={true}
              demo={true}
              userId="agent-feed-user"
              maxMessages={3}
            />
          </div>

          {/* Chat Messages */}
          <div className="flex-1 bg-white overflow-y-auto p-6">
            {claudeMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for Claude Code</h3>
                  <p className="text-gray-600 max-w-md">
                    Send a message to start using Claude Code with full tool access.
                    The SDK can execute bash commands, read/write files, and much more.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {claudeMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="flex items-center mb-2">
                        <span className="font-medium">
                          {msg.role === 'user' ? '👤 You' : '🤖 Claude'}
                        </span>
                        <span className="text-xs opacity-75 ml-2">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white border-t p-6">
            <div className="flex space-x-4">
              <input
                type="text"
                value={claudeMessage}
                onChange={(e) => setClaudeMessage(e.target.value)}
                placeholder={toolMode ? "Enter command (e.g., 'ls', 'pwd', 'cat package.json')..." : "Chat with Claude..."}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !claudeLoading) {
                    handleSendMessage();
                  }
                }}
                disabled={claudeLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={claudeLoading || !claudeMessage.trim()}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  claudeLoading || !claudeMessage.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {claudeLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Executing...
                  </div>
                ) : (
                  '📤 Send'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Status & Info */}
        <div className="w-80 bg-white border-l overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ System Status</h3>

            {/* Status Cards */}
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-medium text-green-900">Claude Code SDK</div>
                    <div className="text-sm text-green-700">Official SDK Active</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-medium text-blue-900">Tool Access</div>
                    <div className="text-sm text-blue-700">All Tools Enabled</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-medium text-purple-900">Model</div>
                    <div className="text-sm text-purple-700">claude-sonnet-4-20250514</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Tools */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">🛠️ Available Tools</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {['Bash', 'Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob', 'WebFetch'].map(tool => (
                  <div key={tool} className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                    {tool}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">📈 Activity</h4>
              <div className="text-sm text-gray-600">
                <div className="flex justify-between py-1">
                  <span>Messages sent:</span>
                  <span className="font-medium">{claudeMessages.filter(m => m.role === 'user').length}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Tool executions:</span>
                  <span className="font-medium">{claudeMessages.filter(m => m.role === 'assistant').length}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Current mode:</span>
                  <span className="font-medium">{toolMode ? 'Tool' : 'Chat'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaudeCodeWithStreamingInterface;