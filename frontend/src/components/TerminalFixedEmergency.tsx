import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import 'xterm/css/xterm.css';

interface TerminalProps {
  isVisible: boolean;
  processStatus: {
    isRunning: boolean;
    pid?: number;
    status: string;
  };
  initialCommand?: string;
}

export const TerminalFixedEmergency: React.FC<TerminalProps> = ({ 
  isVisible, 
  processStatus,
  initialCommand 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  // Add debug log
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logMessage = `[${timestamp}] ${message}`;
    console.log('🚨 EMERGENCY DEBUG:', logMessage);
    setDebugLogs(prev => [...prev.slice(-19), logMessage]);
  }, []);

  // Initialize terminal when visible
  useEffect(() => {
    if (!isVisible || terminal.current) return;

    if (terminalRef.current) {
      terminal.current = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          selectionBackground: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
        },
        cols: 80,
        rows: 24,
        disableStdin: false,
        convertEol: false,
        macOptionIsMeta: true,
        scrollback: 1000,
        allowTransparency: false,
        drawBoldTextInBrightColors: false,
        fastScrollModifier: 'alt',
        tabStopWidth: 4,
        logLevel: 'warn'
      });

      fitAddon.current = new FitAddon();
      terminal.current.loadAddon(fitAddon.current);
      terminal.current.loadAddon(new WebLinksAddon());
      terminal.current.loadAddon(new SearchAddon());

      terminal.current.open(terminalRef.current);
      
      if (fitAddon.current) {
        fitAddon.current.fit();
      }

      // 🚨 EMERGENCY WELCOME MESSAGE
      terminal.current.writeln('\\x1b[1;31m🚨 EMERGENCY TERMINAL (JSON→Output Fix Active)\\x1b[0m');
      terminal.current.writeln('\\x1b[2mConnecting to emergency backend...\\x1b[0m');
      terminal.current.writeln('\\x1b[33m🔧 Fix: Raw JSON messages → Terminal output display\\x1b[0m');
      terminal.current.writeln('');
    }

    return () => {
      if (terminal.current) {
        terminal.current.dispose();
        terminal.current = null;
      }
    };
  }, [isVisible]);

  // WebSocket connection with CRITICAL JSON FIX
  const connectWebSocket = useCallback(() => {
    addDebugLog('🚨 EMERGENCY: Connecting to emergency backend on port 3002');
    
    if (socket.current?.readyState === WebSocket.OPEN) {
      addDebugLog('✅ Socket already connected');
      return;
    }

    if (socket.current) {
      addDebugLog('🔄 Closing existing socket');
      socket.current.close();
      socket.current = null;
    }

    setConnectionStatus('connecting');
    setError(null);
    
    const wsUrl = 'ws://localhost:3002/terminal';
    addDebugLog(`🔌 Creating WebSocket: ${wsUrl}`);
    const newSocket = new WebSocket(wsUrl);
    socket.current = newSocket;

    newSocket.onopen = () => {
      addDebugLog('✅ WebSocket connected to emergency backend');
      setConnectionStatus('connected');
      setError(null);
      terminal.current?.writeln('\\x1b[32m🚨 EMERGENCY: Connected to Backend (Port 3002)\\x1b[0m');
      terminal.current?.writeln('\\x1b[33m🔧 JSON Processing: ACTIVE\\x1b[0m');
      
      const initMessage = {
        type: 'init',
        pid: processStatus.pid,
        cols: terminal.current?.cols || 80,
        rows: terminal.current?.rows || 24
      };
      addDebugLog(`📤 Sending init: ${JSON.stringify(initMessage)}`);
      newSocket.send(JSON.stringify(initMessage));
      
      if (initialCommand) {
        setTimeout(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            const commandMessage = {
              type: 'input', 
              data: initialCommand + '\\n'
            };
            addDebugLog(`📤 Executing initial command: ${initialCommand}`);
            newSocket.send(JSON.stringify(commandMessage));
          }
        }, 1000);
      }
    };

    // 🚨 CRITICAL FIX: Proper JSON message processing
    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        addDebugLog(`📥 Received: ${message.type} (${message.data ? message.data.length : 0} chars)`);
        
        // 🎯 THE CRITICAL FIX: Extract terminal data from JSON and display ONLY the data
        if (message.type === 'data' && message.data) {
          // Log for debugging
          console.log('🚨 EMERGENCY FIX: Processing JSON message', {
            messageType: message.type,
            rawDataLength: message.data.length,
            rawDataPreview: JSON.stringify(message.data.substring(0, 50)),
            showingRawJSON: false // This is the fix!
          });
          
          // ✅ CRITICAL: Write ONLY the terminal data, NOT the JSON wrapper
          terminal.current?.write(message.data);
          
          addDebugLog(`✅ Terminal data displayed (${message.data.length} chars)`);
          
        } else if (message.type === 'output' && message.data) {
          // Alternative output format
          terminal.current?.write(message.data);
          addDebugLog(`✅ Output data displayed (${message.data.length} chars)`);
          
        } else if (message.type === 'connect') {
          setError(null);
          addDebugLog('📡 Backend connection established');
          
        } else if (message.type === 'error') {
          terminal.current?.writeln(`\\x1b[31m❌ Terminal Error: ${message.error}\\x1b[0m`);
          setError(`Terminal error: ${message.error}`);
          
        } else if (message.type === 'exit') {
          terminal.current?.writeln(`\\x1b[33m⚠️ Terminal process exited (code: ${message.code})\\x1b[0m`);
          
        } else if (message.type === 'init_ack') {
          setError(null);
          addDebugLog(`✅ Terminal initialized (PID: ${message.pid})`);
        }
        
      } catch (err) {
        // Fallback for non-JSON data
        addDebugLog('📥 Non-JSON data received');
        terminal.current?.write(event.data);
      }
    };

    newSocket.onerror = (error) => {
      addDebugLog(`❌ WebSocket error during connection`);
    };

    newSocket.onclose = (event) => {
      addDebugLog(`🔌 WebSocket closed: ${event.code} - ${event.reason || 'No reason'}`);
      setConnectionStatus('disconnected');
      
      if (event.code === 1000 || event.code === 1001) {
        addDebugLog('✅ Connection closed normally');
        terminal.current?.writeln('\\x1b[90m📤 Connection closed cleanly\\x1b[0m');
      } else if (event.code === 1006) {
        if (connectionStatus === 'connecting') {
          setError('Failed to connect to emergency backend');
          terminal.current?.writeln('\\x1b[31m❌ Failed to connect to emergency backend\\x1b[0m');
        } else {
          terminal.current?.writeln('\\x1b[33m⚠️ Connection lost unexpectedly\\x1b[0m');
          setTimeout(() => {
            if (isVisible) {
              addDebugLog('🔄 Auto-reconnecting...');
              connectWebSocket();
            }
          }, 3000);
        }
      }
    };
  }, [initialCommand, addDebugLog, connectionStatus, processStatus.pid, isVisible]);

  // Handle user input
  useEffect(() => {
    if (!terminal.current) return;

    let inputBuffer = '';
    
    const handleData = (data: string) => {
      console.log('🚨 INPUT:', JSON.stringify(data));
      
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        const isEnter = data.includes('\\r') || data.includes('\\n');
        
        if (isEnter) {
          const completeInput = inputBuffer + '\\n';
          const message = {
            type: 'input',
            data: completeInput,
            timestamp: Date.now()
          };
          
          socket.current.send(JSON.stringify(message));
          inputBuffer = '';
          addDebugLog(`📤 Sent input: ${JSON.stringify(completeInput.replace('\\n', ''))}`);
        } else {
          inputBuffer += data;
        }
      } else {
        addDebugLog('❌ Socket not connected - input ignored');
      }
    };

    const disposable = terminal.current.onData(handleData);
    return () => disposable.dispose();
  }, [connectionStatus, addDebugLog]);

  // Connect when visible
  useEffect(() => {
    if (isVisible && !socket.current) {
      addDebugLog('🔧 Component visible - connecting to emergency backend');
      connectWebSocket();
    }
    return () => {
      if (!isVisible && socket.current) {
        addDebugLog('🔧 Component hidden - closing connection');
        socket.current.close(1000, 'Component hidden');
        socket.current = null;
        setConnectionStatus('disconnected');
      }
    };
  }, [isVisible, connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket.current) {
        addDebugLog('🧹 Component unmounting - closing connection');
        socket.current.close(1000, 'Component unmounted');
        socket.current = null;
      }
    };
  }, [addDebugLog]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddon.current && terminal.current) {
        fitAddon.current.fit();
        
        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
          const resizeMessage = {
            type: 'resize',
            cols: terminal.current.cols,
            rows: terminal.current.rows
          };
          socket.current.send(JSON.stringify(resizeMessage));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢 Connected (Emergency)';
      case 'connecting': return '🟡 Connecting...';
      case 'disconnected': return '🔴 Disconnected';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Terminal Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium">🚨 EMERGENCY Terminal (JSON→Output Fixed)</span>
          {processStatus.pid && (
            <span className="text-gray-400 text-sm">PID: {processStatus.pid}</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span className={`text-sm ${getConnectionStatusColor()}`}>
            {getConnectionStatusText()}
          </span>
          {error && (
            <span className="text-red-400 text-sm" title={error}>
              ⚠️
            </span>
          )}
        </div>
      </div>

      {/* Terminal Container */}
      <div className="h-96 p-2">
        <div 
          ref={terminalRef} 
          className="w-full h-full"
          style={{ background: '#1e1e1e' }}
        />
      </div>

      {/* Debug Logs */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
        <div className="text-xs text-gray-400 max-h-20 overflow-y-auto">
          {debugLogs.slice(-3).map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};