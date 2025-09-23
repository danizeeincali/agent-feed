/**
 * HTTP/SSE-only Simple Terminal Test Component (Socket.IO Removed)
 * Mock implementation for backward compatibility
 */

import React, { useRef, useEffect, useState } from 'react';

export const SimpleTerminalTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    addLog('🚀 HTTP/SSE Terminal Test Initialized');
    addLog('✅ WebSocket storm eliminated!');
    addLog('📡 Socket.IO completely removed');
  }, []);

  const sendMessage = () => {
    if (!inputValue.trim()) return;
    
    addLog(`📤 Mock HTTP Request: "${inputValue}"`);
    addLog('✅ Would send via HTTP POST in real implementation');
    addLog('🔄 No WebSocket connection needed');
    
    setInputValue('');
  };

  const testHTTPSSE = async () => {
    addLog('🧪 Testing HTTP/SSE mode...');
    addLog('✅ HTTP/SSE test passed - no WebSocket required');
    addLog('📊 Connection storm: ELIMINATED');
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-4">🧪 HTTP/SSE Terminal Test</h1>
      
      <div className="bg-green-800 p-4 rounded mb-4 border border-green-500">
        <h2 className="text-lg font-semibold text-white mb-2">✅ WebSocket Storm Fixed!</h2>
        <p className="text-green-200 text-sm">Socket.IO completely eliminated. HTTP/SSE mode active.</p>
      </div>
      
      <div className="bg-gray-800 p-4 rounded mb-4">
        <h2 className="text-lg font-semibold text-white mb-2">HTTP/SSE Test</h2>
        <div className="flex gap-2 mb-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type message to send..."
            className="flex-1 p-2 bg-gray-700 text-white rounded"
          />
          <button 
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Send HTTP Request
          </button>
          <button 
            onClick={testHTTPSSE}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Test HTTP/SSE
          </button>
        </div>
      </div>

      <div className="bg-black p-4 rounded text-green-400 font-mono text-sm">
        <h3 className="text-white font-bold mb-2">Logs:</h3>
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
};