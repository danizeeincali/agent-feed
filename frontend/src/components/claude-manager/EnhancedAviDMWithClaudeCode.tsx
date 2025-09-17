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
import { ErrorCategorizer } from '../../services/ErrorCategorizer';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
  isRetry?: boolean;
}

interface LoadingState {
  isLoading: boolean;
  status: 'idle' | 'sending' | 'processing' | 'retrying' | 'completing';
  progress?: string;
  retryCount?: number;
  startTime?: number;
}

const EnhancedAviDMWithClaudeCode: React.FC = () => {
  const [activeTab, setActiveTab] = useState('avi-dm');
  const [claudeMessage, setClaudeMessage] = useState('');
  const [claudeMessages, setClaudeMessages] = useState<ClaudeMessage[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    status: 'idle'
  });
  const [toolMode, setToolMode] = useState(true);

  // Avi DM specific state
  const [aviMessages, setAviMessages] = useState([]);
  const [aviLoading, setAviLoading] = useState(false);
  const [aviConnected, setAviConnected] = useState(true);

  const handleSendMessage = async (retryCount = 0) => {
    if (!claudeMessage.trim() || loadingState.isLoading) return;

    const userMessage = claudeMessage.trim();
    setClaudeMessage('');

    setLoadingState({
      isLoading: true,
      status: 'sending',
      progress: 'Connecting to Claude Code...',
      retryCount,
      startTime: Date.now()
    });

    // Add user message immediately
    const userMsg: ClaudeMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    };
    setClaudeMessages(prev => [...prev, userMsg]);

    try {
      // Update status to processing
      setLoadingState(prev => ({
        ...prev,
        status: 'processing',
        progress: 'Processing your request...'
      }));

      // Set up timeout and progress tracking
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 300000); // 5 minutes timeout to match AviDMService configuration

      // Progress updates for long operations
      const progressInterval = setInterval(() => {
        setLoadingState(prev => {
          if (!prev.startTime) return prev;

          const elapsedSeconds = Math.floor((Date.now() - prev.startTime) / 1000);
          const progress = ErrorCategorizer.getLongOperationExplanation(elapsedSeconds);

          return { ...prev, progress };
        });
      }, 5000);

      console.log('🔧 DEBUG: Sending request to /api/claude-code/streaming-chat');
      console.log('🔧 DEBUG: Request payload:', {
        message: toolMode ? `Use tools to help with: ${userMessage}. Execute commands and show real output.` : userMessage,
        options: {
          cwd: '/workspaces/agent-feed',
          model: 'claude-sonnet-4-20250514',
          enableTools: toolMode,
          forceToolUse: toolMode
        }
      });

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: toolMode ? `Use tools to help with: ${userMessage}. Execute commands and show real output.` : userMessage,
          options: {
            cwd: '/workspaces/agent-feed',
            model: 'claude-sonnet-4-20250514',
            enableTools: toolMode,
            forceToolUse: toolMode
          }
        }),
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      console.log('🔧 DEBUG: Response status:', response.status);
      console.log('🔧 DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 Claude Code API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
      }

      setLoadingState(prev => ({
        ...prev,
        status: 'completing',
        progress: 'Finalizing response...'
      }));

      const data = await response.json();
      console.log('🔧 DEBUG: Response data:', data);

      // Add Claude's response - handle the backend response format
      let responseContent = 'No response received';
      if (data.success && data.message) {
        responseContent = data.message;
      } else if (data.responses && data.responses.length > 0) {
        const lastResponse = data.responses[data.responses.length - 1];
        responseContent = lastResponse.content || lastResponse.message || lastResponse;
      } else if (data.content) {
        responseContent = data.content;
      }

      const claudeMsg: ClaudeMessage = {
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now(),
        isRetry: retryCount > 0
      };
      setClaudeMessages(prev => [...prev, claudeMsg]);

    } catch (error: any) {
      console.error('Error sending message to Claude Code:', error);

      // Use error categorizer for better error handling
      const errorCategory = ErrorCategorizer.categorizeError(error, retryCount);

      // Show retry option if appropriate
      if (errorCategory.shouldRetry && retryCount < errorCategory.maxRetries) {
        setLoadingState({
          isLoading: true,
          status: 'retrying',
          progress: `Retrying... (attempt ${retryCount + 2})`,
          retryCount: retryCount + 1
        });

        setTimeout(() => {
          handleSendMessage(retryCount + 1);
        }, errorCategory.retryDelay);

        return; // Don't show error message yet, we're retrying
      }

      // Add error message if not retrying
      const errorMsg: ClaudeMessage = {
        role: 'assistant',
        content: errorCategory.userMessage,
        timestamp: Date.now(),
        isError: true
      };
      setClaudeMessages(prev => [...prev, errorMsg]);
    } finally {
      // Only reset loading if not retrying
      if (!loadingState.isLoading || loadingState.status !== 'retrying') {
        setLoadingState({
          isLoading: false,
          status: 'idle'
        });
      }
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
                    instance={{
                      id: 'avi-dm',
                      name: 'Avi DM',
                      status: 'running',
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      isConnected: aviConnected,
                      hasOutput: true
                    }}
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
                                : msg.isError
                                ? 'bg-red-50 text-red-900 border border-red-200'
                                : 'bg-gray-100 text-gray-900'
                            )}>
                              <div className="flex items-center mb-2">
                                <span className="font-medium">
                                  {msg.role === 'user' ? '👤 You' : msg.isError ? '❌ Error' : '🤖 Claude'}
                                </span>
                                {msg.isRetry && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Retry Success
                                  </Badge>
                                )}
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

                    {/* Progress Indicator */}
                    {loadingState.isLoading && loadingState.progress && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          <span className="text-blue-800 text-sm">{loadingState.progress}</span>
                          {loadingState.retryCount && loadingState.retryCount > 0 && (
                            <Badge variant="outline" className="ml-2 text-xs bg-yellow-100 text-yellow-800">
                              Retry #{loadingState.retryCount}
                            </Badge>
                          )}
                        </div>
                        {loadingState.startTime && (
                          <div className="text-xs text-blue-600 mt-1">
                            Elapsed: {Math.round((Date.now() - loadingState.startTime) / 1000)}s
                          </div>
                        )}
                      </div>
                    )}

                    {/* Input Area */}
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={claudeMessage}
                        onChange={(e) => setClaudeMessage(e.target.value)}
                        placeholder={toolMode ? "Enter command (e.g., 'ls', 'pwd', 'cat package.json')..." : "Chat with Claude..."}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !loadingState.isLoading) {
                            handleSendMessage();
                          }
                        }}
                        disabled={loadingState.isLoading}
                      />
                      <Button
                        onClick={() => handleSendMessage()}
                        disabled={loadingState.isLoading || !claudeMessage.trim()}
                        className="flex items-center space-x-2"
                      >
                        {loadingState.isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>
                              {loadingState.status === 'sending' && 'Sending...'}
                              {loadingState.status === 'processing' && 'Processing...'}
                              {loadingState.status === 'retrying' && `Retrying... (${loadingState.retryCount})`}
                              {loadingState.status === 'completing' && 'Completing...'}
                            </span>
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
                      <div className={cn(
                        "flex items-center justify-between p-3 border rounded-lg",
                        loadingState.isLoading
                          ? "bg-blue-50 border-blue-200"
                          : "bg-green-50 border-green-200"
                      )}>
                        <div>
                          <div className={cn(
                            "font-medium",
                            loadingState.isLoading ? "text-blue-900" : "text-green-900"
                          )}>
                            Claude Code SDK
                          </div>
                          <div className={cn(
                            "text-sm",
                            loadingState.isLoading ? "text-blue-700" : "text-green-700"
                          )}>
                            {loadingState.isLoading
                              ? `${loadingState.status.charAt(0).toUpperCase() + loadingState.status.slice(1)}...`
                              : "Official SDK Active"
                            }
                          </div>
                        </div>
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          loadingState.isLoading
                            ? "bg-blue-500 animate-pulse"
                            : "bg-green-500"
                        )}></div>
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