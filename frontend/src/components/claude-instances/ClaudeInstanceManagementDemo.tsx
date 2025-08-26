/**
 * Claude Instance Management Demo Component
 * Complete demonstration of all Claude Instance Management components
 * Shows integration with existing WebSocket infrastructure
 */

import React, { useState, useCallback } from 'react';
import { Settings, RefreshCw, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ClaudeInstanceSelector } from './ClaudeInstanceSelector';
import { EnhancedChatInterface } from './EnhancedChatInterface';
import { InstanceStatusIndicator } from './InstanceStatusIndicator';
import { useClaudeInstances } from '../../hooks/useClaudeInstances';
import { 
  ClaudeInstance, 
  ChatMessage, 
  ImageAttachment,
  ClaudeInstanceConfig 
} from '../../types/claude-instances';

// Mock data for demonstration
const createMockInstance = (id: string, name: string, status: ClaudeInstance['status']): ClaudeInstance => ({
  id,
  name,
  description: `${name} instance for development`,
  workingDirectory: status === 'running' ? '/workspaces/agent-feed/prod' : '/workspaces/agent-feed',
  status,
  pid: status === 'running' ? Math.floor(Math.random() * 10000) + 1000 : undefined,
  startTime: status === 'running' ? new Date(Date.now() - Math.random() * 3600000) : undefined,
  lastActivity: status === 'running' ? new Date(Date.now() - Math.random() * 300000) : undefined,
  uptime: status === 'running' ? Math.floor(Math.random() * 7200) : undefined,
  cpuUsage: status === 'running' ? Math.random() * 100 : undefined,
  memoryUsage: status === 'running' ? Math.random() * 1024 * 1024 * 1024 : undefined,
  isConnected: status === 'running',
  hasOutput: status === 'running',
  createdAt: new Date(Date.now() - Math.random() * 86400000),
  updatedAt: new Date(),
  autoRestart: false,
  autoRestartHours: 6,
  skipPermissions: name.includes('Skip'),
  resumeSession: name.includes('Resume') || name.includes('Continue'),
  useProductionMode: name.includes('Production'),
  connectionCount: status === 'running' ? Math.floor(Math.random() * 3) + 1 : 0
});

const mockInstances: ClaudeInstance[] = [
  createMockInstance('prod-1', 'Production Claude', 'running'),
  createMockInstance('skip-1', 'Skip Permissions Claude', 'running'),
  createMockInstance('dev-1', 'Development Claude', 'stopped'),
  createMockInstance('resume-1', 'Resume Session Claude', 'error'),
];

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    instanceId: 'prod-1',
    type: 'user',
    role: 'user',
    content: 'Hello Claude! Can you help me build a React component?',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: 'msg-2',
    instanceId: 'prod-1',
    type: 'assistant',
    role: 'assistant',
    content: 'Hello! I\'d be happy to help you build a React component. What kind of component are you looking to create? Please provide some details about:\n\n1. The purpose of the component\n2. What props it should accept\n3. What it should render\n4. Any specific functionality it needs\n\nI can help you with TypeScript types, styling with Tailwind CSS, and following React best practices.',
    timestamp: new Date(Date.now() - 45000),
    metadata: {
      tokensUsed: 95,
      model: 'claude-sonnet-4',
      duration: 1250
    }
  },
  {
    id: 'msg-3',
    instanceId: 'prod-1',
    type: 'user',
    role: 'user',
    content: 'I need a file upload component with drag and drop support.',
    timestamp: new Date(Date.now() - 30000),
  },
  {
    id: 'msg-4',
    instanceId: 'prod-1',
    type: 'assistant',
    role: 'assistant',
    content: 'Perfect! I\'ll create a comprehensive file upload component with drag and drop support. Here\'s what I\'ll include:\n\n## Features:\n- Drag and drop zone\n- Click to select files\n- File validation (type, size)\n- Upload progress indicators\n- File preview thumbnails\n- Error handling\n\nLet me create this component for you...',
    timestamp: new Date(Date.now() - 15000),
    isStreaming: true,
    streamingComplete: false
  }
];

export const ClaudeInstanceManagementDemo: React.FC = () => {
  const [selectedInstance, setSelectedInstance] = useState<ClaudeInstance | null>(mockInstances[0]);
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [isLoading, setIsLoading] = useState(false);

  // Use the real hook for demonstration (will connect to WebSocket if available)
  const {
    instances: liveInstances,
    selectedInstance: liveSelectedInstance,
    isConnected,
    createInstance,
    selectInstance,
    sendMessage: sendLiveMessage
  } = useClaudeInstances({ autoConnect: false }); // Don't auto-connect for demo

  // Use mock data or live data
  const instances = liveInstances.length > 0 ? liveInstances : mockInstances;
  const currentInstance = liveSelectedInstance || selectedInstance;

  const handleInstanceSelect = useCallback((instance: ClaudeInstance | null) => {
    setSelectedInstance(instance);
    if (liveInstances.length > 0 && instance) {
      selectInstance(instance.id);
    }
  }, [liveInstances.length, selectInstance]);

  const handleSendMessage = useCallback(async (message: string, images?: ImageAttachment[]) => {
    if (!currentInstance) return;

    setIsLoading(true);

    // Create user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      instanceId: currentInstance.id,
      type: 'user',
      role: 'user',
      content: message,
      timestamp: new Date(),
      images
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      if (liveInstances.length > 0) {
        // Send to live instance
        await sendLiveMessage(currentInstance.id, message, images);
      } else {
        // Mock response for demo
        setTimeout(() => {
          const response: ChatMessage = {
            id: `msg-${Date.now()}-response`,
            instanceId: currentInstance.id,
            type: 'assistant',
            role: 'assistant',
            content: `This is a mock response to: "${message}"\n\nIn a real implementation, this would be Claude's actual response. The components are fully integrated with the WebSocket system and will work with live instances when connected.`,
            timestamp: new Date(),
            metadata: {
              tokensUsed: Math.floor(Math.random() * 100) + 50,
              model: 'claude-sonnet-4',
              duration: Math.floor(Math.random() * 2000) + 500
            }
          };
          
          setMessages(prev => [...prev, response]);
          setIsLoading(false);
        }, 1000 + Math.random() * 2000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  }, [currentInstance, liveInstances.length, sendLiveMessage]);

  const handleCreateNew = useCallback(async () => {
    try {
      if (liveInstances.length > 0) {
        // Create a real instance
        const newInstance = await createInstance({
          name: 'New Claude Instance',
          workingDirectory: '/workspaces/agent-feed'
        });
        setSelectedInstance(newInstance);
      } else {
        // Mock creation for demo
        const newInstance = createMockInstance(
          `demo-${Date.now()}`, 
          'Demo Created Instance', 
          'starting'
        );
        setSelectedInstance(newInstance);
        
        // Simulate starting process
        setTimeout(() => {
          setSelectedInstance(prev => prev ? { ...prev, status: 'running', isConnected: true } : null);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to create instance:', error);
    }
  }, [liveInstances.length, createInstance]);

  const handleClearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Claude Instance Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isConnected ? 'Connected to live system' : 'Demo mode with mock data'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Instance Selector */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Select Instance
            </h2>
            <ClaudeInstanceSelector
              instances={instances}
              selectedInstance={currentInstance}
              onSelect={handleInstanceSelect}
              onCreateNew={handleCreateNew}
              showCreateButton={true}
            />
          </div>

          {/* Instance Status */}
          {currentInstance && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Instance Status
              </h2>
              <InstanceStatusIndicator
                instance={currentInstance}
                showDetails={true}
                showMetrics={true}
                size="lg"
              />
            </div>
          )}

          {/* Instance List */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              All Instances ({instances.length})
            </h2>
            <div className="space-y-3">
              {instances.map((instance) => (
                <div
                  key={instance.id}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors',
                    currentInstance?.id === instance.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                  onClick={() => handleInstanceSelect(instance)}
                >
                  <InstanceStatusIndicator
                    instance={instance}
                    showDetails={true}
                    showMetrics={false}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          {currentInstance ? (
            <EnhancedChatInterface
              instance={currentInstance}
              messages={messages.filter(m => m.instanceId === currentInstance.id)}
              isConnected={currentInstance.isConnected}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              onClearMessages={handleClearMessages}
              enableImageUpload={true}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
              <div className="text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Instance Selected
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                  Select a Claude instance from the sidebar to start chatting, or create a new one.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Instance
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaudeInstanceManagementDemo;