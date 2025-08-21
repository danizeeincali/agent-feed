"use strict";
/**
 * Token Analytics WebSocket Handler
 * Handles real-time token cost tracking and analytics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackTokenUsage = exports.broadcastTokenUsageUpdate = void 0;
const server_1 = require("../server");
const logger_1 = require("@/utils/logger");
/**
 * Broadcast token usage update to all subscribed clients
 */
const broadcastTokenUsageUpdate = (tokenUsage) => {
    try {
        (0, server_1.broadcastTokenAnalytics)('token-usage-update', tokenUsage);
        logger_1.logger.debug('Token usage update broadcasted', { tokenUsage });
    }
    catch (error) {
        logger_1.logger.error('Failed to broadcast token usage update', { error, tokenUsage });
    }
};
exports.broadcastTokenUsageUpdate = broadcastTokenUsageUpdate;
/**
 * Track new token usage and broadcast to clients
 */
const trackTokenUsage = async (usage) => {
    try {
        const tokenUsage = {
            ...usage,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString()
        };
        // Broadcast to all subscribers
        (0, exports.broadcastTokenUsageUpdate)(tokenUsage);
        // TODO: Store in database for persistence
        // await tokenUsageRepository.save(tokenUsage);
        return tokenUsage;
    }
    catch (error) {
        logger_1.logger.error('Failed to track token usage', { error, usage });
        throw error;
    }
};
exports.trackTokenUsage = trackTokenUsage;
//# sourceMappingURL=token-analytics.js.map