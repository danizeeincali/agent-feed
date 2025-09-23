import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import 'xterm/css/xterm.css';
import { useWebSocketTerminal } from '../hooks/useWebSocketTerminal';
import { ToolCallFormatter } from '../utils/tool-call-formatter';

interface TerminalProps {
  isVisible: boolean;
  processStatus: {
    isRunning: boolean;
    pid?: number;
    status: string;
  };
  initialCommand?: string;
  instanceId?: string;
}

export const TerminalUnified: React.FC<TerminalProps> = ({ 
  isVisible, 
  processStatus,
  initialCommand,
  instanceId = `unified-terminal-${Date.now()}`
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  
  // SPARC ARCHITECTURE: Single WebSocket manager - useWebSocketTerminal hook only
  const { 
    connectionState, 
    connectToInstance,
    disconnectFromInstance, 
    sendCommand, 
    addHandler, 
    removeHandler,
    config
  } = useWebSocketTerminal({
    url: 'ws://localhost:3000'
  });
  
  const [error, setError] = useState<string | null>(null);
  const [currentCommand, setCurrentCommand] = useState<string>('');
  const [loadingAnimation, setLoadingAnimation] = useState({ 
    isActive: false, 
    message: '', 
    startTime: 0 
  });
  const [permissionRequest, setPermissionRequest] = useState({
    isActive: false,
    message: '',
    requestId: ''
  });

  // Initialize terminal when visible
  useEffect(() => {
    if (!isVisible || terminal.current) return;

    if (terminalRef.current) {
      console.log('🚀 SPARC: Initializing unified terminal with single WebSocket manager');
      
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

      // Open terminal
      terminal.current.open(terminalRef.current);
      fitAddon.current.fit();

      // Welcome message
      terminal.current.writeln('\\x1b[1;32m🚀 SPARC Unified Terminal (Single WebSocket Manager)\\x1b[0m');
      terminal.current.writeln('\\x1b[2mConnecting via useWebSocketTerminal hook only...\\x1b[0m');
      terminal.current.writeln('\\x1b[35m✨ Enhanced: Loading animations & Permission handling\\x1b[0m');
      terminal.current.writeln('');
    }

    return () => {
      if (terminal.current) {
        terminal.current.dispose();
        terminal.current = null;
      }
    };
  }, [isVisible]);
  
  // SPARC REFINEMENT: WebSocket connection based on process status
  useEffect(() => {
    if (!processStatus.isRunning || !isVisible) {
      console.log('🔌 SPARC: Disconnecting - process not running or terminal not visible');
      disconnectFromInstance(instanceId);
      return;
    }
    
    console.log(`🔌 SPARC: Connecting to WebSocket terminal for instance: ${instanceId}`);
    connectToInstance(instanceId).then(() => {
      console.log('✅ SPARC: Successfully connected to WebSocket terminal');
    }).catch(error => {
      console.error('❌ SPARC: Failed to connect to terminal:', error);
      setError(`Connection failed: ${error.message}`);
    });
    
    return () => {
      console.log(`🔌 SPARC: Cleanup - disconnecting from instance: ${instanceId}`);
      disconnectFromInstance(instanceId);
    };
  }, [processStatus.isRunning, isVisible, instanceId, connectToInstance, disconnectFromInstance]);

  // SPARC ARCHITECTURE: Setup event handlers for all WebSocket messages
  useEffect(() => {
    console.log('📡 SPARC: Setting up unified WebSocket event handlers');
    
    // Handle regular terminal messages
    const handleMessage = (data: any) => {
      console.log('📨 SPARC: WebSocket message received:', data);
      
      if (data.type === 'data' && terminal.current) {
        const formattedData = ToolCallFormatter.formatOutputWithToolCalls(data.data);
        terminal.current.write(formattedData);
      } else if (data.type === 'error') {
        console.error('📨 SPARC: Error message:', data);
        if (terminal.current) {
          terminal.current.writeln(`\\x1b[31m❌ Error: ${data.error}\\x1b[0m`);
        }
        setError(data.error);
      }
    };
    
    // Handle loading animations
    const handleLoading = (data: any) => {
      console.log('✨ SPARC: Loading animation:', data);
      setLoadingAnimation({
        isActive: !data.isComplete,
        message: data.message,
        startTime: data.isComplete ? 0 : Date.now()
      });
      
      if (terminal.current) {
        if (data.isComplete) {
          terminal.current.writeln(`\\x1b[32m✅ ${data.message}\\x1b[0m`);
        } else {
          terminal.current.write(`\\r\\x1b[K\\x1b[35m${data.message}\\x1b[0m`);
        }
      }
    };
    
    // Handle permission requests
    const handlePermissionRequest = (data: any) => {
      console.log('🔐 SPARC: Permission request:', data);
      setPermissionRequest({
        isActive: true,
        message: data.message,
        requestId: data.requestId
      });
      
      if (terminal.current) {
        terminal.current.writeln(`\\r\\n\\x1b[33m🔐 PERMISSION REQUIRED:\\x1b[0m`);
        terminal.current.writeln(`\\x1b[36m${data.message}\\x1b[0m`);
        terminal.current.writeln(`\\x1b[32mPress 'y' for Yes, 'n' for No, 'd' for Ask Differently\\x1b[0m`);
        terminal.current.write('\\x1b[33m> \\x1b[0m');
      }
    };
    
    // Handle connection state changes
    const handleConnect = (data: any) => {
      console.log('✅ SPARC: WebSocket connected:', data);
      if (terminal.current) {
        terminal.current.writeln('\\x1b[32m✅ SPARC WebSocket Connected (Unified)\\x1b[0m');
        terminal.current.writeln('\\x1b[33m🔍 Ready for input - start typing!\\x1b[0m');
        
        // Execute initial command if provided
        if (initialCommand) {
          setTimeout(() => {
            console.log('📝 SPARC: Executing initial command:', initialCommand);
            sendCommand(instanceId, initialCommand).catch(error => {
              console.error('❌ SPARC: Failed to send initial command:', error);
            });
          }, 500);
        }
      }
    };
    
    const handleDisconnect = (data: any) => {
      console.log('❌ SPARC: WebSocket disconnected:', data);
      if (terminal.current) {
        terminal.current.writeln('\\x1b[33m⚠️ SPARC WebSocket Disconnected\\x1b[0m');
      }
    };
    
    const handleError = (data: any) => {
      console.error('❌ SPARC: WebSocket error:', data);
      setError(data.error || 'WebSocket connection error');
      if (terminal.current) {
        terminal.current.writeln(`\\x1b[31m❌ SPARC Connection Error: ${data.error}\\x1b[0m`);
      }
    };
    
    // Add all event handlers
    addHandler('message', handleMessage);
    addHandler('loading', handleLoading);
    addHandler('permission_request', handlePermissionRequest);
    addHandler('connect', handleConnect);
    addHandler('disconnect', handleDisconnect);
    addHandler('error', handleError);
    
    return () => {
      // Remove all event handlers on cleanup
      removeHandler('message', handleMessage);
      removeHandler('loading', handleLoading);
      removeHandler('permission_request', handlePermissionRequest);
      removeHandler('connect', handleConnect);
      removeHandler('disconnect', handleDisconnect);
      removeHandler('error', handleError);
    };
  }, [instanceId, addHandler, removeHandler, sendCommand, initialCommand]);

  // SPARC REFINEMENT: Handle terminal input with permission response support
  useEffect(() => {
    if (!terminal.current) return;

    console.log('🔍 SPARC: Setting up unified terminal input handler');
    
    const handleData = (data: string) => {
      console.log('🎯 SPARC: Terminal input data:', JSON.stringify(data));
      
      // Handle permission responses
      if (permissionRequest.isActive && (data === '\\r' || data === '\\n')) {
        const response = currentCommand.toLowerCase().trim();
        let action = '';
        
        switch (response) {
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
            action = 'ask_differently';
            break;
          default:
            if (terminal.current) {
              terminal.current.writeln('\\x1b[33m⚠️ Please enter y/n/d\\x1b[0m');
              terminal.current.write('\\x1b[33m> \\x1b[0m');
            }
            setCurrentCommand('');
            return;
        }
        
        // Send permission response
        sendCommand(instanceId, JSON.stringify({
          type: 'permission_response',
          requestId: permissionRequest.requestId,
          action: action
        })).catch(error => {
          console.error('❌ SPARC: Failed to send permission response:', error);
        });
        
        setPermissionRequest({ isActive: false, message: '', requestId: '' });
        setCurrentCommand('');
        
        if (terminal.current) {
          terminal.current.writeln(`\\r\\n\\x1b[32m✅ Response sent: ${action}\\x1b[0m`);
        }
        return;
      }
      
      // Handle Enter key for regular commands
      if (data === '\\r' || data === '\\n') {
        if (currentCommand.trim()) {
          console.log('📝 SPARC: Sending command via useWebSocketTerminal:', currentCommand);
          sendCommand(instanceId, currentCommand).catch(error => {
            console.error('❌ SPARC: Failed to send command:', error);
          });
          setCurrentCommand('');
        }
        terminal.current?.write('\\r\\n');
      } 
      // Handle backspace
      else if (data === '\\u007F' || data === '\\b') {
        if (currentCommand.length > 0) {
          setCurrentCommand(prev => prev.slice(0, -1));
          terminal.current?.write('\\b \\b');
        }
      } 
      // Handle regular characters
      else {
        setCurrentCommand(prev => prev + data);
        terminal.current?.write(data);
      }
    };

    const disposable = terminal.current.onData(handleData);
    
    return () => {
      if (disposable) {
        disposable.dispose();
      }
    };
  }, [connectionState.isConnected, instanceId, sendCommand, currentCommand, permissionRequest]);

  if (!isVisible) return null;

  const getConnectionStatusColor = () => {
    if (connectionState.isConnected) return 'text-green-500';
    if (connectionState.connectionType === 'websocket') return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConnectionStatusText = () => {
    if (connectionState.isConnected) return '🟢 Connected (SPARC Unified)';
    if (connectionState.connectionType === 'websocket') return '🟡 Connecting... (SPARC)';
    return '🔴 Disconnected (SPARC)';
  };

  return (
    <div className="terminal-container">
      {/* Terminal Header */}
      <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="font-medium">SPARC Unified Terminal</span>
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
          <span className={`text-sm ${getConnectionStatusColor()}`}>
            {getConnectionStatusText()}
          </span>
          <span className="text-gray-400 text-sm">
            Instance: {instanceId}
          </span>
          {error && (
            <span className="text-red-400 text-sm" title={error}>
              ⚠️ {error}
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
      <div className="bg-black relative">
        <div 
          ref={terminalRef} 
          className="w-full h-96"
        />
      </div>

      {/* Terminal Footer */}
      <div className="bg-gray-800 text-gray-400 px-4 py-2 text-xs">
        <div className="flex items-center justify-between">
          <span>SPARC WebSocket URL: {config.url}/terminal</span>
          <div className="flex items-center space-x-4">
            <span>Mode: Single Manager</span>
            <span>Status: {connectionState.connectionType}</span>
            <span className="text-green-400">✅ No Dual Managers</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalUnified;