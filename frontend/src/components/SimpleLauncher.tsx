/**
 * Simple Claude Launcher UI Component
 * Minimal design: Just Launch/Stop buttons + status display
 * No social features, no users, no complex state management
 */

import React, { useState, useEffect } from 'react';
import { TerminalComponent } from './Terminal';
import { TerminalFixed } from './TerminalFixed';
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

  // Simple HTTP API calls (no WebSocket complexity)
  const apiCall = async (endpoint: string, method: string = 'GET'): Promise<ApiResponse> => {
    const response = await fetch(`http://localhost:3001/api/claude${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  };

  // Check Claude availability on mount
  useEffect(() => {
    const checkClaude = async () => {
      try {
        const response = await apiCall('/check');
        setClaudeAvailable(response.claudeAvailable || false);
      } catch (error) {
        console.error('Error checking Claude availability:', error);
        setClaudeAvailable(false);
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

  const handleLaunch = async () => {
    setIsLoading(true);
    try {
      const response = await apiCall('/launch', 'POST');
      
      if (response.success && response.status) {
        setProcessStatus(response.status);
        if (response.workingDirectory) {
          setWorkingDirectory(response.workingDirectory);
        }
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
      
      if (response.success && response.status) {
        setProcessStatus(response.status);
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
    return claudeAvailable ? '✅ Available' : '❌ Not Found';
  };

  return (
    <div className="simple-launcher">
      <h1>Claude Code Launcher</h1>
      <p>Simple process launcher - no social features, no users</p>

      {/* System Information */}
      <div className="system-info">
        <div><strong>Claude Code:</strong> {getClaudeAvailabilityDisplay()}</div>
        <div><strong>Working Directory:</strong> {workingDirectory || '/prod'}</div>
      </div>

      {/* Status Display */}
      <div className="status-section">
        <h3>Process Status</h3>
        {getStatusDisplay()}
      </div>

      {/* Control Buttons */}
      <div className="controls">
        <button
          onClick={handleLaunch}
          disabled={isLoading || processStatus.isRunning || !claudeAvailable}
          className="launch-button"
        >
          {isLoading && processStatus.status !== 'running' ? '🔄 Launching...' : '🚀 Launch Claude'}
        </button>

        <button
          onClick={handleStop}
          disabled={isLoading || !processStatus.isRunning}
          className="stop-button"
        >
          {isLoading && processStatus.isRunning ? '🔄 Stopping...' : '🛑 Stop Claude'}
        </button>
      </div>

      {!claudeAvailable && (
        <div className="warning">
          ⚠️ Claude Code not found. Please install Claude Code CLI first.
        </div>
      )}

      {/* Terminal Integration */}
      {processStatus.isRunning && (
        <div className="terminal-section mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Claude Terminal</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setUseFixedTerminal(!useFixedTerminal)}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                title="Toggle between original and fixed terminal versions"
              >
                {useFixedTerminal ? '🔧 Fixed' : '📟 Original'}
              </button>
              <button
                onClick={() => setShowTerminal(!showTerminal)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {showTerminal ? '🔽 Hide Terminal' : '🔼 Show Terminal'}
              </button>
            </div>
          </div>
          {showTerminal && (
            useFixedTerminal ? (
              <TerminalFixed 
                isVisible={showTerminal}
                processStatus={processStatus}
              />
            ) : (
              <TerminalComponent 
                isVisible={showTerminal}
                processStatus={processStatus}
              />
            )
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

        .launch-button, .stop-button {
          padding: 12px 24px;
          font-size: 16px;
          font-weight: bold;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .launch-button {
          background: #28a745;
          color: white;
        }

        .launch-button:hover:not(:disabled) {
          background: #218838;
        }

        .launch-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
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