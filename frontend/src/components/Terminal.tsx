import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import 'xterm/css/xterm.css';
import { useWebSocketTerminal } from '../hooks/useWebSocketTerminal';
import { ToolCallFormatter } from '../utils/tool-call-formatter';
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

interface LoadingAnimationState {
  isActive: boolean;
  message: string;
  startTime: number;
}

interface PermissionRequestState {
  isActive: boolean;
  message: string;
  requestId: string;
}

export const TerminalComponent: React.FC<TerminalProps> = ({ 
  isVisible, 
  processStatus,
  initialCommand 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  // SWARM RESOLUTION: Remove raw WebSocket - use hook-managed connections only
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [lastCommand, setLastCommand] = useState<string>('');
  const [cascadeDetected, setCascadeDetected] = useState<boolean>(false);
  const [optimalDimensions, setOptimalDimensions] = useState<{ cols: number; rows: number }>({ cols: 80, rows: 24 });
  const [terminalDimensions, setTerminalDimensions] = useState(() => getResponsiveTerminalDimensions());
  const [loadingAnimation, setLoadingAnimation] = useState<LoadingAnimationState>({ 
    isActive: false, 
    message: '', 
    startTime: 0 
  });
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequestState>({
    isActive: false,
    message: '',
    requestId: ''
  });
  const resizeObserver = useRef<ResizeObserver | null>(null);
  // SWARM RESOLUTION: Hook already declared above with unified configuration

  // SWARM RESOLUTION: Setup unified WebSocket event handlers
  useEffect(() => {
    if (!terminal.current) return;
    
    // Handle WebSocket messages from backend
    const handleMessage = (data: any) => {
      console.log('📨 SWARM: WebSocket message received:', data);
      
      if (data.type === 'data' && terminal.current) {
        // Format and display terminal output
        const formattedData = ToolCallFormatter.formatOutputWithToolCalls(data.data);
        terminal.current.write(formattedData);
        setTerminalOutput(prev => prev + data.data);
      } else if (data.type === 'error') {
        console.error('📨 SWARM: Error message:', data);
        if (terminal.current) {
          terminal.current.writeln(`\x1b[31m❌ Error: ${data.error || data.message}\x1b[0m`);
        }
        setError(data.error || data.message);
      }
    };
    
    const handleLoading = (data: any) => {
      console.log('✨ SWARM: Loading animation:', data);
      setLoadingAnimation({
        isActive: !data.isComplete,
        message: data.message,
        startTime: data.isComplete ? 0 : Date.now()
      });
      
      if (terminal.current) {
        if (data.isComplete) {
          terminal.current.writeln(`\x1b[32m✅ ${data.message}\x1b[0m`);
        } else {
          terminal.current.write(`\r\x1b[K\x1b[35m${data.message}\x1b[0m`);
        }
      }
    };
    
    const handlePermissionRequest = (data: any) => {
      console.log('🔐 SWARM: Permission request:', data);
      setPermissionRequest({
        isActive: true,
        message: data.message,
        requestId: data.requestId
      });
      
      if (terminal.current) {
        terminal.current.writeln(`\r\n\x1b[33m🔐 PERMISSION REQUIRED:\x1b[0m`);
        terminal.current.writeln(`\x1b[36m${data.message}\x1b[0m`);
        terminal.current.writeln(`\x1b[32mPress 'y' for Yes, 'n' for No, 'd' for Ask Differently\x1b[0m`);
        terminal.current.write('\x1b[33m> \x1b[0m');
      }
    };

    const handleConnect = (data: any) => {
      console.log('✅ SWARM: WebSocket connected:', data);
      setConnectionStatus('connected');
      if (terminal.current) {
        terminal.current.writeln('\x1b[32m✅ Connected via Unified WebSocket Manager (SWARM RESOLVED)\x1b[0m');
      }
    };

    const handleDisconnect = (data: any) => {
      console.log('❌ SWARM: WebSocket disconnected:', data);
      setConnectionStatus('disconnected');
      if (terminal.current) {
        terminal.current.writeln('\x1b[33m⚠️ WebSocket Disconnected\x1b[0m');
      }
    };
    
    // Register all event handlers with unified WebSocket hook
    addHandler('message', handleMessage);
    addHandler('loading', handleLoading);
    addHandler('permission_request', handlePermissionRequest);
    addHandler('connect', handleConnect);
    addHandler('disconnect', handleDisconnect);
    
    return () => {
      removeHandler('message', handleMessage);
      removeHandler('loading', handleLoading);
      removeHandler('permission_request', handlePermissionRequest);
      removeHandler('connect', handleConnect);  
      removeHandler('disconnect', handleDisconnect);
    };
  }, [addHandler, removeHandler]);
  
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
      terminal.current.writeln('\x1b[1;32m🚀 Claude Code Terminal (Enhanced with Loading & Permissions)\x1b[0m');
      terminal.current.writeln('\x1b[2mConnecting to Claude process...\x1b[0m');
      terminal.current.writeln(`\x1b[36mℹ️  Terminal: ${dimensions.cols}×${dimensions.rows} (${breakpointConfig.name})\x1b[0m`);
      
      // Show Claude CLI cascade prevention status
      if (validation.canHandle) {
        terminal.current.writeln('\x1b[32m✅ Claude CLI cascade prevention: ACTIVE\x1b[0m');
      } else {
        terminal.current.writeln(`\x1b[33m⚠️  Claude CLI cascade risk: ${validation.cascadeRisk.toUpperCase()}\x1b[0m`);
        terminal.current.writeln(`\x1b[33m💡 ${validation.recommendation}\x1b[0m`);
      }
      
      terminal.current.writeln('\x1b[35m✨ Enhanced Features: Loading animations & Permission handling\x1b[0m');
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

  // SWARM RESOLUTION: Replace raw WebSocket with hook-managed connection
  const connectWebSocket = useCallback(async () => {
    if (!terminal.current || connectionState.isConnected) return;

    setConnectionStatus('connecting');  
    setError(null);

    try {
      // Use unified WebSocket hook instead of raw WebSocket
      console.log('🔧 SWARM FIX: Using hook-managed WebSocket connection');
      const instanceId = `claude-terminal-${Date.now()}`;
      await connectToInstance(instanceId);

      // Connection success handled by useWebSocketTerminal hook
      setConnectionStatus('connected');
      terminal.current?.writeln('\x1b[32m✅ Connected via Unified WebSocket Manager (SWARM RESOLVED)\x1b[0m');
      terminal.current?.writeln('\x1b[33m🔍 SWARM: Single WebSocket connection established\x1b[0m');
      
      // Execute initial command if provided
      if (initialCommand) {
        setTimeout(async () => {
          try {
            await sendCommand(instanceId, initialCommand);
            console.log('📝 SWARM: Sent initial command via hook:', initialCommand);
            if (terminal.current) {
              terminal.current.write(`\x1b[33m➜ Auto-executing: ${initialCommand}\x1b[0m\r\n`);
            }
          } catch (error) {
            console.error('❌ SWARM: Failed to send initial command:', error);
          }
        }, 500);
      }
      
      // Focus terminal after connection
      setTimeout(() => {
        if (terminal.current) {
          console.log('🔍 SWARM: Focusing terminal after connection');
          terminal.current.focus();
        }
      }, 100);

      // Message handling moved to useWebSocketTerminal hook event handlers
      // SWARM RESOLUTION: Unified message processing

      // Error handling and reconnection managed by useWebSocketTerminal hook
      // SWARM RESOLUTION: Centralized error management

    } catch (error) {
      setError('Failed to connect via WebSocket hook');
      setConnectionStatus('disconnected');
      console.error('SWARM: WebSocket hook connection error:', error);
    }
  }, [processStatus.pid, processStatus.isRunning, connectToInstance, sendCommand]);

  // Handle permission response input
  const handlePermissionResponse = useCallback((response: string) => {
    if (!permissionRequest.isActive) return false;
    
    const normalizedResponse = response.toLowerCase().trim();
    let action = '';
    
    switch (normalizedResponse) {
      case 'y':
      case 'yes':
        action = 'yes';
        break;
      case 'n':
      case 'no':
        action = 'no';
        break;
      case 'd':
      case 'different':
      case 'ask differently':
        action = 'ask_differently';
        break;
      default:
        return false; // Not a valid permission response
    }
    
    // SWARM RESOLUTION: Send permission response via WebSocket hook
    if (connectionState.isConnected && connectionState.instanceId) {
      const message = {
        type: 'permission_response',
        requestId: permissionRequest.requestId,
        action: action,
        timestamp: Date.now()
      };
      console.log('📝 SWARM: Sending permission response via hook:', message);
      try {
        sendCommand(connectionState.instanceId, JSON.stringify(message));
      } catch (error) {
        console.error('❌ SWARM: Error sending permission response:', error);
      }
    }
    
    // Clear permission state
    setPermissionRequest({ isActive: false, message: '', requestId: '' });
    
    if (terminal.current) {
      terminal.current.writeln(`\r\n\x1b[32m✅ Response sent: ${action}\x1b[0m`);
    }
    
    return true; // Handled as permission response
  }, [permissionRequest]);
  
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
      
      // Check if this is a permission response
      if (permissionRequest.isActive && (data === '\r' || data === '\n')) {
        // For Enter key, we need to get the current input - in real terminal we'd track this
        // For now, let's handle single-char responses
        return; // Let normal flow handle it
      }
      
      if (permissionRequest.isActive && data.length === 1 && ['y', 'n', 'd', 'Y', 'N', 'D'].includes(data)) {
        if (handlePermissionResponse(data)) {
          if (terminal.current) {
            terminal.current.write(data); // Echo the character
          }
          return; // Don't send to backend as command
        }
      }
      
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
      
      console.log('🔍 SWARM: Connection state:', connectionState.isConnected);
      console.log('🔍 SWARM: Instance ID:', connectionState.instanceId);
      console.log('🔍 SWARM: Using unified WebSocket hook for message sending');
      
      // SPARC ARCHITECTURE: Terminal input now handled by useWebSocketTerminal hook
      console.log('📝 SPARC: Input handling delegated to useWebSocketTerminal hook:', JSON.stringify(data));
      
      // Use the hook's sendCommand method for input
      if (data === '\r' || data === '\n') {
        if (lastCommand.trim()) {
          sendCommand('terminal-instance', lastCommand).catch(error => {
            console.error('❌ SPARC: Failed to send command via hook:', error);
          });
          setLastCommand('');
        }
      } else if (data !== '\b' && data !== '\x7f') {
        setLastCommand(prev => prev + data);
      } else {
        setLastCommand(prev => prev.slice(0, -1));
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
  }, [connectionStatus, permissionRequest.isActive, handlePermissionResponse]); // Add connectionStatus as dependency

  // SWARM RESOLUTION: Connect/disconnect based on process status using hook
  useEffect(() => {
    if (processStatus.isRunning && isVisible) {
      connectWebSocket();
    } else {
      if (connectionState.instanceId) {
        disconnectFromInstance(connectionState.instanceId);
      }
      setConnectionStatus('disconnected');
    }
  }, [processStatus.isRunning, isVisible, connectWebSocket, connectionState.instanceId, disconnectFromInstance]);

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
        // SPARC ARCHITECTURE: Resize handling moved to useWebSocketTerminal hook
        console.log('📏 SPARC: Resize handling delegated to useWebSocketTerminal hook');
        
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
          {loadingAnimation.isActive && (
            <span className="ml-2 px-2 py-1 bg-purple-600 text-purple-100 text-xs rounded flex items-center space-x-1">
              <span className="animate-spin">✨</span>
              <span>Loading...</span>
            </span>
          )}
          {permissionRequest.isActive && (
            <span className="ml-2 px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded flex items-center space-x-1">
              <span>🔐</span>
              <span>Permission Required</span>
            </span>
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

      {/* Loading Animation Overlay */}
      {loadingAnimation.isActive && (
        <div className="absolute top-16 left-4 right-4 bg-purple-900/80 text-purple-100 px-4 py-2 rounded-lg border border-purple-500 z-10">
          <div className="flex items-center space-x-2">
            <div className="animate-spin text-purple-300">✨</div>
            <span className="text-sm font-medium">{loadingAnimation.message}</span>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-purple-300 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-purple-300 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-1 h-1 bg-purple-300 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Permission Request Dialog */}
      {permissionRequest.isActive && (
        <div className="absolute top-20 left-4 right-4 bg-yellow-900/90 text-yellow-100 px-4 py-3 rounded-lg border border-yellow-500 z-20">
          <div className="flex items-start space-x-3">
            <div className="text-yellow-400 text-lg">🔐</div>
            <div className="flex-1">
              <div className="font-medium text-yellow-200 mb-1">Permission Required</div>
              <div className="text-sm mb-3">{permissionRequest.message}</div>
              <div className="flex space-x-2 text-xs">
                <kbd className="px-2 py-1 bg-green-700 text-green-100 rounded">Y</kbd>
                <span className="text-green-300">Yes</span>
                <kbd className="px-2 py-1 bg-red-700 text-red-100 rounded">N</kbd>
                <span className="text-red-300">No</span>
                <kbd className="px-2 py-1 bg-blue-700 text-blue-100 rounded">D</kbd>
                <span className="text-blue-300">Ask Differently</span>
              </div>
            </div>
          </div>
        </div>
      )}

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