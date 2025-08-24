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

export const TerminalDiagnostic: React.FC<TerminalProps> = ({ 
  isVisible, 
  processStatus 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socket = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [terminalDiagnostics, setTerminalDiagnostics] = useState({
    isOpen: false,
    isDisposed: false,
    element: null as HTMLElement | null,
    canvasExists: false,
    cursorState: '',
    bufferData: '',
    writeCallCount: 0,
    lastWriteData: '',
    lastWriteTimestamp: 0
  });
  
  // Enhanced diagnostic logging
  const addDiagnosticLog = useCallback((message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = {
      info: '🔍',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    }[level];
    const logMessage = `[${timestamp}] ${prefix} ${message}`;
    console.log(`DIAGNOSTIC:`, logMessage);
    setDiagnosticLogs(prev => [...prev.slice(-29), logMessage]);
  }, []);

  // Terminal diagnostics checker
  const checkTerminalDiagnostics = useCallback(() => {
    if (!terminal.current) {
      setTerminalDiagnostics(prev => ({
        ...prev,
        isOpen: false,
        isDisposed: true,
        element: null,
        canvasExists: false,
        cursorState: 'N/A - Terminal not initialized',
        bufferData: 'N/A'
      }));
      return;
    }

    const term = terminal.current;
    const element = terminalRef.current;
    const canvas = element?.querySelector('canvas');
    
    // Get buffer content (first 100 chars)
    let bufferContent = '';
    try {
      for (let i = 0; i < Math.min(3, term.buffer.active.length); i++) {
        const line = term.buffer.active.getLine(i);
        if (line) {
          bufferContent += line.translateToString() + '\n';
        }
      }
    } catch (e) {
      bufferContent = `Error reading buffer: ${e}`;
    }

    setTerminalDiagnostics({
      isOpen: !!(term as any)._core,
      isDisposed: (term as any)._isDisposed === true,
      element: element,
      canvasExists: !!canvas,
      cursorState: `x:${term.buffer.active.cursorX}, y:${term.buffer.active.cursorY}, visible:${(term as any)._core?.coreService?.optionsService?.options?.cursorBlink}`,
      bufferData: bufferContent.slice(0, 200),
      writeCallCount: terminalDiagnostics.writeCallCount,
      lastWriteData: terminalDiagnostics.lastWriteData,
      lastWriteTimestamp: terminalDiagnostics.lastWriteTimestamp
    });

    addDiagnosticLog(`Terminal state: open=${!!(term as any)._core}, disposed=${(term as any)._isDisposed}, canvas=${!!canvas}`, 'info');
  }, [addDiagnosticLog, terminalDiagnostics.writeCallCount, terminalDiagnostics.lastWriteData, terminalDiagnostics.lastWriteTimestamp]);

  // Enhanced terminal write function with diagnostics
  const diagnosticWrite = useCallback((data: string) => {
    if (!terminal.current) {
      addDiagnosticLog('❌ WRITE FAILED: Terminal instance is null', 'error');
      return false;
    }

    const term = terminal.current;
    addDiagnosticLog(`📝 WRITE ATTEMPT: "${data}" (${data.length} chars)`, 'info');

    try {
      // Check if terminal is disposed
      if ((term as any)._isDisposed) {
        addDiagnosticLog('❌ WRITE FAILED: Terminal is disposed', 'error');
        return false;
      }

      // Check if core exists
      if (!(term as any)._core) {
        addDiagnosticLog('❌ WRITE FAILED: Terminal core not initialized', 'error');
        return false;
      }

      // Update diagnostics before write
      setTerminalDiagnostics(prev => ({
        ...prev,
        writeCallCount: prev.writeCallCount + 1,
        lastWriteData: data,
        lastWriteTimestamp: Date.now()
      }));

      // Attempt the actual write
      term.write(data);
      addDiagnosticLog(`✅ WRITE SUCCESS: Data written to terminal`, 'success');
      
      // Force refresh/render
      setTimeout(() => {
        if ((term as any)._core?.renderer) {
          (term as any)._core.renderer.refresh();
          addDiagnosticLog('🔄 Forced terminal refresh', 'info');
        }
      }, 10);

      return true;
    } catch (error) {
      addDiagnosticLog(`❌ WRITE ERROR: ${error}`, 'error');
      return false;
    }
  }, [addDiagnosticLog]);

  // Initialize terminal with enhanced diagnostics
  useEffect(() => {
    if (!isVisible || terminal.current) return;

    if (terminalRef.current) {
      addDiagnosticLog('🚀 INITIALIZING Terminal with diagnostics...', 'info');
      
      // Create terminal with diagnostic-friendly configuration
      terminal.current = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Fira Code", "Cascadia Code", "Courier New", monospace',
        theme: {
          background: '#000000',  // Pure black for contrast
          foreground: '#00ff00',  // Bright green
          cursor: '#ff0000',      // Bright red cursor
          selectionBackground: '#ffffff',
        },
        cols: 80,
        rows: 24,
        convertEol: true,
        scrollback: 1000,
        allowTransparency: false,
        screenKeys: true,
        useFlowControl: false,
        tabStopWidth: 8,
        logLevel: 'debug'  // Enable debug logging
      });

      addDiagnosticLog(`✅ Terminal instance created`, 'success');

      // Add fit addon
      fitAddon.current = new FitAddon();
      terminal.current.loadAddon(fitAddon.current);
      addDiagnosticLog(`✅ FitAddon loaded`, 'success');
      
      // Open terminal and verify DOM attachment
      try {
        terminal.current.open(terminalRef.current);
        addDiagnosticLog(`✅ Terminal opened in DOM element`, 'success');
        
        // Verify canvas creation
        setTimeout(() => {
          const canvas = terminalRef.current?.querySelector('canvas');
          if (canvas) {
            addDiagnosticLog(`✅ Canvas element found: ${canvas.width}x${canvas.height}`, 'success');
          } else {
            addDiagnosticLog(`❌ Canvas element NOT FOUND in DOM`, 'error');
          }
        }, 100);
      } catch (error) {
        addDiagnosticLog(`❌ Terminal open failed: ${error}`, 'error');
      }
      
      // Fit to container
      setTimeout(() => {
        if (fitAddon.current && terminal.current) {
          try {
            fitAddon.current.fit();
            addDiagnosticLog(`✅ Terminal fitted: ${terminal.current.cols}x${terminal.current.rows}`, 'success');
          } catch (error) {
            addDiagnosticLog(`❌ Terminal fit failed: ${error}`, 'error');
          }
        }
      }, 200);

      // Test initial writes with diagnostics
      setTimeout(() => {
        if (terminal.current) {
          addDiagnosticLog('🧪 TESTING: Initial diagnostic writes...', 'info');
          
          const testMessages = [
            '\x1b[1;31m🔴 RED TEST MESSAGE\x1b[0m\r\n',
            '\x1b[1;32m🟢 GREEN TEST MESSAGE\x1b[0m\r\n', 
            '\x1b[1;33m🟡 YELLOW TEST MESSAGE\x1b[0m\r\n',
            '\x1b[1;36m🔵 CYAN DIAGNOSTIC TERMINAL\x1b[0m\r\n',
            'Plain text test message\r\n',
            'If you can see this, terminal rendering works!\r\n',
            '\r\n$ '
          ];

          testMessages.forEach((msg, i) => {
            setTimeout(() => {
              diagnosticWrite(msg);
            }, i * 100);
          });

          // Focus terminal
          try {
            terminal.current.focus();
            addDiagnosticLog('✅ Terminal focused', 'success');
          } catch (error) {
            addDiagnosticLog(`❌ Terminal focus failed: ${error}`, 'error');
          }
        }
      }, 300);

      // Set up diagnostic checker interval
      const diagnosticInterval = setInterval(() => {
        checkTerminalDiagnostics();
      }, 2000);

      return () => {
        clearInterval(diagnosticInterval);
        if (terminal.current) {
          addDiagnosticLog('🔄 Disposing terminal', 'info');
          terminal.current.dispose();
          terminal.current = null;
        }
      };
    }
  }, [isVisible, addDiagnosticLog, diagnosticWrite, checkTerminalDiagnostics]);

  // WebSocket connection with enhanced event handling
  const connectWebSocket = useCallback(() => {
    if (socket.current?.connected) {
      addDiagnosticLog('Socket already connected', 'info');
      return;
    }

    setConnectionStatus('connecting');
    setError(null);
    addDiagnosticLog('Creating Socket.IO connection...', 'info');

    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: {
        userId: 'diagnostic-terminal',
        username: 'Diagnostic Terminal',
        token: 'diagnostic-token'
      },
      query: {
        pid: processStatus.pid
      }
    });

    socket.current = newSocket;

    // Connection handlers
    newSocket.on('connect', () => {
      addDiagnosticLog(`✅ SOCKET CONNECTED: ${newSocket.id}`, 'success');
      setConnectionStatus('connected');
      
      diagnosticWrite('\x1b[32m✅ WebSocket Connected\x1b[0m\r\n');
      diagnosticWrite(`Socket ID: ${newSocket.id}\r\n`);
      diagnosticWrite('\x1b[33mType anything to test terminal I/O...\x1b[0m\r\n\r\n$ ');

      // Send init message
      if (processStatus.pid) {
        newSocket.emit('init', {
          pid: processStatus.pid,
          cols: terminal.current?.cols || 80,
          rows: terminal.current?.rows || 24
        });
        addDiagnosticLog(`Sent init with PID: ${processStatus.pid}`, 'info');
      }
    });

    newSocket.on('connect_error', (error) => {
      addDiagnosticLog(`❌ CONNECTION ERROR: ${error.message}`, 'error');
      setError(error.message);
      setConnectionStatus('disconnected');
      diagnosticWrite(`\x1b[31m❌ Connection error: ${error.message}\x1b[0m\r\n`);
    });

    newSocket.on('disconnect', (reason) => {
      addDiagnosticLog(`Disconnected: ${reason}`, 'warn');
      setConnectionStatus('disconnected');
      diagnosticWrite(`\x1b[33m⚠️ Disconnected: ${reason}\x1b[0m\r\n`);
    });

    // CRITICAL: Enhanced terminal output handler with diagnostics
    newSocket.on('terminal:output', (data: any) => {
      addDiagnosticLog(`📨 RECEIVED terminal:output: ${JSON.stringify(data).slice(0, 100)}`, 'success');
      
      if (terminal.current) {
        const outputData = data?.data || data;
        if (typeof outputData === 'string') {
          addDiagnosticLog(`🎯 ATTEMPTING DIAGNOSTIC WRITE: "${outputData}"`, 'info');
          const success = diagnosticWrite(outputData);
          if (!success) {
            addDiagnosticLog(`❌ DIAGNOSTIC WRITE FAILED`, 'error');
          }
          
          // Also check terminal state after write
          setTimeout(() => checkTerminalDiagnostics(), 100);
        } else {
          addDiagnosticLog(`⚠️ Non-string output: ${typeof outputData}`, 'warn');
        }
      } else {
        addDiagnosticLog(`❌ Terminal not available for output`, 'error');
      }
    });

    // Enhanced event logger
    newSocket.onAny((eventName, ...args) => {
      addDiagnosticLog(`📡 EVENT '${eventName}': ${JSON.stringify(args).slice(0, 100)}`, 'info');
    });

  }, [processStatus.pid, addDiagnosticLog, diagnosticWrite, checkTerminalDiagnostics]);

  // Terminal input handler with diagnostics
  useEffect(() => {
    if (!terminal.current) return;

    addDiagnosticLog('Setting up enhanced input handler', 'info');
    
    const disposable = terminal.current.onData((data) => {
      addDiagnosticLog(`⌨️ INPUT: "${data}" (codes: ${Array.from(data).map(c => c.charCodeAt(0)).join(',')})`, 'info');
      
      // Send to server
      if (socket.current?.connected) {
        socket.current.emit('terminal:input', data);
        socket.current.emit('terminal_input', data);
        socket.current.emit('input', { data });
        addDiagnosticLog(`📤 SENT INPUT via multiple events`, 'success');
      } else {
        addDiagnosticLog('❌ Cannot send input - socket disconnected', 'error');
      }
    });

    return () => {
      disposable.dispose();
      addDiagnosticLog('Input handler disposed', 'info');
    };
  }, [connectionStatus, addDiagnosticLog]);

  // Auto-connect when visible and process running
  useEffect(() => {
    if (isVisible && processStatus.status === 'running') {
      addDiagnosticLog('Process running, connecting WebSocket...', 'info');
      connectWebSocket();
    } else {
      if (socket.current) {
        addDiagnosticLog('Disconnecting WebSocket...', 'info');
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
  }, [isVisible, processStatus.status, connectWebSocket]);

  if (!isVisible) return null;

  return (
    <div className="bg-gray-900 border border-red-500 rounded-lg overflow-hidden">
      {/* Enhanced Header with Diagnostics */}
      <div className="bg-red-900 px-4 py-2 border-b border-red-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-white font-bold">🔬 DIAGNOSTIC TERMINAL</span>
            {processStatus.pid && (
              <span className="text-gray-300 text-sm">PID: {processStatus.pid}</span>
            )}
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              connectionStatus === 'connected' ? 'bg-green-500/30 text-green-300' :
              connectionStatus === 'connecting' ? 'bg-yellow-500/30 text-yellow-300' :
              'bg-red-500/30 text-red-300'
            }`}>
              {connectionStatus.toUpperCase()}
            </span>
          </div>
          {error && (
            <span className="text-red-300 text-sm font-bold">{error}</span>
          )}
        </div>
      </div>

      {/* Terminal Container with Enhanced Styling */}
      <div className="h-96 p-2 bg-black border-2 border-red-500">
        <div 
          ref={terminalRef} 
          className="w-full h-full border border-yellow-500"
          style={{ 
            minHeight: '350px',
            backgroundColor: '#000000',
            position: 'relative'
          }}
          onClick={() => terminal.current?.focus()}
        />
      </div>

      {/* Terminal State Diagnostics */}
      <div className="bg-red-800 border-t border-red-600 p-3">
        <div className="text-xs text-white font-mono">
          <div className="font-bold mb-2 text-yellow-300">🔬 TERMINAL STATE DIAGNOSTICS:</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div>Open: {terminalDiagnostics.isOpen ? '✅' : '❌'}</div>
              <div>Disposed: {terminalDiagnostics.isDisposed ? '❌' : '✅'}</div>
              <div>Canvas Exists: {terminalDiagnostics.canvasExists ? '✅' : '❌'}</div>
              <div>Element: {terminalDiagnostics.element ? '✅' : '❌'}</div>
            </div>
            <div>
              <div>Write Calls: {terminalDiagnostics.writeCallCount}</div>
              <div>Cursor: {terminalDiagnostics.cursorState}</div>
              <div>Last Write: {terminalDiagnostics.lastWriteTimestamp > 0 ? new Date(terminalDiagnostics.lastWriteTimestamp).toLocaleTimeString() : 'Never'}</div>
              <div>Last Data: "{terminalDiagnostics.lastWriteData.slice(0, 20)}..."</div>
            </div>
          </div>
          {terminalDiagnostics.bufferData && (
            <div className="mt-2">
              <div className="font-bold text-cyan-300">Buffer Content (first 3 lines):</div>
              <pre className="bg-black p-2 rounded text-green-300 text-xs overflow-auto">
                {terminalDiagnostics.bufferData || 'Empty buffer'}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Debug Logs */}
      <div className="bg-gray-800 border-t border-gray-600 p-3 max-h-48 overflow-auto">
        <div className="text-xs font-mono">
          <div className="font-bold mb-2 text-red-400">🔍 DIAGNOSTIC LOGS:</div>
          <div className="space-y-1">
            {diagnosticLogs.map((log, i) => (
              <div key={i} className={`whitespace-pre-wrap break-all ${
                log.includes('❌') ? 'text-red-300' :
                log.includes('✅') ? 'text-green-300' :
                log.includes('⚠️') ? 'text-yellow-300' :
                'text-gray-300'
              }`}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Control Panel */}
      <div className="bg-red-800 px-4 py-2 border-t border-red-700">
        <div className="flex items-center justify-between text-xs text-white">
          <div className="flex items-center space-x-4">
            <span>Socket: {socket.current?.id || 'Not connected'}</span>
            <span>Transport: {socket.current?.io?.engine?.transport?.name || 'N/A'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => checkTerminalDiagnostics()}
              className="px-2 py-1 bg-yellow-500/30 text-yellow-300 rounded hover:bg-yellow-500/50"
            >
              Check State
            </button>
            <button
              onClick={() => diagnosticWrite('Test write at ' + new Date().toLocaleTimeString() + '\r\n')}
              className="px-2 py-1 bg-green-500/30 text-green-300 rounded hover:bg-green-500/50"
            >
              Test Write
            </button>
            <button
              onClick={() => connectWebSocket()}
              className="px-2 py-1 bg-blue-500/30 text-blue-300 rounded hover:bg-blue-500/50"
            >
              Reconnect
            </button>
            <button
              onClick={() => terminal.current?.clear()}
              className="px-2 py-1 bg-gray-500/30 text-gray-300 rounded hover:bg-gray-500/50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalDiagnostic;