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

export const TerminalEmergencyFix: React.FC<TerminalProps> = ({ 
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
        },
        cols: 80,
        rows: 24,
      });

      // Add addons
      fitAddon.current = new FitAddon();
      terminal.current.loadAddon(fitAddon.current);
      terminal.current.loadAddon(new WebLinksAddon());
      terminal.current.loadAddon(new SearchAddon());

      // Open terminal
      terminal.current.open(terminalRef.current);
      
      // Fit terminal to container
      if (fitAddon.current) {
        fitAddon.current.fit();
      }

      // Welcome message
      terminal.current.writeln('🚀 Emergency Fix Terminal - Direct Passthrough Active');
      terminal.current.writeln('✅ No buffering, no UI cascade, direct terminal control');
      terminal.current.writeln('');
    }

    return () => {
      if (terminal.current) {
        terminal.current.dispose();
        terminal.current = null;
      }
    };
  }, [isVisible]);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    setError(null);

    const wsUrl = 'ws://localhost:3002/terminal';
    const newSocket = new WebSocket(wsUrl);
    socket.current = newSocket;

    newSocket.onopen = () => {
      setConnectionStatus('connected');
      terminal.current?.writeln('✅ Connected to emergency fix terminal server');
      
      // Send initial setup
      const initMessage = {
        type: 'init',
        pid: processStatus.pid,
        cols: terminal.current?.cols || 80,
        rows: terminal.current?.rows || 24
      };
      newSocket.send(JSON.stringify(initMessage));
      
      // Execute initial command if provided
      if (initialCommand) {
        setTimeout(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            const commandMessage = {
              type: 'input',
              data: initialCommand + '\n'
            };
            newSocket.send(JSON.stringify(commandMessage));
          }
        }, 500);
      }
    };

    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // EMERGENCY FIX: Direct output display - no processing
        if (message.type === 'data' && message.data) {
          terminal.current?.write(message.data);
        } else if (message.type === 'error') {
          terminal.current?.writeln(`❌ Error: ${message.error}`);
          setError(message.error);
        } else if (message.type === 'exit') {
          terminal.current?.writeln(`⚠️ Process exited (code: ${message.code})`);
        }
      } catch (err) {
        // Fallback for raw text data
        terminal.current?.write(event.data);
      }
    };

    newSocket.onerror = (error) => {
      console.log('WebSocket error during connection');
    };

    newSocket.onclose = (event) => {
      setConnectionStatus('disconnected');
      
      if (event.code === 1000) {
        terminal.current?.writeln('📤 Connection closed normally');
      } else {
        terminal.current?.writeln('⚠️ Connection lost');
        if (isVisible) {
          setTimeout(() => connectWebSocket(), 3000);
        }
      }
    };
  }, [initialCommand, processStatus.pid, isVisible]);

  // EMERGENCY FIX: Direct input handling - no buffering
  useEffect(() => {
    if (!terminal.current) return;

    const handleData = (data: string) => {
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        // Direct passthrough - no buffering, no local echo
        const message = {
          type: 'input',
          data: data,
          timestamp: Date.now()
        };
        socket.current.send(JSON.stringify(message));
      }
    };

    const disposable = terminal.current.onData(handleData);
    return () => disposable.dispose();
  }, [connectionStatus]);

  // Connect when visible
  useEffect(() => {
    if (isVisible && !socket.current) {
      connectWebSocket();
    }
    
    return () => {
      if (!isVisible && socket.current) {
        socket.current.close(1000, 'Component hidden');
        socket.current = null;
        setConnectionStatus('disconnected');
      }
    };
  }, [isVisible, connectWebSocket]);

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
      case 'connected': return '✅ Emergency Fix Active';
      case 'connecting': return '🟡 Connecting...';
      case 'disconnected': return '🔴 Disconnected';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gray-900 border border-green-500 rounded-lg overflow-hidden">
      <div className="bg-green-800 px-4 py-2 border-b border-green-600 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium">🚨 Emergency Fix Terminal</span>
          {processStatus.pid && (
            <span className="text-green-200 text-sm">PID: {processStatus.pid}</span>
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

      <div className="h-96 p-2">
        <div 
          ref={terminalRef} 
          className="w-full h-full"
          style={{ background: '#1e1e1e' }}
        />
      </div>

      <div className="bg-green-800 px-4 py-2 border-t border-green-600">
        <div className="text-xs text-green-200">
          Direct passthrough mode - No buffering or UI cascade
        </div>
      </div>
    </div>
  );
};