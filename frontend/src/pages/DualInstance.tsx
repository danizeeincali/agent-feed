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
import { io, Socket } from 'socket.io-client';
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
        selection: '#264f78',
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

    // Connect to WebSocket
    const socket = io('http://localhost:3002', {
      transports: ['websocket'],
      path: '/terminal'
    });

    socketRef.current = socket;

    // Socket event handlers
    socket.on('connect', () => {
      console.log('Terminal WebSocket connected');
      term.writeln('\x1b[32m✓ Connected to terminal server\x1b[0m');
      
      // Request current process info
      socket.emit('process:info');
    });

    socket.on('terminal:data', (data: TerminalData) => {
      if (data.type === 'output' || data.type === 'process-output') {
        term.write(data.data);
      }
    });

    socket.on('terminal:buffer', ({ buffer }) => {
      if (buffer) {
        term.write(buffer);
      }
    });

    socket.on('process:info', (info: ProcessInfo) => {
      setProcessInfo(info);
    });

    socket.on('process:launched', (info: ProcessInfo) => {
      setProcessInfo(info);
      setIsLaunching(false);
      setLastError(null);
      term.writeln('\x1b[32m✓ Claude instance launched successfully\x1b[0m');
    });

    socket.on('process:killed', () => {
      setProcessInfo(prev => ({ ...prev, status: 'stopped', pid: null }));
      term.writeln('\x1b[33m⚠ Claude instance stopped\x1b[0m');
    });

    socket.on('process:error', ({ message, action }) => {
      setLastError(message);
      setIsLaunching(false);
      term.writeln(`\x1b[31m✗ Error during ${action}: ${message}\x1b[0m`);
      alert(`Failed to ${action} Claude instance: ${message}`);
    });

    socket.on('terminal:broadcast', (data: any) => {
      if (data.type === 'auto-restart') {
        term.writeln('\x1b[33m🔄 Auto-restart triggered\x1b[0m');
      }
    });

    socket.on('disconnect', () => {
      console.log('Terminal WebSocket disconnected');
      term.writeln('\x1b[31m✗ Disconnected from terminal server\x1b[0m');
    });

    // Terminal input handler
    term.onData((data) => {
      socket.emit('terminal:input', data);
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
        socket.emit('terminal:resize', {
          cols: term.cols,
          rows: term.rows
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      term.dispose();
    };
  }, []);

  // Launch instance
  const handleLaunch = useCallback(() => {
    if (socketRef.current && !isLaunching) {
      setIsLaunching(true);
      setLastError(null);
      
      socketRef.current.emit('process:launch', {
        autoRestartHours,
        workingDirectory: '/workspaces/agent-feed/prod',
        resumeOnRestart: true,
        agentLinkEnabled: true
      });
    }
  }, [autoRestartHours, isLaunching]);

  // Kill instance
  const handleKill = useCallback(() => {
    if (socketRef.current && processInfo.status === 'running') {
      if (confirm('Are you sure you want to stop the Claude instance?')) {
        socketRef.current.emit('process:kill');
      }
    }
  }, [processInfo.status]);

  // Restart instance
  const handleRestart = useCallback(() => {
    if (socketRef.current && processInfo.status === 'running') {
      socketRef.current.emit('process:restart');
    }
  }, [processInfo.status]);

  // Update auto-restart configuration
  const handleConfigUpdate = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('process:config', {
        autoRestartHours
      });
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