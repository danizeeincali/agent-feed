/**
 * SSETerminalInterface - Terminal Interface Component for SSE-based Claude Instances
 * 
 * Provides a clean terminal interface specifically designed for SSE communication
 * with Claude instances, including real-time output streaming and command input.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSSEClaudeInstance } from '../../hooks/useSSEClaudeInstance';
import { ConnectionState, InstanceOutputMessage } from '../../managers/ClaudeInstanceManager';
// CSS handled by global styles

interface SSETerminalInterfaceProps {
  instanceId: string;
  apiUrl?: string;
  autoConnect?: boolean;
  onConnectionChange?: (connected: boolean, instanceId: string) => void;
  className?: string;
}

export const SSETerminalInterface: React.FC<SSETerminalInterfaceProps> = ({
  instanceId,
  apiUrl = 'http://localhost:3000',
  autoConnect = true,
  onConnectionChange,
  className
}) => {
  const {
    isConnected,
    connectionState,
    connectionError,
    output,
    connectToInstance,
    disconnectFromInstance,
    sendCommand,
    clearOutput,
    loading,
    messageCount,
    lastActivity
  } = useSSEClaudeInstance({
    apiUrl,
    autoConnect: autoConnect && !!instanceId
  });

  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Notify parent of connection changes
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(isConnected, instanceId);
    }
  }, [isConnected, instanceId, onConnectionChange]);

  // Auto-connect when instanceId changes
  useEffect(() => {
    if (instanceId && autoConnect && !isConnected) {
      connectToInstance(instanceId);
    }
  }, [instanceId, autoConnect, isConnected, connectToInstance]);

  // Handle command submission
  const handleSendCommand = useCallback(async () => {
    if (!input.trim() || !instanceId || !isConnected) return;

    try {
      // Add to command history
      const trimmedInput = input.trim();
      setCommandHistory(prev => {
        const newHistory = [trimmedInput, ...prev.filter(cmd => cmd !== trimmedInput)];
        return newHistory.slice(0, 50); // Keep last 50 commands
      });
      setHistoryIndex(-1);

      await sendCommand(instanceId, trimmedInput);
      setInput('');
      
      // Focus input after sending
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Failed to send command:', error);
    }
  }, [input, instanceId, isConnected, sendCommand]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        handleSendCommand();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex] || '');
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex] || '');
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setInput('');
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setInput('');
        setHistoryIndex(-1);
        break;
    }
  }, [commandHistory, historyIndex, handleSendCommand]);

  // Handle clear output
  const handleClearOutput = useCallback(() => {
    clearOutput(instanceId);
  }, [clearOutput, instanceId]);

  // Handle connection toggle
  const handleConnectionToggle = useCallback(async () => {
    if (isConnected) {
      await disconnectFromInstance(instanceId);
    } else {
      await connectToInstance(instanceId);
    }
  }, [isConnected, instanceId, connectToInstance, disconnectFromInstance]);

  // Format connection status
  const getConnectionStatusText = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return `Connected (${messageCount} messages)`;
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.RECONNECTING:
        return 'Reconnecting...';
      case ConnectionState.ERROR:
        return `Error: ${connectionError || 'Connection failed'}`;
      case ConnectionState.DISCONNECTED:
      default:
        return 'Disconnected';
    }
  };

  // Render output message
  const renderOutputMessage = (message: InstanceOutputMessage, index: number) => {
    return (
      <div 
        key={`${message.id}-${index}`}
        className={`output-line ${message.type} ${message.isReal ? 'real' : 'synthetic'}`}
      >
        <span className="timestamp">
          {message.timestamp.toLocaleTimeString()}
        </span>
        <span className="content">
          {message.content}
        </span>
      </div>
    );
  };

  return (
    <div className={`sse-terminal-interface ${className || ''}`}>
      {/* Terminal Header */}
      <div className="terminal-header">
        <div className="terminal-title">
          <h3>Terminal - {instanceId?.slice(0, 12)}...</h3>
          <span className="instance-id">{instanceId}</span>
        </div>
        
        <div className="terminal-controls">
          <div className="connection-status">
            <span className={`status-indicator ${connectionState}`}>
              {getConnectionStatusText()}
            </span>
            {lastActivity && (
              <span className="last-activity">
                Last: {lastActivity.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="control-buttons">
            <button 
              onClick={handleClearOutput}
              disabled={loading || output.length === 0}
              className="btn btn-clear"
              title="Clear terminal output"
            >
              Clear ({output.length})
            </button>
            
            <button 
              onClick={handleConnectionToggle}
              disabled={loading}
              className={`btn ${isConnected ? 'btn-disconnect' : 'btn-connect'}`}
              title={isConnected ? 'Disconnect from instance' : 'Connect to instance'}
            >
              {loading ? 'Loading...' : (isConnected ? 'Disconnect' : 'Connect')}
            </button>
          </div>
        </div>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="connection-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{connectionError}</span>
        </div>
      )}

      {/* Terminal Output */}
      <div className="terminal-output" ref={outputRef}>
        {output.length === 0 ? (
          <div className="welcome-message">
            {isConnected 
              ? `Connected to Claude instance ${instanceId.slice(0, 12)}. Type commands below.`
              : `Terminal ready. ${isConnected ? 'Connected' : 'Click Connect to start.'}`
            }
          </div>
        ) : (
          output.map((message, index) => renderOutputMessage(message, index))
        )}
      </div>

      {/* Terminal Input */}
      <div className="terminal-input">
        <div className="input-prefix">
          <span className={`prompt ${isConnected ? 'connected' : 'disconnected'}`}>
            {instanceId.slice(0, 8)}$
          </span>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? "Type command and press Enter..." : "Connect to instance to send commands"}
          className="command-input"
          disabled={!isConnected || loading}
          autoComplete="off"
          spellCheck="false"
        />
        
        <button 
          onClick={handleSendCommand}
          disabled={!isConnected || !input.trim() || loading}
          className="btn btn-send"
          title="Send command (Enter)"
        >
          {loading ? '...' : 'Send'}
        </button>
        
        {commandHistory.length > 0 && (
          <div className="history-info">
            <span className="history-count">
              ↑↓ History ({commandHistory.length})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SSETerminalInterface;