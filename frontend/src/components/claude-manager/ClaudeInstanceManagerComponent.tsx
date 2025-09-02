/**
 * ClaudeInstanceManagerComponent - Interactive Claude Instance Control Interface
 * 
 * React component for real-time interaction with individual Claude instances.
 * Provides WebSocket-based terminal interface and interactive command execution.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClaudeInstanceManager, ClaudeInstanceConfig, InstanceOutputMessage } from '../../managers/ClaudeInstanceManager';
import { ConnectionState } from '../../services/SingleConnectionManager';
import './claude-manager.css';
import './instance-table.css';

interface ClaudeInstanceManagerComponentProps {
  apiUrl?: string;
  websocketUrl?: string;
  autoConnect?: boolean;
}

export const ClaudeInstanceManagerComponent: React.FC<ClaudeInstanceManagerComponentProps> = ({
  apiUrl = 'http://localhost:3000',
  websocketUrl,
  autoConnect = false
}) => {
  const [instanceManager] = useState(() => new ClaudeInstanceManager({
    instanceId: '',
    apiUrl,
    websocketUrl,
    autoConnect,
    reconnectAttempts: 3,
    reconnectInterval: 5000
  }));

  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [availableInstances, setAvailableInstances] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    instanceId: string | null;
    state: ConnectionState;
  }>({ isConnected: false, instanceId: null, state: ConnectionState.DISCONNECTED });
  
  const [output, setOutput] = useState<InstanceOutputMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const outputRef = useRef<HTMLDivElement>(null);

  // Fetch available instances
  const fetchAvailableInstances = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/claude/instances`);
      const data = await response.json();
      
      if (data.success) {
        const runningInstances = data.instances
          .filter((i: any) => i.status === 'running');
        setAvailableInstances(runningInstances);
      }
    } catch (err) {
      console.error('Failed to fetch available instances:', err);
      setError('Failed to fetch available instances');
    }
  }, [apiUrl]);

  // Setup instance manager event listeners
  useEffect(() => {
    const handleConnected = ({ instanceId }: { instanceId: string }) => {
      console.log('Connected to instance:', instanceId);
      setError(null);
      setOutput([]); // Clear output for new connection
    };

    const handleDisconnected = ({ instanceId }: { instanceId: string }) => {
      console.log('Disconnected from instance:', instanceId);
    };

    const handleOutput = ({ instanceId, content, isReal }: { 
      instanceId: string; 
      content: string; 
      isReal?: boolean 
    }) => {
      if (instanceId === selectedInstanceId) {
        const message: InstanceOutputMessage = {
          id: `output-${Date.now()}`,
          instanceId,
          type: 'output',
          content,
          timestamp: new Date(),
          isReal
        };
        
        setOutput(prev => [...prev, message]);
      }
    };

    const handleError = ({ instanceId, error: instanceError }: { 
      instanceId: string; 
      error: string 
    }) => {
      setError(`Instance ${instanceId}: ${instanceError}`);
    };

    instanceManager.on('instance:connected', handleConnected);
    instanceManager.on('instance:disconnected', handleDisconnected);
    instanceManager.on('instance:output', handleOutput);
    instanceManager.on('instance:error', handleError);

    return () => {
      instanceManager.off('instance:connected', handleConnected);
      instanceManager.off('instance:disconnected', handleDisconnected);
      instanceManager.off('instance:output', handleOutput);
      instanceManager.off('instance:error', handleError);
    };
  }, [instanceManager, selectedInstanceId]);

  // Update connection status
  useEffect(() => {
    const updateStatus = () => {
      setConnectionStatus(instanceManager.getConnectionStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [instanceManager]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Fetch instances on mount
  useEffect(() => {
    fetchAvailableInstances();
    const interval = setInterval(fetchAvailableInstances, 5000);
    return () => clearInterval(interval);
  }, [fetchAvailableInstances]);

  // Connect to selected instance
  const connectToInstance = async (instanceId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await instanceManager.connectToInstance(instanceId);
      setSelectedInstanceId(instanceId);
      
      console.log('Successfully connected to instance:', instanceId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      console.error('Failed to connect to instance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Disconnect from current instance
  const disconnectFromInstance = async () => {
    try {
      setLoading(true);
      await instanceManager.disconnectFromInstance();
      setSelectedInstanceId(null);
      setOutput([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Disconnect failed';
      setError(errorMessage);
      console.error('Failed to disconnect:', err);
    } finally {
      setLoading(false);
    }
  };

  // Send command to instance
  const sendCommand = async () => {
    if (!input.trim()) return;

    try {
      setError(null);
      
      // Add input to output display
      const inputMessage: InstanceOutputMessage = {
        id: `input-${Date.now()}`,
        instanceId: selectedInstanceId!,
        type: 'input',
        content: `> ${input}\n`,
        timestamp: new Date(),
        isReal: true
      };
      
      setOutput(prev => [...prev, inputMessage]);
      
      await instanceManager.sendCommand(input);
      setInput('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Command failed';
      setError(errorMessage);
      console.error('Failed to send command:', err);
    }
  };

  // Clear output
  const clearOutput = () => {
    if (selectedInstanceId) {
      instanceManager.clearInstanceOutput(selectedInstanceId);
      setOutput([]);
    }
  };

  const isConnected = connectionStatus.isConnected && selectedInstanceId;

  return (
    <div className="claude-instance-manager-component">
      <div className="header">
        <h2>Claude Instance Controller</h2>
        <div className="connection-info">
          <span className={`connection-status ${connectionStatus.state}`}>
            {connectionStatus.state}
          </span>
          {connectionStatus.instanceId && (
            <span className="instance-id">
              {connectionStatus.instanceId.slice(0, 12)}...
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
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
                {availableInstances.map(instance => (
                  <tr 
                    key={instance.id}
                    className={`instance-row ${selectedInstanceId === instance.id ? 'selected' : ''}`}
                  >
                    <td className="instance-id-cell">
                      <span className="full-id">{instance.id}</span>
                    </td>
                    <td className="pid-cell">
                      <code>{instance.pid}</code>
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge status-${instance.status}`}>
                        {instance.status}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {selectedInstanceId === instance.id && isConnected ? (
                        <button 
                          onClick={disconnectFromInstance}
                          disabled={loading}
                          className="btn btn-disconnect btn-sm"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setSelectedInstanceId(instance.id);
                            connectToInstance(instance.id);
                          }}
                          disabled={loading || isConnected}
                          className="btn btn-connect btn-sm"
                        >
                          Connect
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <button 
          onClick={fetchAvailableInstances}
          disabled={loading}
          className="btn btn-refresh"
        >
          Refresh Instances
        </button>
      </div>

      {isConnected && (
        <div className="interactive-terminal">
          <div className="terminal-header">
            <h3>Terminal - {selectedInstanceId?.slice(0, 12)}...</h3>
            <div className="terminal-controls">
              <button onClick={clearOutput} className="btn btn-clear">
                Clear
              </button>
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
              onKeyPress={(e) => e.key === 'Enter' && sendCommand()}
              placeholder="Type command and press Enter..."
              className="command-input"
              disabled={!isConnected}
            />
            <button 
              onClick={sendCommand}
              disabled={!isConnected || !input.trim()}
              className="btn btn-send"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {!isConnected && selectedInstanceId && (
        <div className="connection-pending">
          <p>
            {connectionStatus.state === ConnectionState.CONNECTING 
              ? 'Connecting to instance...' 
              : 'Select an instance and click Connect to start interactive session'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ClaudeInstanceManagerComponent;