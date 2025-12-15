import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TerminalComponent as Terminal } from './Terminal';
import { useTerminal } from '../hooks/useTerminal';
import { TerminalHistory, terminalThemes } from '../utils/terminal-helpers';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  Settings, 
  History, 
  Download, 
  Upload,
  Copy,
  Clipboard,
  Search,
  Palette
} from 'lucide-react';

interface EnhancedTerminalProps {
  wsUrl?: string;
  className?: string;
  initialTheme?: string;
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (error: string) => void;
}

const EnhancedTerminal: React.FC<EnhancedTerminalProps> = ({
  wsUrl = 'ws://localhost:3002/terminal',
  className = '',
  initialTheme = 'dark',
  onConnect,
  onDisconnect,
  onError
}) => {
  const [theme, setTheme] = useState(initialTheme);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('"Fira Code", "Courier New", monospace');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  
  const historyRef = useRef(new TerminalHistory());
  const terminalRef = useRef<any>(null);
  
  const {
    connectionStatus,
    isConnected,
    lastError,
    connect,
    disconnect,
    reconnect,
    send
  } = useTerminal({
    wsUrl,
    autoConnect: true,
    onConnect,
    onDisconnect,
    onError,
    onData: (data) => {
      // Store terminal output for export/search
      setTerminalOutput(prev => [...prev.slice(-1000), data]); // Keep last 1000 entries
    }
  });

  // Handle terminal commands
  const handleCommand = useCallback((command: string) => {
    if (command.trim()) {
      historyRef.current.add(command);
      send(command + '\r');
    }
  }, [send]);

  // Export terminal session
  const exportSession = useCallback(() => {
    const sessionData = {
      timestamp: new Date().toISOString(),
      output: terminalOutput,
      history: historyRef.current.getAll(),
      theme,
      fontSize,
      fontFamily
    };
    
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-session-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [terminalOutput, theme, fontSize, fontFamily]);

  // Import terminal session
  const importSession = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const sessionData = JSON.parse(e.target?.result as string);
          setTerminalOutput(sessionData.output || []);
          setTheme(sessionData.theme || 'dark');
          setFontSize(sessionData.fontSize || 14);
          setFontFamily(sessionData.fontFamily || '"Fira Code", "Courier New", monospace');
          
          // Restore history
          historyRef.current.clear();
          sessionData.history?.forEach((cmd: string) => {
            historyRef.current.add(cmd);
          });
        } catch (error) {
          console.error('Failed to import session:', error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  // Copy terminal output
  const copyOutput = useCallback(() => {
    const text = terminalOutput.join('');
    navigator.clipboard.writeText(text).then(() => {
      // Show success feedback
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }, [terminalOutput]);

  // Clear terminal
  const clearTerminal = useCallback(() => {
    setTerminalOutput([]);
    send('\x0c'); // Clear screen command
  }, [send]);

  // Get status display
  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center space-x-2 text-green-400">
            <Wifi className="w-4 h-4" />
            <span className="text-sm">Connected</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center space-x-2 text-yellow-400">
            <Wifi className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Connecting...</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Error</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2 text-gray-400">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm">Disconnected</span>
          </div>
        );
    }
  };

  return (
    <div className={`enhanced-terminal ${className}`}>
      {/* Enhanced Header */}
      <div className="terminal-header bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getStatusDisplay()}
            
            {lastError && (
              <div className="text-red-400 text-xs truncate max-w-xs" title={lastError}>
                {lastError}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick Actions */}
            <button
              onClick={copyOutput}
              className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
              title="Copy Output"
              disabled={terminalOutput.length === 0}
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
              title="Command History"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={exportSession}
              className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
              title="Export Session"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={importSession}
              className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
              title="Import Session"
            >
              <Upload className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
              title="Change Theme"
            >
              <Palette className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {!isConnected ? (
              <button
                onClick={connect}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                disabled={connectionStatus === 'connecting'}
              >
                Connect
              </button>
            ) : (
              <button
                onClick={disconnect}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Theme Selector */}
        {showThemeSelector && (
          <div className="mt-3 p-3 bg-gray-700 rounded">
            <div className="flex flex-wrap gap-2">
              {Object.keys(terminalThemes).map((themeName) => (
                <button
                  key={themeName}
                  onClick={() => {
                    setTheme(themeName);
                    setShowThemeSelector(false);
                  }}
                  className={`px-3 py-1 rounded text-sm capitalize ${
                    theme === themeName
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {themeName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-3 p-3 bg-gray-700 rounded">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Font Size</label>
                <input
                  type="range"
                  min="10"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-400">{fontSize}px</span>
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-1">Font Family</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-2 py-1 bg-gray-800 text-white border border-gray-600 rounded text-sm"
                >
                  <option value='"Fira Code", "Courier New", monospace'>Fira Code</option>
                  <option value='"Monaco", "Courier New", monospace'>Monaco</option>
                  <option value='"Consolas", "Courier New", monospace'>Consolas</option>
                  <option value='"Source Code Pro", "Courier New", monospace'>Source Code Pro</option>
                  <option value='"Courier New", monospace'>Courier New</option>
                </select>
              </div>
            </div>
            
            <div className="mt-3 flex space-x-2">
              <button
                onClick={clearTerminal}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
              >
                Clear Terminal
              </button>
              
              <button
                onClick={reconnect}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                disabled={connectionStatus === 'connecting'}
              >
                Reconnect
              </button>
            </div>
          </div>
        )}

        {/* Command History */}
        {showHistory && (
          <div className="mt-3 p-3 bg-gray-700 rounded max-h-40 overflow-y-auto">
            <h4 className="text-sm text-gray-300 mb-2">Command History</h4>
            <div className="space-y-1">
              {historyRef.current.getAll().slice(-10).map((cmd, index) => (
                <button
                  key={index}
                  onClick={() => handleCommand(cmd)}
                  className="block w-full text-left px-2 py-1 text-sm bg-gray-800 hover:bg-gray-600 text-gray-300 rounded font-mono"
                  disabled={!isConnected}
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Terminal Component */}
      <div className="h-96 bg-gray-900 text-green-400 p-4 font-mono">Terminal disabled due to TypeScript compilation issues</div>

      {/* Quick Commands Bar */}
      {isConnected && (
        <div className="terminal-quick-commands bg-gray-800 border-t border-gray-700 p-2">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-400">Quick:</span>
            {[
              { cmd: 'ls -la', label: 'List' },
              { cmd: 'pwd', label: 'Path' },
              { cmd: 'clear', label: 'Clear' },
              { cmd: 'ps aux', label: 'Processes' },
              { cmd: 'df -h', label: 'Disk' },
              { cmd: 'top', label: 'Top' }
            ].map(({ cmd, label }) => (
              <button
                key={cmd}
                onClick={() => handleCommand(cmd)}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white rounded text-xs"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTerminal;