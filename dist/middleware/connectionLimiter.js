"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionLimiter = void 0;
class ConnectionLimiter {
    static instance = null;
    connections = new Map();
    MAX_CONNECTIONS_PER_USER = 1;
    CONNECTION_TIMEOUT = 30000; // 30 seconds
    static getInstance() {
        if (!ConnectionLimiter.instance) {
            ConnectionLimiter.instance = new ConnectionLimiter();
        }
        return ConnectionLimiter.instance;
    }
    addConnection(socket, userId) {
        const userConnections = this.connections.get(userId) || [];
        // Clean up stale connections first
        this.cleanupStaleConnections(userId);
        // Check if user already has maximum connections
        const activeConnections = userConnections.filter(conn => this.isConnectionActive(conn.socketId));
        if (activeConnections.length >= this.MAX_CONNECTIONS_PER_USER) {
            console.log(`🚫 ConnectionLimiter: User ${userId} has reached max connections (${this.MAX_CONNECTIONS_PER_USER})`);
            // Disconnect oldest connection
            const oldestConnection = activeConnections[0];
            this.forceDisconnect(oldestConnection.socketId, 'Connection limit reached');
            // Remove from tracking
            this.removeConnection(oldestConnection.socketId, userId);
        }
        // Add new connection
        const newConnection = {
            socketId: socket.id,
            userId,
            lastActivity: new Date(),
            connectionCount: activeConnections.length + 1
        };
        userConnections.push(newConnection);
        this.connections.set(userId, userConnections);
        console.log(`✅ ConnectionLimiter: Added connection ${socket.id} for user ${userId} (${userConnections.length} total)`);
        // Setup cleanup on disconnect
        socket.on('disconnect', () => {
            this.removeConnection(socket.id, userId);
        });
        return true;
    }
    removeConnection(socketId, userId) {
        const userConnections = this.connections.get(userId) || [];
        const filteredConnections = userConnections.filter(conn => conn.socketId !== socketId);
        if (filteredConnections.length === 0) {
            this.connections.delete(userId);
        }
        else {
            this.connections.set(userId, filteredConnections);
        }
        console.log(`🗑️ ConnectionLimiter: Removed connection ${socketId} for user ${userId}`);
    }
    getConnectionCount(userId) {
        const userConnections = this.connections.get(userId) || [];
        return userConnections.filter(conn => this.isConnectionActive(conn.socketId)).length;
    }
    getTotalConnections() {
        let total = 0;
        for (const userConnections of this.connections.values()) {
            total += userConnections.filter(conn => this.isConnectionActive(conn.socketId)).length;
        }
        return total;
    }
    cleanupStaleConnections(userId) {
        const userConnections = this.connections.get(userId) || [];
        const activeConnections = userConnections.filter(conn => {
            const isActive = this.isConnectionActive(conn.socketId);
            const isRecent = (Date.now() - conn.lastActivity.getTime()) < this.CONNECTION_TIMEOUT;
            return isActive && isRecent;
        });
        if (activeConnections.length !== userConnections.length) {
            console.log(`🧹 ConnectionLimiter: Cleaned up ${userConnections.length - activeConnections.length} stale connections for user ${userId}`);
            if (activeConnections.length === 0) {
                this.connections.delete(userId);
            }
            else {
                this.connections.set(userId, activeConnections);
            }
        }
    }
    isConnectionActive(socketId) {
        // In a real implementation, this would check if the socket is still connected
        // For now, we'll assume connections are active (server-side tracking would be better)
        return true;
    }
    forceDisconnect(socketId, reason) {
        console.log(`🔌 ConnectionLimiter: Force disconnecting ${socketId} - ${reason}`);
        // In Socket.IO server implementation, you would find the socket by ID and disconnect it
        // This is a placeholder for server-side implementation
    }
    // Periodic cleanup method
    startPeriodicCleanup() {
        setInterval(() => {
            for (const userId of this.connections.keys()) {
                this.cleanupStaleConnections(userId);
            }
        }, 10000); // Clean up every 10 seconds
    }
    // Get status for monitoring
    getStatus() {
        const connections = {};
        for (const [userId, userConnections] of this.connections.entries()) {
            connections[userId] = userConnections.length;
        }
        return {
            totalConnections: this.getTotalConnections(),
            userCount: this.connections.size,
            connections
        };
    }
}
exports.connectionLimiter = ConnectionLimiter.getInstance();
//# sourceMappingURL=connectionLimiter.js.map