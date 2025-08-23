/**
 * Terminal View Component
 * 
 * xterm.js-based terminal interface for Claude instances with WebSocket
 * communication, multi-tab synchronization, and session management.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import { 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  Square, 
  Download, 
  Upload,
  Search,
  Copy,
  Settings,
  Maximize,
  Minimize
} from 'lucide-react';
import { useTerminalSocket } from '@/hooks/useTerminalSocket';
import { useNotification } from '@/hooks/useNotification';

interface TerminalSettings {
  fontSize: number;
  fontFamily: string;
  theme: 'dark' | 'light';
  cursorBlink: boolean;
  scrollback: number;
}

const DEFAULT_SETTINGS: TerminalSettings = {
  fontSize: 14,
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
  theme: 'dark',
  cursorBlink: true,
  scrollback: 1000
};

const THEMES = {
  dark: {
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
  },
  light: {
    background: '#ffffff',
    foreground: '#333333',
    cursor: '#333333',
    selection: '#add6ff',
    black: '#000000',
    red: '#cd3131',
    green: '#00bc00',
    yellow: '#949800',
    blue: '#0451a5',
    magenta: '#bc05bc',
    cyan: '#0598bc',
    white: '#555555',
    brightBlack: '#666666',
    brightRed: '#cd3131',
    brightGreen: '#14ce14',
    brightYellow: '#b5ba00',
    brightBlue: '#0451a5',
    brightMagenta: '#bc05bc',
    brightCyan: '#0598bc',
    brightWhite: '#a5a5a5'
  }
};

export const TerminalView: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  
  const [settings, setSettings] = useState<TerminalSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const { addNotification } = useNotification();
  
  // Create showNotification wrapper for backward compatibility
  const showNotification = useCallback((notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
  }) => {
    try {
      addNotification(notification);
    } catch (error) {
      console.error('Notification failed:', error);
      // Fallback to console for critical errors
      console.log(`${notification.type.toUpperCase()}: ${notification.title}${notification.message ? ` - ${notification.message}` : ''}`);
    }
  }, [addNotification]);
  
  const {
    connected,
    connecting,
    instanceInfo,
    connect,
    disconnect,
    sendInput,
    sendResize,
    error,
    history
  } = useTerminalSocket();

  /**
   * Initialize terminal
   */
  const initializeTerminal = useCallback(() => {
    if (!terminalRef.current || terminal.current) {
      return;
    }

    // Create terminal instance with error handling
    let term: Terminal;
    console.log('🔍 DEBUG: Creating Terminal instance with settings:', settings);
    console.log('🔍 DEBUG: Using theme:', THEMES[settings.theme]);
    
    try {
      term = new Terminal({
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        theme: THEMES[settings.theme],
        cursorBlink: settings.cursorBlink,
        scrollback: settings.scrollback,
        allowTransparency: true,
        macOptionIsMeta: true,
        rightClickSelectsWord: true,
        allowProposedApi: true
      });
      console.log('✅ DEBUG: Terminal instance created successfully:', term);
      console.log('🔍 DEBUG: Terminal methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(term)));
    } catch (error) {
      console.error('❌ CRITICAL DEBUG: Terminal initialization failed:', error);
      showNotification({
        type: 'error',
        title: 'Terminal Initialization Failed',
        message: 'Unable to create terminal instance. Please refresh the page.',
        duration: 10000
      });
      return;
    }

    // Create and load essential addons with error handling
    let fit: FitAddon | null = null;
    let webLinks: WebLinksAddon | null = null;
    let search: SearchAddon | null = null;

    try {
      fit = new FitAddon();
      term.loadAddon(fit);
      fitAddon.current = fit;
    } catch (error) {
      console.error('FitAddon failed to load:', error);
      fitAddon.current = null;
    }

    try {
      webLinks = new WebLinksAddon();
      term.loadAddon(webLinks);
    } catch (error) {
      console.warn('WebLinksAddon failed to load, web links disabled:', error);
    }

    try {
      search = new SearchAddon();
      term.loadAddon(search);
      searchAddon.current = search;
    } catch (error) {
      console.warn('SearchAddon failed to load, search functionality disabled:', error);
      searchAddon.current = null;
      // Notify user that search is unavailable
      showNotification({
        type: 'warning',
        title: 'Search Disabled',
        message: 'Terminal search functionality is temporarily unavailable.',
        duration: 5000
      });
    }

    // Store terminal reference
    terminal.current = term;

    // Open terminal with error handling
    try {
      term.open(terminalRef.current);
      if (fit) {
        fit.fit();
      }
    } catch (error) {
      console.error('Terminal open/fit failed:', error);
      showNotification({
        type: 'error',
        title: 'Terminal Display Error',
        message: 'Terminal failed to display properly. Please refresh the page.',
        duration: 10000
      });
    }

    // Handle input with EXTENSIVE DEBUGGING
    console.log('🔍 CRITICAL DEBUG: Setting up terminal onData handler in TerminalView');
    const inputHandler = (data: string) => {
      console.log('🎯 CRITICAL DEBUG: TerminalView xterm.js onData fired!');
      console.log('🎯 CRITICAL DEBUG: Input data:', JSON.stringify(data));
      console.log('🎯 CRITICAL DEBUG: Data length:', data.length);
      console.log('🎯 CRITICAL DEBUG: Data char codes:', Array.from(data).map(c => c.charCodeAt(0)));
      console.log('🎯 CRITICAL DEBUG: Connected state:', connected);
      console.log('🎯 CRITICAL DEBUG: sendInput function:', typeof sendInput);
      
      if (connected) {
        console.log('📤 CRITICAL DEBUG: Calling sendInput with data');
        try {
          sendInput(data);
          console.log('✅ CRITICAL DEBUG: sendInput called successfully');
        } catch (error) {
          console.error('❌ CRITICAL DEBUG: Error calling sendInput:', error);
        }
      } else {
        console.warn('⚠️ CRITICAL DEBUG: Not connected, cannot send input');
      }
    };
    
    try {
      const disposable = term.onData(inputHandler);
      console.log('✅ CRITICAL DEBUG: Terminal onData handler attached successfully:', disposable);
    } catch (error) {
      console.error('❌ CRITICAL DEBUG: Failed to attach onData handler:', error);
    }

    // Handle resize
    term.onResize((size) => {
      if (connected) {
        sendResize(size.cols, size.rows);
      }
    });

    // Handle selection
    term.onSelectionChange(() => {
      const selection = term.getSelection();
      if (selection) {
        // Copy to clipboard if supported
        if (navigator.clipboard) {
          navigator.clipboard.writeText(selection);
        }
      }
    });

    // Fit terminal on window resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      terminal.current = null;
      fitAddon.current = null;
      searchAddon.current = null;
    };
  }, [settings, connected, sendInput, sendResize]);

  /**
   * Handle terminal data
   */
  useEffect(() => {
    if (history && terminal.current) {
      // Write history to terminal
      history.forEach(data => {
        terminal.current?.write(data);
      });
    }
  }, [history]);

  /**
   * Connect to instance terminal
   */
  useEffect(() => {
    if (instanceId && !connected && !connecting) {
      connect(instanceId);
    }
  }, [instanceId, connected, connecting, connect]);

  /**
   * Initialize terminal on mount
   */
  useEffect(() => {
    const cleanup = initializeTerminal();
    return cleanup;
  }, [initializeTerminal]);

  /**
   * Handle connection errors
   */
  useEffect(() => {
    if (error) {
      showNotification({
        type: 'error',
        title: 'Terminal Connection Error',
        message: error,
        duration: 5000
      });

      // Auto-reconnect with exponential backoff
      if (reconnectAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          if (instanceId) {
            connect(instanceId);
          }
        }, delay);
      }
    }
  }, [error, reconnectAttempts, instanceId, connect, showNotification]);

  /**
   * Reset reconnect attempts on successful connection
   */
  useEffect(() => {
    if (connected) {
      setReconnectAttempts(0);
    }
  }, [connected]);

  /**
   * Update terminal settings
   */
  const updateSettings = (newSettings: Partial<TerminalSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    if (terminal.current) {
      terminal.current.options.fontSize = updated.fontSize;
      terminal.current.options.fontFamily = updated.fontFamily;
      terminal.current.options.theme = THEMES[updated.theme];
      terminal.current.options.cursorBlink = updated.cursorBlink;
      terminal.current.options.scrollback = updated.scrollback;

      // Fit after settings change
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    }

    // Save to localStorage
    localStorage.setItem('terminal-settings', JSON.stringify(updated));
  };

  /**
   * Load settings from localStorage
   */
  useEffect(() => {
    const saved = localStorage.getItem('terminal-settings');
    if (saved) {
      try {
        const savedSettings = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
      } catch (error) {
        console.warn('Failed to load terminal settings:', error);
      }
    }
  }, []);

  /**
   * Handle search with fallback
   */
  const handleSearch = (query: string, direction: 'next' | 'previous' = 'next') => {
    if (!searchAddon.current) {
      showNotification({
        type: 'info',
        title: 'Search Unavailable',
        message: 'Terminal search is currently disabled. Try refreshing the page.',
        duration: 3000
      });
      return;
    }

    if (!query.trim()) {
      return;
    }

    try {
      if (direction === 'next') {
        searchAddon.current.findNext(query);
      } else {
        searchAddon.current.findPrevious(query);
      }
    } catch (error) {
      console.error('Search operation failed:', error);
      showNotification({
        type: 'error',
        title: 'Search Error',
        message: 'Search operation failed. Please try again.',
        duration: 3000
      });
    }
  };

  /**
   * Clear terminal
   */
  const clearTerminal = () => {
    if (terminal.current) {
      terminal.current.clear();
    }
  };

  /**
   * Download terminal content
   */
  const downloadContent = () => {
    if (terminal.current) {
      const content = terminal.current.getSelection() || terminal.current.buffer.active.toString();
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `terminal-${instanceId}-${new Date().toISOString()}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  /**
   * Copy selection
   */
  const copySelection = () => {
    if (terminal.current) {
      const selection = terminal.current.getSelection();
      if (selection && navigator.clipboard) {
        navigator.clipboard.writeText(selection);
        showNotification({
          type: 'success',
          title: 'Copied',
          message: 'Selection copied to clipboard',
          duration: 2000
        });
      }
    }
  };

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Fit terminal after fullscreen toggle
    setTimeout(() => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    }, 100);
  };

  /**
   * Reconnect
   */
  const handleReconnect = () => {
    if (instanceId) {
      setReconnectAttempts(0);
      connect(instanceId);
    }
  };

  /**
   * Disconnect and go back
   */
  const handleDisconnect = () => {
    disconnect();
    navigate('/dual-instance');
  };

  const connectionStatus = connected ? 'connected' : connecting ? 'connecting' : 'disconnected';

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b bg-white ${isFullscreen ? 'bg-gray-900 border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          {/* Instance Info */}
          <div>
            <h2 className={`text-lg font-semibold ${isFullscreen ? 'text-white' : 'text-gray-900'}`}>
              Terminal: {instanceInfo?.name || instanceId}
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <div className={`flex items-center gap-1 ${
                connectionStatus === 'connected' ? 'text-green-600' :
                connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {connectionStatus === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {connectionStatus}
              </div>
              {instanceInfo && (
                <span className={isFullscreen ? 'text-gray-300' : 'text-gray-600'}>
                  • {instanceInfo.type} • PID: {instanceInfo.pid}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${
              isFullscreen ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Copy */}
          <button
            onClick={copySelection}
            className={`p-2 rounded-lg transition-colors ${
              isFullscreen ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Copy Selection"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Download */}
          <button
            onClick={downloadContent}
            className={`p-2 rounded-lg transition-colors ${
              isFullscreen ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Download Content"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              isFullscreen ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg transition-colors ${
              isFullscreen ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Reconnect */}
          {!connected && (
            <button
              onClick={handleReconnect}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reconnect
            </button>
          )}

          {/* Disconnect */}
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Square className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className={`p-3 border-b ${isFullscreen ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery, e.shiftKey ? 'previous' : 'next');
                }
              }}
              placeholder="Search terminal..."
              className={`flex-1 px-3 py-1 rounded border ${
                isFullscreen 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <button
              onClick={() => handleSearch(searchQuery, 'previous')}
              className={`px-2 py-1 text-sm ${
                isFullscreen ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              } rounded`}
            >
              ↑
            </button>
            <button
              onClick={() => handleSearch(searchQuery, 'next')}
              className={`px-2 py-1 text-sm ${
                isFullscreen ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              } rounded`}
            >
              ↓
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className={`p-4 border-b ${isFullscreen ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isFullscreen ? 'text-gray-300' : 'text-gray-700'}`}>
                Font Size
              </label>
              <input
                type="range"
                min="10"
                max="24"
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                className="w-full"
              />
              <span className={`text-xs ${isFullscreen ? 'text-gray-400' : 'text-gray-500'}`}>
                {settings.fontSize}px
              </span>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isFullscreen ? 'text-gray-300' : 'text-gray-700'}`}>
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as 'dark' | 'light' })}
                className={`w-full px-2 py-1 text-sm rounded border ${
                  isFullscreen 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isFullscreen ? 'text-gray-300' : 'text-gray-700'}`}>
                Font Family
              </label>
              <select
                value={settings.fontFamily}
                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                className={`w-full px-2 py-1 text-sm rounded border ${
                  isFullscreen 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value="Monaco, Menlo, 'Ubuntu Mono', monospace">Monaco</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Fira Code', monospace">Fira Code</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="cursorBlink"
                checked={settings.cursorBlink}
                onChange={(e) => updateSettings({ cursorBlink: e.target.checked })}
                className="mr-2"
              />
              <label 
                htmlFor="cursorBlink" 
                className={`text-sm ${isFullscreen ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Cursor Blink
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Container */}
      <div className="flex-1 relative">
        <div
          ref={terminalRef}
          className="absolute inset-0 p-2"
          style={{ 
            backgroundColor: THEMES[settings.theme].background,
            fontFamily: settings.fontFamily 
          }}
        />
        
        {/* Connection Overlay */}
        {!connected && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 text-center max-w-md">
              <div className="mb-4">
                {connecting ? (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Connecting to terminal...
                  </div>
                ) : error ? (
                  <div className="text-red-600">
                    <WifiOff className="w-8 h-8 mx-auto mb-2" />
                    Connection failed
                    <div className="text-sm mt-1">{error}</div>
                  </div>
                ) : (
                  <div className="text-gray-600">
                    <WifiOff className="w-8 h-8 mx-auto mb-2" />
                    Not connected
                  </div>
                )}
              </div>
              
              {!connecting && (
                <button
                  onClick={handleReconnect}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {error ? 'Retry Connection' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalView;