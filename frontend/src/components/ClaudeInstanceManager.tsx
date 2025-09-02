import React, { useState, useEffect, useRef } from 'react';
import './ClaudeInstanceManager.css';
import { nldCapture } from '../utils/nld-ui-capture';
import { useHTTPSSE } from '../hooks/useHTTPSSE';
import { useNLDClaudeInstanceManager } from '../patterns/nld-integration-hooks';
import { useClaudeInstanceSync } from '../hooks/useClaudeInstanceSync';
import { apiService } from '../services/api';

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
  apiUrl = 'http://localhost:3000' // Fixed: Use correct backend port
}) => {
  // SPARC SYNC FIX: Use enhanced synchronization hook
  const {
    instances: syncedInstances,
    selectedInstanceId: syncedSelectedInstance,
    selectInstance: syncSelectInstance,
    forceSync,
    validateInstanceExists,
    error: syncError,
    syncInProgress,
    lastSync
  } = useClaudeInstanceSync({
    autoSync: true,
    syncInterval: 3000,
    validateInstances: true,
    clearCacheOnMount: true
  });

  const [output, setOutput] = useState<{ [key: string]: string }>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionType, setConnectionType] = useState<string>('Disconnected');
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null);

  // Convert synced instances to local format
  const instances = syncedInstances.map(instance => ({
    id: instance.id,
    name: instance.name,
    status: instance.status,
    pid: instance.pid,
    startTime: instance.startTime
  }));

  const selectedInstance = syncedSelectedInstance;
  const error = syncError;
  
  const outputRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // NLD Integration for intelligent failure detection and recovery
  const nld = useNLDClaudeInstanceManager();
  
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

  // Setup event handlers - no need for periodic fetching, handled by sync hook
  useEffect(() => {
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
        // SPARC SYNC FIX: Use sync hook to refresh instances
        await forceSync();
        if (data.instanceId) {
          const success = await syncSelectInstance(data.instanceId);
          if (success) {
            setOutput(prev => ({ ...prev, [data.instanceId]: '' }));
          }
        }
      } catch (error) {
        console.error('Failed to refresh instances after creation success:', error);
      }
    });
    
    // Handle instance creation error events
    on('instance:create:error', (error) => {
      console.error('Instance creation error event received:', error);
      setLoading(false);
      // Error is already handled by sync hook
    });
    
    // CRITICAL FIX: Handle instance status updates from backend SSE
    on('instance:status', (data) => {
      console.log('📲 Instance status update received:', data);
      
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
      
      // Force sync to get latest instances state
      forceSync();
    });
    
    // Handle status updates (alternative event name)
    on('status_update', (data) => {
      console.log('📲 Status update received:', data);
      // Force sync instead of updating state directly
      forceSync();
    });
    
    // Handle connection errors
    on('error', (error) => {
      console.error('HTTP/SSE error:', error);
      setConnectionType('Connection Error');
      // Let sync hook handle error state
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
      setConnectionType('Connection Error');
    } else if (isConnected) {
      // Connection restored
      setConnectionType('Connected');
    }
  }, [connectionError, isConnected]);

  // REMOVED: fetchInstances function - replaced by useClaudeInstanceSync hook

  const createInstance = async (command: string) => {
    const startTime = performance.now();
    setLoading(true);
    
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
      
      // SPARC SYNC FIX: Use API service for instance creation
      const data = await apiService.createClaudeInstance(config);
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
        
        // SPARC SYNC FIX: Use sync hook to refresh and select instance
        await forceSync();
        const success = await syncSelectInstance(instanceId);
        
        if (success) {
          setOutput(prev => ({ ...prev, [instanceId]: '' }));
        }
        
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
        // Error handling is managed by sync hook
      }
    } catch (err) {
      console.error('Create instance error:', err);
      // Error handling managed by sync hook and API service
      
      // Capture NLD pattern for instance creation failure
      nldCapture.captureInstanceCreationFailure(
        err instanceof Error ? err.message : 'Failed to create instance',
        `${apiUrl}/api/v1/claude/instances`,
        'POST',
        'ClaudeInstanceManager'
      );
    } finally {
      setLoading(false);
    }
  };

  const sendInput = async () => {
    // SPARC SYNC FIX: Enhanced validation using sync hook
    if (!selectedInstance || selectedInstance === 'undefined' || !selectedInstance.trim()) {
      console.warn('Cannot send input: no valid instance selected', { selectedInstance });
      return;
    }
    
    if (!input.trim()) {
      console.warn('Cannot send empty input');
      return;
    }
    
    // Validate instance exists in backend before sending
    const exists = await validateInstanceExists(selectedInstance);
    if (!exists) {
      console.error('Instance not found in backend:', selectedInstance);
      await forceSync(); // Refresh to get latest state
      return;
    }
    
    if (socket && isConnected) {
      console.log('⌨️ Sending input to instance:', selectedInstance, 'Input:', input);
      emit('terminal:input', {
        input: input + '\n',
        instanceId: selectedInstance
      });
      setInput('');
    } else {
      console.warn('Not connected, cannot send input');
    }
  };

  const terminateInstance = async (instanceId: string) => {
    try {
      // SPARC SYNC FIX: Use API service for termination
      const data = await apiService.terminateClaudeInstance(instanceId);
      
      if (data.success) {
        console.log('Instance terminated successfully, refreshing instances list...');
        
        // Force sync to get latest instances
        await forceSync();
        
        if (selectedInstance === instanceId) {
          await syncSelectInstance(null);
        }
        
        // Clear output for terminated instance
        setOutput(prev => {
          const newOutput = { ...prev };
          delete newOutput[instanceId];
          return newOutput;
        });
      }
    } catch (err) {
      console.error('Failed to terminate instance:', err);
      // Error handling managed by API service and sync hook
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
          {syncInProgress && <span className="sync-status">⟳ Syncing...</span>}
          {lastSync && !syncInProgress && (
            <span className="sync-time">Last sync: {lastSync.toLocaleTimeString()}</span>
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
                  data-testid="instance-card"
                  data-instance-id={instance.id}
                  onClick={async () => {
                    // SPARC SYNC FIX: Use sync hook for instance selection with validation
                    console.log('Selecting instance:', instance.id);
                    
                    // Disconnect from current instance first
                    if (selectedInstance && selectedInstance !== instance.id) {
                      console.log('Disconnecting from previous instance:', selectedInstance);
                      disconnectFromInstance();
                    }
                    
                    // Use sync hook to validate and select instance
                    const success = await syncSelectInstance(instance.id);
                    if (!success) {
                      console.error('Failed to select instance - not found in backend');
                      return;
                    }
                    
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
                    <div className={`instance-status status-${instance.status || 'starting'}`} data-testid={`status-${instance.id}`}>
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
                    data-testid={`disconnect-button-${instance.id}`}
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
                data-testid="terminal-output"
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
                  data-testid="command-input"
                />
                <button onClick={sendInput} className="btn-send" data-testid="send-command-button">
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