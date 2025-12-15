import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private subscribers: Map<string, Set<Function>> = new Map();
  private roomSubscriptions: Set<string> = new Set();

  connect() {
    if (this.socket?.connected) return this.socket;

    this.socket = io({
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('[SocketManager] Connected:', this.socket?.id);
      // Resubscribe to rooms on reconnect
      this.roomSubscriptions.forEach(room => {
        this.socket?.emit('subscribe:post', room);
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketManager] Disconnected:', reason);
    });

    // Forward all events to subscribers
    this.setupEventForwarding();

    return this.socket;
  }

  private setupEventForwarding() {
    const events = [
      'ticket:status:update',
      'comment:state',
      'comment:state:waiting',
      'comment:state:analyzed',
      'comment:state:responding',
      'comment:state:complete',
      'comment:created',
      'comment:updated',
      'agent:response'
    ];

    events.forEach(eventName => {
      this.socket?.on(eventName, (data: any) => {
        console.log(`[SocketManager] ${eventName}:`, data);
        const handlers = this.subscribers.get(eventName);
        handlers?.forEach(handler => handler(data));
      });
    });
  }

  subscribe(event: string, handler: Function) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(handler);

    return () => {
      this.subscribers.get(event)?.delete(handler);
    };
  }

  subscribeToPost(postId: string) {
    this.roomSubscriptions.add(postId);
    this.socket?.emit('subscribe:post', postId);
    console.log('[SocketManager] Subscribed to post:', postId);
  }

  unsubscribeFromPost(postId: string) {
    this.roomSubscriptions.delete(postId);
    this.socket?.emit('unsubscribe:post', postId);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketManager = new SocketManager();
export default socketManager;
