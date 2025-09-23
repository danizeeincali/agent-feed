import React, { useState, useEffect, useRef } from 'react';

interface HTTPPollingTerminalProps {
  instanceId?: string;
  pid?: string;
}

interface TerminalOutput {
  timestamp: string;
  output: string;
  type: 'output' | 'error' | 'info';
}

export const HTTPPollingTerminal: React.FC<HTTPPollingTerminalProps> = ({ 
  instanceId = 'claude-2426', 
  pid = '2426' 
}) => {
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<'polling' | 'sse'>('sse');
  const terminalRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const sseConnection = useRef<EventSource | null>(null);

  const addOutput = (text: string, type: TerminalOutput['type'] = 'output') => {
    const newOutput: TerminalOutput = {
      timestamp: new Date().toISOString(),
      output: text,
      type
    };
    
    setOutput(prev => [...prev.slice(-100), newOutput]); // Keep last 100 lines
  };

  const startSSE = () => {
    console.log('🚀 NUCLEAR OPTION: Starting SSE connection for instance:', instanceId);
    
    if (sseConnection.current) {
      sseConnection.current.close();
    }

    try {
      const eventSource = new EventSource(`/api/v1/claude/instances/${instanceId}/terminal/stream`);
      
      eventSource.onopen = () => {
        console.log('✅ SSE connection opened');
        setIsConnected(true);
        setError(null);
        addOutput(`✅ Connected to Claude instance ${instanceId} via Server-Sent Events`, 'info');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 SSE message received:', data);
          
          if (data.type === 'terminal_output') {
            addOutput(data.output, 'output');
          } else if (data.type === 'connected') {
            addOutput(`🔗 SSE connection established for instance ${data.instanceId}`, 'info');
          } else if (data.type === 'ping') {
            console.log('💓 SSE keepalive ping');
          }
        } catch (error) {
          console.error('SSE message parsing error:', error);
          addOutput('⚠️ Error parsing SSE message', 'error');
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setError('SSE connection failed');
        setIsConnected(false);
        addOutput('❌ SSE connection error - switching to HTTP polling', 'error');
        
        // Fallback to HTTP polling
        setTimeout(() => {
          setConnectionMethod('polling');
          startPolling();
        }, 1000);
      };
      
      sseConnection.current = eventSource;
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setError('Failed to create SSE connection');
      addOutput('❌ Failed to create SSE connection - switching to HTTP polling', 'error');
      setConnectionMethod('polling');
      setTimeout(startPolling, 1000);
    }
  };

  const startPolling = () => {
    console.log('🚀 NUCLEAR OPTION: Starting HTTP polling for PID:', pid);
    
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    setIsConnected(true);
    addOutput(`🔄 Starting HTTP polling for Claude PID ${pid}`, 'info');
    
    pollingInterval.current = setInterval(async () => {
      try {
        // Direct PID endpoint for Claude instance 2426
        const response = await fetch(`/api/v1/claude/terminal/output/${pid}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 HTTP polling response:', data);
        
        if (data.success) {
          // Add status update every few polls
          const now = Date.now();
          if (now % 10000 < 2000) { // Every ~10 seconds
            addOutput(`📊 Claude PID ${data.pid} status: ${data.status} | Uptime: ${data.uptime}s`, 'info');
            if (data.output) {
              addOutput(data.output, 'output');
            }
          }
        } else {
          addOutput(`⚠️ ${data.error}`, 'error');
        }
      } catch (error) {
        console.error('HTTP polling error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        if (!errorMsg.includes('fetch')) { // Don't spam network errors
          addOutput(`❌ Polling error: ${errorMsg}`, 'error');
        }
      }
    }, 3000); // Poll every 3 seconds
  };

  const stopConnections = () => {
    console.log('🛑 Stopping all connections');
    
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    if (sseConnection.current) {
      sseConnection.current.close();
      sseConnection.current = null;
    }
    
    setIsConnected(false);
    addOutput('🛑 Connections stopped', 'info');
  };

  const testDirectConnection = async () => {
    addOutput('🧪 Testing direct connection to Claude instance...', 'info');
    
    try {
      const response = await fetch(`/api/v1/claude/terminal/output/2426`);
      const data = await response.json();
      
      if (data.success) {
        addOutput(`✅ Direct connection successful!`, 'info');
        addOutput(`📋 PID: ${data.pid} | Status: ${data.status} | Uptime: ${data.uptime}s`, 'info');
        addOutput(`💬 Message: ${data.message}`, 'info');
        addOutput(`📤 Output: ${data.output}`, 'output');
      } else {
        addOutput(`❌ Direct connection failed: ${data.error}`, 'error');
      }
    } catch (error) {
      addOutput(`❌ Direct connection error: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    addOutput('🚀 NUCLEAR OPTION: HTTP Terminal initialized - WebSocket connection storm bypassed!', 'info');
    addOutput(`🎯 Target: Claude instance PID ${pid}`, 'info');
    
    // Start with SSE, fallback to polling
    if (connectionMethod === 'sse') {
      startSSE();
    } else {
      startPolling();
    }
    
    return () => {
      stopConnections();
    };
  }, [instanceId, pid, connectionMethod]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const getStatusColor = () => {
    if (error) return 'text-red-500';
    if (isConnected) return 'text-green-500';
    return 'text-yellow-500';
  };

  return (
    <div className="bg-gray-900 text-green-400 font-mono p-4 rounded-lg h-96">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
        <h3 className="text-lg font-bold">
          🚀 NUCLEAR OPTION: HTTP Terminal (PID {pid})
        </h3>
        <div className="flex items-center gap-4">
          <span className={`text-sm ${getStatusColor()}`}>
            {error ? '❌ Error' : isConnected ? '✅ Connected' : '⏳ Connecting'}
          </span>
          <span className="text-xs text-gray-400">
            Method: {connectionMethod.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setConnectionMethod('sse');
            stopConnections();
            setTimeout(startSSE, 100);
          }}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
        >
          SSE Stream
        </button>
        <button
          onClick={() => {
            setConnectionMethod('polling');
            stopConnections();
            setTimeout(startPolling, 100);
          }}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
        >
          HTTP Poll
        </button>
        <button
          onClick={testDirectConnection}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
        >
          Test Direct
        </button>
        <button
          onClick={stopConnections}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
        >
          Stop
        </button>
      </div>

      <div 
        ref={terminalRef}
        className="bg-black p-3 rounded h-64 overflow-y-auto text-sm leading-relaxed"
      >
        {output.map((line, index) => (
          <div key={index} className="mb-1">
            <span className="text-gray-500 text-xs">
              {new Date(line.timestamp).toLocaleTimeString()}
            </span>
            <span className={`ml-2 ${
              line.type === 'error' ? 'text-red-400' : 
              line.type === 'info' ? 'text-blue-400' : 
              'text-green-400'
            }`}>
              {line.output}
            </span>
          </div>
        ))}
        {output.length === 0 && (
          <div className="text-gray-500 text-center mt-8">
            Waiting for terminal output...
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-900 border border-red-600 rounded text-red-200 text-sm">
          ❌ {error}
        </div>
      )}
    </div>
  );
};

export default HTTPPollingTerminal;