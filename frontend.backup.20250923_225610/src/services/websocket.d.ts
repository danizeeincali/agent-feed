export declare class WebSocketService {
    private url;
    private ws;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private listeners;
    private isConnecting;
    constructor(url?: string);
    connect(): Promise<void>;
    disconnect(): void;
    subscribe(type: string, callback: (data: any) => void): () => void;
    send(type: string, data: any): void;
    private handleMessage;
    private scheduleReconnect;
    private sendHeartbeat;
    isConnected(): boolean;
}
export declare const wsService: WebSocketService;
//# sourceMappingURL=websocket.d.ts.map