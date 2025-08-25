/**
 * Claude Instances API Routes
 * Provides RESTful endpoints for managing dedicated Claude instances
 */
declare const router: import("express-serve-static-core").Router;
/**
 * WebSocket endpoint for real-time Claude instance communication
 */
declare const setupWebSocketEndpoint: (io: any) => any;
export { setupWebSocketEndpoint };
export default router;
//# sourceMappingURL=claude-instances.d.ts.map