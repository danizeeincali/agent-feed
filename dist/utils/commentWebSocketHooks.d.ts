/**
 * WebSocket hooks for comment operations
 * These functions integrate with the existing comment routes to provide real-time updates
 */
export declare const commentHooks: {
    /**
     * Called after a comment is created
     */
    onCommentCreated: (postId: string, commentId: string, parentId?: string) => Promise<void>;
    /**
     * Called after a comment is updated
     */
    onCommentUpdated: (postId: string, commentId: string) => Promise<void>;
    /**
     * Called after a comment is deleted
     */
    onCommentDeleted: (postId: string, commentId: string) => Promise<void>;
    /**
     * Called after a reaction is added/removed
     */
    onReactionUpdated: (postId: string, commentId: string, reactions: any) => Promise<void>;
    /**
     * Called when a user is mentioned in a comment
     */
    onUserMentioned: (postId: string, commentId: string, mentionedUsers: string[]) => Promise<void>;
};
export default commentHooks;
//# sourceMappingURL=commentWebSocketHooks.d.ts.map