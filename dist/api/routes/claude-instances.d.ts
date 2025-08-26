/**
 * Claude Instances API Routes
 * Provides RESTful endpoints for managing dedicated Claude instances
 */
declare const router: import("express-serve-static-core").Router;
/**
 * HTTP/SSE only - WebSocket endpoint completely removed
 * Real-time communication now handled via Server-Sent Events
 */
declare const setupHTTPEndpoints: () => any;
export { setupHTTPEndpoints };
export default router;
//# sourceMappingURL=claude-instances.d.ts.map