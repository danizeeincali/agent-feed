/**
 * Simple Claude Launcher UI Component
 * Minimal design: Just Launch/Stop buttons + status display
 * No social features, no users, no complex state management
 */

import React, { useState, useEffect } from 'react';
import { TerminalComponent } from './Terminal';
import { TerminalEmergencyFixed } from './TerminalEmergencyFixed';
import TerminalDiagnostic from './TerminalDiagnostic';
import TerminalLauncher from './TerminalLauncher';

interface ProcessStatus {
  isRunning: boolean;
  pid?: number;
  status: 'stopped' | 'running' | 'error' | 'starting';
  error?: string;
  startedAt?: string;
  workingDirectory?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  status?: ProcessStatus;
  workingDirectory?: string;
  claudeAvailable?: boolean;
  error?: string;
}

export const SimpleLauncher: React.FC = () => {
  const [processStatus, setProcessStatus] = useState<ProcessStatus>({
    isRunning: false,
    status: 'stopped'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [claudeAvailable, setClaudeAvailable] = useState<boolean | null>(null);
  const [workingDirectory, setWorkingDirectory] = useState<string>('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [useFixedTerminal, setUseFixedTerminal] = useState(true); // Default to fixed version
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [terminalMode, setTerminalMode] = useState<'original' | 'fixed' | 'diagnostic' | 'comparison'>('fixed');
  const [selectedCommand, setSelectedCommand] = useState<string>('cd prod && claude');

  // Simple HTTP API calls with comprehensive debug logging (now using Vite proxy)
  const apiCall = async (endpoint: string, method: string = 'GET'): Promise<ApiResponse> => {
    // Use relative URL - Vite proxy will handle routing to backend
    const fullUrl = `/api/claude${endpoint}`;
    console.log('🔍 SPARC DEBUG: apiCall starting');
    console.log('🔍 SPARC DEBUG: endpoint:', endpoint);
    console.log('🔍 SPARC DEBUG: method:', method);
    console.log('🔍 SPARC DEBUG: full URL (proxied):', fullUrl);
    console.log('🔍 SPARC DEBUG: Vite will proxy to backend server' + fullUrl);
    
    try {
      console.log('🔍 SPARC DEBUG: Making fetch request...');
      const response = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🔍 SPARC DEBUG: Fetch response received');
      console.log('🔍 SPARC DEBUG: response.ok:', response.ok);
      console.log('🔍 SPARC DEBUG: response.status:', response.status);
      console.log('🔍 SPARC DEBUG: response.statusText:', response.statusText);
      console.log('🔍 SPARC DEBUG: response.headers:', [...response.headers.entries()]);
      
      if (!response.ok) {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        console.error('🔍 SPARC DEBUG: Response not OK, throwing error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('🔍 SPARC DEBUG: Parsing JSON response...');
      const jsonData = await response.json();
      console.log('🔍 SPARC DEBUG: JSON parsed successfully:', jsonData);
      
      return jsonData;
    } catch (error) {
      console.error('🔍 SPARC DEBUG: apiCall failed with error:', error);
      console.error('🔍 SPARC DEBUG: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  };

  // Check Claude availability on mount with proper error handling
  useEffect(() => {
    const checkClaude = async () => {
      console.log('🔍 Checking Claude CLI availability via proxy...');
      
      try {
        const response = await apiCall('/check');
        
        console.log('✅ Claude API response:', response);
        
        // FIXED: Properly handle the response structure
        const isAvailable = response.claudeAvailable === true || response.status === 'ok';
        
        setClaudeAvailable(isAvailable);
        console.log('✅ Claude CLI availability set to:', isAvailable);
        
      } catch (error) {
        console.error('❌ Error checking Claude CLI:', error.message);
        
        // FIXED: Don't assume unavailable on network errors
        // The CLI might be available even if the check endpoint fails
        setClaudeAvailable(true); // Default to true to allow user to try
        console.log('⚠️ Defaulting to available due to network error');
      }
    };

    checkClaude();
  }, []);

  // Poll status every 2 seconds (simple HTTP polling)
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await apiCall('/status');
        if (response.success && response.status) {
          setProcessStatus(response.status);
          if (response.workingDirectory) {
            setWorkingDirectory(response.workingDirectory);
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    };

    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial poll

    return () => clearInterval(interval);
  }, []);

  const handleLaunch = async (command: string) => {
    setIsLoading(true);
    setSelectedCommand(command);
    try {
      const response = await apiCall('/launch', 'POST');
      
      if (response.success) {
        setProcessStatus({ isRunning: true, status: 'running' });
        if (response.workingDirectory) {
          setWorkingDirectory(response.workingDirectory);
        }
        setShowTerminal(true); // Auto-show terminal when launching
      } else {
        alert(`Failed to launch: ${response.message || response.error}`);
      }
    } catch (error) {
      console.error('Launch error:', error);
      alert(`Error launching Claude: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      const response = await apiCall('/stop', 'POST');
      
      if (response.success) {
        setProcessStatus({ isRunning: false, status: 'stopped' });
      }
    } catch (error) {
      console.error('Stop error:', error);
      alert(`Error stopping Claude: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusDisplay = () => {
    switch (processStatus.status) {
      case 'running':
        return (
          <div className="status running">
            ✅ Running (PID: {processStatus.pid})
            {processStatus.startedAt && (
              <div className="started-time">
                Started: {new Date(processStatus.startedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        );
      case 'starting':
        return <div className="status starting">🔄 Starting...</div>;
      case 'error':
        return (
          <div className="status error">
            ❌ Error: {processStatus.error || 'Unknown error'}
          </div>
        );
      case 'stopped':
      default:
        return <div className="status stopped">⚫ Stopped</div>;
    }
  };

  const getClaudeAvailabilityDisplay = () => {
    if (claudeAvailable === null) return '🔄 Checking...';
    return claudeAvailable ? '✅ Available' : '⚠️ Check Required';
  };

  return (
    <div className="simple-launcher">
      <h1>Claude Code Launcher</h1>
      <p>Simple process launcher - no social features, no users</p>

      {/* System Information */}
      <div className="system-info">
        <div><strong>Claude Code:</strong> <span data-testid="claude-availability">{getClaudeAvailabilityDisplay()}</span></div>
        <div><strong>Working Directory:</strong> {workingDirectory || '/prod'}</div>
      </div>

      {/* Status Display */}
      <div className="status-section">
        <h3>Process Status</h3>
        {getStatusDisplay()}
      </div>

      {/* Control Buttons */}
      <div className="controls">
        {processStatus.status !== 'running' ? (
          <div className="launch-options">
            <button
              onClick={() => handleLaunch('cd prod && claude')}
              disabled={isLoading}
              className="launch-button"
              title="Launch Claude in prod directory"
            >
              {isLoading ? '🔄 Launching...' : '🚀 prod/claude'}
            </button>
            
            <button
              onClick={() => handleLaunch('cd prod && claude --dangerously-skip-permissions')}
              disabled={isLoading}
              className="launch-button skip-perms"
              title="Launch with permissions skipped"
            >
              {isLoading ? '🔄 Launching...' : '⚡ skip-permissions'}
            </button>
            
            <button
              onClick={() => handleLaunch('cd prod && claude --dangerously-skip-permissions -c')}
              disabled={isLoading}
              className="launch-button skip-perms-c"
              title="Launch with permissions skipped and -c flag"
            >
              {isLoading ? '🔄 Launching...' : '⚡ skip-permissions -c'}
            </button>
            
            <button
              onClick={() => handleLaunch('cd prod && claude --dangerously-skip-permissions --resume')}
              disabled={isLoading}
              className="launch-button skip-perms-resume"
              title="Resume with permissions skipped"
            >
              {isLoading ? '🔄 Launching...' : '↻ skip-permissions --resume'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleStop}
            disabled={isLoading}
            className="stop-button"
          >
            {isLoading ? '🔄 Stopping...' : '🛑 Stop Claude'}
          </button>
        )}
      </div>

      {claudeAvailable === false && (
        <div className="warning">
          ⚠️ Unable to verify Claude Code CLI. You can still try launching.
        </div>
      )}

      {/* Terminal Integration */}
      {processStatus.status === 'running' && (
        <div className="terminal-section mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">🔬 Claude Terminal - Deep Diagnostic</h3>
            <div className="flex items-center space-x-2">
              <select
                value={terminalMode}
                onChange={(e) => setTerminalMode(e.target.value as any)}
                className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value="original">📟 Original</option>
                <option value="fixed">🔧 Fixed</option>
                <option value="diagnostic">🔬 Diagnostic</option>
                <option value="comparison">🔍 Comparison</option>
              </select>
              <button
                onClick={() => setShowTerminal(!showTerminal)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {showTerminal ? '🔽 Hide Terminal' : '🔼 Show Terminal'}
              </button>
            </div>
          </div>
          
          {showTerminal && (
            <div className="space-y-6">
              {terminalMode === 'original' && (
                <div>
                  <h4 className="text-md font-medium text-gray-300 mb-2">📟 Original Terminal</h4>
                  <TerminalComponent 
                    isVisible={showTerminal}
                    processStatus={processStatus}
                    initialCommand={selectedCommand}
                  />
                </div>
              )}
              
              {terminalMode === 'fixed' && (
                <div>
                  <h4 className="text-md font-medium text-gray-300 mb-2">🔧 Fixed Terminal</h4>
                  <TerminalEmergencyFixed 
                    isVisible={showTerminal}
                    processStatus={processStatus}
                    initialCommand={selectedCommand}
                  />
                </div>
              )}
              
              {terminalMode === 'diagnostic' && (
                <div>
                  <h4 className="text-md font-medium text-red-400 mb-2">🔬 Diagnostic Terminal (Deep Analysis)</h4>
                  <TerminalDiagnostic 
                    isVisible={showTerminal}
                    processStatus={processStatus}
                  />
                </div>
              )}
              
              {terminalMode === 'comparison' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-300 mb-2">🔧 Fixed Terminal</h4>
                    <TerminalEmergencyFixed 
                      isVisible={showTerminal}
                      processStatus={processStatus}
                    />
                  </div>
                  
                  <div className="border-t border-red-500 pt-6">
                    <h4 className="text-md font-medium text-red-400 mb-2">🔬 Diagnostic Terminal</h4>
                    <TerminalDiagnostic 
                      isVisible={showTerminal}
                      processStatus={processStatus}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <style>{`
        .simple-launcher {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        h1 {
          color: #333;
          text-align: center;
        }

        p {
          text-align: center;
          color: #666;
          font-style: italic;
          margin-bottom: 30px;
        }

        .system-info {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .system-info div {
          margin: 5px 0;
        }

        .status-section {
          background: #fff;
          border: 2px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }

        .status {
          font-size: 18px;
          font-weight: bold;
          padding: 10px;
          border-radius: 6px;
          margin: 10px 0;
        }

        .status.running {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .status.starting {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }

        .status.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .status.stopped {
          background: #e2e3e5;
          color: #383d41;
          border: 1px solid #d6d8db;
        }

        .started-time {
          font-size: 14px;
          font-weight: normal;
          margin-top: 5px;
          opacity: 0.8;
        }

        .controls {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin: 30px 0;
        }

        .launch-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          width: 100%;
          max-width: 600px;
        }

        .launch-button, .stop-button {
          padding: 12px 16px;
          font-size: 14px;
          font-weight: bold;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .launch-button {
          background: #28a745;
          color: white;
        }

        .launch-button.skip-perms {
          background: #ffc107;
          color: #212529;
        }

        .launch-button.skip-perms-c {
          background: #fd7e14;
          color: white;
        }

        .launch-button.skip-perms-resume {
          background: #6f42c1;
          color: white;
        }

        .launch-button:hover:not(:disabled) {
          background: #218838;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .launch-button.skip-perms:hover:not(:disabled) {
          background: #e0a800;
        }

        .launch-button.skip-perms-c:hover:not(:disabled) {
          background: #e85d04;
        }

        .launch-button.skip-perms-resume:hover:not(:disabled) {
          background: #5a2d7e;
        }

        .launch-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .stop-button {
          background: #dc3545;
          color: white;
        }

        .stop-button:hover:not(:disabled) {
          background: #c82333;
        }

        .stop-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .warning {
          background: #fff3cd;
          color: #856404;
          padding: 15px;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          text-align: center;
          margin-top: 20px;
        }

        .terminal-section {
          background: #f8f9fa;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
        }

        .terminal-section h3 {
          margin-top: 0;
          color: #495057;
        }

        .terminal-section p {
          color: #6c757d;
          margin-bottom: 15px;
          text-align: left;
          font-style: normal;
        }
      `}</style>
    </div>
  );
};

export default SimpleLauncher;