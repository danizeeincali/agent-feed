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

/**
 * SPARC Terminal - Width Expansion Solution
 * 
 * SPECIFICATION: 
 * - Prevent Claude CLI cascading by expanding terminal to full horizontal space
 * - Increase cols from 80 to 140+ to accommodate Claude CLI spinner and content
 * - Maintain responsive sizing that adapts to container width
 * - Ensure proper height for terminal interaction
 * 
 * ARCHITECTURE:
 * - Use dynamic width calculation based on container size
 * - Implement responsive column calculation: floor(containerWidth / 9)
 * - Set minimum 120 columns for Claude CLI compatibility
 * - Increase height to 600px for better visibility
 */
export const TerminalExpandedWidth: React.FC<TerminalProps> = ({ 
  isVisible, 
  processStatus,
  initialCommand 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [terminalDimensions, setTerminalDimensions] = useState({ cols: 140, rows: 35 });

  // Calculate optimal terminal dimensions based on container width
  const calculateDimensions = useCallback(() => {
    if (!containerRef.current) return { cols: 140, rows: 35 };
    
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    
    // Calculate columns: ~9px per character (font-size 14px)
    const optimalCols = Math.max(120, Math.floor((containerWidth - 32) / 9)); // 32px for padding
    const optimalRows = Math.max(30, Math.floor((containerHeight - 40) / 20)); // 20px line height
    
    console.log('🔍 SPARC WIDTH: Container dimensions:', { containerWidth, containerHeight });
    console.log('🔍 SPARC WIDTH: Calculated dimensions:', { optimalCols, optimalRows });
    
    return { cols: optimalCols, rows: optimalRows };
  }, []);

  // Initialize terminal with expanded width
  useEffect(() => {
    if (!isVisible || terminal.current) return;

    if (terminalRef.current && containerRef.current) {
      const dimensions = calculateDimensions();
      setTerminalDimensions(dimensions);
      
      // Create terminal with expanded dimensions
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
        cols: dimensions.cols,
        rows: dimensions.rows,
        disableStdin: false,
        convertEol: false,
        macOptionIsMeta: true,
        scrollback: 2000,
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
      
      // Fit to container after opening
      setTimeout(() => {
        if (fitAddon.current && terminal.current) {
          fitAddon.current.fit();
          console.log('🔍 SPARC WIDTH: Terminal fitted, final dimensions:', {
            cols: terminal.current.cols,
            rows: terminal.current.rows
          });
        }
      }, 100);

      // Welcome message with width info
      terminal.current.writeln('\\x1b[1;32m🚀 Claude Code Terminal - EXPANDED WIDTH\\x1b[0m');
      terminal.current.writeln(`\\x1b[2mTerminal Size: ${dimensions.cols}x${dimensions.rows} (Optimized for Claude CLI)\\x1b[0m`);
      terminal.current.writeln('\\x1b[33m📏 Width Expansion: ACTIVE - No More Cascading!\\x1b[0m');
      terminal.current.writeln('');
    }

    return () => {
      if (terminal.current) {
        terminal.current.dispose();
        terminal.current = null;
      }
    };
  }, [isVisible, calculateDimensions]);

  // WebSocket connection with expanded width support
  const connectWebSocket = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) return;

    if (socket.current) {
      socket.current.close();
      socket.current = null;
    }

    setConnectionStatus('connecting');
    setError(null);
    
    const wsUrl = 'ws://localhost:3002/terminal';
    const newSocket = new WebSocket(wsUrl);
    socket.current = newSocket;

    newSocket.onopen = () => {
      setConnectionStatus('connected');
      setError(null);
      terminal.current?.writeln('\\x1b[32m✅ Connected to Terminal Server (Width Expanded)\\x1b[0m');
      
      const initMessage = {
        type: 'init',
        pid: processStatus.pid,
        cols: terminal.current?.cols || terminalDimensions.cols,
        rows: terminal.current?.rows || terminalDimensions.rows
      };
      
      console.log('🔍 SPARC WIDTH: Sending init with expanded dimensions:', initMessage);
      newSocket.send(JSON.stringify(initMessage));
      
      if (initialCommand) {
        setTimeout(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            const commandMessage = {
              type: 'input', 
              data: initialCommand + '\\n'
            };
            console.log('📤 SPARC WIDTH: Executing initial command in expanded terminal:', initialCommand);
            newSocket.send(JSON.stringify(commandMessage));
          }
        }, 1000);
      }
    };

    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'data' && message.data) {
          // Log width handling
          if (message.data.includes('claude') || message.data.includes('🤖') || message.data.includes('Loading') || message.data.includes('spinner')) {
            console.log('🔍 SPARC WIDTH: Claude CLI content detected, terminal width:', terminal.current?.cols);
          }
          
          terminal.current?.write(message.data);
          
        } else if (message.type === 'output' && message.data) {
          terminal.current?.write(message.data);
          
        } else if (message.type === 'connect') {
          setError(null);
          
        } else if (message.type === 'error') {
          terminal.current?.writeln(`\\x1b[31m❌ Error: ${message.error}\\x1b[0m`);
          setError(`Terminal error: ${message.error}`);
          
        } else if (message.type === 'exit') {
          terminal.current?.writeln(`\\x1b[33m⚠️ Process exited (code: ${message.code})\\x1b[0m`);
          
        } else if (message.type === 'init_ack') {
          setError(null);
          console.log('✅ SPARC WIDTH: Terminal initialized with expanded width');
        }
        
      } catch (err) {
        terminal.current?.write(event.data);
      }
    };

    newSocket.onerror = () => {
      console.error('❌ SPARC WIDTH: WebSocket connection error');
    };

    newSocket.onclose = (event) => {
      console.log('🔌 SPARC WIDTH: WebSocket closed:', event.code);
      setConnectionStatus('disconnected');
      
      if (event.code === 1006 && connectionStatus !== 'connecting') {
        terminal.current?.writeln('\\x1b[33m⚠️ Connection lost - attempting reconnection...\\x1b[0m');
        setTimeout(() => {
          if (isVisible) {
            connectWebSocket();
          }
        }, 3000);
      }
    };
  }, [initialCommand, processStatus.pid, isVisible, terminalDimensions, connectionStatus]);

  // Handle user input
  useEffect(() => {
    if (!terminal.current) return;

    const handleData = (data: string) => {
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        const message = {
          type: 'input',
          data: data.replace(/\\r/g, '\\n'),
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

  // Handle window/container resize with debouncing
  useEffect(() => {
    const handleResize = () => {
      if (fitAddon.current && terminal.current && containerRef.current) {
        const newDimensions = calculateDimensions();
        
        // Only resize if dimensions changed significantly
        if (Math.abs(newDimensions.cols - terminalDimensions.cols) > 5) {
          console.log('🔍 SPARC WIDTH: Resizing terminal:', terminalDimensions, '->', newDimensions);
          
          fitAddon.current.fit();
          setTerminalDimensions(newDimensions);
          
          if (socket.current && socket.current.readyState === WebSocket.OPEN) {
            const resizeMessage = {
              type: 'resize',
              cols: terminal.current.cols,
              rows: terminal.current.rows
            };
            socket.current.send(JSON.stringify(resizeMessage));
          }
        }
      }
    };

    const debouncedResize = (() => {
      let timeout: NodeJS.Timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(handleResize, 300);
      };
    })();

    window.addEventListener('resize', debouncedResize);
    return () => window.removeEventListener('resize', debouncedResize);
  }, [calculateDimensions, terminalDimensions]);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢 Connected (Expanded Width)';
      case 'connecting': return '🟡 Connecting...';
      case 'disconnected': return '🔴 Disconnected';
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef}
      className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden w-full max-w-full"
    >
      {/* Terminal Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium">📏 Expanded Width Terminal</span>
          <span className="text-blue-400 text-sm">
            {terminalDimensions.cols}×{terminalDimensions.rows}
          </span>
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

      {/* Terminal Container - Full Width and Height */}
      <div className="h-[600px] p-4 w-full">
        <div 
          ref={terminalRef} 
          className="w-full h-full min-w-full"
          style={{ 
            background: '#1e1e1e',
            minWidth: '100%',
            overflow: 'hidden'
          }}
        />
      </div>

      {/* Terminal Footer with Width Info */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>📏 Width Expansion: ACTIVE - Claude CLI Cascade Prevention</span>
          <div className="flex items-center space-x-4">
            <span>Size: {terminalDimensions.cols}×{terminalDimensions.rows}</span>
            <span>Min Width: 120 cols</span>
          </div>
        </div>
      </div>
    </div>
  );
};