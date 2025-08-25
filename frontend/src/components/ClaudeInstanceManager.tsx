import React, { useState, useEffect, useRef } from 'react';
import './ClaudeInstanceManager.css';
import { nldCapture } from '../utils/nld-ui-capture';

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
  
  const wsRef = useRef<WebSocket | null>(null);
  const outputRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    connectWebSocket();
    fetchInstances();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    // Use correct WebSocket path that matches server WebSocket setup
    const wsUrl = apiUrl.replace('http', 'ws') + '/socket.io/?EIO=4&transport=websocket';
    const ws = new WebSocket(wsUrl);
    
    
    ws.onopen = () => {
      console.log('Connected to Claude instances WebSocket');
      setError(null);
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error');
      
      // Capture NLD pattern for WebSocket connection failure
      nldCapture.captureWebSocketConnectionFailure(
        'WebSocket connection error',
        wsUrl,
        'ClaudeInstanceManager'
      );
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Attempt to reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };
    
    wsRef.current = ws;
  };

  const handleWebSocketMessage = (message: any) => {
    if (message.type === 'instances' || (message instanceof Array)) {
      // Handle instances list update
      const instancesData = message.type === 'instances' ? message.data : message;
      setInstances(instancesData.map(inst => ({
        id: inst.id,
        name: inst.id.slice(0, 8), // Use first 8 chars of ID as name for now
        status: inst.status,
        pid: inst.pid,
        startTime: new Date(inst.startTime)
      })));
      return;
    }
    
    switch (message.type) {
      case 'output':
        setOutput(prev => ({
          ...prev,
          [message.instanceId]: (prev[message.instanceId] || '') + message.data
        }));
        // Auto-scroll to bottom
        if (outputRefs.current[message.instanceId]) {
          outputRefs.current[message.instanceId]!.scrollTop = 
            outputRefs.current[message.instanceId]!.scrollHeight;
        }
        break;
        
      case 'status':
        setInstances(prev => prev.map(inst => 
          inst.id === message.instanceId 
            ? { ...inst, status: message.status }
            : inst
        ));
        break;
    }
  };

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
    
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input',
        instanceId: selectedInstance,
        data: input + '\n'
      }));
      setInput('');
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
          {instances.length > 0 && (
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
                <pre>{output[selectedInstance] || 'Waiting for output...'}</pre>
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