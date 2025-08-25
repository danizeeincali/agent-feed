import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

interface TerminalDebugProps {
  isVisible: boolean;
  processStatus: {
    isRunning: boolean;
    pid?: number;
    status: string;
  };
}

export const TerminalDebug: React.FC<TerminalDebugProps> = ({ 
  isVisible, 
  processStatus 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const ws = useRef<WebSocket | null>(null);
  
  // Debug state
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [keysPressed, setKeysPressed] = useState(0);
  const [socketMessages, setSocketMessages] = useState(0);
  const [connectionState, setConnectionState] = useState('disconnected');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLogs(prev => [...prev.slice(-20), logEntry]);
  };

  // Initialize terminal
  useEffect(() => {
    if (!isVisible || terminal.current) return;

    addLog('🔧 Starting terminal initialization...');
    
    if (terminalRef.current) {
      addLog('📦 Creating xterm.js Terminal instance');
      
      terminal.current = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'monospace',
        theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
        cols: 80,
        rows: 24,
      });

      const fitAddon = new FitAddon();
      terminal.current.loadAddon(fitAddon);

      addLog('🖥️ Opening terminal in DOM');
      terminal.current.open(terminalRef.current);
      fitAddon.fit();
      
      terminal.current.writeln('🚀 TERMINAL DEBUG MODE');
      terminal.current.writeln('Type anything to test input capture...');
      terminal.current.write('$ ');
      
      addLog('✅ Terminal initialization complete');

      // Set up input handler with extensive logging
      const handleData = (data: string) => {
        addLog(`🎯 KEYBOARD INPUT: "${data}" (code: ${data.charCodeAt(0)})`);
        setKeysPressed(prev => prev + 1);
        
        // Echo the character immediately to show xterm is working
        terminal.current?.write(data);
        
        // Try to send via WebSocket
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          try {
            const message = JSON.stringify({ type: 'input', data });
            ws.current.send(message);
            addLog(`📡 Sent to WebSocket: ${message}`);
            setSocketMessages(prev => prev + 1);
          } catch (error) {
            addLog(`❌ WebSocket send error: ${error}`);
          }
        } else {
          addLog(`⚠️ WebSocket not ready (state: ${ws.current?.readyState})`);
        }
      };

      addLog('🔗 Attaching onData handler');
      terminal.current.onData(handleData);
      
      // Focus the terminal
      terminal.current.focus();
      addLog('🎯 Terminal focused');
    }

    return () => {
      if (terminal.current) {
        addLog('🧹 Cleaning up terminal');
        terminal.current.dispose();
        terminal.current = null;
      }
    };
  }, [isVisible]);

  // WebSocket connection
  useEffect(() => {
    if (!processStatus.isRunning || !isVisible) return;

    addLog('🔌 Starting WebSocket connection...');
    
    try {
      // CRITICAL FIX: Use relative URL that will be proxied by Vite
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/terminal-debug`;
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        addLog('✅ WebSocket connected!');
        setConnectionState('connected');
        terminal.current?.writeln('\\r\\n✅ WebSocket connected');
        terminal.current?.write('$ ');
      };
      
      ws.current.onmessage = (event) => {
        addLog(`📥 Received: ${event.data}`);
        terminal.current?.write(event.data);
      };
      
      ws.current.onerror = (error) => {
        addLog(`❌ WebSocket error: ${error}`);
        setConnectionState('error');
      };
      
      ws.current.onclose = () => {
        addLog('🔌 WebSocket closed');
        setConnectionState('disconnected');
      };
      
    } catch (error) {
      addLog(`❌ WebSocket creation failed: ${error}`);
    }

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [processStatus.isRunning, isVisible]);

  const testInput = () => {
    addLog('🧪 Testing programmatic input');
    if (terminal.current) {
      // Simulate typing "test"
      // Simulate typing test - fixed type issue
      if (terminal.current && typeof terminal.current.onData === 'function') {
        terminal.current.onData('t');
        terminal.current.onData('e');
        terminal.current.onData('s');
        terminal.current.onData('t');
      }
    }
  };

  const focusTerminal = () => {
    addLog('🎯 Manually focusing terminal');
    terminal.current?.focus();
  };

  const clearLogs = () => {
    setDebugLogs([]);
    setKeysPressed(0);
    setSocketMessages(0);
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Debug Panel */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <h3 className="text-white font-bold mb-2">🔍 Terminal Debug Panel</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-green-400">
            Keys Pressed: <span className="font-bold">{keysPressed}</span>
          </div>
          <div className="text-blue-400">
            Socket Messages: <span className="font-bold">{socketMessages}</span>
          </div>
          <div className={`${connectionState === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
            Connection: <span className="font-bold">{connectionState}</span>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={testInput} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
            Test Input
          </button>
          <button onClick={focusTerminal} className="bg-green-600 text-white px-2 py-1 rounded text-xs">
            Focus Terminal
          </button>
          <button onClick={clearLogs} className="bg-red-600 text-white px-2 py-1 rounded text-xs">
            Clear Logs
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 flex">
        <div className="flex-1 p-2">
          <div 
            ref={terminalRef} 
            className="w-full h-full bg-black rounded"
            onClick={focusTerminal}
          />
        </div>
        
        {/* Debug Logs */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-2">
          <h4 className="text-white font-bold mb-2">Debug Logs:</h4>
          <div className="bg-black p-2 rounded text-xs font-mono text-green-400 h-full overflow-y-auto">
            {debugLogs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};