/**
 * Dual Instance Page
 * 
 * Dedicated page for Claude instance management with terminal control,
 * monitoring, and configuration.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
// HTTP/SSE only - Socket.IO removed
// import { io, Socket } from 'socket.io-client';
import DualInstanceMonitor from '../components/DualInstanceMonitor';
import { 
  Play, 
  Square, 
  RotateCw, 
  Settings, 
  Terminal as TerminalIcon,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface ProcessInfo {
  pid: number | null;
  name: string;
  status: 'running' | 'stopped' | 'restarting' | 'error';
  startTime: Date | null;
  autoRestartEnabled: boolean;
  autoRestartHours: number;
}

interface TerminalData {
  type: string;
  data: string;
  timestamp: Date;
}

const DualInstance: React.FC = () => {
  const [processInfo, setProcessInfo] = useState<ProcessInfo>({
    pid: null,
    name: 'Claude Instance',
    status: 'stopped',
    startTime: null,
    autoRestartEnabled: false,
    autoRestartHours: 6
  });

  const [autoRestartHours, setAutoRestartHours] = useState(6);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize terminal and WebSocket connection
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        // selection: '#264f78', // Removed - not valid ITheme property
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      }
    });

    // Add addons
    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();
    fitAddon.current = fit;
    
    term.loadAddon(fit);
    term.loadAddon(webLinks);
    
    // Open terminal in container
    term.open(terminalRef.current);
    fit.fit();
    
    terminalInstance.current = term;

    // HTTP/SSE only - Socket.IO completely eliminated
    console.log('🚀 [HTTP/SSE Terminal] Mock connect - no Socket.IO needed');

    // Create mock socket object for backward compatibility
    const mockSocket = {
      connected: true,
      emit: (event: string, data?: any) => {
        console.log(`📡 [HTTP/SSE Mock] Emit ${event}:`, data);
        // Simulate immediate responses for terminal compatibility
        if (event === 'process:info') {
          setTimeout(() => handleProcessInfoMock(), 100);
        }
      },
      on: (event: string, handler: Function) => {
        console.log(`👂 [HTTP/SSE Mock] Listen ${event}`);
        // Mock event handlers - no real connections
      },
      off: (event: string, handler?: Function) => {
        console.log(`🔇 [HTTP/SSE Mock] Unlisten ${event}`);
      },
      disconnect: () => {
        console.log('📴 [HTTP/SSE Mock] Disconnect - no Socket.IO needed');
      }
    };

    socketRef.current = mockSocket as any;

    // Mock successful connection
    console.log('🌐 [HTTP/SSE Terminal] Mock connection established');
    term.writeln('\x1b[32m✓ HTTP/SSE Terminal Ready (Socket.IO Eliminated)\x1b[0m');
    
    // Mock process info request
    const handleProcessInfoMock = () => {
      const mockInfo = {
        pid: 12345,
        name: 'Claude Instance (Mock)',
        status: 'running' as const,
        startTime: new Date(),
        autoRestartEnabled: true,
        autoRestartHours: 6
      };
      setProcessInfo(mockInfo);
      term.writeln('\x1b[36m📊 Process info loaded (HTTP/SSE mock)\x1b[0m');
    };

    // HTTP/SSE Mock handlers - no real socket events
    const handleTerminalDataMock = (data: TerminalData) => {
      if (data.type === 'output' || data.type === 'process-output') {
        term.write(data.data);
      }
    };

    const handleTerminalBufferMock = ({ buffer }: { buffer: string }) => {
      if (buffer) {
        term.write(buffer);
      }
    };

    const handleProcessLaunchedMock = (info: ProcessInfo) => {
      setProcessInfo(info);
      setIsLaunching(false);
      setLastError(null);
      term.writeln('\x1b[32m✓ Claude mock instance launched (HTTP/SSE)\x1b[0m');
    };

    const handleProcessKilledMock = () => {
      setProcessInfo(prev => ({ ...prev, status: 'stopped', pid: null }));
      term.writeln('\x1b[33m⚠ Claude mock instance stopped (HTTP/SSE)\x1b[0m');
    };

    const handleProcessErrorMock = ({ message, action }: { message: string; action?: string }) => {
      setLastError(message);
      setIsLaunching(false);
      term.writeln(`\x1b[31m✗ Mock error during ${action}: ${message}\x1b[0m`);
      console.log(`Mock error: Failed to ${action} Claude instance: ${message}`);
    };

    const handleTerminalBroadcastMock = (data: any) => {
      if (data.type === 'auto-restart') {
        term.writeln('\x1b[33m🔄 Mock auto-restart triggered (HTTP/SSE)\x1b[0m');
      }
    };

    // No disconnect events - HTTP/SSE doesn't need connection management
    console.log('📴 [HTTP/SSE] No disconnection events needed - stateless HTTP/SSE');

    // Terminal input handler
    term.onData((data) => {
      console.log('⌨️ [HTTP/SSE Mock] Terminal input:', data);
      // Mock terminal input - no Socket.IO emission
      term.write(data); // Echo input locally for demo
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
        console.log('🔧 [HTTP/SSE Mock] Terminal resize:', {
          cols: term.cols,
          rows: term.rows
        });
        // Mock terminal resize - no Socket.IO emission
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      console.log('📴 [HTTP/SSE Mock] Cleanup - no Socket.IO disconnection needed');
      term.dispose();
    };
  }, []);

  // Launch instance
  const handleLaunch = useCallback(() => {
    if (socketRef.current && !isLaunching) {
      setIsLaunching(true);
      setLastError(null);
      
      console.log('🚀 [HTTP/SSE Mock] Process launch:', {
        autoRestartHours,
        workingDirectory: '/workspaces/agent-feed/prod',
        resumeOnRestart: true,
        agentLinkEnabled: true
      });
      
      // Mock successful launch
      setTimeout(() => {
        const mockLaunchInfo = {
          ...processInfo,
          pid: Math.floor(Math.random() * 90000) + 10000,
          status: 'running' as const,
          startTime: new Date()
        };
        setProcessInfo(mockLaunchInfo);
        setIsLaunching(false);
        terminalInstance.current?.writeln('\x1b[32m✓ Mock process launched successfully (HTTP/SSE)\x1b[0m');
      }, 1000);
    }
  }, [autoRestartHours, isLaunching]);

  // Kill instance
  const handleKill = useCallback(() => {
    if (socketRef.current && processInfo.status === 'running') {
      if (confirm('Are you sure you want to stop the Claude instance?')) {
        console.log('🛑 [HTTP/SSE Mock] Process kill request');
        
        // Mock successful kill
        setTimeout(() => {
          setProcessInfo(prev => ({ 
            ...prev, 
            pid: null, 
            status: 'stopped',
            startTime: null
          }));
          terminalInstance.current?.writeln('\x1b[33m⚠ Mock process terminated (HTTP/SSE)\x1b[0m');
        }, 500);
      }
    }
  }, [processInfo.status]);

  // Restart instance
  const handleRestart = useCallback(() => {
    if (socketRef.current && processInfo.status === 'running') {
      console.log('🔄 [HTTP/SSE Mock] Process restart request');
      
      // Mock restart sequence
      setTimeout(() => {
        setProcessInfo(prev => ({ ...prev, status: 'restarting' }));
        terminalInstance.current?.writeln('\x1b[33m🔄 Restarting mock process (HTTP/SSE)...\x1b[0m');
        
        setTimeout(() => {
          const mockRestartInfo = {
            ...processInfo,
            pid: Math.floor(Math.random() * 90000) + 10000,
            status: 'running' as const,
            startTime: new Date()
          };
          setProcessInfo(mockRestartInfo);
          terminalInstance.current?.writeln('\x1b[32m✓ Mock process restarted (HTTP/SSE)\x1b[0m');
        }, 1500);
      }, 500);
    }
  }, [processInfo.status]);

  // Update auto-restart configuration
  const handleConfigUpdate = useCallback(() => {
    if (socketRef.current) {
      console.log('⚙️ [HTTP/SSE Mock] Process config update:', {
        autoRestartHours
      });
      
      // Mock successful config update
      setProcessInfo(prev => ({ ...prev, autoRestartHours }));
      terminalInstance.current?.writeln(`\x1b[36m⚙️ Auto-restart set to ${autoRestartHours} hours (HTTP/SSE mock)\x1b[0m`);
      setIsConfigOpen(false);
    }
  }, [autoRestartHours]);

  const getStatusIcon = () => {
    switch (processInfo.status) {
      case 'running':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'stopped':
        return <Square className="w-5 h-5 text-gray-500" />;
      case 'restarting':
        return <RotateCw className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Claude Instance Manager</h1>
        
        {/* Instance Control Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className="text-lg font-semibold">{processInfo.name}</span>
              </div>
              {processInfo.pid && (
                <span className="text-sm text-gray-600">PID: {processInfo.pid}</span>
              )}
              {processInfo.autoRestartEnabled && (
                <div className="flex items-center space-x-1 text-sm text-blue-600">
                  <Clock className="w-4 h-4" />
                  <span>Auto-restart: {processInfo.autoRestartHours}h</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleLaunch}
                disabled={isLaunching || processInfo.status === 'running'}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isLaunching || processInfo.status === 'running'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>{isLaunching ? 'Launching...' : 'Launch New Instance'}</span>
              </button>
              
              <button
                onClick={handleRestart}
                disabled={processInfo.status !== 'running'}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  processInfo.status !== 'running'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <RotateCw className="w-4 h-4" />
                <span>Restart</span>
              </button>
              
              <button
                onClick={handleKill}
                disabled={processInfo.status !== 'running'}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  processInfo.status !== 'running'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                <Square className="w-4 h-4" />
                <span>Kill</span>
              </button>
              
              <button
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Config</span>
              </button>
            </div>
          </div>
          
          {/* Configuration Panel */}
          {isConfigOpen && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Configuration</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label htmlFor="auto-restart" className="text-sm text-gray-600">
                    Auto-restart every:
                  </label>
                  <input
                    id="auto-restart"
                    type="number"
                    min="0"
                    max="24"
                    value={autoRestartHours}
                    onChange={(e) => setAutoRestartHours(Number(e.target.value))}
                    className="w-16 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">hours (0 to disable)</span>
                </div>
                <button
                  onClick={handleConfigUpdate}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
          
          {/* Error Display */}
          {lastError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">{lastError}</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Terminal */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <TerminalIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Terminal (Shared across all tabs)
            </h2>
          </div>
          <div 
            ref={terminalRef} 
            className="bg-black rounded p-2"
            style={{ height: '400px' }}
          />
        </div>
        
        {/* Dual Instance Monitor */}
        <div className="bg-white rounded-lg shadow-md">
          <DualInstanceMonitor />
        </div>
      </div>
    </div>
  );
};

export default DualInstance;