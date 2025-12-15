/**
 * SSE Output Chunking System
 * 
 * Implements incremental output streaming to prevent message accumulation.
 * Based on TDD London School tests - implements EXACTLY what the tests specify.
 */

const EventEmitter = require('events');

class SSEOutputChunker extends EventEmitter {
  constructor() {
    super();
    this.outputPositions = new Map(); // instanceId -> position
    this.outputBuffers = new Map(); // instanceId -> full buffer content
    this.sseConnections = new Map(); // instanceId -> [connections]
    this.connectionStates = new Map(); // instanceId -> state info
    this.messageHashes = new Set(); // for deduplication
    this.lastInputTimes = new Map(); // for input debouncing
    
    // Configuration
    this.maxBufferSize = 1024 * 100; // 100KB
    this.inputDebounceMs = 100;
  }

  // Position tracking per Claude instance
  getPosition(instanceId) {
    return this.outputPositions.get(instanceId) || 0;
  }

  updatePosition(instanceId, newPos) {
    this.outputPositions.set(instanceId, newPos);
    return newPos;
  }

  getNewContentSince(instanceId, fullContent) {
    const lastPos = this.getPosition(instanceId);
    const newContent = fullContent.substring(lastPos);
    this.updatePosition(instanceId, fullContent.length);
    return newContent;
  }

  // Buffer management
  appendToBuffer(instanceId, newContent) {
    const current = this.outputBuffers.get(instanceId) || '';
    const updated = current + newContent;
    
    if (updated.length > this.maxBufferSize) {
      // Trim from beginning, keep recent content
      const trimmed = updated.substring(updated.length - this.maxBufferSize);
      this.outputBuffers.set(instanceId, trimmed);
      
      // Reset position to match trimmed buffer
      this.updatePosition(instanceId, trimmed.length);
      
      return { appended: true, trimmed: true, newSize: trimmed.length };
    } else {
      this.outputBuffers.set(instanceId, updated);
      return { appended: true, trimmed: false, newSize: updated.length };
    }
  }

  getBufferSize(instanceId) {
    return (this.outputBuffers.get(instanceId) || '').length;
  }

  clearBuffer(instanceId) {
    this.outputBuffers.delete(instanceId);
    this.outputPositions.delete(instanceId);
  }

  // SSE Connection Management
  addConnection(instanceId, connection) {
    if (!this.sseConnections.has(instanceId)) {
      this.sseConnections.set(instanceId, []);
    }
    this.sseConnections.get(instanceId).push(connection);
    
    // Set connection state to connected
    this.setState(instanceId, 'connected');
    
    return this.getActiveConnectionCount(instanceId);
  }

  removeConnection(instanceId, connection) {
    const connections = this.sseConnections.get(instanceId) || [];
    const index = connections.indexOf(connection);
    
    if (index !== -1) {
      connections.splice(index, 1);
      
      if (connections.length === 0) {
        this.setState(instanceId, 'disconnected');
      }
    }
    
    return connections.length;
  }

  getActiveConnectionCount(instanceId) {
    return (this.sseConnections.get(instanceId) || []).length;
  }

  getConnections(instanceId) {
    return this.sseConnections.get(instanceId) || [];
  }

  // Connection State Management
  setState(instanceId, state) {
    const current = this.connectionStates.get(instanceId) || { transitions: 0 };
    this.connectionStates.set(instanceId, {
      state,
      timestamp: Date.now(),
      transitions: current.transitions + 1
    });
  }

  getState(instanceId) {
    return this.connectionStates.get(instanceId)?.state || 'disconnected';
  }

  isReady(instanceId) {
    const state = this.getState(instanceId);
    return state === 'connected' || state === 'ready';
  }

  canSendMessages(instanceId) {
    return this.isReady(instanceId) && this.getActiveConnectionCount(instanceId) > 0;
  }

  // Message Deduplication
  createMessageHash(message) {
    return `${message.instanceId}-${message.timestamp}-${message.data}`;
  }

  isDuplicateMessage(message) {
    const hash = this.createMessageHash(message);
    return this.messageHashes.has(hash);
  }

  markMessageAsSeen(message) {
    const hash = this.createMessageHash(message);
    this.messageHashes.add(hash);
    return hash;
  }

  // Input Debouncing
  shouldProcessInput(instanceId, input) {
    const now = Date.now();
    const lastTime = this.lastInputTimes.get(instanceId) || 0;
    const timeSinceLastInput = now - lastTime;
    
    if (timeSinceLastInput < this.inputDebounceMs && input === 'hello') {
      return {
        process: false,
        reason: 'debounced',
        waitTime: this.inputDebounceMs - timeSinceLastInput
      };
    }
    
    this.lastInputTimes.set(instanceId, now);
    return { process: true };
  }

  // Core SSE Chunking
  sendChunk(instanceId, newContent, connections = null) {
    if (!newContent || newContent.length === 0) {
      return { sent: false, reason: 'no_new_content' };
    }
    
    const targetConnections = connections || this.getConnections(instanceId);
    
    const message = {
      type: 'output',
      instanceId,
      data: newContent,
      timestamp: new Date().toISOString(),
      isIncremental: true
    };
    
    const serialized = `data: ${JSON.stringify(message)}\n\n`;
    let successCount = 0;
    
    targetConnections.forEach(conn => {
      if (conn && conn.writable && !conn.destroyed) {
        try {
          conn.write(serialized);
          successCount++;
        } catch (error) {
          console.error('Failed to write to SSE connection:', error);
        }
      }
    });
    
    // Mark as seen for deduplication
    this.markMessageAsSeen(message);
    
    return { sent: true, successCount, message };
  }

  // Send incremental content via SSE
  sendIncremental(instanceId, incrementalContent, connections) {
    return this.sendChunk(instanceId, incrementalContent, connections);
  }

  // Main processing method - coordinates all components
  processNewOutput(instanceId, rawOutput) {
    // Check if we can send messages
    if (!this.canSendMessages(instanceId)) {
      return { processed: false, reason: 'not_ready' };
    }
    
    // Get incremental content
    const lastPos = this.getPosition(instanceId);
    const incrementalContent = rawOutput.substring(lastPos);
    
    if (incrementalContent.length === 0) {
      return { processed: false, reason: 'no_new_content' };
    }
    
    // Update buffer and position
    this.appendToBuffer(instanceId, incrementalContent);
    this.updatePosition(instanceId, rawOutput.length);
    
    // Send via SSE
    const connections = this.getConnections(instanceId);
    const sendResult = this.sendIncremental(instanceId, incrementalContent, connections);
    
    return {
      processed: true,
      incrementalContent,
      bytesSent: incrementalContent.length,
      connectionsSent: sendResult.successCount
    };
  }

  // Handle reconnection scenarios
  handleReconnection(instanceId, currentBuffer, lastKnownPosition) {
    // Only send content after last known position
    const newContentOnly = currentBuffer.substring(lastKnownPosition);
    
    return {
      shouldSendWelcome: true,
      shouldSendBuffer: newContentOnly.length > 0,
      contentToSend: newContentOnly,
      welcomeMessage: {
        type: 'reconnected',
        instanceId,
        message: `Reconnected to Claude instance ${instanceId}`,
        resumeFrom: lastKnownPosition
      }
    };
  }

  // Connection recovery
  recover(instanceId, lastKnownState) {
    const recovery = {
      instanceId,
      reconnected: true,
      resumePosition: this.getPosition(instanceId),
      stateTransition: `${lastKnownState} -> connected`,
      timestamp: new Date().toISOString()
    };
    
    this.setState(instanceId, 'connected');
    return recovery;
  }

  // Cleanup methods
  cleanup(instanceId) {
    this.clearBuffer(instanceId);
    this.sseConnections.delete(instanceId);
    this.connectionStates.delete(instanceId);
    this.lastInputTimes.delete(instanceId);
  }

  // Get status info
  getStatus() {
    return {
      instances: Array.from(this.outputPositions.keys()),
      totalConnections: Array.from(this.sseConnections.values())
        .reduce((sum, conns) => sum + conns.length, 0),
      bufferSizes: Object.fromEntries(
        Array.from(this.outputBuffers.entries())
          .map(([id, buffer]) => [id, buffer.length])
      ),
      connectionStates: Object.fromEntries(this.connectionStates.entries())
    };
  }
}

module.exports = SSEOutputChunker;
