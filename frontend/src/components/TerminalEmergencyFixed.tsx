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

export const TerminalEmergencyFixed: React.FC<TerminalProps> = ({ 
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
  const lastSpinnerFrame = useRef<string>('');
  const spinnerDetector = useRef<RegExp>(/[✻⣾⣽⣻⢿⡿⣟⣯⣷]\s*(\w+\.\.\.|\w+…)\s*\(esc to interrupt\)/);

  // ENHANCED CASCADE PREVENTION: Comprehensive terminal data processing
  const processTerminalData = useCallback((data: string) => {
    // Detect any Claude CLI spinner patterns (not just Waddling)
    const spinnerPatterns = [
      /[✻✽✶*✢·]\s*(\w+ing\.{3}|\w+\.{3})\s*\(esc to interrupt\)/,
      /[✻✽✶*✢·]\s*(Doing|Waddling|Improvising|Thinking)\.{3}/,
      />\s*Try\s*"[^"]*"/,
      /╭─+╮/  // Box drawing characters
    ];
    
    let isSpinnerFrame = false;
    let currentFrame = '';
    
    for (const pattern of spinnerPatterns) {
      const match = data.match(pattern);
      if (match) {
        isSpinnerFrame = true;
        currentFrame = match[0];
        break;
      }
    }
    
    if (isSpinnerFrame) {
      // Skip identical consecutive frames
      if (currentFrame === lastSpinnerFrame.current) {
        return '';
      }
      
      lastSpinnerFrame.current = currentFrame;
      
      // For spinner frames, ensure they overwrite previous content
      // Use proper ANSI sequences for in-place updates
      const processedData = data
        .replace(/\r\n/g, '\n')  // Normalize line endings
        .replace(/\r/g, '')     // Remove standalone carriage returns
        .replace(/^/, '\x1b[2K\x1b[1G'); // Prepend: clear line + move to start
      
      return processedData;
    }
    
    // Reset spinner tracking on non-spinner output
    lastSpinnerFrame.current = '';
    
    // For regular output, just normalize line endings
    return data.replace(/\r\n/g, '\n').replace(/\r/g, '');
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
        },
        cols: 80,
        rows: 24,
      });

      fitAddon.current = new FitAddon();
      terminal.current.loadAddon(fitAddon.current);
      terminal.current.loadAddon(new WebLinksAddon());
      terminal.current.loadAddon(new SearchAddon());

      terminal.current.open(terminalRef.current);
      
      if (fitAddon.current) {
        fitAddon.current.fit();
      }

      terminal.current.writeln('🚀 Emergency Terminal Fix Active');
      terminal.current.writeln('✅ Direct WebSocket connection to port 3002');
      terminal.current.writeln('');
    }

    return () => {
      if (terminal.current) {
        terminal.current.dispose();
        terminal.current = null;
      }
    };
  }, [isVisible]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    setError(null);

    const wsUrl = 'ws://localhost:3002/terminal';
    const newSocket = new WebSocket(wsUrl);
    socket.current = newSocket;

    newSocket.onopen = () => {
      setConnectionStatus('connected');
      terminal.current?.writeln('✅ Connected to emergency backend');
      
      const initMessage = {
        type: 'init',
        pid: processStatus.pid,
        cols: terminal.current?.cols || 80,
        rows: terminal.current?.rows || 24
      };
      newSocket.send(JSON.stringify(initMessage));
      
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

    // CRITICAL CASCADE FIX: Enhanced message handling with deduplication
    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Only process the data field - never display raw JSON
        if (message.type === 'data' && message.data) {
          // Process data for cascade prevention
          const processedData = processTerminalData(message.data);
          terminal.current?.write(processedData);
        } else if (message.type === 'error') {
          terminal.current?.writeln(`❌ Error: ${message.error}`);
          setError(message.error);
        } else if (message.type === 'exit') {
          terminal.current?.writeln(`⚠️ Process exited (code: ${message.code})`);
        }
      } catch (err) {
        // Fallback for non-JSON data
        terminal.current?.write(event.data);
      }
    };

    newSocket.onerror = () => {
      console.log('WebSocket error occurred');
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

  // CRITICAL FIX: Direct input handling - no buffering
  useEffect(() => {
    if (!terminal.current) return;

    const handleData = (data: string) => {
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
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

  // Handle resize
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

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
    }
  };

  const getStatusText = () => {
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
          <span className="text-white font-medium">🚨 Emergency Terminal Fix</span>
          {processStatus.pid && (
            <span className="text-green-200 text-sm">PID: {processStatus.pid}</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span className={`text-sm ${getStatusColor()}`}>
            {getStatusText()}
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
          Fixed: No raw JSON display - Port 3002 emergency backend
        </div>
      </div>
    </div>
  );
};