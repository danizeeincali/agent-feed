declare const app: import("express-serve-static-core").Express;
declare const httpServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
export declare const broadcastToFeed: (feedId: string, event: string, data: any) => void;
export declare const broadcastToPost: (postId: string, event: string, data: any) => void;
export declare const broadcastToUser: (userId: string, event: string, data: any) => void;
export declare const broadcastNotification: (userId: string, notification: any) => void;
export { app, httpServer as server };
export default app;
//# sourceMappingURL=server.d.ts.map