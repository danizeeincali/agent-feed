/**
 * WebSocket Connection Fix - Backend Patch
 * SPARC Architecture Implementation
 * 
 * This patch integrates the new connection registry and instance normalization
 * into the existing simple-backend.js to fix connection establishment issues.
 * 
 * Apply this by importing and calling patchWebSocketHandlers(server) in simple-backend.js
 */

// Import our architecture components (compiled for Node.js)
const { normalizeInstanceId, parseInstanceMetadata } = require('../utils/websocket-instance-normalizer');
const { WebSocketConnectionRegistry } = require('../utils/websocket-connection-registry');

// Create global connection registry
const connectionRegistry = new WebSocketConnectionRegistry(true);

/**
 * Enhanced WebSocket message handler with proper instance ID normalization
 */
function createEnhancedWebSocketHandler(activeProcesses, instanceOutputBuffers) {
  return (ws, req) => {
    console.log('🔗 SPARC Enhanced: New WebSocket connection established');
    
    let connectionInstanceId = null;
    let connectionMetadata = null;
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 SPARC Enhanced: WebSocket message received:', message.type);
        
        if (message.type === 'connect' && message.terminalId) {
          // CRITICAL FIX: Normalize instance ID consistently
          const normalizedId = normalizeInstanceId(message.terminalId);
          const metadata = parseInstanceMetadata(message.terminalId);
          
          console.log(`✅ SPARC Enhanced: Registering WebSocket for instance ${normalizedId}`);
          console.log(`📋 Instance metadata:`, metadata);
          
          // Validate that the Claude process exists
          if (!activeProcesses.has(normalizedId)) {
            console.error(`❌ SPARC Enhanced: Claude process ${normalizedId} not found`);
            console.error(`🔍 Available processes:`, Array.from(activeProcesses.keys()));
            
            ws.send(JSON.stringify({
              type: 'error',
              error: `Claude instance ${normalizedId} not found`,
              instanceId: normalizedId,
              availableInstances: Array.from(activeProcesses.keys()),
              timestamp: Date.now()
            }));
            return;
          }
          
          // Register connection with enhanced registry
          const success = connectionRegistry.register(ws, normalizedId, {
            userAgent: req.headers['user-agent'],
            remoteAddress: req.socket.remoteAddress
          });
          
          if (success) {
            connectionInstanceId = normalizedId;
            connectionMetadata = metadata;
            
            // Send connection confirmation
            ws.send(JSON.stringify({
              type: 'connect',
              terminalId: normalizedId,
              instanceId: normalizedId,
              status: 'success',
              metadata: metadata,
              timestamp: Date.now()
            }));
            
            // Send any buffered output
            const outputBuffer = instanceOutputBuffers.get(normalizedId);
            if (outputBuffer && outputBuffer.buffer.length > 0) {
              console.log(`📦 SPARC Enhanced: Sending ${outputBuffer.buffer.length} bytes of buffered output`);
              
              ws.send(JSON.stringify({
                type: 'output',
                data: outputBuffer.buffer,
                instanceId: normalizedId,
                terminalId: normalizedId,
                source: 'buffered',
                timestamp: Date.now()
              }));
              
              // Update buffer position
              outputBuffer.lastSentPosition = outputBuffer.buffer.length;
            }
            
            console.log(`✅ SPARC Enhanced: WebSocket registered for ${normalizedId} (${connectionRegistry.getConnectionCount(normalizedId)} total connections)`);
          } else {
            console.error(`❌ SPARC Enhanced: Failed to register WebSocket for ${normalizedId}`);
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Failed to register connection',
              instanceId: normalizedId,
              timestamp: Date.now()
            }));
          }
        }
        
        if (message.type === 'input' && message.data && connectionInstanceId) {
          // Forward input to Claude process
          const processInfo = activeProcesses.get(connectionInstanceId);
          if (processInfo && processInfo.status === 'running') {
            console.log(`⌨️ SPARC Enhanced: Forwarding input to Claude ${connectionInstanceId}: ${message.data.slice(0, 100)}`);
            
            try {
              if (processInfo.usePty && processInfo.processType === 'pty') {
                // PTY input handling with proper termination
                let inputData = message.data;
                if (!inputData.endsWith('\\n') && !inputData.endsWith('\\r\\n')) {
                  inputData += '\\n';
                }
                
                // Track sent input for echo filtering
                processInfo.lastSentInput = inputData.replace(/[\\r\\n]+$/, '');
                processInfo.process.write(inputData);
                
                // Record message activity
                connectionRegistry.recordMessageReceived(ws);
                
              } else if (processInfo.process && processInfo.process.stdin) {
                // Regular pipe input handling
                let inputData = message.data;
                if (!inputData.endsWith('\\n')) {
                  inputData += '\\n';
                }
                processInfo.process.stdin.write(inputData);
                
                connectionRegistry.recordMessageReceived(ws);
              }
              
            } catch (error) {
              console.error(`❌ SPARC Enhanced: Failed to forward input to Claude ${connectionInstanceId}:`, error);
              ws.send(JSON.stringify({
                type: 'error',
                error: error.message,
                instanceId: connectionInstanceId,
                timestamp: Date.now()
              }));
            }
          } else {
            console.error(`❌ SPARC Enhanced: Cannot forward input - Claude ${connectionInstanceId} not running`);
            ws.send(JSON.stringify({
              type: 'error',
              error: `Claude instance ${connectionInstanceId} not running`,
              instanceId: connectionInstanceId,
              timestamp: Date.now()
            }));
          }
        }
        
        // Handle ping for health monitoring
        if (message.type === 'ping' && message.timestamp) {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: message.timestamp,
            serverTime: Date.now()
          }));
          
          if (connectionInstanceId) {
            connectionRegistry.recordMessageReceived(ws);
          }
        }
        
      } catch (error) {
        console.error('❌ SPARC Enhanced: WebSocket message parsing error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Message parsing error',
          timestamp: Date.now()
        }));
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 SPARC Enhanced: WebSocket connection closed (${code}): ${reason}`);
      if (connectionInstanceId) {
        console.log(`📊 Remaining connections for ${connectionInstanceId}: ${connectionRegistry.getConnectionCount(connectionInstanceId) - 1}`);
      }
      // Registry will auto-cleanup via the close event listener
    });
    
    ws.on('error', (error) => {
      console.error('❌ SPARC Enhanced: WebSocket error:', error);
      // Registry will handle cleanup
    });
  };
}

/**
 * Enhanced broadcast function using the connection registry
 */
function createEnhancedBroadcast() {
  return (instanceId, message) => {
    // Normalize instance ID for consistent lookup
    const normalizedId = normalizeInstanceId(instanceId);
    
    // Use the connection registry for broadcasting
    const successCount = connectionRegistry.broadcast(normalizedId, {
      type: 'output',
      data: message.output || message.data,
      instanceId: normalizedId,
      terminalId: normalizedId,
      source: message.source || 'process',
      timestamp: message.timestamp || Date.now(),
      ...message
    });
    
    console.log(`📤 SPARC Enhanced: Broadcast to ${successCount} connections for ${normalizedId}`);
    
    if (successCount === 0) {
      console.warn(`⚠️ SPARC Enhanced: No connections for instance ${normalizedId} - output will be buffered`);
    }
    
    return successCount;
  };
}

/**
 * Enhanced incremental output broadcast
 */
function createEnhancedIncrementalBroadcast(instanceOutputBuffers) {
  const enhancedBroadcast = createEnhancedBroadcast();
  
  return (instanceId, newData, source = 'stdout') => {
    const normalizedId = normalizeInstanceId(instanceId);
    const outputBuffer = instanceOutputBuffers.get(normalizedId);
    
    if (!outputBuffer) {
      console.warn(`⚠️ SPARC Enhanced: No output buffer for ${normalizedId} - initializing`);
      instanceOutputBuffers.set(normalizedId, {
        buffer: '',
        readPosition: 0,
        lastSentPosition: 0,
        createdAt: new Date()
      });
      return createEnhancedIncrementalBroadcast(instanceOutputBuffers)(instanceId, newData, source);
    }
    
    // Append new data to buffer
    outputBuffer.buffer += newData;
    
    // Calculate new data slice since last sent position
    const newDataSlice = outputBuffer.buffer.slice(outputBuffer.lastSentPosition);
    
    if (newDataSlice.length === 0) {
      console.log(`📊 SPARC Enhanced: No new output for ${normalizedId} - already sent`);
      return;
    }
    
    console.log(`📤 SPARC Enhanced: Broadcasting incremental output for ${normalizedId}: ${newDataSlice.length} bytes`);
    
    const message = {
      type: 'terminal_output',
      output: newDataSlice,
      instanceId: normalizedId,
      terminalId: normalizedId,
      timestamp: Date.now(),
      source: source,
      isReal: true,
      position: outputBuffer.lastSentPosition,
      totalLength: outputBuffer.buffer.length,
      isIncremental: true,
      sequence: Date.now() // Simple sequence number
    };
    
    // Update last sent position
    outputBuffer.lastSentPosition = outputBuffer.buffer.length;
    
    // Use enhanced broadcast
    const successCount = enhancedBroadcast(normalizedId, message);
    
    // If no connections, the message will be buffered for when connections are established
    return successCount;
  };
}

/**
 * Patch function to apply enhancements to existing WebSocket server
 */
function patchWebSocketHandlers(wss, activeProcesses, instanceOutputBuffers) {
  console.log('🚀 SPARC Enhanced: Patching WebSocket handlers');
  
  // Remove existing handlers
  wss.removeAllListeners('connection');
  
  // Add enhanced handler
  const enhancedHandler = createEnhancedWebSocketHandler(activeProcesses, instanceOutputBuffers);
  wss.on('connection', enhancedHandler);
  
  console.log('✅ SPARC Enhanced: WebSocket handlers patched');
  
  // Return enhanced broadcast functions for use in the main server
  return {
    enhancedBroadcast: createEnhancedBroadcast(),
    enhancedIncrementalBroadcast: createEnhancedIncrementalBroadcast(instanceOutputBuffers),
    connectionRegistry: connectionRegistry,
    normalizeInstanceId: normalizeInstanceId
  };
}

/**
 * Status endpoint for connection debugging
 */
function createConnectionStatusEndpoint() {
  return (req, res) => {
    const stats = connectionRegistry.getStats();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      registry: {
        totalConnections: stats.totalConnections,
        healthyConnections: stats.healthyConnections,
        degradedConnections: stats.degradedConnections,
        unhealthyConnections: stats.unhealthyConnections,
        oldestConnection: stats.oldestConnection,
        averageConnectionAge: stats.averageConnectionAge,
        connectionsPerInstance: Object.fromEntries(stats.connectionsPerInstance)
      },
      architecture: 'SPARC Enhanced WebSocket Communication'
    });
  };
}

module.exports = {
  patchWebSocketHandlers,
  createConnectionStatusEndpoint,
  connectionRegistry,
  normalizeInstanceId
};