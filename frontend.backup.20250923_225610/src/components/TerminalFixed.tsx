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

export const TerminalFixedComponent: React.FC<TerminalProps> = ({ 
  isVisible, 
  processStatus,
  initialCommand,
  instanceId = `claude-terminal-${Date.now()}`
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  
  // Use ONLY useWebSocketTerminal hook for all WebSocket communication
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

  // Initialize terminal when visible
  useEffect(() => {
    if (!isVisible || terminal.current) return;

    if (terminalRef.current) {
      console.log('🔍 DEBUG: Initializing fixed terminal');
      
      terminal.current = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
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
      terminal.current.writeln('\\x1b[1;32m🚀 Claude Terminal (FIXED WebSocket Integration)\\x1b[0m');
      terminal.current.writeln('\\x1b[2mConnecting via useWebSocketTerminal hook...\\x1b[0m');
      terminal.current.writeln('');
    }

    return () => {
      if (terminal.current) {
        terminal.current.dispose();
        terminal.current = null;
      }
    };
  }, [isVisible]);
  
  // Handle WebSocket connection based on process status
  useEffect(() => {
    if (!processStatus.isRunning || !isVisible) return;
    
    console.log(`🔌 Connecting to WebSocket terminal for instance: ${instanceId}`);
    connectToInstance(instanceId).catch(error => {
      console.error('❌ Failed to connect to terminal:', error);
      setError(`Connection failed: ${error.message}`);
    });
    
    return () => {
      console.log(`🔌 Disconnecting from WebSocket terminal for instance: ${instanceId}`);
      disconnectFromInstance(instanceId);
    };
  }, [processStatus.isRunning, isVisible, instanceId, connectToInstance, disconnectFromInstance]);

  // Setup event handlers for WebSocket messages
  useEffect(() => {
    console.log('📡 Setting up WebSocket event handlers');
    
    // Handle regular messages (including 'data' type from backend)
    const handleMessage = (data: any) => {
      console.log('📨 WebSocket message received:', data);
      
      if (data.type === 'data' && terminal.current) {
        // This is the message type that backend sends
        const formattedData = ToolCallFormatter.formatOutputWithToolCalls(data.data);
        terminal.current.write(formattedData);
      } else if (data.type === 'error') {
        console.error('📨 Error message:', data);
        if (terminal.current) {
          terminal.current.writeln(`\\x1b[31m❌ Error: ${data.error}\\x1b[0m`);
        }
        setError(data.error);
      }
    };
    
    // Handle connection state changes
    const handleConnect = (data: any) => {
      console.log('✅ WebSocket connected:', data);
      if (terminal.current) {
        terminal.current.writeln('\\x1b[32m✅ WebSocket Connected (Fixed)\\x1b[0m');
        terminal.current.writeln('\\x1b[33m🔍 Ready for input - start typing!\\x1b[0m');
        
        // Execute initial command if provided
        if (initialCommand) {
          setTimeout(() => {
            console.log('📝 Executing initial command:', initialCommand);
            sendCommand(instanceId, initialCommand).catch(error => {
              console.error('❌ Failed to send initial command:', error);
            });
          }, 500);
        }
      }
    };
    
    const handleDisconnect = (data: any) => {
      console.log('❌ WebSocket disconnected:', data);
      if (terminal.current) {
        terminal.current.writeln('\\x1b[33m⚠️ WebSocket Disconnected\\x1b[0m');
      }
    };
    
    const handleError = (data: any) => {
      console.error('❌ WebSocket error:', data);
      setError(data.error || 'WebSocket connection error');
      if (terminal.current) {
        terminal.current.writeln(`\\x1b[31m❌ Connection Error: ${data.error}\\x1b[0m`);
      }
    };
    
    // Add all event handlers
    addHandler('message', handleMessage);
    addHandler('connect', handleConnect);
    addHandler('disconnect', handleDisconnect);
    addHandler('error', handleError);
    
    return () => {
      // Remove all event handlers on cleanup
      removeHandler('message', handleMessage);
      removeHandler('connect', handleConnect);
      removeHandler('disconnect', handleDisconnect);
      removeHandler('error', handleError);
    };
  }, [instanceId, addHandler, removeHandler, sendCommand, initialCommand]);

  // Handle terminal input
  useEffect(() => {
    if (!terminal.current) return;

    console.log('🔍 Setting up terminal input handler (Fixed)');
    
    let currentCommand = '';
    
    const handleData = (data: string) => {
      console.log('🎯 Terminal input data (Fixed):', JSON.stringify(data));
      
      // Handle Enter key
      if (data === '\\r' || data === '\\n') {
        if (currentCommand.trim()) {
          console.log('📝 Sending command via useWebSocketTerminal:', currentCommand);
          sendCommand(instanceId, currentCommand).catch(error => {
            console.error('❌ Failed to send command:', error);
          });
          currentCommand = '';
        }
        terminal.current?.write('\\r\\n');
      } 
      // Handle backspace
      else if (data === '\\u007F' || data === '\\b') {
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
          terminal.current?.write('\\b \\b');
        }
      } 
      // Handle regular characters
      else {
        currentCommand += data;
        terminal.current?.write(data);
      }
    };

    const disposable = terminal.current.onData(handleData);
    
    return () => {
      if (disposable) {
        disposable.dispose();
      }
    };
  }, [connectionState.isConnected, instanceId, sendCommand]);

  if (!isVisible) return null;

  const getConnectionStatusColor = () => {
    if (connectionState.isConnected) return 'text-green-500';
    if (connectionState.connectionType === 'websocket') return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConnectionStatusText = () => {
    if (connectionState.isConnected) return '🟢 Connected (Fixed)';
    if (connectionState.connectionType === 'websocket') return '🟡 Connecting... (Fixed)';
    return '🔴 Disconnected (Fixed)';
  };

  return (
    <div className="terminal-container">
      {/* Terminal Header */}
      <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="font-medium">Claude Terminal (FIXED)</span>
          {processStatus.pid && (
            <span className="text-gray-400 text-sm">PID: {processStatus.pid}</span>
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

      {/* Terminal Container */}
      <div className="bg-black">
        <div 
          ref={terminalRef} 
          className="w-full h-96"
        />
      </div>

      {/* Terminal Footer */}
      <div className="bg-gray-800 text-gray-400 px-4 py-2 text-xs">
        <div className="flex items-center justify-between">
          <span>WebSocket URL: {config.url}/terminal</span>
          <span>Status: {connectionState.connectionType}</span>
        </div>
      </div>
    </div>
  );
};

export default TerminalFixedComponent;