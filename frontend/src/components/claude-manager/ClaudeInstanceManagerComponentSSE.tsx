/**
 * ClaudeInstanceManagerComponentSSE - Complete SSE-based Claude Instance Control Interface
 * 
 * React component for real-time interaction with individual Claude instances.
 * Provides SSE-based terminal interface and interactive command execution.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useSSEClaudeInstance } from '../../hooks/useSSEClaudeInstance';
import { ConnectionState } from '../../managers/ClaudeInstanceManager';
// CSS handled by global styles

interface ClaudeInstanceManagerComponentSSEProps {
  apiUrl?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export const ClaudeInstanceManagerComponentSSE: React.FC<ClaudeInstanceManagerComponentSSEProps> = ({
  apiUrl = 'http://localhost:3000',
  autoConnect = false,
  reconnectAttempts = 5,
  reconnectInterval = 2000
}) => {
  // Use SSE hook for state management
  const {
    manager,
    isConnected,
    connectionState,
    connectionError,
    availableInstances,
    selectedInstanceId,
    output,
    connectToInstance,
    disconnectFromInstance,
    sendCommand,
    refreshInstances,
    clearOutput,
    loading,
    messageCount,
    lastActivity
  } = useSSEClaudeInstance({
    apiUrl,
    autoConnect,
    reconnectAttempts,
    reconnectInterval
  });

  const [input, setInput] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output when new messages arrive
  React.useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Handle command submission
  const handleSendCommand = useCallback(async () => {
    if (!input.trim() || !selectedInstanceId) return;

    try {
      await sendCommand(selectedInstanceId, input);
      setInput('');
    } catch (error) {
      console.error('Failed to send command:', error);
    }
  }, [input, selectedInstanceId, sendCommand]);

  // Handle instance selection
  const handleInstanceSelection = useCallback(async (instanceId: string) => {
    if (selectedInstanceId === instanceId && isConnected) {
      // If clicking on already connected instance, disconnect
      await disconnectFromInstance(instanceId);
    } else {
      // Connect to new instance
      await connectToInstance(instanceId);
    }
  }, [selectedInstanceId, isConnected, connectToInstance, disconnectFromInstance]);

  // Handle clear output
  const handleClearOutput = useCallback(() => {
    if (selectedInstanceId) {
      clearOutput(selectedInstanceId);
    }
  }, [selectedInstanceId, clearOutput]);

  // Format connection status display
  const getConnectionStatusText = () => {
    if (!selectedInstanceId) return 'No instance selected';
    
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return `Connected to ${selectedInstanceId.slice(0, 12)}...`;
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.RECONNECTING:
        return 'Reconnecting...';
      case ConnectionState.ERROR:
        return 'Connection error';
      case ConnectionState.DISCONNECTED:
      default:
        return 'Disconnected';
    }
  };

  const isActiveConnection = isConnected && selectedInstanceId;

  return (
    <div className="claude-instance-manager-component">
      <div className="header">
        <h2>Claude Instance Controller (SSE)</h2>
        <div className="connection-info">
          <span className={`connection-status ${connectionState}`}>
            {getConnectionStatusText()}
          </span>
          {messageCount > 0 && (
            <span className="message-count">
              Messages: {messageCount}
            </span>
          )}
          {lastActivity && (
            <span className="last-activity">
              Last: {lastActivity.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {connectionError && (
        <div className="error-banner">
          {connectionError}
          <button onClick={() => window.location.reload()}>Dismiss</button>
        </div>
      )}

      <div className="instance-selection">
        <h3>Select Instance</h3>
        {availableInstances.length === 0 ? (
          <div className="no-instances">
            No running instances available. Create an instance using the Service Manager.
          </div>
        ) : (
          <div className="instance-table-container">
            <table className="instance-table">
              <thead>
                <tr>
                  <th>Instance ID</th>
                  <th>PID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {availableInstances.map(instance => {
                  const isSelected = selectedInstanceId === instance.id;
                  const isConnectedToThis = isSelected && isConnected;
                  
                  return (
                    <tr 
                      key={instance.id}
                      className={`instance-row ${isSelected ? 'selected' : ''}`}
                    >
                      <td className="instance-id-cell">
                        <span className="full-id">{instance.id}</span>
                      </td>
                      <td className="pid-cell">
                        <code>{instance.pid}</code>
                      </td>
                      <td className="status-cell">
                        <span className={`status-badge status-${isConnectedToThis ? 'connected' : instance.status}`}>
                          {isConnectedToThis ? 'connected' : instance.status}
                        </span>
                      </td>
                      <td className="actions-cell">
                        {isConnectedToThis ? (
                          <button 
                            onClick={() => handleInstanceSelection(instance.id)}
                            disabled={loading}
                            className="btn btn-disconnect btn-sm"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleInstanceSelection(instance.id)}
                            disabled={loading}
                            className="btn btn-connect btn-sm"
                          >
                            Connect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        <button 
          onClick={refreshInstances}
          disabled={loading}
          className="btn btn-refresh"
        >
          {loading ? 'Refreshing...' : 'Refresh Instances'}
        </button>
      </div>

      {isActiveConnection && (
        <div className="interactive-terminal">
          <div className="terminal-header">
            <h3>Terminal - {selectedInstanceId?.slice(0, 12)}...</h3>
            <div className="terminal-controls">
              <button onClick={handleClearOutput} className="btn btn-clear">
                Clear ({messageCount})
              </button>
              <span className="connection-state">
                {connectionState}
              </span>
            </div>
          </div>
          
          <div className="terminal-output" ref={outputRef}>
            {output.length === 0 ? (
              <div className="welcome-message">
                Connected to Claude instance. Type commands below.
              </div>
            ) : (
              output.map(message => (
                <div 
                  key={message.id}
                  className={`output-line ${message.type} ${message.isReal ? 'real' : 'synthetic'}`}
                >
                  <span className="timestamp">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="content">
                    {message.content}
                  </span>
                </div>
              ))
            )}
          </div>
          
          <div className="terminal-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendCommand()}
              placeholder="Type command and press Enter..."
              className="command-input"
              disabled={!isActiveConnection}
            />
            <button 
              onClick={handleSendCommand}
              disabled={!isActiveConnection || !input.trim() || loading}
              className="btn btn-send"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {!isActiveConnection && selectedInstanceId && (
        <div className="connection-pending">
          <p>
            {connectionState === ConnectionState.CONNECTING 
              ? 'Connecting to instance...' 
              : connectionState === ConnectionState.RECONNECTING
              ? 'Reconnecting to instance...'
              : 'Select an instance and click Connect to start interactive session'
            }
          </p>
          {connectionError && (
            <p className="connection-error">
              Error: {connectionError}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ClaudeInstanceManagerComponentSSE;