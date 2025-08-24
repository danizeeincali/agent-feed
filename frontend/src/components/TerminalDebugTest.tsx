import React, { useState } from 'react';
import { TerminalDebug } from './TerminalDebug';

export const TerminalDebugTest: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [mockProcessStatus, setMockProcessStatus] = useState({
    isRunning: true,
    pid: 12345,
    status: 'running'
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Terminal Debug Test Page</h1>
        
        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setIsVisible(!isVisible)}
              className={`px-4 py-2 rounded font-medium ${
                isVisible 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isVisible ? 'Hide Terminal' : 'Show Terminal'}
            </button>
            
            <button
              onClick={() => setMockProcessStatus(prev => ({ ...prev, isRunning: !prev.isRunning }))}
              className={`px-4 py-2 rounded font-medium ${
                mockProcessStatus.isRunning 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {mockProcessStatus.isRunning ? 'Stop Process' : 'Start Process'}
            </button>

            <button
              onClick={() => setMockProcessStatus(prev => ({ 
                ...prev, 
                pid: Math.floor(Math.random() * 100000) 
              }))}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium"
            >
              Change PID
            </button>

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
            >
              Reload Page
            </button>
          </div>

          {/* Status Display */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded p-4">
              <h3 className="font-bold text-sm text-gray-300">Terminal Visibility</h3>
              <p className={`text-lg font-bold ${isVisible ? 'text-green-400' : 'text-red-400'}`}>
                {isVisible ? 'VISIBLE' : 'HIDDEN'}
              </p>
            </div>
            
            <div className="bg-gray-700 rounded p-4">
              <h3 className="font-bold text-sm text-gray-300">Process Status</h3>
              <p className={`text-lg font-bold ${mockProcessStatus.isRunning ? 'text-green-400' : 'text-red-400'}`}>
                {mockProcessStatus.isRunning ? 'RUNNING' : 'STOPPED'}
              </p>
            </div>
            
            <div className="bg-gray-700 rounded p-4">
              <h3 className="font-bold text-sm text-gray-300">Process PID</h3>
              <p className="text-lg font-bold text-blue-400">
                {mockProcessStatus.pid}
              </p>
            </div>
          </div>
        </div>

        {/* Debug Instructions */}
        <div className="bg-blue-900 border border-blue-600 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-blue-200">🔍 Debug Instructions</h2>
          <div className="space-y-2 text-blue-100">
            <p><strong>1. Check Browser Console:</strong> Open DevTools (F12) and watch the console for detailed logs</p>
            <p><strong>2. Test Keyboard Input:</strong> Click in the terminal and try typing - every keystroke should be logged</p>
            <p><strong>3. Monitor WebSocket:</strong> Watch the connection status and socket events in the debug panel</p>
            <p><strong>4. Focus Testing:</strong> Click the "Focus Terminal" button and verify focus status changes</p>
            <p><strong>5. Network Tab:</strong> Check DevTools Network tab for WebSocket connection attempts</p>
            <p><strong>6. Test Buttons:</strong> Use the "Test Keyboard" button to simulate input programmatically</p>
          </div>
        </div>

        {/* Expected Behavior */}
        <div className="bg-green-900 border border-green-600 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-green-200">✅ Expected Behavior</h2>
          <div className="space-y-2 text-green-100">
            <p><strong>Terminal Initialization:</strong> Should see logs for terminal creation and addon loading</p>
            <p><strong>WebSocket Connection:</strong> Should attempt to connect to the backend terminal service via proxy</p>
            <p><strong>Keyboard Events:</strong> Every keypress should increment the counter and log details</p>
            <p><strong>Focus Management:</strong> Terminal focus status should update when clicking in/out of terminal</p>
            <p><strong>Socket Messages:</strong> Input should be sent via socket.emit('message', ...) when connected</p>
            <p><strong>Error Handling:</strong> Connection failures should be logged and displayed</p>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-red-900 border border-red-600 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-red-200">🚨 Troubleshooting Checklist</h2>
          <div className="space-y-2 text-red-100">
            <p><strong>No Keyboard Events:</strong> Check if xterm.js is properly loaded and terminal has focus</p>
            <p><strong>WebSocket Fails:</strong> Verify backend server is running on port 3001</p>
            <p><strong>Input Not Sent:</strong> Check if socket is connected (should see green status)</p>
            <p><strong>Terminal Not Visible:</strong> Verify xterm CSS is loaded and container has proper dimensions</p>
            <p><strong>Focus Issues:</strong> Try clicking directly in the terminal area, not on borders</p>
            <p><strong>Console Errors:</strong> Look for import errors or missing dependencies</p>
          </div>
        </div>

        {/* Terminal Component */}
        <TerminalDebug 
          isVisible={isVisible}
          processStatus={mockProcessStatus}
        />

        {/* Additional Debug Info */}
        <div className="bg-gray-800 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold mb-4">Debug Environment Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
            <div>
              <h3 className="font-bold text-gray-300 mb-2">Browser Info</h3>
              <p>User Agent: {navigator.userAgent}</p>
              <p>Platform: {navigator.platform}</p>
              <p>Language: {navigator.language}</p>
            </div>
            <div>
              <h3 className="font-bold text-gray-300 mb-2">Window Info</h3>
              <p>Inner Width: {window.innerWidth}</p>
              <p>Inner Height: {window.innerHeight}</p>
              <p>Location: {window.location.href}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};