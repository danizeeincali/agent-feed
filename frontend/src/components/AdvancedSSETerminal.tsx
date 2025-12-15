/**
 * Advanced SSE Terminal - Demonstration of Comprehensive SSE Streaming Architecture
 * Shows prevention of message accumulation storms through intelligent processing
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useAdvancedSSEConnection from '../hooks/useAdvancedSSEConnection';
import { ProcessedMessage } from '../services/IncrementalMessageProcessor';

interface AdvancedSSETerminalProps {
  instanceId: string;
  apiUrl?: string;
  className?: string;
}

interface TerminalStats {
  messagesDisplayed: number;
  memoryUsage: string;
  connectionHealth: string;
  processingLatency: number;
  bufferSize: number;
}

export const AdvancedSSETerminal: React.FC<AdvancedSSETerminalProps> = ({
  instanceId,
  apiUrl = 'http://localhost:3000',
  className = ''
}) => {
  // Terminal state
  const [terminalContent, setTerminalContent] = useState('');
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [stats, setStats] = useState<TerminalStats>({
    messagesDisplayed: 0,
    memoryUsage: '0 KB',
    connectionHealth: 'disconnected',
    processingLatency: 0,
    bufferSize: 0
  });
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Refs
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Advanced SSE Connection
  const {
    connectionState,
    metrics,
    connectToInstance,
    disconnectFromInstance,
    getMessages,
    getUIState,
    updateScroll,
    setAutoScroll,
    scrollToBottom,
    setInstanceVisibility,
    addMessageHandler,
    addStateChangeHandler,
    getMetrics,
    flushUpdates
  } = useAdvancedSSEConnection(apiUrl, {
    autoReconnect: true,
    maxRetries: 5,
    enableBackfill: true,
    batchSize: 20,
    maxMemoryMB: 10
  });
  
  // Connect on mount
  useEffect(() => {
    console.log(`🚀 Advanced SSE Terminal initializing for instance: ${instanceId}`);
    connectToInstance(instanceId);
    
    return () => {
      disconnectFromInstance(instanceId);
    };
  }, [instanceId, connectToInstance, disconnectFromInstance]);
  
  // Setup message handler
  useEffect(() => {
    const removeMessageHandler = addMessageHandler((id, messages) => {
      if (id === instanceId && messages.length > 0) {
        // Process messages in batches to prevent UI blocking
        const content = messages.map(msg => {
          const timestamp = new Date(msg.timestamp).toLocaleTimeString();
          const typeIndicator = msg.type === 'error' ? '❌' : msg.type === 'info' ? 'ℹ️' : '';
          return `${typeIndicator}[${timestamp}] ${msg.content}`;
        }).join('');
        
        setTerminalContent(prev => prev + content);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          messagesDisplayed: prev.messagesDisplayed + messages.length,
          bufferSize: prev.bufferSize + content.length
        }));
      }
    });
    
    return removeMessageHandler;
  }, [instanceId, addMessageHandler]);
  
  // Setup state change handler
  useEffect(() => {
    const removeStateHandler = addStateChangeHandler((id, state) => {
      if (id === instanceId) {
        setStats(prev => ({
          ...prev,
          connectionHealth: state.connectionHealth,
          memoryUsage: `${state.memoryUsage} MB`,
          processingLatency: Math.round(metrics.averageLatency)
        }));
      }
    });
    
    return removeStateHandler;
  }, [instanceId, addStateChangeHandler, metrics.averageLatency]);
  
  // Handle scroll updates
  useEffect(() => {
    if (terminalRef.current) {
      updateScroll(instanceId, terminalRef.current);
    }
  }, [terminalContent, instanceId, updateScroll]);
  
  // Auto-scroll management
  useEffect(() => {
    if (isAutoScrollEnabled && terminalRef.current) {
      const element = terminalRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [terminalContent, isAutoScrollEnabled]);
  
  // Handle visibility changes for performance optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setInstanceVisibility(instanceId, isVisible);
      
      if (isVisible) {
        // Flush any pending updates when becoming visible
        flushUpdates();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [instanceId, setInstanceVisibility, flushUpdates]);
  
  // Send command to instance
  const sendCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    
    try {
      const response = await fetch(`${apiUrl}/api/v1/claude/instances/${instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: command })
      });
      
      if (response.ok) {
        // Add to history
        setCommandHistory(prev => [...prev.slice(-49), command]); // Keep last 50 commands
        setHistoryIndex(-1);
        setInputValue('');
        
        // Add command echo to terminal
        const timestamp = new Date().toLocaleTimeString();
        const echo = `[${timestamp}] $ ${command}\n`;
        setTerminalContent(prev => prev + echo);
      } else {
        console.error('Failed to send command:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending command:', error);
    }
  }, [apiUrl, instanceId]);
  
  // Handle input key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendCommand(inputValue);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInputValue('');
        } else {
          setHistoryIndex(newIndex);
          setInputValue(commandHistory[newIndex]);
        }
      }
    }
  }, [inputValue, commandHistory, historyIndex, sendCommand]);
  
  // Handle auto-scroll toggle
  const toggleAutoScroll = useCallback(() => {
    const newAutoScroll = !isAutoScrollEnabled;
    setIsAutoScrollEnabled(newAutoScroll);
    setAutoScroll(instanceId, newAutoScroll);
  }, [isAutoScrollEnabled, instanceId, setAutoScroll]);
  
  // Handle manual scroll to bottom
  const handleScrollToBottom = useCallback(() => {
    scrollToBottom(instanceId);
    setIsAutoScrollEnabled(true);
  }, [instanceId, scrollToBottom]);
  
  // Clear terminal
  const clearTerminal = useCallback(() => {
    setTerminalContent('');
    setStats(prev => ({
      ...prev,
      messagesDisplayed: 0,
      bufferSize: 0
    }));
  }, []);
  
  // Get connection status color
  const getConnectionStatusColor = () => {
    switch (connectionState.connectionHealth) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };
  
  return (
    <div className={`bg-gray-900 text-green-400 font-mono rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-bold">
              🚀 Advanced SSE Terminal ({instanceId})
            </h3>
            <div className={`flex items-center space-x-2 ${getConnectionStatusColor()}`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionState.isConnected ? 'bg-green-400' : 
                connectionState.isConnecting ? 'bg-yellow-400 animate-pulse' : 
                connectionState.isRecovering ? 'bg-orange-400 animate-pulse' :
                'bg-red-400'
              }`}></div>
              <span className="text-sm">
                {connectionState.isConnected ? 'Connected' :
                 connectionState.isConnecting ? 'Connecting...' :
                 connectionState.isRecovering ? 'Recovering...' :
                 'Disconnected'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <span>Messages: {stats.messagesDisplayed}</span>
            <span>Memory: {stats.memoryUsage}</span>
            <span>Latency: {stats.processingLatency}ms</span>
            <span>Rate: {connectionState.messagesPerSecond}/s</span>
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleAutoScroll}
            className={`px-3 py-1 text-xs rounded ${
              isAutoScrollEnabled 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            Auto-scroll: {isAutoScrollEnabled ? 'ON' : 'OFF'}
          </button>
          
          <button
            onClick={handleScrollToBottom}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
          >
            Scroll to Bottom
          </button>
          
          <button
            onClick={clearTerminal}
            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
          >
            Clear
          </button>
          
          <button
            onClick={flushUpdates}
            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
          >
            Flush Updates
          </button>
          
          <div className="flex-1"></div>
          
          {connectionState.lastError && (
            <span className="text-red-400 text-xs">
              Error: {connectionState.lastError}
            </span>
          )}
        </div>
      </div>
      
      {/* Terminal Content */}
      <div 
        ref={terminalRef}
        className="h-96 overflow-y-auto bg-black p-4 text-sm leading-relaxed whitespace-pre-wrap"
        onScroll={(e) => {
          const element = e.target as HTMLElement;
          const isNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 50;
          
          if (!isNearBottom && isAutoScrollEnabled) {
            setIsAutoScrollEnabled(false);
            setAutoScroll(instanceId, false);
          }
        }}
      >
        {terminalContent || (
          <div className="text-gray-500 text-center mt-8">
            Waiting for terminal output...
            <br />
            <span className="text-xs">
              Connection Status: {connectionState.connectionHealth}
              {connectionState.isRecovering && ' (Recovering...)'}
            </span>
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-green-400">$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder-gray-500"
            disabled={!connectionState.isConnected}
          />
          <button
            onClick={() => sendCommand(inputValue)}
            disabled={!connectionState.isConnected || !inputValue.trim()}
            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded"
          >
            Send
          </button>
        </div>
      </div>
      
      {/* Performance Stats (Debug) */}
      <div className="bg-gray-800 px-4 py-1 text-xs text-gray-400 border-t border-gray-700">
        <div className="flex justify-between">
          <span>Buffer: {Math.round(stats.bufferSize / 1024)}KB</span>
          <span>Total Messages: {metrics.totalMessages}</span>
          <span>Uptime: {Math.round(metrics.connectionUptime)}s</span>
          <span>Recoveries: {metrics.recoveryCount}</span>
          <span>Seq: {connectionState.sequenceNumber}</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSSETerminal;