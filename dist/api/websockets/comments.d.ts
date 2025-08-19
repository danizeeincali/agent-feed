import { Server } from 'http';
interface CommentWebSocketData {
    type: 'comment_update' | 'comment_delete' | 'reaction_update' | 'subscription_notification';
    commentId: string;
    postId: string;
    data?: any;
}
declare class CommentWebSocketManager {
    private wss;
    private connections;
    initialize(server: Server): void;
    private handleClientMessage;
    private handleCommentSubscription;
    broadcastToPost(postId: string, data: CommentWebSocketData): void;
    broadcastCommentUpdate(postId: string, commentId: string, updateType: 'created' | 'updated' | 'deleted'): void;
    broadcastReactionUpdate(postId: string, commentId: string, reactions: any): void;
    notifySubscribers(commentId: string, notificationType: 'reply' | 'mention' | 'reaction'): Promise<void>;
    getConnectionStats(): {
        [postId: string]: number;
    };
    close(): void;
}
export declare const commentWebSocketManager: CommentWebSocketManager;
export {};
//# sourceMappingURL=comments.d.ts.map