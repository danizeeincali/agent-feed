import React, { useState, useEffect, useRef } from 'react';
import './ClaudeInstanceManager.css';
import { nldCapture } from '../utils/nld-ui-capture';
import { useHTTPSSE } from '../hooks/useHTTPSSE';

interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
}

interface ClaudeInstanceManagerProps {
  apiUrl?: string;
}

const ClaudeInstanceManager: React.FC<ClaudeInstanceManagerProps> = ({ 
  apiUrl = 'http://localhost:3000' 
}) => {
  const [instances, setInstances] = useState<ClaudeInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [output, setOutput] = useState<{ [key: string]: string }>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<string>('Disconnected');
  
  const outputRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Use HTTP/SSE hook instead of WebSocket
  const { 
    socket, 
    isConnected, 
    connectionError, 
    connectSSE, 
    startPolling, 
    on, 
    off,
    emit
  } = useHTTPSSE({ 
    url: apiUrl,
    autoConnect: true
  });

  // Setup event handlers and fetch instances
  useEffect(() => {
    fetchInstances();
    setupEventHandlers();
    
    return () => {
      cleanupEventHandlers();
    };
  }, [socket]);

  const setupEventHandlers = () => {
    if (!socket) return;
    
    // Handle connection events
    on('connect', (data) => {
      console.log('Connected via HTTP/SSE:', data);
      setError(null);
      setConnectionType(data.connectionType === 'sse' ? 'Connected via SSE' : 
                      data.connectionType === 'polling' ? 'Connected via Polling' : 
                      'Connected via HTTP/SSE');
    });
    
    // Handle terminal output
    on('terminal:output', (data) => {
      if (data.output && data.instanceId) {
        setOutput(prev => ({
          ...prev,
          [data.instanceId]: (prev[data.instanceId] || '') + data.output
        }));
        
        // Auto-scroll to bottom
        if (outputRefs.current[data.instanceId]) {
          const element = outputRefs.current[data.instanceId];
          if (element) {
            element.scrollTop = element.scrollHeight;
          }
        }
      }
    });
    
    // Handle connection errors
    on('error', (error) => {
      console.error('HTTP/SSE error:', error);
      setError(connectionError || 'Connection error');
      setConnectionType('Connection Error');
    });
  };

  const cleanupEventHandlers = () => {
    if (!socket) return;
    
    off('connect');
    off('terminal:output');
    off('error');
  };

  // Update connection status when connectionError changes
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
      setConnectionType('Connection Error');
    } else if (isConnected) {
      setError(null);
    }
  }, [connectionError, isConnected]);

  const fetchInstances = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/claude/instances`);
      const data = await response.json();
      if (data.success) {
        setInstances(data.instances);
      }
    } catch (err) {
      console.error('Failed to fetch instances:', err);
      const errorMessage = 'Failed to fetch instances';
      setError(errorMessage);
      
      // Capture potential communication breakdown
      nldCapture.captureCommunicationBreakdown(
        { endpoint: '/api/claude/instances', method: 'GET', error: err },
        'ClaudeInstanceManager'
      );
    }
  };

  const createInstance = async (command: string) => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);
    
    
    // Map commands to instance configurations
    const getInstanceConfig = (cmd: string) => {
      if (cmd.includes('prod') && !cmd.includes('skip-permissions')) {
        return { 
          command: ['claude'],
          workingDirectory: '/workspaces/agent-feed/prod'
        };
      } else if (cmd.includes('skip-permissions') && cmd.includes('resume')) {
        return { 
          command: ['claude', '--dangerously-skip-permissions', '--resume'],
          workingDirectory: '/workspaces/agent-feed/prod'
        };
      } else if (cmd.includes('skip-permissions') && cmd.includes('-c')) {
        return { 
          command: ['claude', '--dangerously-skip-permissions', '-c'],
          workingDirectory: '/workspaces/agent-feed/prod'
        };
      } else if (cmd.includes('skip-permissions')) {
        return { 
          command: ['claude', '--dangerously-skip-permissions'],
          workingDirectory: '/workspaces/agent-feed/prod'
        };
      } else {
        return { 
          command: ['claude'],
          workingDirectory: '/workspaces/agent-feed'
        };
      }
    };
    
    try {
      const response = await fetch(`${apiUrl}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getInstanceConfig(command))
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchInstances();
        setSelectedInstance(data.instanceId);
        setOutput(prev => ({ ...prev, [data.instanceId]: '' }));
        
        // Start terminal streaming for the new instance
        // Try SSE first, fallback to polling if it fails
        try {
          connectSSE(data.instanceId);
          console.log('Started SSE streaming for instance:', data.instanceId);
        } catch (sseError) {
          console.log('SSE failed, falling back to polling:', sseError);
          startPolling(data.instanceId);
        }
      } else {
        setError(data.error || 'Failed to create instance');
      }
    } catch (err) {
      console.error('Create instance error:', err);
      const errorMessage = 'Failed to create instance';
      setError(errorMessage);
      
      // Capture NLD pattern for instance creation failure
      nldCapture.captureInstanceCreationFailure(
        err instanceof Error ? err.message : errorMessage,
        `${apiUrl}/api/claude/instances`,
        'POST',
        'ClaudeInstanceManager'
      );
    } finally {
      setLoading(false);
    }
  };

  const sendInput = () => {
    if (!selectedInstance || !input.trim()) return;
    
    if (socket && isConnected) {
      emit('terminal:input', {
        input: input + '\n',
        instanceId: selectedInstance
      });
      setInput('');
    } else {
      console.warn('Not connected, cannot send input');
      setError('Not connected to terminal');
    }
  };

  const terminateInstance = async (instanceId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/claude/instances/${instanceId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchInstances();
        if (selectedInstance === instanceId) {
          setSelectedInstance(null);
        }
        // Clear output for terminated instance
        setOutput(prev => {
          const newOutput = { ...prev };
          delete newOutput[instanceId];
          return newOutput;
        });
      }
    } catch (err) {
      setError('Failed to terminate instance');
    }
  };

  return (
    <div className="claude-instance-manager">
      <div className="header">
        <h2>Claude Instance Manager</h2>
        <div className="status">
          {error && <span className="error">{error}</span>}
          {!error && (
            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              {connectionType}
            </span>
          )}
          {instances && instances.length > 0 && (
            <span className="count">Active: {instances.filter(i => i.status === 'running').length}/{instances.length}</span>
          )}
        </div>
      </div>

      <div className="controls">
        <div className="launch-buttons">
          <button 
            onClick={() => createInstance('cd prod && claude')} 
            disabled={loading}
            className="btn btn-prod"
            title="Launch Claude in prod directory"
          >
            🚀 prod/claude
          </button>
          <button 
            onClick={() => createInstance('cd prod && claude --dangerously-skip-permissions')} 
            disabled={loading}
            className="btn btn-skip-perms"
            title="Launch with permissions skipped"
          >
            ⚡ skip-permissions
          </button>
          <button 
            onClick={() => createInstance('cd prod && claude --dangerously-skip-permissions -c')} 
            disabled={loading}
            className="btn btn-skip-perms-c"
            title="Launch with permissions skipped and -c flag"
          >
            ⚡ skip-permissions -c
          </button>
          <button 
            onClick={() => createInstance('cd prod && claude --dangerously-skip-permissions --resume')} 
            disabled={loading}
            className="btn btn-skip-perms-resume"
            title="Resume with permissions skipped"
          >
            ↻ skip-permissions --resume
          </button>
        </div>
      </div>

      <div className="instances-grid">
        <div className="instances-list">
          <h3>Instances</h3>
          {instances.length === 0 ? (
            <p className="no-instances">No active instances. Launch one to get started!</p>
          ) : (
            <ul>
              {instances.map(instance => (
                <li 
                  key={instance.id}
                  className={`instance-item ${selectedInstance === instance.id ? 'selected' : ''} status-${instance.status}`}
                  onClick={() => {
                    setSelectedInstance(instance.id);
                    // Start streaming for the selected instance if not already streaming
                    if (instance.status === 'running') {
                      try {
                        connectSSE(instance.id);
                        console.log('Started SSE streaming for selected instance:', instance.id);
                      } catch (sseError) {
                        console.log('SSE failed for selected instance, falling back to polling:', sseError);
                        startPolling(instance.id);
                      }
                    }
                  }}
                >
                  <div className="instance-header">
                    <span className="instance-name">{instance.name}</span>
                    <span className={`instance-status ${instance.status}`}>
                      {instance.status}
                    </span>
                  </div>
                  <div className="instance-info">
                    <span className="instance-id">ID: {instance.id.slice(0, 8)}</span>
                    {instance.pid && <span className="instance-pid">PID: {instance.pid}</span>}
                  </div>
                  <button 
                    className="btn-terminate"
                    onClick={(e) => {
                      e.stopPropagation();
                      terminateInstance(instance.id);
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="instance-interaction">
          {selectedInstance ? (
            <>
              <h3>Instance Output</h3>
              <div 
                className="output-area"
                ref={el => outputRefs.current[selectedInstance] = el}
              >
                <pre>{output[selectedInstance] || 'Connecting to terminal stream...'}</pre>
              </div>
              <div className="input-area">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendInput()}
                  placeholder="Type command and press Enter..."
                  className="input-field"
                />
                <button onClick={sendInput} className="btn-send">
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select an instance or launch a new one to interact with Claude</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaudeInstanceManager;