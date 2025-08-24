import React, { useRef, useEffect, useState } from 'react';
import { getSocketIOUrl, getWebSocketUrl } from '../utils/websocket-url';

export const SimpleTerminalTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]);
  };

  const sendMessage = () => {
    if (!inputValue.trim()) return;
    
    addLog(`Sending: "${inputValue}"`);
    
    // Try WebSocket
    try {
      const ws = new WebSocket(getWebSocketUrl());
      ws.onopen = () => {
        addLog('WebSocket connected');
        ws.send(JSON.stringify({ type: 'test', data: inputValue }));
        addLog('Message sent');
        ws.close();
      };
      ws.onerror = (error) => {
        addLog(`WebSocket error: ${error}`);
      };
    } catch (error) {
      addLog(`Error: ${error}`);
    }
    
    setInputValue('');
  };

  const testSocketIO = async () => {
    try {
      const { io } = await import('socket.io-client');
      const socket = io(getSocketIOUrl() + '/terminal');
      
      socket.on('connect', () => {
        addLog('Socket.IO connected');
        socket.emit('test', { data: 'hello' });
      });
      
      socket.on('error', (error: any) => {
        addLog(`Socket.IO error: ${error}`);
      });
      
    } catch (error) {
      addLog(`Socket.IO test failed: ${error}`);
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-4">🧪 Simple Terminal Test</h1>
      
      <div className="bg-gray-800 p-4 rounded mb-4">
        <h2 className="text-lg font-semibold text-white mb-2">WebSocket Test</h2>
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
            Send WebSocket
          </button>
          <button 
            onClick={testSocketIO}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Test Socket.IO
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