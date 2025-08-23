import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';

interface TerminalProps {
  isVisible: boolean;
  processStatus: {
    isRunning: boolean;
    pid?: number;
    status: string;
  };
}

export const TerminalFixed: React.FC<TerminalProps> = ({ 
  isVisible, 
  processStatus 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socket = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  // Add debug log
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logMessage = `[${timestamp}] ${message}`;
    console.log('🔍 DEBUG:', logMessage);
    setDebugLogs(prev => [...prev.slice(-19), logMessage]);
  }, []);

  // Initialize terminal
  useEffect(() => {
    if (!isVisible || terminal.current) return;

    if (terminalRef.current) {
      addDebugLog('Initializing terminal...');
      
      // Create terminal with specific configuration
      terminal.current = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Fira Code", "Cascadia Code", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#00ff00',
          selectionBackground: '#264f78',
        },
        cols: 80,
        rows: 24,
        convertEol: true,
        scrollback: 1000,
        allowTransparency: false,
        screenKeys: true,
        useFlowControl: false,
        tabStopWidth: 8
      });

      // Add fit addon
      fitAddon.current = new FitAddon();
      terminal.current.loadAddon(fitAddon.current);
      
      // Open terminal
      terminal.current.open(terminalRef.current);
      addDebugLog('Terminal opened in DOM');
      
      // Fit to container
      setTimeout(() => {
        if (fitAddon.current) {
          fitAddon.current.fit();
          addDebugLog(`Terminal resized to cols: ${terminal.current?.cols}, rows: ${terminal.current?.rows}`);
        }
      }, 100);

      // Initial messages
      terminal.current.writeln('\x1b[1;32m🚀 Terminal Fixed Version - Enhanced Debug Mode\x1b[0m');
      terminal.current.writeln('\x1b[33mWaiting for connection...\x1b[0m');
      terminal.current.writeln('');
      
      // Focus terminal
      terminal.current.focus();
      addDebugLog('Terminal focused');
    }

    return () => {
      if (terminal.current) {
        addDebugLog('Disposing terminal');
        terminal.current.dispose();
        terminal.current = null;
      }
    };
  }, [isVisible, addDebugLog]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (socket.current?.connected) {
      addDebugLog('Socket already connected');
      return;
    }

    setConnectionStatus('connecting');
    setError(null);
    addDebugLog('Creating Socket.IO connection...');

    // Create socket with simplified auth
    const newSocket = io('http://localhost:3001/terminal', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: {
        userId: 'test-user-001',
        username: 'Test User',
        token: 'test-token'
      },
      query: {
        pid: processStatus.pid
      }
    });

    socket.current = newSocket;

    // Connection event handlers
    newSocket.on('connect', () => {
      addDebugLog(`Socket connected! ID: ${newSocket.id}`);
      setConnectionStatus('connected');
      
      if (terminal.current) {
        terminal.current.writeln('\x1b[32m✅ Connected to terminal server\x1b[0m');
        terminal.current.writeln('\x1b[36mSocket ID: ' + newSocket.id + '\x1b[0m');
        terminal.current.writeln('\x1b[33mTry typing now - all input will be logged\x1b[0m');
        terminal.current.writeln('');
        terminal.current.write('$ ');
      }

      // Send init message
      if (processStatus.pid) {
        newSocket.emit('init', {
          pid: processStatus.pid,
          cols: terminal.current?.cols || 80,
          rows: terminal.current?.rows || 24
        });
        addDebugLog(`Sent init with PID: ${processStatus.pid}`);
      }
    });

    newSocket.on('connect_error', (error) => {
      addDebugLog(`Connection error: ${error.message}`);
      setError(error.message);
      setConnectionStatus('disconnected');
      
      if (terminal.current) {
        terminal.current.writeln(`\x1b[31m❌ Connection error: ${error.message}\x1b[0m`);
      }
    });

    newSocket.on('disconnect', (reason) => {
      addDebugLog(`Disconnected: ${reason}`);
      setConnectionStatus('disconnected');
      
      if (terminal.current) {
        terminal.current.writeln(`\x1b[33m⚠️ Disconnected: ${reason}\x1b[0m`);
      }
    });

    // Terminal data handlers
    newSocket.on('output', (data: any) => {
      addDebugLog(`Received output: ${JSON.stringify(data).slice(0, 100)}`);
      if (terminal.current && data?.data) {
        terminal.current.write(data.data);
      }
    });

    newSocket.on('terminal_data', (data: any) => {
      addDebugLog(`Received terminal_data: ${JSON.stringify(data).slice(0, 100)}`);
      if (terminal.current && data?.data) {
        terminal.current.write(data.data);
      }
    });

    newSocket.on('connected', (data: any) => {
      addDebugLog(`Received connected event: ${JSON.stringify(data)}`);
      if (terminal.current) {
        terminal.current.writeln(`\x1b[36m${data.message || 'Connected'}\x1b[0m`);
      }
    });

    newSocket.on('error', (data: any) => {
      addDebugLog(`Received error: ${JSON.stringify(data)}`);
      if (terminal.current && data?.message) {
        terminal.current.writeln(`\x1b[31mError: ${data.message}\x1b[0m`);
      }
    });

    // Listen for any event (debugging)
    newSocket.onAny((eventName, ...args) => {
      addDebugLog(`Event '${eventName}': ${JSON.stringify(args).slice(0, 100)}`);
    });

  }, [processStatus.pid, addDebugLog]);

  // Terminal input handler
  useEffect(() => {
    if (!terminal.current) return;

    addDebugLog('Setting up input handler');
    
    const disposable = terminal.current.onData((data) => {
      addDebugLog(`Input received: "${data}" (${data.length} chars, codes: ${Array.from(data).map(c => c.charCodeAt(0)).join(', ')})`);
      
      // Echo locally for immediate feedback
      if (terminal.current) {
        // Handle special characters
        if (data === '\r') {
          terminal.current.write('\r\n$ ');
        } else if (data === '\x7f') { // Backspace
          terminal.current.write('\b \b');
        } else {
          terminal.current.write(data);
        }
      }
      
      // Send to server if connected
      if (socket.current?.connected) {
        const message = {
          type: 'input',
          data: data,
          timestamp: Date.now()
        };
        
        socket.current.emit('message', message);
        socket.current.emit('terminal_input', data);
        socket.current.emit('input', { data });
        
        addDebugLog(`Sent input via 3 different events`);
      } else {
        addDebugLog('Cannot send input - socket not connected');
      }
    });

    // Also handle key events directly
    const keyDisposable = terminal.current.onKey((e) => {
      addDebugLog(`Key event: key="${e.key}", keyCode=${e.domEvent.keyCode}, ctrl=${e.domEvent.ctrlKey}`);
    });

    return () => {
      disposable.dispose();
      keyDisposable.dispose();
      addDebugLog('Input handlers disposed');
    };
  }, [connectionStatus, addDebugLog]);

  // Connect/disconnect based on visibility and process status
  useEffect(() => {
    if (isVisible && processStatus.isRunning) {
      addDebugLog('Process is running, connecting...');
      connectWebSocket();
    } else {
      if (socket.current) {
        addDebugLog('Disconnecting socket...');
        socket.current.disconnect();
        socket.current = null;
      }
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [isVisible, processStatus.isRunning, connectWebSocket]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (fitAddon.current && terminal.current) {
        fitAddon.current.fit();
        const cols = terminal.current.cols;
        const rows = terminal.current.rows;
        
        addDebugLog(`Window resized - cols: ${cols}, rows: ${rows}`);
        
        if (socket.current?.connected) {
          socket.current.emit('resize', { cols, rows });
          socket.current.emit('terminal_resize', { cols, rows });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [addDebugLog]);

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Connected</span>;
      case 'connecting':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Connecting...</span>;
      case 'disconnected':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Disconnected</span>;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-white font-medium">Terminal (Fixed Version)</span>
            {processStatus.pid && (
              <span className="text-gray-400 text-sm">PID: {processStatus.pid}</span>
            )}
            {getStatusBadge()}
          </div>
          {error && (
            <span className="text-red-400 text-sm">{error}</span>
          )}
        </div>
      </div>

      {/* Terminal Container */}
      <div className="relative">
        <div className="h-96 p-2 bg-black">
          <div 
            ref={terminalRef} 
            className="w-full h-full"
            onClick={() => terminal.current?.focus()}
          />
        </div>

        {/* Debug Panel */}
        <div className="absolute top-2 right-2 w-80 max-h-64 bg-black/90 border border-gray-600 rounded p-2 overflow-auto">
          <div className="text-xs text-green-400 font-mono">
            <div className="font-bold mb-1 text-yellow-400">Debug Logs:</div>
            {debugLogs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">{log}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Socket: {socket.current?.id || 'Not connected'}</span>
            <span>Transport: {socket.current?.io?.engine?.transport?.name || 'N/A'}</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => connectWebSocket()}
              className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
            >
              Reconnect
            </button>
            <button
              onClick={() => terminal.current?.clear()}
              className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalFixed;