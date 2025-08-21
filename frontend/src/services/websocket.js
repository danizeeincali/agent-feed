"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsService = exports.WebSocketService = void 0;
class WebSocketService {
    url;
    ws = null;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 1000;
    listeners = new Map();
    isConnecting = false;
    constructor(url = 'ws://localhost:8000/ws') {
        this.url = url;
    }
    connect() {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return Promise.resolve();
        }
        this.isConnecting = true;
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.sendHeartbeat();
                    resolve();
                };
                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    }
                    catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                    }
                };
                this.ws.onclose = (event) => {
                    console.log('WebSocket disconnected:', event.code, event.reason);
                    this.isConnecting = false;
                    this.ws = null;
                    if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.scheduleReconnect();
                    }
                };
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.isConnecting = false;
                    reject(error);
                };
            }
            catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
    }
    subscribe(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(callback);
        // Return unsubscribe function
        return () => {
            const typeListeners = this.listeners.get(type);
            if (typeListeners) {
                typeListeners.delete(callback);
                if (typeListeners.size === 0) {
                    this.listeners.delete(type);
                }
            }
        };
    }
    send(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                type,
                data,
                timestamp: new Date().toISOString(),
            };
            this.ws.send(JSON.stringify(message));
        }
        else {
            console.warn('WebSocket not connected, cannot send message');
        }
    }
    handleMessage(message) {
        const listeners = this.listeners.get(message.type);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(message.data);
                }
                catch (error) {
                    console.error('Error in WebSocket message handler:', error);
                }
            });
        }
        // Handle system-wide messages
        if (message.type === 'heartbeat') {
            this.send('heartbeat_ack', {});
        }
    }
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        setTimeout(() => {
            this.connect().catch(error => {
                console.error('Reconnection failed:', error);
            });
        }, delay);
    }
    sendHeartbeat() {
        const heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send('heartbeat', { timestamp: Date.now() });
            }
            else {
                clearInterval(heartbeatInterval);
            }
        }, 30000); // Send heartbeat every 30 seconds
    }
    isConnected() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}
exports.WebSocketService = WebSocketService;
// Singleton instance
exports.wsService = new WebSocketService();
//# sourceMappingURL=websocket.js.map