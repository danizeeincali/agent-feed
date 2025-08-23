import { Server as SocketIOServer } from 'socket.io';
import TerminalStreamingService from '@/services/terminal-streaming';
declare const app: import("express-serve-static-core").Express;
declare const httpServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare const io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const broadcastToFeed: (feedId: string, event: string, data: any) => void;
export declare const broadcastToPost: (postId: string, event: string, data: any) => void;
export declare const broadcastToUser: (userId: string, event: string, data: any) => void;
export declare const broadcastNotification: (userId: string, notification: any) => void;
export declare const getTerminalStreamingService: () => TerminalStreamingService;
export declare const getWebSocketHubIntegration: () => any;
export { app, httpServer as server, io };
export default app;
//# sourceMappingURL=server.d.ts.map