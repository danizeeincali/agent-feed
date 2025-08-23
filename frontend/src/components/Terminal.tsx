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
}

export const TerminalComponent: React.FC<TerminalProps> = ({ 
  isVisible, 
  processStatus 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Initialize terminal when visible
  useEffect(() => {
    if (!isVisible || terminal.current) return;

    if (terminalRef.current) {
      // Create terminal instance
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
      });

      // Add addons
      fitAddon.current = new FitAddon();
      terminal.current.loadAddon(fitAddon.current);
      terminal.current.loadAddon(new WebLinksAddon());
      terminal.current.loadAddon(new SearchAddon());

      // Open terminal with debugging
      console.log('🔍 DEBUG: Opening terminal, terminalRef.current:', terminalRef.current);
      terminal.current.open(terminalRef.current);
      console.log('✅ DEBUG: Terminal opened successfully');
      
      // Fit terminal to container
      if (fitAddon.current) {
        console.log('🔍 DEBUG: Fitting terminal to container');
        fitAddon.current.fit();
        console.log('✅ DEBUG: Terminal fitted successfully');
      }

      // Welcome message with debug info
      terminal.current.writeln('\x1b[1;32m🚀 Claude Code Terminal (DEBUG MODE)\x1b[0m');
      terminal.current.writeln('\x1b[2mConnecting to Claude process...\x1b[0m');
      terminal.current.writeln('\x1b[33m🔍 DEBUG: Terminal initialized, input handler attached\x1b[0m');
      terminal.current.writeln('\x1b[33m🔍 DEBUG: Try typing - events should be logged to console\x1b[0m');
      terminal.current.writeln('');
      
      // Test terminal input immediately
      setTimeout(() => {
        if (terminal.current) {
          console.log('🔍 DEBUG: Testing terminal focus and interactivity...');
          terminal.current.focus();
          console.log('🔍 DEBUG: Terminal focused, click inside and try typing');
        }
      }, 1000);
    }

    return () => {
      if (terminal.current) {
        terminal.current.dispose();
        terminal.current = null;
      }
    };
  }, [isVisible]);

  // WebSocket connection management
  const connectWebSocket = useCallback(async () => {
    if (!terminal.current || ws.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    setError(null);

    try {
      // Connect to Socket.IO terminal namespace
      const { io } = await import('socket.io-client');
      const socket = io('http://localhost:3001/terminal', {
        transports: ['websocket', 'polling']
      });
      
      ws.current = socket as any; // Type compatibility

      socket.on('connect', () => {
        console.log('🔍 DEBUG: Socket.IO connected event fired');
        setConnectionStatus('connected');
        terminal.current?.writeln('\x1b[32m✅ Connected to Claude terminal\x1b[0m');
        terminal.current?.writeln('\x1b[33m🔍 DEBUG: Socket.IO connection established\x1b[0m');
        terminal.current?.writeln('\x1b[33m🔍 DEBUG: Try typing now - input should work\x1b[0m');
        
        // Send initial setup
        const initData = {
          pid: processStatus.pid,
          cols: terminal.current?.cols || 80,
          rows: terminal.current?.rows || 24
        };
        console.log('🔍 DEBUG: Sending init data:', initData);
        socket.emit('init', initData);
        
        // Focus terminal after connection
        setTimeout(() => {
          if (terminal.current) {
            console.log('🔍 DEBUG: Focusing terminal after connection');
            terminal.current.focus();
          }
        }, 100);
      });

      socket.on('output', (message) => {
        console.log('📨 DEBUG: Received output message:', message);
        terminal.current?.write(message.data);
      });

      socket.on('error', (message) => {
        console.error('📨 DEBUG: Received error message:', message);
        terminal.current?.writeln(`\x1b[31m❌ Error: ${message.message}\x1b[0m`);
        setError(message.message);
      });

      socket.on('connected', (message) => {
        console.log('📨 DEBUG: Received connected message:', message);
        terminal.current?.writeln(`\x1b[36mℹ️ Connected to process ${message.pid}\x1b[0m`);
        terminal.current?.writeln('\x1b[33m🔍 DEBUG: Ready for input - start typing!\x1b[0m');
      });

      socket.on('connect_error', (error) => {
        console.error('📨 DEBUG: Socket.IO connection error:', error);
        console.error('📨 DEBUG: Error type:', typeof error);
        console.error('📨 DEBUG: Error message:', error?.message);
        setError('Socket.IO connection error');
        setConnectionStatus('disconnected');
        terminal.current?.writeln('\x1b[31m❌ Connection error\x1b[0m');
        terminal.current?.writeln(`\x1b[31m🔍 DEBUG: ${error?.message || 'Unknown error'}\x1b[0m`);
      });

      socket.on('disconnect', (reason) => {
        console.log('📨 DEBUG: Socket.IO disconnected:', reason);
        setConnectionStatus('disconnected');
        terminal.current?.writeln('\x1b[33m⚠️ Connection closed\x1b[0m');
        terminal.current?.writeln(`\x1b[33m🔍 DEBUG: Disconnect reason: ${reason}\x1b[0m`);
        
        // Attempt to reconnect after 3 seconds if process is still running
        if (processStatus.isRunning) {
          console.log('🔄 DEBUG: Scheduling reconnection in 3 seconds');
          setTimeout(() => {
            console.log('🔄 DEBUG: Attempting reconnection...');
            connectWebSocket();
          }, 3000);
        }
      });

    } catch (error) {
      setError('Failed to create WebSocket connection');
      setConnectionStatus('disconnected');
      console.error('WebSocket creation error:', error);
    }
  }, [processStatus.pid, processStatus.isRunning]);

  // Handle terminal input with EXTENSIVE DEBUGGING
  useEffect(() => {
    if (!terminal.current) {
      console.log('🔍 DEBUG: Terminal input handler - terminal.current is null/undefined');
      return;
    }

    console.log('🔍 DEBUG: Setting up terminal input handler');
    console.log('🔍 DEBUG: Terminal instance:', terminal.current);
    console.log('🔍 DEBUG: Terminal has onData method:', typeof terminal.current.onData);
    
    const handleData = (data: string) => {
      console.log('🎯 CRITICAL DEBUG: xterm.js onData event fired!');
      console.log('🎯 CRITICAL DEBUG: Input data received:', JSON.stringify(data));
      console.log('🎯 CRITICAL DEBUG: Data length:', data.length);
      console.log('🎯 CRITICAL DEBUG: Data char codes:', Array.from(data).map(c => c.charCodeAt(0)));
      
      console.log('🔍 DEBUG: WebSocket current state:', ws.current);
      console.log('🔍 DEBUG: WebSocket connected:', (ws.current as any)?.connected);
      console.log('🔍 DEBUG: WebSocket readyState:', ws.current?.readyState);
      
      if (ws.current && (ws.current as any).connected) {
        const message = {
          type: 'input',
          data: data,
          timestamp: Date.now()
        };
        console.log('📝 DEBUG: Sending input message:', message);
        console.log('📝 DEBUG: Socket emit method:', typeof (ws.current as any).emit);
        
        try {
          (ws.current as any).emit('message', message);
          console.log('✅ DEBUG: Message sent successfully');
        } catch (error) {
          console.error('❌ DEBUG: Error sending message:', error);
        }
      } else {
        console.warn('❌ DEBUG: Terminal not connected, cannot send input');
        console.warn('❌ DEBUG: ws.current exists:', !!ws.current);
        console.warn('❌ DEBUG: ws.current.connected:', (ws.current as any)?.connected);
        console.warn('❌ DEBUG: Connection status:', connectionStatus);
      }
    };

    console.log('🔍 DEBUG: Attaching onData handler to terminal');
    try {
      const disposable = terminal.current.onData(handleData);
      console.log('✅ DEBUG: onData handler attached successfully:', disposable);
    } catch (error) {
      console.error('❌ DEBUG: Failed to attach onData handler:', error);
    }

    return () => {
      console.log('🔍 DEBUG: Cleaning up terminal input handler');
      if (terminal.current) {
        try {
          terminal.current.onData(() => {
            console.log('🔍 DEBUG: Dummy onData handler for cleanup');
          });
        } catch (error) {
          console.error('❌ DEBUG: Error during cleanup:', error);
        }
      }
    };
  }, [connectionStatus]); // Add connectionStatus as dependency

  // Connect/disconnect based on process status
  useEffect(() => {
    if (processStatus.isRunning && isVisible) {
      connectWebSocket();
    } else {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      setConnectionStatus('disconnected');
    }
  }, [processStatus.isRunning, isVisible, connectWebSocket]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddon.current && terminal.current) {
        fitAddon.current.fit();
        
        // Send new dimensions to server
        if (ws.current && (ws.current as any).connected) {
          const resizeMessage = {
            type: 'resize',
            cols: terminal.current.cols,
            rows: terminal.current.rows
          };
          console.log('📏 DEBUG: Sending resize message:', resizeMessage);
          (ws.current as any).emit('message', resizeMessage);
        } else {
          console.warn('📏 DEBUG: Cannot send resize - not connected');
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
    const statusText = (() => {
      switch (connectionStatus) {
        case 'connected': return '🟢 Connected (DEBUG)';
        case 'connecting': return '🟡 Connecting... (DEBUG)';
        case 'disconnected': return '🔴 Disconnected (DEBUG)';
      }
    })();
    console.log('🔍 DEBUG: Connection status display:', statusText, 'Actual status:', connectionStatus);
    return statusText;
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Terminal Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium">Claude Terminal</span>
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

      {/* Terminal Footer */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Working Directory: /workspaces/agent-feed/prod</span>
          <div className="flex items-center space-x-4">
            <span>Ctrl+C: Interrupt</span>
            <span>Ctrl+D: Exit</span>
          </div>
        </div>
      </div>
    </div>
  );
};