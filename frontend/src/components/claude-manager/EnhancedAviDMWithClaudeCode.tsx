/**
 * Enhanced Avi DM with Claude Code Integration
 * Combines the original Avi DM functionality with the new Claude Code SDK streaming
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Terminal,
  MessageSquare,
  Zap,
  Activity,
  Send,
  Settings,
  Bot,
  Monitor
} from 'lucide-react';
import StreamingTickerWorking from '../../StreamingTickerWorking';
import { AviChatInterface } from '../claude-instances/AviChatInterface';
import { cn } from '../../lib/utils';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const EnhancedAviDMWithClaudeCode: React.FC = () => {
  const [activeTab, setActiveTab] = useState('avi-dm');
  const [claudeMessage, setClaudeMessage] = useState('');
  const [claudeMessages, setClaudeMessages] = useState<ClaudeMessage[]>([]);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [toolMode, setToolMode] = useState(true);

  // Avi DM specific state
  const [aviMessages, setAviMessages] = useState([]);
  const [aviLoading, setAviLoading] = useState(false);
  const [aviConnected, setAviConnected] = useState(true);

  const handleSendMessage = async () => {
    if (!claudeMessage.trim() || claudeLoading) return;

    const userMessage = claudeMessage.trim();
    setClaudeMessage('');
    setClaudeLoading(true);

    // Add user message immediately
    const userMsg: ClaudeMessage = {
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

      // Add Claude's response
      const claudeMsg: ClaudeMessage = {
        role: 'assistant',
        content: data.message || data.response || 'No response received',
        timestamp: Date.now()
      };
      setClaudeMessages(prev => [...prev, claudeMsg]);

    } catch (error) {
      console.error('Error sending message to Claude Code:', error);

      // Add error message
      const errorMsg: ClaudeMessage = {
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
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Bot className="w-8 h-8 text-blue-600 mr-3" />
                Avi DM - Interactive Control
              </h1>
              <p className="text-gray-600 mt-1">Enhanced AI assistant with Claude Code integration</p>
            </div>

            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Online
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="avi-dm" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Avi Chat</span>
            </TabsTrigger>
            <TabsTrigger value="claude-code" className="flex items-center space-x-2">
              <Terminal className="w-4 h-4" />
              <span>Claude Code</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Live Activity</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-6">
            {/* Avi DM Chat Tab */}
            <TabsContent value="avi-dm" className="h-full">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Avi DM Chat Interface
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full p-0">
                  <AviChatInterface
                    instance={{ id: 'avi-dm', name: 'Avi DM', status: 'active' }}
                    messages={aviMessages}
                    isConnected={aviConnected}
                    isLoading={aviLoading}
                    onSendMessage={(message) => {
                      console.log('Avi message:', message);
                      // Add message handling logic here
                    }}
                    onClearMessages={() => setAviMessages([])}
                    className="h-full"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Claude Code Tab */}
            <TabsContent value="claude-code" className="h-full">
              <div className="h-full flex space-x-6">
                {/* Left Side - Claude Code Chat */}
                <Card className="flex-1 flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Terminal className="w-5 h-5 mr-2" />
                        Claude Code Interface
                      </CardTitle>

                      {/* Mode Toggle */}
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-700">Mode:</span>
                        <Button
                          variant={toolMode ? "default" : "outline"}
                          size="sm"
                          onClick={() => setToolMode(!toolMode)}
                          className="flex items-center space-x-2"
                        >
                          {toolMode ? (
                            <>
                              <Zap className="w-4 h-4" />
                              <span>Tool Mode</span>
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-4 h-4" />
                              <span>Chat Mode</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                      {claudeMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Bot className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Claude Code Ready</h3>
                            <p className="text-gray-600 max-w-md">
                              Send a message to start using Claude Code with full tool access.
                            </p>
                          </div>
                        </div>
                      ) : (
                        claudeMessages.map((msg, index) => (
                          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={cn(
                              "max-w-2xl rounded-lg p-4",
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            )}>
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
                        ))
                      )}
                    </div>

                    {/* Input Area */}
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={claudeMessage}
                        onChange={(e) => setClaudeMessage(e.target.value)}
                        placeholder={toolMode ? "Enter command (e.g., 'ls', 'pwd', 'cat package.json')..." : "Chat with Claude..."}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !claudeLoading) {
                            handleSendMessage();
                          }
                        }}
                        disabled={claudeLoading}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={claudeLoading || !claudeMessage.trim()}
                        className="flex items-center space-x-2"
                      >
                        {claudeLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Executing...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Send</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Side - Status & Tools */}
                <Card className="w-80">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Monitor className="w-5 h-5 mr-2" />
                      System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Status Indicators */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div>
                          <div className="font-medium text-green-900">Claude Code SDK</div>
                          <div className="text-sm text-green-700">Official SDK Active</div>
                        </div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div>
                          <div className="font-medium text-blue-900">Tool Access</div>
                          <div className="text-sm text-blue-700">All Tools Enabled</div>
                        </div>
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>

                    {/* Available Tools */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">🛠️ Available Tools</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {['Bash', 'Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob', 'WebFetch'].map(tool => (
                          <div key={tool} className="px-2 py-1 bg-gray-100 rounded text-gray-700 text-center">
                            {tool}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Activity Stats */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">📈 Activity</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Messages sent:</span>
                          <span className="font-medium">{claudeMessages.filter(m => m.role === 'user').length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tool executions:</span>
                          <span className="font-medium">{claudeMessages.filter(m => m.role === 'assistant').length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current mode:</span>
                          <Badge variant={toolMode ? "default" : "secondary"}>
                            {toolMode ? 'Tool' : 'Chat'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Live Activity Tab */}
            <TabsContent value="activity" className="h-full">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Live Activity Ticker
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StreamingTickerWorking
                    enabled={true}
                    demo={true}
                    userId="agent-feed-user"
                    maxMessages={5}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedAviDMWithClaudeCode;