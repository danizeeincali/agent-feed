import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import 'xterm/css/xterm.css';
import { 
  calculateTerminalDimensions, 
  analyzeCascadePotential, 
  findOptimalTerminalWidth,
  recommendTerminalWidth,
  detectRealTimeCascade
} from '../utils/terminal-width-calculator';
import '../styles/terminal-responsive.css';
import { 
  getResponsiveTerminalDimensions, 
  validateClaudeCliSupport,
  createTerminalResizeObserver,
  debugViewportCorrelation,
  getBreakpointConfig
} from '../utils/terminalViewport';

interface TerminalProps {
  isVisible: boolean;
  processStatus: {
    isRunning: boolean;
    pid?: number;
    status: string;
  };
  initialCommand?: string;
}

export const TerminalComponent: React.FC<TerminalProps> = ({ 
  isVisible, 
  processStatus,
  initialCommand 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [lastCommand, setLastCommand] = useState<string>('');
  const [cascadeDetected, setCascadeDetected] = useState<boolean>(false);
  const [optimalDimensions, setOptimalDimensions] = useState<{ cols: number; rows: number }>({ cols: 80, rows: 24 });
  const [terminalDimensions, setTerminalDimensions] = useState(() => getResponsiveTerminalDimensions());
  const resizeObserver = useRef<ResizeObserver | null>(null);

  // Initialize terminal when visible
  useEffect(() => {
    if (!isVisible || terminal.current) return;

    if (terminalRef.current) {
      // Get responsive terminal dimensions
      const dimensions = getResponsiveTerminalDimensions();
      const breakpointConfig = getBreakpointConfig();
      
      // Validate Claude CLI support
      const validation = validateClaudeCliSupport(dimensions.cols);
      
      console.log('🔍 DEBUG: Responsive terminal dimensions:', dimensions);
      console.log('🔍 DEBUG: Claude CLI validation:', validation);
      console.log('🔍 DEBUG: Breakpoint config:', breakpointConfig);
      
      // Create terminal instance with responsive dimensions
      terminal.current = new Terminal({
        cursorBlink: true,
        fontSize: breakpointConfig.fontSize,
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
        cols: dimensions.cols,
        rows: dimensions.rows,
      });
      
      // Store dimensions for later reference
      setTerminalDimensions(dimensions);

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

      // Welcome message with viewport correlation debug info
      terminal.current.writeln('\x1b[1;32m🚀 Claude Code Terminal (Viewport-Responsive)\x1b[0m');
      terminal.current.writeln('\x1b[2mConnecting to Claude process...\x1b[0m');
      terminal.current.writeln(`\x1b[36mℹ️  Terminal: ${dimensions.cols}×${dimensions.rows} (${breakpointConfig.name})\x1b[0m`);
      
      // Show Claude CLI cascade prevention status
      if (validation.canHandle) {
        terminal.current.writeln('\x1b[32m✅ Claude CLI cascade prevention: ACTIVE\x1b[0m');
      } else {
        terminal.current.writeln(`\x1b[33m⚠️  Claude CLI cascade risk: ${validation.cascadeRisk.toUpperCase()}\x1b[0m`);
        terminal.current.writeln(`\x1b[33m💡 ${validation.recommendation}\x1b[0m`);
      }
      
      terminal.current.writeln('\x1b[33m🔍 DEBUG: Try typing - events should be logged to console\x1b[0m');
      terminal.current.writeln('');
      
      // Debug viewport correlation in console
      debugViewportCorrelation();
      
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
  }, [isVisible, optimalDimensions]);

  // WebSocket connection management
  const connectWebSocket = useCallback(async () => {
    if (!terminal.current || ws.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    setError(null);

    try {
      // PROTOCOL FIX: Use raw WebSocket instead of Socket.IO to match backend
      console.log('🔧 DEBUG: Creating raw WebSocket connection to match backend protocol');
      const wsUrl = `ws://localhost:3002/terminal`;
      const socket = new WebSocket(wsUrl);
      
      ws.current = socket;

      socket.onopen = () => {
        console.log('🔍 DEBUG: Raw WebSocket connected - PROTOCOL MATCH!');
        setConnectionStatus('connected');
        terminal.current?.writeln('\x1b[32m✅ Connected to Terminal Server (Protocol Fixed)\x1b[0m');
        terminal.current?.writeln('\x1b[33m🔍 DEBUG: Raw WebSocket connection established\x1b[0m');
        terminal.current?.writeln('\x1b[33m🔍 DEBUG: Try typing now - protocol should match!\x1b[0m');
        
        // Send initial setup with responsive dimensions
        const currentDimensions = getResponsiveTerminalDimensions();
        const initData = {
          type: 'init',
          pid: processStatus.pid,
          cols: terminal.current?.cols || currentDimensions.cols,
          rows: terminal.current?.rows || currentDimensions.rows
        };
        console.log('🔍 DEBUG: Sending init data:', initData);
        socket.send(JSON.stringify(initData));
        
        // Execute initial command if provided
        if (initialCommand) {
          setTimeout(() => {
            const commandMessage = {
              type: 'input',
              data: initialCommand + '\r',
              timestamp: Date.now()
            };
            socket.send(JSON.stringify(commandMessage));
            console.log('📝 DEBUG: Sent initial command:', initialCommand);
            if (terminal.current) {
              terminal.current.write(`\x1b[33m➜ Auto-executing: ${initialCommand}\x1b[0m\r\n`);
            }
          }, 500); // Small delay to ensure terminal is ready
        }
        
        // Focus terminal after connection
        setTimeout(() => {
          if (terminal.current) {
            console.log('🔍 DEBUG: Focusing terminal after connection');
            terminal.current.focus();
          }
        }, 100);
      };

      socket.onmessage = (event) => {
        console.log('📨 DEBUG: Received WebSocket message:', event.data);
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'data') {
            terminal.current?.write(message.data);
          } else if (message.type === 'error') {
            console.error('📨 DEBUG: Received error message:', message);
            terminal.current?.writeln(`\x1b[31m❌ Error: ${message.message}\x1b[0m`);
            setError(message.message);
          } else if (message.type === 'init_ack') {
            console.log('📨 DEBUG: Received init acknowledgment:', message);
            terminal.current?.writeln(`\x1b[36mℹ️ Connected to process ${message.pid}\x1b[0m`);
            terminal.current?.writeln('\x1b[33m🔍 DEBUG: Ready for input - start typing!\x1b[0m');
          }
        } catch (error) {
          console.error('📨 DEBUG: Error parsing WebSocket message:', error);
          terminal.current?.write(event.data); // Fallback to raw data
        }
      };

      socket.onerror = (error) => {
        console.error('📨 DEBUG: WebSocket connection error:', error);
        setError('WebSocket connection error');
        setConnectionStatus('disconnected');
        terminal.current?.writeln('\x1b[31m❌ Connection error\x1b[0m');
      };

      socket.onclose = (event) => {
        console.log('📨 DEBUG: WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        terminal.current?.writeln('\x1b[33m⚠️ Connection closed\x1b[0m');
        terminal.current?.writeln(`\x1b[33m🔍 DEBUG: Disconnect code: ${event.code}\x1b[0m`);
        
        // Attempt to reconnect after 3 seconds if process is still running
        if (processStatus.isRunning) {
          console.log('🔄 DEBUG: Scheduling reconnection in 3 seconds');
          setTimeout(() => {
            console.log('🔄 DEBUG: Attempting reconnection...');
            connectWebSocket();
          }, 3000);
        }
      };

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
      
      // Track the last command for width optimization
      if (data === '\r' || data === '\n') {
        // Command executed, analyze for optimal width
        const fullCommand = lastCommand.trim();
        if (fullCommand) {
          console.log('🔍 Analyzing command for width requirements:', fullCommand);
          const recommendation = recommendTerminalWidth(fullCommand, terminalOutput, {
            width: window.innerWidth,
            height: window.innerHeight
          });
          
          if (recommendation.recommendedCols > (terminal.current?.cols || optimalDimensions.cols)) {
            console.log('📏 Command requires wider terminal:', recommendation);
            setOptimalDimensions(prev => ({
              ...prev,
              cols: Math.max(prev.cols, recommendation.recommendedCols)
            }));
          }
          
          setLastCommand('');
        }
      } else if (data !== '\b' && data !== '\x7f') { // Not backspace or delete
        setLastCommand(prev => prev + data);
      } else {
        setLastCommand(prev => prev.slice(0, -1));
      }
      
      console.log('🔍 DEBUG: WebSocket current state:', ws.current);
      console.log('🔍 DEBUG: WebSocket readyState:', ws.current?.readyState);
      console.log('🔍 DEBUG: WebSocket OPEN constant:', WebSocket.OPEN);
      
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        // REGRESSION FIX: Preserve carriage returns for Claude CLI spinners and terminal control
        let normalizedData = data;
        
        // Only normalize Windows CRLF to LF - preserve standalone \r for terminal control
        normalizedData = normalizedData.replace(/\r\n/g, '\n');
        // CRITICAL: DO NOT convert standalone \r - essential for Claude CLI spinner overwriting!
        
        const message = {
          type: 'input',
          data: normalizedData,
          timestamp: Date.now()
        };
        console.log('📝 DEBUG: Sending normalized input message:', message);
        console.log('📝 DEBUG: Socket emit method:', typeof (ws.current as any).emit);
        
        try {
          (ws.current as WebSocket).send(JSON.stringify(message));
          console.log('✅ DEBUG: Message sent successfully via raw WebSocket');
        } catch (error) {
          console.error('❌ DEBUG: Error sending message:', error);
        }
      } else {
        console.warn('❌ DEBUG: Terminal not connected, cannot send input');
        console.warn('❌ DEBUG: ws.current exists:', !!ws.current);
        console.warn('❌ DEBUG: ws.current.readyState:', ws.current?.readyState);
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

  // Handle responsive resize with viewport correlation
  useEffect(() => {
    const handleResize = () => {
      if (fitAddon.current && terminal.current) {
        // Get new responsive dimensions
        const newDimensions = getResponsiveTerminalDimensions();
        const validation = validateClaudeCliSupport(newDimensions.cols);
        
        console.log('📏 DEBUG: Viewport resize detected:', newDimensions);
        console.log('📏 DEBUG: Claude CLI validation after resize:', validation);
        
        // Update terminal dimensions state
        setTerminalDimensions(newDimensions);
        
        // Fit terminal to new container size
        fitAddon.current.fit();
        
        // Send new dimensions to server
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          const resizeMessage = {
            type: 'resize',
            cols: terminal.current.cols,
            rows: terminal.current.rows,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
              cascadePrevention: validation.canHandle
            }
          };
          console.log('📏 DEBUG: Sending responsive resize message:', resizeMessage);
          (ws.current as WebSocket).send(JSON.stringify(resizeMessage));
        } else {
          console.warn('📏 DEBUG: Cannot send resize - not connected');
        }
        
        // Show cascade prevention status update
        if (terminal.current) {
          if (validation.canHandle) {
            terminal.current.writeln('\x1b[32m✅ Viewport resized - Claude CLI cascade prevention maintained\x1b[0m');
          } else {
            terminal.current.writeln(`\x1b[33m⚠️  Viewport resized - cascade risk: ${validation.cascadeRisk}\x1b[0m`);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Set up ResizeObserver for more precise container resize detection
    if (terminalRef.current) {
      resizeObserver.current = createTerminalResizeObserver(
        (dimensions) => {
          console.log('📏 DEBUG: Container resize observed:', dimensions);
          setTerminalDimensions(dimensions);
        }
      );
      resizeObserver.current.observe(terminalRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
        resizeObserver.current = null;
      }
    };
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

  // Get current cascade prevention status for CSS classes
  const validation = validateClaudeCliSupport(terminalDimensions.cols);
  const cascadeStatusClass = validation.canHandle 
    ? 'cascade-safe' 
    : validation.cascadeRisk === 'high' 
      ? 'cascade-risk' 
      : 'cascade-warning';

  return (
    <div className={`terminal-container terminal-wrapper ${cascadeStatusClass}`}>
      {/* Terminal Header */}
      <div className="terminal-header">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium">Claude Terminal</span>
          {cascadeDetected && (
            <span className="ml-2 px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded">
              🔄 Auto-Expanding
            </span>
          )}
          {processStatus.pid && (
            <span className="text-gray-400 text-sm">PID: {processStatus.pid}</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-400 text-xs">
            {optimalDimensions.cols}×{optimalDimensions.rows}
          </span>
          <span className={`text-sm ${getConnectionStatusColor()}`}>
            {getConnectionStatusText()}
          </span>
          <span className="text-gray-400 text-sm">
            {terminalDimensions.cols}×{terminalDimensions.rows}
          </span>
          <span className={`text-xs ${
            validateClaudeCliSupport(terminalDimensions.cols).canHandle 
              ? 'text-green-400' 
              : 'text-yellow-400'
          }`} title="Claude CLI cascade prevention status">
            {validateClaudeCliSupport(terminalDimensions.cols).canHandle ? '✅' : '⚠️'}
          </span>
          {error && (
            <span className="text-red-400 text-sm" title={error}>
              ⚠️
            </span>
          )}
        </div>
      </div>

      {/* Terminal Container */}
      <div className="terminal-responsive">
        <div 
          ref={terminalRef} 
          className="terminal-content terminal-font-responsive"
        />
      </div>

      {/* Terminal Footer */}
      <div className="terminal-footer">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Working Directory: /workspaces/agent-feed/prod</span>
          <div className="flex items-center space-x-4">
            <span>Ctrl+C: Interrupt</span>
            <span>Ctrl+D: Exit</span>
            {cascadeDetected && (
              <span className="text-yellow-400">⚠️ Cascade Prevention Active</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};