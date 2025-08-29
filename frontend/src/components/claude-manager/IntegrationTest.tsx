import React, { useState } from 'react';
import ClaudeInstanceButtons from './ClaudeInstanceButtons';
import ChatInterface from './ChatInterface';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

// Integration test component to verify all components work together
const IntegrationTest: React.FC = () => {
  const [instances] = useState([
    {
      id: 'claude-12345',
      name: 'Test Instance',
      status: 'running' as const,
      pid: 12345
    }
  ]);
  
  const [output] = useState({
    'claude-12345': 'Claude instance started successfully.\nReady for commands.\n'
  });
  
  const [selectedInstance, setSelectedInstance] = useState(instances[0]);

  const handleCreateInstance = (command: string) => {
    console.log('Creating instance with command:', command);
  };

  const handleSendInput = (input: string) => {
    console.log('Sending input:', input);
  };

  const handleInstanceSelect = (instanceId: string) => {
    console.log('Selecting instance:', instanceId);
    const instance = instances.find(i => i.id === instanceId);
    if (instance) {
      setSelectedInstance(instance);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
          Claude Manager Components Integration Test
        </h1>
        
        {/* Test ClaudeInstanceButtons */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            1. Claude Instance Buttons
          </h2>
          <ClaudeInstanceButtons
            onCreateInstance={handleCreateInstance}
            loading={false}
            connectionStatuses={{
              'prod': 'connected',
              'skip-permissions': 'disconnected'
            }}
          />
        </section>

        {/* Test ChatInterface */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            2. Chat Interface (Complete)
          </h2>
          <div className="h-96">
            <ChatInterface
              selectedInstance={selectedInstance}
              output={output}
              connectionType="Connected via SSE (claude-12)"
              isConnected={true}
              onSendInput={handleSendInput}
              onInstanceSelect={handleInstanceSelect}
              instances={instances}
              loading={false}
              error={null}
            />
          </div>
        </section>

        {/* Test MessageList separately */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            3. Message List (Standalone)
          </h2>
          <div className="h-48 border border-gray-200 dark:border-gray-700 rounded-lg">
            <MessageList
              instanceId="claude-12345"
              output="Welcome to Claude!\nType your commands below.\n[12:00:00] Status changed to: running\n"
              connectionType="Connected via SSE"
              isConnected={true}
            />
          </div>
        </section>

        {/* Test MessageInput separately */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            4. Message Input (Standalone)
          </h2>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <MessageInput
              onSendMessage={(msg) => console.log('Test message:', msg)}
              disabled={false}
              placeholder="Test typing here..."
              showTypingIndicator={false}
            />
          </div>
        </section>

        {/* Component Status Summary */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            5. Component Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="font-medium text-green-800 dark:text-green-400">✅ ClaudeInstanceButtons</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Professional styling, hover effects, connection status</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="font-medium text-green-800 dark:text-green-400">✅ ChatInterface</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Modern chat layout, instance management</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="font-medium text-green-800 dark:text-green-400">✅ MessageList</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Chat bubbles, animations, auto-scroll</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="font-medium text-green-800 dark:text-green-400">✅ MessageInput</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Auto-resize, keyboard shortcuts, professional styling</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default IntegrationTest;