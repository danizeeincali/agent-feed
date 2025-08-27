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
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null);
  
  const outputRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Use HTTP/SSE hook instead of WebSocket
  const { 
    socket, 
    isConnected, 
    connectionError, 
    connectSSE, 
    startPolling, 
    disconnectFromInstance,
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
      setCurrentInstanceId(data.instanceId || null);
      setConnectionType(data.connectionType === 'sse' ? `Connected via SSE${data.instanceId ? ` (${data.instanceId.slice(0,8)})` : ''}` : 
                      data.connectionType === 'polling' ? `Connected via Polling${data.instanceId ? ` (${data.instanceId.slice(0,8)})` : ''}` : 
                      'Connected via HTTP/SSE');
    });
    
    // CRITICAL FIX: Handle REAL terminal output from Claude processes ONLY
    on('terminal:output', (data) => {
      if (data.output && data.instanceId && data.isReal) {
        // Display REAL Claude output without fake prefixes - enhanced validation
        const realOutput = data.output;
        
        console.log(`📺 REAL Claude output for ${data.instanceId.slice(0,8)}:`, realOutput);
        
        setOutput(prev => ({
          ...prev,
          [data.instanceId]: (prev[data.instanceId] || '') + realOutput
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
    
    // Also handle 'output' type messages from SSE - ONLY REAL Claude output
    on('output', (data) => {
      if (data.data && data.instanceId && data.isReal) {
        console.log(`📺 REAL Claude output (type: output) for ${data.instanceId.slice(0,8)}:`, data.data);
        
        setOutput(prev => ({
          ...prev,
          [data.instanceId]: (prev[data.instanceId] || '') + data.data
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
    
    // Handle instance creation success events
    on('instance:create:success', async (data) => {
      console.log('Instance creation success event received:', data);
      try {
        await fetchInstances();
        if (data.instanceId) {
          setSelectedInstance(data.instanceId);
          setOutput(prev => ({ ...prev, [data.instanceId]: '' }));
        }
      } catch (error) {
        console.error('Failed to refresh instances after creation success:', error);
        setError('Failed to refresh instances list');
      }
    });
    
    // Handle instance creation error events
    on('instance:create:error', (error) => {
      console.error('Instance creation error event received:', error);
      setError(error.message || 'Failed to create instance');
      setLoading(false);
    });
    
    // CRITICAL FIX: Handle instance status updates from backend SSE
    on('instance:status', (data) => {
      console.log('📲 Instance status update received:', data);
      
      // Update instances list with new status and ensure type safety
      setInstances(prev => prev.map(instance => 
        instance.id === data.instanceId 
          ? { ...instance, status: data.status as ClaudeInstance['status'] }
          : instance
      ));
      
      // Show status change notification in output if this instance is selected
      if (data.instanceId === selectedInstance) {
        const timestamp = new Date().toLocaleTimeString();
        const statusMessage = `[${timestamp}] Status changed to: ${data.status}\n`;
        setOutput(prev => ({
          ...prev,
          [data.instanceId]: (prev[data.instanceId] || '') + statusMessage
        }));
        console.log('🔄 Updated selected instance status in UI');
      }
    });
    
    // Handle status updates (alternative event name)
    on('status_update', (data) => {
      console.log('📲 Status update received:', data);
      setInstances(prev => prev.map(instance => 
        instance.id === data.instanceId 
          ? { ...instance, status: data.status }
          : instance
      ));
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
    off('terminal:input_echo'); // Clean up input echo handler
    off('instance:create:success');
    off('instance:create:error');
    off('instance:status'); // Clean up status handler
    off('status_update'); // Clean up status update handler
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
    
    
    // SPARC Enhanced instance configuration mapping
    const getInstanceConfig = (cmd: string) => {
      if (cmd.includes('prod') && !cmd.includes('skip-permissions')) {
        return { 
          command: ['claude'],
          instanceType: 'prod'  // SPARC: Let backend resolve directory
        };
      } else if (cmd.includes('skip-permissions') && cmd.includes('resume')) {
        return { 
          command: ['claude', '--dangerously-skip-permissions', '--resume'],
          instanceType: 'skip-permissions-resume'
        };
      } else if (cmd.includes('skip-permissions') && cmd.includes('-c')) {
        return { 
          command: ['claude', '--dangerously-skip-permissions', '-c'],
          instanceType: 'skip-permissions-c'
        };
      } else if (cmd.includes('skip-permissions')) {
        return { 
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions'
        };
      } else {
        return { 
          command: ['claude'],
          instanceType: 'default'
        };
      }
    };
    
    try {
      const config = getInstanceConfig(command);
      console.log('🚀 SPARC Sending instance configuration:', config);
      
      const response = await fetch(`${apiUrl}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      if (data.success) {
        // CRITICAL FIX: Extract instanceId from correct response structure
        // Backend returns { success: true, instance: { id: instanceId } }
        const instanceId = data.instanceId || data.instance?.id;
        
        if (!instanceId) {
          console.error('❌ Instance creation succeeded but no instance ID found in response:', data);
          setError('Instance creation failed: No instance ID in response');
          return;
        }
        
        // Validate instanceId format
        if (!/^claude-\d+$/.test(instanceId)) {
          console.error('❌ Invalid instance ID format:', instanceId);
          setError(`Invalid instance ID format: ${instanceId}`);
          return;
        }
        
        console.log('✅ SPARC Enhanced instance created successfully:', instanceId);
        console.log('   Instance Type:', data.instance?.type || 'unknown');
        console.log('   Working Directory:', data.instance?.workingDirectory || 'unknown');
        
        // Refresh instances list immediately after successful creation
        await fetchInstances();
        
        setSelectedInstance(instanceId);
        setOutput(prev => ({ ...prev, [instanceId]: '' }));
        
        // Wait a moment for the instance to be ready, then start streaming
        setTimeout(() => {
          try {
            console.log('🔗 Starting terminal connection for validated instance:', instanceId);
            connectSSE(instanceId);
            console.log('✅ Started SSE streaming for instance:', instanceId);
          } catch (sseError) {
            console.log('⚠️ SSE failed, falling back to polling:', sseError);
            startPolling(instanceId);
          }
        }, 500); // Small delay to ensure instance is ready
      } else {
        const errorMsg = data.error || 'Failed to create instance';
        console.error('❌ Instance creation failed:', errorMsg, data);
        setError(errorMsg);
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
    // TDD London School Fix: Enhanced validation before sending input
    if (!selectedInstance || selectedInstance === 'undefined' || !selectedInstance.trim()) {
      console.warn('Cannot send input: no valid instance selected', { selectedInstance });
      setError('No valid instance selected');
      return;
    }
    
    if (!input.trim()) {
      console.warn('Cannot send empty input');
      return;
    }
    
    // Validate instance ID format
    if (!/^claude-[a-zA-Z0-9]+$/.test(selectedInstance)) {
      console.error('Invalid instance ID format:', selectedInstance);
      setError(`Invalid instance ID format: ${selectedInstance}`);
      return;
    }
    
    if (socket && isConnected) {
      console.log('⌨️ Sending input to instance:', selectedInstance, 'Input:', input);
      emit('terminal:input', {
        input: input + '\n',
        instanceId: selectedInstance
      });
      setInput('');
      setError(null); // Clear any previous errors
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
        console.log('Instance terminated successfully, refreshing instances list...');
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
    <div className="claude-instance-manager" data-testid="claude-instance-manager">
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
                    // TDD London School Fix: Enhanced instance selection validation
                    if (!instance.id || instance.id === 'undefined' || !instance.id.trim()) {
                      console.error('Cannot select instance with invalid ID:', instance.id);
                      setError('Invalid instance ID');
                      return;
                    }
                    
                    // Validate instance ID format
                    if (!/^claude-[a-zA-Z0-9]+$/.test(instance.id)) {
                      console.error('Instance ID does not match expected format:', instance.id);
                      setError(`Invalid instance ID format: ${instance.id}`);
                      return;
                    }
                    
                    console.log('Selecting validated instance:', instance.id);
                    
                    // Disconnect from current instance first
                    if (selectedInstance && selectedInstance !== instance.id) {
                      console.log('Disconnecting from previous instance:', selectedInstance);
                      disconnectFromInstance();
                    }
                    
                    setSelectedInstance(instance.id);
                    // Initialize output for this instance if not already present
                    if (!output[instance.id]) {
                      setOutput(prev => ({ ...prev, [instance.id]: '' }));
                    }
                    
                    // Start streaming for the selected instance if running
                    if (instance.status === 'running') {
                      setTimeout(() => {
                        try {
                          console.log('Starting SSE connection for selected instance:', instance.id);
                          connectSSE(instance.id);
                        } catch (sseError) {
                          console.log('SSE failed for selected instance, falling back to polling:', sseError);
                          startPolling(instance.id);
                        }
                      }, 100); // Small delay to ensure cleanup is complete
                    }
                  }}
                >
                  <div className="instance-header">
                    <span className="instance-name">{instance.name}</span>
                    <div className={`instance-status status-${instance.status || 'starting'}`}>
                      <span className={`status-indicator status-${instance.status || 'starting'}`}>●</span>
                      <span className="status-text">{instance.status || 'starting'}</span>
                    </div>
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
                <pre>
                  {output[selectedInstance] || (
                    currentInstanceId === selectedInstance 
                      ? `Waiting for real output from Claude instance ${selectedInstance.slice(0,8)}...\n` 
                      : `Connecting to instance ${selectedInstance.slice(0,8)}...\n${connectionType}\n`
                  )}
                </pre>
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