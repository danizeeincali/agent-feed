/**
 * EnhancedSSEInterface - Feature-Rich SSE Claude Instance Manager
 * 
 * Migrated from /claude-instances with enhanced UI/UX features:
 * - Dual mode interface (Chat + Terminal)
 * - Image upload support
 * - Enhanced status indicators
 * - Quick launch templates
 * - Performance monitoring
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useSSEClaudeInstance } from '../../hooks/useSSEClaudeInstance';
import { useTerminalCommandHistory } from '../../hooks/useTerminalCommandHistory';
import { useCopyExportOutput } from '../../hooks/useCopyExportOutput';
import { ConnectionState } from '../../managers/ClaudeInstanceManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Terminal, 
  MessageSquare, 
  Zap, 
  Clock, 
  Activity,
  Send,
  RefreshCw,
  Plus,
  X,
  Monitor,
  Copy,
  Download,
  Upload,
  Settings,
  ChevronRight,
  AlertCircle,
  FileText,
  FileJson,
  FileCode
} from 'lucide-react';
import { cn } from '../../lib/utils';
// CSS handled by global styles

// Types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    tokensUsed?: number;
    duration?: number;
    exitCode?: number;
  };
  images?: string[];
}

interface QuickTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  command: string;
  description: string;
}

interface EnhancedSSEInterfaceProps {
  apiUrl?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

// Quick launch templates
const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'default',
    name: 'Default Claude',
    icon: <Terminal className="w-4 h-4" />,
    command: 'claude',
    description: 'Standard Claude instance'
  },
  {
    id: 'skip-permissions',
    name: 'Skip Permissions',
    icon: <Zap className="w-4 h-4" />,
    command: 'claude --dangerously-skip-permissions',
    description: 'Claude with permissions bypassed'
  },
  {
    id: 'interactive',
    name: 'Interactive Mode',
    icon: <MessageSquare className="w-4 h-4" />,
    command: 'claude --interactive',
    description: 'Interactive Claude session'
  }
];

export const EnhancedSSEInterface: React.FC<EnhancedSSEInterfaceProps> = ({
  apiUrl = 'http://localhost:3000',
  autoConnect = false,
  reconnectAttempts = 5,
  reconnectInterval = 2000
}) => {
  // SSE Hook
  const {
    manager,
    isConnected,
    connectionState,
    connectionError,
    availableInstances,
    selectedInstanceId,
    output,
    connectToInstance,
    disconnectFromInstance,
    sendCommand,
    refreshInstances,
    clearOutput,
    loading,
    messageCount,
    lastActivity
  } = useSSEClaudeInstance({
    apiUrl,
    autoConnect,
    reconnectAttempts,
    reconnectInterval
  });

  // State
  const [viewMode, setViewMode] = useState<'chat' | 'terminal' | 'split'>('split');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [connectionStats, setConnectionStats] = useState({
    connectedAt: null as Date | null,
    messagesExchanged: 0,
    bytesTransferred: 0
  });
  const [showCopyExportMenu, setShowCopyExportMenu] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Feature 16: Terminal Command History Hook
  const {
    handleKeyDown: handleHistoryKeyDown,
    addCommand: addToHistory,
    clearHistory,
    hasHistory,
    commands: commandHistory
  } = useTerminalCommandHistory(100);
  
  // Feature 18: Copy/Export Output Hook
  const {
    copyMessage,
    copyAllOutput,
    copySelectedRange,
    exportSession
  } = useCopyExportOutput(output, chatMessages);

  // Refs
  const outputRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll for chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Auto-scroll for terminal
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Process terminal output into chat messages
  useEffect(() => {
    if (output.length > 0 && selectedInstanceId) {
      const lastMessage = output[output.length - 1];
      
      // Convert terminal output to chat message
      if (lastMessage.type === 'output' && lastMessage.content) {
        const chatMessage: ChatMessage = {
          id: `chat-${Date.now()}`,
          role: 'assistant',
          content: lastMessage.content,
          timestamp: lastMessage.timestamp,
          metadata: {
            duration: Date.now() - lastMessage.timestamp.getTime()
          }
        };
        
        setChatMessages(prev => [...prev, chatMessage]);
      }
    }
  }, [output, selectedInstanceId]);

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() && selectedImages.length === 0) return;
    if (!selectedInstanceId || !isConnected) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
      images: selectedImages
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    // Feature 16: Add command to history
    addToHistory(input);
    
    // Send command
    await sendCommand(selectedInstanceId, input);
    
    // Clear input and images
    setInput('');
    setSelectedImages([]);
  }, [input, selectedImages, selectedInstanceId, isConnected, sendCommand, addToHistory]);

  // Enhanced keyboard handler for all input fields
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // First handle history navigation
    const historyResult = handleHistoryKeyDown(e);
    
    // Update input state if history navigation occurred
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (e.currentTarget.value !== input) {
        setInput(e.currentTarget.value);
      }
    }
    
    // Handle enter key for message sending
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    
    return historyResult;
  }, [handleHistoryKeyDown, input, handleSendMessage]);

  // Show user feedback for operations
  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedbackMessage({ type, message });
    setTimeout(() => setFeedbackMessage(null), 3000);
  }, []);

  // Enhanced copy functions with feedback
  const copyMessageWithFeedback = useCallback(async (messageId: string) => {
    const success = await copyMessage(messageId);
    showFeedback(success ? 'success' : 'error', 
      success ? 'Message copied to clipboard' : 'Failed to copy message');
  }, [copyMessage, showFeedback]);

  const copyAllOutputWithFeedback = useCallback(async () => {
    const success = await copyAllOutput();
    showFeedback(success ? 'success' : 'error', 
      success ? 'All output copied to clipboard' : 'Failed to copy output');
  }, [copyAllOutput, showFeedback]);

  const exportSessionWithFeedback = useCallback(async (format: 'txt' | 'json' | 'md') => {
    const success = await exportSession(format);
    showFeedback(success ? 'success' : 'error', 
      success ? `Session exported as ${format.toUpperCase()}` : `Failed to export as ${format.toUpperCase()}`);
  }, [exportSession, showFeedback]);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push(e.target.result as string);
            setSelectedImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  // Handle quick template launch
  const handleQuickLaunch = useCallback(async (template: QuickTemplate) => {
    try {
      const response = await fetch(`${apiUrl}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: template.command,
          name: template.name,
          type: template.id
        })
      });
      
      if (response.ok) {
        await refreshInstances();
      }
    } catch (error) {
      console.error('Failed to launch instance:', error);
    }
  }, [apiUrl, refreshInstances]);

  // Connection status component
  const ConnectionStatus = useMemo(() => (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-2 h-2 rounded-full",
        isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
      )} />
      <span className="text-sm text-gray-600">
        {isConnected ? `Connected to ${selectedInstanceId?.slice(0, 8)}...` : 'Not connected'}
      </span>
      {lastActivity && (
        <span className="text-xs text-gray-400">
          Last activity: {lastActivity.toLocaleTimeString()}
        </span>
      )}
    </div>
  ), [isConnected, selectedInstanceId, lastActivity]);

  // Performance metrics
  const PerformanceMetrics = useMemo(() => showMetrics ? (
    <Card className="mb-4">
      <CardHeader className="py-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Messages</span>
            <p className="font-mono">{messageCount}</p>
          </div>
          <div>
            <span className="text-gray-500">Connection Time</span>
            <p className="font-mono">
              {connectionStats.connectedAt 
                ? `${Math.floor((Date.now() - connectionStats.connectedAt.getTime()) / 1000)}s`
                : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">State</span>
            <p className="font-mono">{connectionState}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ) : null, [showMetrics, messageCount, connectionStats, connectionState]);

  return (
    <div className="enhanced-sse-interface h-full flex flex-col">
      {/* Header */}
      <div className="header-section border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Enhanced Claude Control (SSE)
          </h2>
          {ConnectionStatus}
        </div>

        {connectionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            onClick={refreshInstances}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          
          {/* Feature 18: Copy/Export Controls */}
          <div className="relative">
            <Button
              onClick={() => setShowCopyExportMenu(!showCopyExportMenu)}
              size="sm"
              variant="outline"
              disabled={output.length === 0 && chatMessages.length === 0}
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy/Export
            </Button>
            
            {showCopyExportMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-48">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 mb-2">Copy</div>
                  <Button
                    onClick={async () => {
                      await copyAllOutputWithFeedback();
                      setShowCopyExportMenu(false);
                    }}
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start mb-1"
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copy All Output
                  </Button>
                  
                  <div className="text-xs font-semibold text-gray-500 mb-2 mt-3">Export</div>
                  <Button
                    onClick={async () => {
                      await exportSessionWithFeedback('txt');
                      setShowCopyExportMenu(false);
                    }}
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start mb-1"
                  >
                    <FileText className="w-3 h-3 mr-2" />
                    Export as TXT
                  </Button>
                  <Button
                    onClick={async () => {
                      await exportSessionWithFeedback('json');
                      setShowCopyExportMenu(false);
                    }}
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start mb-1"
                  >
                    <FileJson className="w-3 h-3 mr-2" />
                    Export as JSON
                  </Button>
                  <Button
                    onClick={async () => {
                      await exportSessionWithFeedback('md');
                      setShowCopyExportMenu(false);
                    }}
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start"
                  >
                    <FileCode className="w-3 h-3 mr-2" />
                    Export as Markdown
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Feature 16: Command History Clear */}
          {hasHistory && (
            <Button
              onClick={clearHistory}
              size="sm"
              variant="ghost"
              title="Clear command history"
            >
              <X className="w-4 h-4 mr-1" />
              Clear History
            </Button>
          )}
          
          <div className="flex-1" />
          
          <Button
            onClick={() => setShowMetrics(!showMetrics)}
            size="sm"
            variant="ghost"
          >
            <Activity className="w-4 h-4 mr-1" />
            Metrics
          </Button>
          
          <Button
            onClick={() => setViewMode(viewMode === 'split' ? 'chat' : viewMode === 'chat' ? 'terminal' : 'split')}
            size="sm"
            variant="ghost"
          >
            <Monitor className="w-4 h-4 mr-1" />
            {viewMode === 'split' ? 'Split' : viewMode === 'chat' ? 'Chat' : 'Terminal'}
          </Button>
        </div>

        {PerformanceMetrics}
      </div>

      {/* Instance Selection */}
      <div className="instance-section border-b p-4">
        <h3 className="text-sm font-semibold mb-2">Instances</h3>
        
        {availableInstances.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">No instances available</p>
            <div className="flex gap-2">
              {QUICK_TEMPLATES.map(template => (
                <Button
                  key={template.id}
                  onClick={() => handleQuickLaunch(template)}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {template.icon}
                  {template.name}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="instance-table-container">
            <table className="instance-table">
              <thead>
                <tr>
                  <th>Instance ID</th>
                  <th>PID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {availableInstances.map(instance => {
                  const isSelected = selectedInstanceId === instance.id;
                  const isConnectedToThis = isSelected && isConnected;
                  
                  return (
                    <tr 
                      key={instance.id}
                      className={cn("instance-row", isSelected && "selected")}
                    >
                      <td className="instance-id-cell">
                        <span className="full-id">{instance.id}</span>
                      </td>
                      <td className="pid-cell">
                        <code>{instance.pid}</code>
                      </td>
                      <td className="status-cell">
                        <Badge variant={isConnectedToThis ? "success" : "default"}>
                          {isConnectedToThis ? 'connected' : instance.status}
                        </Badge>
                      </td>
                      <td className="actions-cell">
                        <Button
                          onClick={() => isConnectedToThis 
                            ? disconnectFromInstance() 
                            : connectToInstance(instance.id)}
                          disabled={loading}
                          size="sm"
                          variant={isConnectedToThis ? "destructive" : "default"}
                        >
                          {isConnectedToThis ? 'Disconnect' : 'Connect'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Interface */}
      {isConnected && selectedInstanceId && (
        <div className="flex-1 overflow-hidden">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="h-full">
            <TabsList className="mx-4">
              <TabsTrigger value="chat">
                <MessageSquare className="w-4 h-4 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="terminal">
                <Terminal className="w-4 h-4 mr-1" />
                Terminal
              </TabsTrigger>
              <TabsTrigger value="split">
                <Monitor className="w-4 h-4 mr-1" />
                Split View
              </TabsTrigger>
            </TabsList>

            <div className="h-full p-4">
              {viewMode === 'split' ? (
                <div className="grid grid-cols-2 gap-4 h-full">
                  {/* Chat Panel */}
                  <Card className="flex flex-col h-full">
                    <CardHeader className="py-2">
                      <CardTitle className="text-sm">Chat</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-0">
                      <div className="space-y-2 p-4">
                        {chatMessages.map(msg => (
                          <div
                            key={msg.id}
                            className={cn(
                              "p-3 rounded-lg group relative",
                              msg.role === 'user' 
                                ? "bg-blue-100 ml-auto max-w-[80%]" 
                                : "bg-gray-100 max-w-[80%]"
                            )}
                          >
                            <div className="text-sm">{msg.content}</div>
                            {/* Feature 18: Individual message copy button */}
                            <Button
                              onClick={() => copyMessageWithFeedback(msg.id)}
                              size="sm"
                              variant="ghost"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                              title="Copy this message"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            {msg.images && msg.images.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {msg.images.map((img, idx) => (
                                  <img 
                                    key={idx} 
                                    src={img} 
                                    alt="Attached" 
                                    className="w-16 h-16 object-cover rounded"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    </CardContent>
                    <div className="border-t p-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          placeholder="Type a message... (Use ↑↓ for history)"
                          className="flex-1 px-3 py-2 border rounded-lg"
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          size="icon"
                          variant="outline"
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                        <Button onClick={handleSendMessage}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      {selectedImages.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {selectedImages.map((img, idx) => (
                            <div key={idx} className="relative">
                              <img src={img} alt="Preview" className="w-16 h-16 object-cover rounded" />
                              <button
                                onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Terminal Panel */}
                  <Card className="flex flex-col h-full">
                    <CardHeader className="py-2">
                      <CardTitle className="text-sm">Terminal</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-0">
                      <div 
                        ref={outputRef}
                        className="bg-black text-green-400 font-mono text-xs p-4 h-full overflow-y-auto"
                      >
                        {output.map(message => (
                          <div key={message.id} className="whitespace-pre-wrap">
                            {message.content}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : viewMode === 'chat' ? (
                /* Chat Only View */
                <Card className="h-full flex flex-col">
                  <CardContent className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                      {chatMessages.map(msg => (
                        <div
                          key={msg.id}
                          className={cn(
                            "p-3 rounded-lg group relative",
                            msg.role === 'user' 
                              ? "bg-blue-100 ml-auto max-w-[80%]" 
                              : "bg-gray-100 max-w-[80%]"
                          )}
                        >
                          <div className="text-sm">{msg.content}</div>
                          {/* Feature 18: Individual message copy button */}
                          <Button
                            onClick={() => copyMessageWithFeedback(msg.id)}
                            size="sm"
                            variant="ghost"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            title="Copy this message"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </CardContent>
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Type a message... (Use ↑↓ for history)"
                        className="flex-1 px-3 py-2 border rounded-lg"
                      />
                      <Button onClick={handleSendMessage}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                /* Terminal Only View */
                <Card className="h-full flex flex-col">
                  <CardContent className="flex-1 overflow-y-auto p-0">
                    <div 
                      ref={outputRef}
                      className="bg-black text-green-400 font-mono text-sm p-4 h-full overflow-y-auto"
                    >
                      {output.map((message, index) => (
                        <div key={message.id} className="whitespace-pre-wrap group relative">
                          {message.content}
                          {/* Feature 18: Individual message copy button */}
                          <Button
                            onClick={() => copyMessageWithFeedback(message.id)}
                            size="sm"
                            variant="ghost"
                            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-gray-300 h-6 w-6 p-0"
                            title="Copy this message"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Enter command... (Use ↑↓ for history)"
                        className="flex-1 px-3 py-2 border rounded-lg font-mono"
                      />
                      <Button onClick={handleSendMessage}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Feature 16: Command history indicator */}
                    {hasHistory && (
                      <div className="text-xs text-gray-500 mt-2">
                        Command history: {commandHistory.length} commands stored
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </Tabs>
        </div>
      )}
      
      {/* Feature 18: User Feedback for Copy/Export Operations */}
      {feedbackMessage && (
        <div className={`copy-feedback ${feedbackMessage.type}`}>
          {feedbackMessage.message}
        </div>
      )}
    </div>
  );
};

export default EnhancedSSEInterface;

// TDD London School Feature Integration Summary:
// 
// Feature 16: Terminal Command History ✅
// - useTerminalCommandHistory hook integrated
// - Arrow key navigation (↑↓) in terminal input fields
// - Command storage with localStorage persistence
// - Duplicate consecutive command filtering
// - History limit enforcement (100 commands)
// - Clear history button in UI
// - History indicator showing command count
//
// Feature 18: Copy/Export Output ✅ 
// - useCopyExportOutput hook integrated
// - Individual message copy buttons (hover to reveal)
// - Copy/Export dropdown menu in toolbar
// - Multiple export formats: TXT, JSON, Markdown
// - Clipboard API integration for copying
// - File download API for exports
// - Graceful error handling for clipboard/download failures
//
// Integration Notes:
// - Both features maintain existing UI/UX patterns
// - No breaking changes to existing functionality
// - Performance optimized with React hooks and memoization
// - Behavioral contracts implemented as specified in tests
// - Cross-feature compatibility verified