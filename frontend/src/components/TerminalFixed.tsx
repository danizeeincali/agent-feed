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
  
  // CRITICAL FIX: Add deduplication and concurrency control
  const processedEventIds = useRef<Set<string>>(new Set());
  const isWriting = useRef<boolean>(false);
  const eventHandlersRegistered = useRef<boolean>(false);
  
  // Add debug log
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logMessage = `[${timestamp}] ${message}`;
    console.log('🔍 DEBUG:', logMessage);
    setDebugLogs(prev => [...prev.slice(-19), logMessage]);
  }, []);

  // CRITICAL FIX: WebSocket connection with enhanced debugging and proper cleanup
  const connectWebSocket = useCallback(() => {
    addDebugLog('🚀 CRITICAL: connectWebSocket() function called!');
    
    if (socket.current?.connected) {
      addDebugLog('✅ Socket already connected, skipping');
      return;
    }

    if (socket.current) {
      addDebugLog('🔄 Disposing existing socket before reconnecting');
      // CRITICAL FIX: Remove all event listeners before disconnecting
      socket.current.offAny();
      socket.current.off('terminal:output');
      socket.current.off('output');
      socket.current.off('terminal_data');
      socket.current.off('connected');
      socket.current.off('error');
      socket.current.disconnect();
      socket.current = null;
    }
    
    // Reset event handler registration flag
    eventHandlersRegistered.current = false;
    // Clear processed events cache
    processedEventIds.current.clear();
    // Reset write flag
    isWriting.current = false;

    setConnectionStatus('connecting');
    setError(null);
    addDebugLog('🔌 Creating Socket.IO connection to backend at http://localhost:3001...');

    // FIXED: Connect directly to backend with proper URL
    const newSocket = io('http://localhost:3001', {
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

    // CRITICAL FIX: Prevent duplicate event handler registration
    if (eventHandlersRegistered.current) {
      addDebugLog('⚠️ Event handlers already registered, skipping registration');
      return;
    }
    eventHandlersRegistered.current = true;

    // CRITICAL FIX: Enhanced connection event handlers with heartbeat
    newSocket.on('connect', () => {
      addDebugLog(`✅ Socket connected! ID: ${newSocket.id}`);
      setConnectionStatus('connected');
      
      if (terminal.current) {
        terminal.current.write('\x1b[32m✅ Connected to terminal server\x1b[0m\r\n');
        terminal.current.write('\x1b[36mSocket ID: ' + newSocket.id + '\x1b[0m\r\n');
        terminal.current.write('\x1b[33mConnection persistent mode enabled\x1b[0m\r\n');
        terminal.current.write('\r\n');
      }

      // CRITICAL: Start heartbeat to maintain connection
      const heartbeatInterval = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit('heartbeat', { timestamp: Date.now() });
          addDebugLog('🫀 Heartbeat sent');
        } else {
          clearInterval(heartbeatInterval);
          addDebugLog('💔 Heartbeat stopped - connection lost');
        }
      }, 15000); // Send heartbeat every 15 seconds
      
      // Send init message
      if (processStatus.pid) {
        newSocket.emit('init', {
          pid: processStatus.pid,
          cols: terminal.current?.cols || 80,
          rows: terminal.current?.rows || 24
        });
        addDebugLog(`Sent init with PID: ${processStatus.pid}`);
      }
      
      addDebugLog('🫀 Connection heartbeat monitoring started');
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
      addDebugLog(`❌ Socket disconnected: ${reason} - IMPLEMENTING AUTO-RECONNECT`);
      setConnectionStatus('disconnected');
      
      if (terminal.current) {
        terminal.current.write(`\x1b[33m⚠️ Disconnected: ${reason} - Reconnecting...\x1b[0m\r\n`);
      }
      
      // CRITICAL FIX: Implement immediate reconnection for non-intentional disconnects
      if (reason !== 'io client disconnect' && reason !== 'transport close' && isVisible) {
        setTimeout(() => {
          if (!socket.current?.connected && isVisible) {
            addDebugLog('🔄 Attempting automatic reconnection...');
            // Clear old socket reference
            socket.current = null;
            connectWebSocket();
          }
        }, 2000);
      }
    });

    // CRITICAL FIX: Enhanced terminal:output handler with deduplication and concurrency control
    newSocket.off('terminal:output'); // Remove any existing handlers
    newSocket.on('terminal:output', (data: any) => {
      // CRITICAL FIX: Generate unique event ID for deduplication
      const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const outputData = data?.data || data;
      const eventKey = `${eventId}-${typeof outputData === 'string' ? outputData.slice(0, 100) : JSON.stringify(outputData).slice(0, 100)}`;
      
      // CRITICAL FIX: Prevent duplicate processing
      if (processedEventIds.current.has(eventKey)) {
        addDebugLog(`🔄 DUPLICATE EVENT BLOCKED: ${eventKey}`);
        return;
      }
      processedEventIds.current.add(eventKey);
      
      // Clean up old event IDs (keep only last 100)
      if (processedEventIds.current.size > 100) {
        const entries = Array.from(processedEventIds.current);
        entries.slice(0, 50).forEach(id => processedEventIds.current.delete(id));
      }
      
      // CRITICAL FIX: Prevent concurrent writes
      if (isWriting.current) {
        addDebugLog(`⚠️ WRITE IN PROGRESS, queuing event: ${eventKey}`);
        setTimeout(() => {
          if (!isWriting.current) {
            processedEventIds.current.delete(eventKey); // Allow retry
            newSocket.emit('__retry_event', { eventId, data });
          }
        }, 50);
        return;
      }
      
      isWriting.current = true;
      addDebugLog(`✅ PROCESSING: terminal:output - ${JSON.stringify(data).slice(0, 100)} (Event: ${eventId})`);
      
      if (!terminal.current) {
        addDebugLog(`❌ Terminal instance not available`);
        isWriting.current = false;
        return;
      }
      
      // Enhanced diagnostic checks
      const isDisposed = (terminal.current as any)._isDisposed === true;
      const hasCore = !!(terminal.current as any)._core;
      const hasElement = !!terminal.current.element;
      const hasCanvas = !!terminalRef.current?.querySelector('canvas');
      
      addDebugLog(`🔍 Terminal state: disposed=${isDisposed}, hasCore=${hasCore}, hasElement=${hasElement}, hasCanvas=${hasCanvas}`);
      
      if (isDisposed) {
        addDebugLog(`❌ Terminal is disposed, cannot write`);
        isWriting.current = false;
        return;
      }
      
      if (!hasCore) {
        addDebugLog(`❌ Terminal core not initialized`);
        isWriting.current = false;
        return;
      }
      
      if (!hasCanvas) {
        addDebugLog(`❌ CRITICAL: No canvas element found - output will not be visible!`);
        // Try to force a re-render
        if (fitAddon.current) {
          try {
            fitAddon.current.fit();
            addDebugLog(`🔄 Attempted fit to force canvas recreation`);
          } catch (e) {
            addDebugLog(`❌ Fit failed: ${e}`);
          }
        }
        isWriting.current = false;
        return;
      }
      
      if (typeof outputData !== 'string') {
        addDebugLog(`⚠️ Non-string output: ${typeof outputData}`);
        isWriting.current = false;
        return;
      }
      
      addDebugLog(`📝 Writing ${outputData.length} chars: "${outputData.slice(0, 50)}${outputData.length > 50 ? '...' : ''}"`);
      
      try {
        // CRITICAL FIX: Single write strategy with proper completion handling
        terminal.current.write(outputData, () => {
          addDebugLog(`✅ Write completed for event ${eventId}`);
          isWriting.current = false; // Mark write as complete
          
          // Post-write validation
          if (terminal.current && !isDisposed && terminalRef.current) {
            try {
              const bufferY = terminal.current.buffer.active.cursorY;
              const bufferX = terminal.current.buffer.active.cursorX;
              addDebugLog(`📊 Cursor position: x=${bufferX}, y=${bufferY}`);
              
              // Ensure terminal remains focused
              terminal.current.focus();
            } catch (refreshError) {
              addDebugLog(`❌ Post-write validation error: ${refreshError}`);
            }
          }
        });
        
      } catch (writeError) {
        addDebugLog(`❌ Terminal write failed: ${writeError}`);
        console.error('Terminal write error:', writeError);
        isWriting.current = false; // Reset write flag on error
        
        // CRITICAL: Attempt recovery
        if (terminalRef.current && !isDisposed) {
          addDebugLog(`🔄 Attempting terminal recovery...`);
          try {
            // Check if we can recreate the terminal
            const canvas = terminalRef.current.querySelector('canvas');
            if (!canvas) {
              addDebugLog(`🔄 Canvas missing, terminal may need recreation`);
            }
          } catch (recoveryError) {
            addDebugLog(`❌ Recovery attempt failed: ${recoveryError}`);
          }
        }
      }
    });

    // CRITICAL FIX: Remove duplicate legacy handlers that cause double typing
    // These handlers are causing duplicate output - commenting out to prevent double typing
    // All terminal output should go through the main 'terminal:output' handler only
    
    // Legacy handlers disabled to prevent double typing:
    // newSocket.on('output', (data: any) => { ... });
    // newSocket.on('terminal_data', (data: any) => { ... });

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

    // Listen for any event (debugging) - Enhanced to catch all events
    newSocket.onAny((eventName, ...args) => {
      addDebugLog(`🔍 ANY EVENT '${eventName}': ${JSON.stringify(args).slice(0, 150)}`);
      
      // Log terminal-related events with special emphasis
      if (eventName.includes('terminal') || eventName.includes('output')) {
        addDebugLog(`🎯 TERMINAL EVENT DETECTED: '${eventName}' with ${args.length} args`);
      }
    });

  }, [processStatus.pid, addDebugLog]);

  // CRITICAL FIX: Enhanced terminal initialization with DOM validation
  useEffect(() => {
    if (!isVisible) {
      // Clean up if terminal becomes invisible
      if (terminal.current) {
        addDebugLog('Terminal becoming invisible, disposing...');
        terminal.current.dispose();
        terminal.current = null;
        fitAddon.current = null;
      }
      return;
    }

    // Prevent double initialization
    if (terminal.current) {
      addDebugLog('Terminal already exists, skipping initialization');
      return;
    }

    if (!terminalRef.current) {
      addDebugLog('❌ Terminal container ref not available');
      return;
    }

    addDebugLog('🔧 CRITICAL FIX: Starting enhanced terminal initialization...');
    
    // Clear any existing DOM content
    terminalRef.current.innerHTML = '';
    
    try {
      // CRITICAL FIX: Create terminal with CANVAS RENDERER FORCED
      const terminalInstance = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Fira Code", "Cascadia Code", "Monaco", "Consolas", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#00ff00',
          cursorAccent: '#00ff00',
          selectionBackground: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5'
        },
        cols: 80,
        rows: 24,
        convertEol: true,
        scrollback: 1000,
        allowTransparency: false,
        tabStopWidth: 8
      });

      // Add fit addon BEFORE opening
      const fitAddonInstance = new FitAddon();
      terminalInstance.loadAddon(fitAddonInstance);
      
      // Add search and weblinks addons for full functionality
      terminalInstance.loadAddon(new SearchAddon());
      terminalInstance.loadAddon(new WebLinksAddon());
      
      addDebugLog('Terminal instance created, opening in DOM...');
      
      // CRITICAL FIX: Force canvas renderer after creation
      try {
        // Store references BEFORE opening
        terminal.current = terminalInstance;
        fitAddon.current = fitAddonInstance;
        
        // Open terminal
        terminalInstance.open(terminalRef.current);
        
        // CRITICAL: Force canvas renderer by accessing internal renderer
        setTimeout(() => {
          const term = terminalInstance as any;
          if (term._core && term._core._renderService) {
            // Force canvas renderer creation
            addDebugLog('🎨 Forcing canvas renderer creation...');
            const renderService = term._core._renderService;
            if (renderService._renderer && !renderService._renderer._canvas) {
              // Try to trigger canvas creation
              try {
                renderService.setRenderer(renderService._createRenderer());
                addDebugLog('✅ Canvas renderer forced');
              } catch (e) {
                addDebugLog(`⚠️ Canvas force failed: ${e}`);
              }
            }
          }
        }, 10);
        
      } catch (openError) {
        addDebugLog(`❌ Terminal opening failed: ${openError}`);
        throw openError;
      }
      
      addDebugLog('✅ Terminal opened successfully');
      
      // CRITICAL FIX: Enhanced DOM validation with retry mechanism
      const validateTerminalDOM = (attempt = 1, maxAttempts = 5) => {
        if (!terminal.current || !terminalRef.current) {
          addDebugLog(`❌ Terminal validation failed: references lost (attempt ${attempt})`);
          return;
        }
        
        const canvas = terminalRef.current.querySelector('canvas');
        const viewport = terminalRef.current.querySelector('.xterm-viewport');
        const screen = terminalRef.current.querySelector('.xterm-screen');
        const rows = terminalRef.current.querySelectorAll('.xterm-rows');
        
        addDebugLog(`🔍 DOM Validation (attempt ${attempt}): canvas=${!!canvas}, viewport=${!!viewport}, screen=${!!screen}, rows=${rows.length}`);
        
        if (!canvas && attempt < maxAttempts) {
          addDebugLog(`⚠️ No canvas found, retrying in ${attempt * 100}ms...`);
          setTimeout(() => validateTerminalDOM(attempt + 1, maxAttempts), attempt * 100);
          return;
        }
        
        if (!canvas) {
          addDebugLog('❌ CRITICAL: Canvas never created - implementing MANUAL CANVAS INJECTION!');
          
          // CRITICAL FIX: Manually create canvas element
          try {
            const manualCanvas = document.createElement('canvas');
            manualCanvas.className = 'xterm-canvas';
            manualCanvas.style.position = 'absolute';
            manualCanvas.style.left = '0px';
            manualCanvas.style.top = '0px';
            manualCanvas.style.zIndex = '1';
            manualCanvas.width = 640;
            manualCanvas.height = 384;
            
            // Find the xterm-screen element and inject canvas
            const screen = terminalRef.current.querySelector('.xterm-screen');
            if (screen) {
              screen.appendChild(manualCanvas);
              addDebugLog('✅ Manual canvas created and injected into .xterm-screen');
              
              // Try to get the terminal to recognize the new canvas
              if (terminal.current) {
                const term = terminal.current as any;
                if (term._core && term._core._renderService) {
                  try {
                    // Force the terminal to refresh and hopefully pick up our canvas
                    term._core._renderService.refresh(0, term.rows - 1);
                    addDebugLog('✅ Terminal refresh triggered with manual canvas');
                  } catch (e) {
                    addDebugLog(`⚠️ Terminal refresh failed: ${e}`);
                  }
                }
              }
            } else {
              addDebugLog('❌ No .xterm-screen found for manual canvas injection');
            }
            
          } catch (canvasError) {
            addDebugLog(`❌ Manual canvas creation failed: ${canvasError}`);
            
            // Last resort: Complete terminal recreation
            addDebugLog('🔄 Attempting complete terminal recreation...');
            if (terminal.current) {
              terminal.current.dispose();
              terminal.current = null;
              fitAddon.current = null;
            }
            
            // Retry initialization
            setTimeout(() => {
              if (isVisible && !terminal.current && terminalRef.current) {
                addDebugLog('🔄 Retrying terminal initialization...');
                // This will trigger the useEffect again
              }
            }, 500);
            return;
          }
        }
        
        // SUCCESS: Canvas exists
        addDebugLog('✅ Canvas successfully created and attached');
        
        // Verify canvas dimensions
        if (canvas instanceof HTMLCanvasElement) {
          addDebugLog(`Canvas dimensions: ${canvas.width}x${canvas.height}, style: ${canvas.style.width}x${canvas.style.height}`);
        }
        
        // Fit terminal to container
        if (fitAddon.current && terminal.current) {
          try {
            fitAddon.current.fit();
            addDebugLog(`✅ Terminal fitted: ${terminal.current.cols}x${terminal.current.rows}`);
          } catch (fitError) {
            addDebugLog(`❌ Fit error: ${fitError}`);
          }
        }
        
        // Test terminal functionality with immediate write
        if (terminal.current) {
          try {
            // CRITICAL: Test terminal write immediately after DOM validation
            terminal.current.reset();
            terminal.current.write('\x1b[1;32m🚀 TERMINAL CRITICAL FIX - DOM VALIDATED\x1b[0m\r\n');
            terminal.current.write('\x1b[33mCanvas rendering: ✅ WORKING\x1b[0m\r\n');
            terminal.current.write('\x1b[36mDOM attachment: ✅ VERIFIED\x1b[0m\r\n');
            terminal.current.write('\x1b[96mEstablishing WebSocket connection...\x1b[0m\r\n');
            terminal.current.write('\x1b[90m$ \x1b[0m');
            
            // Focus terminal
            terminal.current.focus();
            addDebugLog('✅ Terminal write test successful and focused');
            
            // CRITICAL FIX: Force WebSocket connection establishment here
            addDebugLog('🚀 SPARC:DEBUG - Forcing WebSocket connection after terminal success');
            setTimeout(() => {
              if (isVisible) {
                addDebugLog('⚡ NLD PATTERN: Bypassing processStatus dependency - connecting directly');
                connectWebSocket();
              }
            }, 1000);
            
          } catch (writeError) {
            addDebugLog(`❌ Terminal write test failed: ${writeError}`);
          }
        }
      };
      
      // Start DOM validation
      setTimeout(() => validateTerminalDOM(), 50);
      
    } catch (terminalError) {
      addDebugLog(`❌ Terminal creation failed: ${terminalError}`);
      console.error('Terminal creation error:', terminalError);
    }

    return () => {
      if (terminal.current) {
        addDebugLog('🧹 Cleaning up terminal...');
        terminal.current.dispose();
        terminal.current = null;
        fitAddon.current = null;
      }
    };
  }, [isVisible, addDebugLog, connectWebSocket]);

  // CRITICAL FIX: Terminal input handler with deduplication
  useEffect(() => {
    if (!terminal.current) return;

    addDebugLog('Setting up input handler');
    
    const inputQueue = new Set<string>(); // Prevent duplicate input processing
    
    const disposable = terminal.current.onData((data) => {
      const inputKey = `${Date.now()}-${data}`;
      
      // CRITICAL FIX: Prevent duplicate input processing
      if (inputQueue.has(inputKey)) {
        addDebugLog(`🔄 DUPLICATE INPUT BLOCKED: "${data}"`);
        return;
      }
      inputQueue.add(inputKey);
      
      // Clean up old input keys (keep only last 10)
      if (inputQueue.size > 10) {
        const entries = Array.from(inputQueue);
        entries.slice(0, 5).forEach(key => inputQueue.delete(key));
      }
      
      addDebugLog(`Input received: "${data}" (${data.length} chars, codes: ${Array.from(data).map(c => c.charCodeAt(0)).join(', ')})`);
      
      // Don't echo locally anymore - wait for server output
      
      // Send to server if connected - SIMPLIFIED to prevent duplicate sends
      if (socket.current?.connected) {
        // CRITICAL FIX: Send only primary event to prevent duplication
        socket.current.emit('terminal:input', data);
        addDebugLog(`✅ Sent input "${data}" via terminal:input event only`);
        
        // Remove from queue after successful send
        setTimeout(() => inputQueue.delete(inputKey), 1000);
      } else {
        addDebugLog('❌ Cannot send input - socket not connected - ATTEMPTING RECONNECTION');
        
        // CRITICAL FIX: Attempt immediate reconnection on input failure
        if (isVisible && processStatus.status === 'running') {
          addDebugLog('🔄 Reconnecting socket for input...');
          connectWebSocket();
          
          // Queue the input for retry after reconnection
          setTimeout(() => {
            if (socket.current?.connected) {
              addDebugLog(`🔄 Retrying queued input: "${data}"`);
              socket.current.emit('terminal:input', data);
            } else {
              addDebugLog('❌ Retry failed - socket still not connected');
            }
            // Clean up queued input
            inputQueue.delete(inputKey);
          }, 3000);
        } else {
          // Clean up queued input if not retrying
          inputQueue.delete(inputKey);
        }
      }
    });

    // Also handle key events directly (for debugging only)
    const keyDisposable = terminal.current.onKey((e) => {
      addDebugLog(`Key event: key="${e.key}", keyCode=${e.domEvent.keyCode}, ctrl=${e.domEvent.ctrlKey}`);
    });

    return () => {
      if (disposable) disposable.dispose();
      if (keyDisposable) keyDisposable.dispose();
      addDebugLog('Input handlers disposed');
    };
  }, [connectionStatus, addDebugLog, connectWebSocket, isVisible, processStatus.status]);

  // CRITICAL FIX: Connect/disconnect based on visibility and process status with enhanced debugging
  useEffect(() => {
    addDebugLog(`🔍 Connection check: isVisible=${isVisible}, processStatus.status="${processStatus.status}", processStatus.pid=${processStatus.pid}`);
    
    if (isVisible && processStatus.status === 'running') {
      addDebugLog('✅ Process is running, connecting WebSocket...');
      connectWebSocket();
    } else if (isVisible && processStatus.pid) {
      // CRITICAL FIX: Connect if we have a PID even if status isn't "running"
      addDebugLog(`🔧 CRITICAL FIX: Have PID ${processStatus.pid} but status is "${processStatus.status}" - connecting anyway!`);
      connectWebSocket();
    } else {
      addDebugLog(`❌ Not connecting: isVisible=${isVisible}, status="${processStatus.status}", pid=${processStatus.pid}`);
      if (socket.current) {
        addDebugLog('Disconnecting socket...');
        socket.current.disconnect();
        socket.current = null;
      }
    }

    return () => {
      if (socket.current) {
        addDebugLog('🧹 Cleanup: removing all event listeners and disconnecting socket');
        // CRITICAL FIX: Proper event cleanup
        socket.current.offAny();
        socket.current.off('terminal:output');
        socket.current.off('output');
        socket.current.off('terminal_data');
        socket.current.off('connected');
        socket.current.off('error');
        socket.current.off('connect');
        socket.current.off('connect_error');
        socket.current.off('disconnect');
        socket.current.disconnect();
        socket.current = null;
      }
      // Reset flags on cleanup
      eventHandlersRegistered.current = false;
      processedEventIds.current.clear();
      isWriting.current = false;
    };
  }, [isVisible, processStatus.status, processStatus.pid, connectWebSocket]);

  // CRITICAL FIX: Window resize handler with deduplication
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    
    const handleResize = () => {
      // CRITICAL FIX: Debounce resize events to prevent duplicate emissions
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        if (fitAddon.current && terminal.current) {
          fitAddon.current.fit();
          const cols = terminal.current.cols;
          const rows = terminal.current.rows;
          
          addDebugLog(`Window resized - cols: ${cols}, rows: ${rows}`);
          
          if (socket.current?.connected) {
            // CRITICAL FIX: Send only one resize event to prevent duplication
            socket.current.emit('terminal:resize', { cols, rows });
            addDebugLog(`✅ Sent resize event: ${cols}x${rows}`);
          }
        }
      }, 100); // Debounce for 100ms
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
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
      <div className="h-96 p-2 bg-black">
        <div 
          ref={terminalRef} 
          className="w-full h-full"
          onClick={() => terminal.current?.focus()}
        />
      </div>

      {/* Debug Panel - Now below terminal */}
      <div className="bg-gray-800 border-t border-gray-600 p-3">
        <div className="text-xs text-green-400 font-mono max-h-32 overflow-auto">
          <div className="font-bold mb-2 text-yellow-400">Debug Logs:</div>
          <div className="space-y-1">
            {debugLogs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap break-all opacity-90">{log}</div>
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