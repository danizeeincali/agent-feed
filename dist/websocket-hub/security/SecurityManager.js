"use strict";
/**
 * Security Manager - Channel isolation and access control for WebSocket Hub
 * Provides authentication, authorization, rate limiting, and security monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityManager = void 0;
const events_1 = require("events");
const logger_1 = require("@/utils/logger");
class SecurityManager extends events_1.EventEmitter {
    config;
    clientContexts = new Map();
    channelPermissions = new Map(); // channel -> client -> permissions
    securityViolations = [];
    blockedIPs = new Set();
    suspiciousActivity = new Map(); // clientId -> violation count
    constructor(config) {
        super();
        this.config = {
            rateLimit: {
                windowSize: 60000, // 1 minute
                ...config.rateLimit
            },
            ...config
        };
        this.initializeIPBlacklist();
        this.startSecurityMonitoring();
    }
    /**
     * Initialize IP blacklist from config
     */
    initializeIPBlacklist() {
        if (this.config.ipBlacklist) {
            this.config.ipBlacklist.forEach(ip => this.blockedIPs.add(ip));
        }
    }
    /**
     * Validate client connection
     */
    async validateClient(clientData) {
        const { socketId, origin, instanceType, token, userId, ipAddress } = clientData;
        // IP validation
        if (ipAddress) {
            await this.validateIPAddress(ipAddress);
        }
        // Origin validation
        if (origin && this.config.allowedOrigins.length > 0) {
            this.validateOrigin(origin);
        }
        // Token validation
        if (token && this.config.tokenValidation) {
            await this.validateToken(token);
        }
        // Create security context
        const securityContext = {
            clientId: socketId,
            instanceType,
            userId,
            token,
            origin,
            ipAddress: ipAddress || 'unknown',
            permissions: this.getDefaultPermissions(instanceType),
            channels: new Set(),
            rateLimitData: this.initializeRateLimitData(),
            securityLevel: this.determineSecurityLevel(instanceType, token)
        };
        this.clientContexts.set(socketId, securityContext);
        logger_1.logger.debug('Client security context created', {
            clientId: socketId,
            instanceType,
            securityLevel: securityContext.securityLevel
        });
        this.emit('clientValidated', { clientId: socketId, securityContext });
    }
    /**
     * Validate IP address
     */
    async validateIPAddress(ipAddress) {
        // Check blacklist
        if (this.blockedIPs.has(ipAddress)) {
            throw new Error(`IP address ${ipAddress} is blocked`);
        }
        // Check whitelist if configured
        if (this.config.ipWhitelist && this.config.ipWhitelist.length > 0) {
            if (!this.config.ipWhitelist.includes(ipAddress)) {
                throw new Error(`IP address ${ipAddress} not in whitelist`);
            }
        }
        // Check for suspicious activity
        const suspiciousCount = this.suspiciousActivity.get(ipAddress) || 0;
        if (suspiciousCount > 10) {
            this.blockedIPs.add(ipAddress);
            throw new Error(`IP address ${ipAddress} blocked due to suspicious activity`);
        }
    }
    /**
     * Validate origin
     */
    validateOrigin(origin) {
        if (!this.config.allowedOrigins.includes(origin)) {
            throw new Error(`Origin ${origin} not allowed`);
        }
    }
    /**
     * Validate JWT token
     */
    async validateToken(token) {
        if (!this.config.tokenValidation) {
            return; // Token validation not configured
        }
        try {
            // Basic token validation - in production, use proper JWT library
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid token format');
            }
            // Decode header and payload
            const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            // Check expiration
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                throw new Error('Token expired');
            }
            // Check issuer
            if (this.config.tokenValidation.issuer && payload.iss !== this.config.tokenValidation.issuer) {
                throw new Error('Invalid token issuer');
            }
            // Check audience
            if (this.config.tokenValidation.audience && payload.aud !== this.config.tokenValidation.audience) {
                throw new Error('Invalid token audience');
            }
        }
        catch (error) {
            throw new Error(`Token validation failed: ${error.message}`);
        }
    }
    /**
     * Validate channel access
     */
    async validateChannelAccess(clientId, channel, action) {
        const context = this.clientContexts.get(clientId);
        if (!context) {
            throw new Error('Client security context not found');
        }
        // Check channel isolation
        if (this.config.enableChannelIsolation) {
            await this.enforceChannelIsolation(context, channel, action);
        }
        // Check channel-specific permissions
        const channelPerms = this.channelPermissions.get(channel);
        if (channelPerms) {
            const clientPerms = channelPerms.get(clientId);
            if (clientPerms) {
                this.validateChannelPermission(clientPerms, action);
            }
        }
        // Check maximum channels per client
        if (action === 'subscribe' && context.channels.size >= this.config.maxChannelsPerClient) {
            throw new Error(`Maximum channels per client exceeded: ${this.config.maxChannelsPerClient}`);
        }
        logger_1.logger.debug('Channel access validated', { clientId, channel, action });
    }
    /**
     * Enforce channel isolation based on instance type and security level
     */
    async enforceChannelIsolation(context, channel, action) {
        const { instanceType, securityLevel } = context;
        // Define channel isolation rules
        const isolationRules = {
            'frontend': {
                allowed: ['public', 'user', 'feed'],
                restricted: ['claude-internal', 'admin', 'system']
            },
            'claude-production': {
                allowed: ['claude-internal', 'system', 'webhook-bridge'],
                restricted: ['user-private']
            },
            'claude-dev': {
                allowed: ['claude-internal', 'dev', 'test'],
                restricted: ['production', 'user-private']
            },
            'webhook': {
                allowed: ['webhook-bridge', 'public'],
                restricted: ['claude-internal', 'user-private', 'admin']
            }
        };
        const rules = isolationRules[instanceType];
        if (!rules) {
            throw new Error(`No isolation rules defined for instance type: ${instanceType}`);
        }
        // Check if channel is restricted
        const isRestricted = rules.restricted.some(pattern => channel.startsWith(pattern) || channel.includes(pattern));
        if (isRestricted) {
            this.recordSecurityViolation({
                type: 'channel_violation',
                clientId: context.clientId,
                details: { channel, action, instanceType, securityLevel },
                timestamp: new Date(),
                severity: 'high',
                action: 'block'
            });
            throw new Error(`Access denied to restricted channel: ${channel}`);
        }
        // Check if channel is allowed
        const isAllowed = rules.allowed.some(pattern => channel.startsWith(pattern) || channel.includes(pattern));
        if (!isAllowed && securityLevel === 'critical') {
            throw new Error(`Access denied to channel: ${channel}`);
        }
    }
    /**
     * Validate specific channel permission
     */
    validateChannelPermission(permissions, action) {
        const actionMap = {
            subscribe: permissions.subscribe,
            read: permissions.read,
            write: permissions.write,
            admin: permissions.admin
        };
        if (!actionMap[action]) {
            throw new Error(`Action ${action} not permitted`);
        }
        // Check time window restrictions
        if (permissions.restrictions?.timeWindows) {
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
            const isInAllowedWindow = permissions.restrictions.timeWindows.some(window => currentTime >= window.start && currentTime <= window.end);
            if (!isInAllowedWindow) {
                throw new Error('Access outside allowed time window');
            }
        }
    }
    /**
     * Validate message against security policies
     */
    async validateMessage(clientId, messageData) {
        const context = this.clientContexts.get(clientId);
        if (!context) {
            throw new Error('Client security context not found');
        }
        // Rate limiting
        await this.enforceRateLimit(context);
        // Message size validation
        const messageSize = JSON.stringify(messageData).length;
        const maxSize = this.getMaxMessageSize(context);
        if (messageSize > maxSize) {
            this.recordSecurityViolation({
                type: 'unauthorized_access',
                clientId,
                details: { messageSize, maxSize, reason: 'Message too large' },
                timestamp: new Date(),
                severity: 'medium',
                action: 'warn'
            });
            throw new Error(`Message size ${messageSize} exceeds limit ${maxSize}`);
        }
        // Content validation (basic)
        if (this.containsSuspiciousContent(messageData)) {
            this.recordSecurityViolation({
                type: 'unauthorized_access',
                clientId,
                details: { reason: 'Suspicious content detected' },
                timestamp: new Date(),
                severity: 'high',
                action: 'block'
            });
            throw new Error('Message contains suspicious content');
        }
        logger_1.logger.debug('Message security validation passed', { clientId, messageSize });
    }
    /**
     * Enforce rate limiting
     */
    async enforceRateLimit(context) {
        const now = Date.now();
        const { rateLimitData } = context;
        const { messagesPerSecond, burstSize, windowSize } = this.config.rateLimit;
        // Reset window if expired
        if (now - rateLimitData.windowStart >= windowSize) {
            rateLimitData.windowStart = now;
            rateLimitData.messageCount = 0;
            rateLimitData.burstTokens = burstSize;
        }
        // Check burst limit
        if (rateLimitData.burstTokens <= 0) {
            const timeSinceLastMessage = now - rateLimitData.lastMessage;
            const tokensToAdd = Math.floor(timeSinceLastMessage / (1000 / messagesPerSecond));
            rateLimitData.burstTokens = Math.min(burstSize, rateLimitData.burstTokens + tokensToAdd);
        }
        if (rateLimitData.burstTokens <= 0) {
            rateLimitData.violations++;
            this.recordSecurityViolation({
                type: 'rate_limit',
                clientId: context.clientId,
                details: {
                    messageCount: rateLimitData.messageCount,
                    violations: rateLimitData.violations,
                    limit: messagesPerSecond
                },
                timestamp: new Date(),
                severity: rateLimitData.violations > 5 ? 'high' : 'medium',
                action: rateLimitData.violations > 10 ? 'disconnect' : 'warn'
            });
            throw new Error('Rate limit exceeded');
        }
        // Update counters
        rateLimitData.messageCount++;
        rateLimitData.burstTokens--;
        rateLimitData.lastMessage = now;
    }
    /**
     * Set channel permissions for a client
     */
    setChannelPermissions(channel, clientId, permissions) {
        if (!this.channelPermissions.has(channel)) {
            this.channelPermissions.set(channel, new Map());
        }
        this.channelPermissions.get(channel).set(clientId, permissions);
        logger_1.logger.debug('Channel permissions set', { channel, clientId, permissions });
        this.emit('permissionsUpdated', { channel, clientId, permissions });
    }
    /**
     * Remove channel permissions for a client
     */
    removeChannelPermissions(channel, clientId) {
        const channelPerms = this.channelPermissions.get(channel);
        if (channelPerms) {
            channelPerms.delete(clientId);
            if (channelPerms.size === 0) {
                this.channelPermissions.delete(channel);
            }
        }
        logger_1.logger.debug('Channel permissions removed', { channel, clientId });
    }
    /**
     * Add client to channel (security context update)
     */
    addClientToChannel(clientId, channel) {
        const context = this.clientContexts.get(clientId);
        if (context) {
            context.channels.add(channel);
        }
    }
    /**
     * Remove client from channel (security context update)
     */
    removeClientFromChannel(clientId, channel) {
        const context = this.clientContexts.get(clientId);
        if (context) {
            context.channels.delete(channel);
        }
    }
    /**
     * Remove client security context
     */
    removeClient(clientId) {
        this.clientContexts.delete(clientId);
        // Remove from all channel permissions
        for (const [channel, clientPerms] of this.channelPermissions.entries()) {
            clientPerms.delete(clientId);
            if (clientPerms.size === 0) {
                this.channelPermissions.delete(channel);
            }
        }
        logger_1.logger.debug('Client security context removed', { clientId });
    }
    /**
     * Block IP address
     */
    blockIP(ipAddress, reason) {
        this.blockedIPs.add(ipAddress);
        logger_1.logger.warn('IP address blocked', { ipAddress, reason });
        this.emit('ipBlocked', { ipAddress, reason });
    }
    /**
     * Unblock IP address
     */
    unblockIP(ipAddress) {
        this.blockedIPs.delete(ipAddress);
        logger_1.logger.info('IP address unblocked', { ipAddress });
        this.emit('ipUnblocked', { ipAddress });
    }
    /**
     * Get security metrics
     */
    getSecurityMetrics() {
        const violationsByType = new Map();
        const clientsBySecurityLevel = new Map();
        // Count violations by type
        this.securityViolations.forEach(violation => {
            const current = violationsByType.get(violation.type) || 0;
            violationsByType.set(violation.type, current + 1);
        });
        // Count clients by security level
        this.clientContexts.forEach(context => {
            const current = clientsBySecurityLevel.get(context.securityLevel) || 0;
            clientsBySecurityLevel.set(context.securityLevel, current + 1);
        });
        return {
            totalClients: this.clientContexts.size,
            blockedIPs: this.blockedIPs.size,
            securityViolations: this.securityViolations.length,
            violationsByType,
            clientsBySecurityLevel
        };
    }
    /**
     * Get recent security violations
     */
    getRecentViolations(limit = 100) {
        return this.securityViolations
            .slice(-limit)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    /**
     * Record security violation
     */
    recordSecurityViolation(violation) {
        this.securityViolations.push(violation);
        // Limit violation history
        if (this.securityViolations.length > 10000) {
            this.securityViolations.splice(0, 1000); // Remove oldest 1000
        }
        // Update suspicious activity tracking
        const currentCount = this.suspiciousActivity.get(violation.clientId) || 0;
        this.suspiciousActivity.set(violation.clientId, currentCount + 1);
        logger_1.logger.warn('Security violation recorded', violation);
        this.emit('securityViolation', violation);
        // Take action based on violation severity
        this.handleSecurityViolation(violation);
    }
    /**
     * Handle security violation actions
     */
    handleSecurityViolation(violation) {
        switch (violation.action) {
            case 'disconnect':
                this.emit('forceDisconnect', {
                    clientId: violation.clientId,
                    reason: violation.type
                });
                break;
            case 'block':
                const context = this.clientContexts.get(violation.clientId);
                if (context && context.ipAddress !== 'unknown') {
                    this.blockIP(context.ipAddress, violation.type);
                }
                break;
            // 'log' and 'warn' are handled by the logging above
        }
    }
    /**
     * Start security monitoring
     */
    startSecurityMonitoring() {
        // Clean up old violations periodically
        setInterval(() => {
            const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
            this.securityViolations = this.securityViolations.filter(violation => violation.timestamp.getTime() > cutoff);
        }, 60 * 60 * 1000); // Check every hour
        // Reset suspicious activity counters periodically
        setInterval(() => {
            this.suspiciousActivity.clear();
        }, 60 * 60 * 1000); // Reset every hour
    }
    /**
     * Get default permissions based on instance type
     */
    getDefaultPermissions(instanceType) {
        const permissions = new Set();
        switch (instanceType) {
            case 'frontend':
                permissions.add('user.read');
                permissions.add('user.write');
                permissions.add('feed.read');
                permissions.add('public.read');
                break;
            case 'claude-production':
                permissions.add('system.read');
                permissions.add('system.write');
                permissions.add('claude.admin');
                permissions.add('webhook.translate');
                break;
            case 'claude-dev':
                permissions.add('dev.read');
                permissions.add('dev.write');
                permissions.add('test.admin');
                break;
            case 'webhook':
                permissions.add('webhook.receive');
                permissions.add('public.read');
                break;
        }
        return permissions;
    }
    /**
     * Initialize rate limit data
     */
    initializeRateLimitData() {
        return {
            messageCount: 0,
            windowStart: Date.now(),
            burstTokens: this.config.rateLimit.burstSize,
            lastMessage: 0,
            violations: 0
        };
    }
    /**
     * Determine security level based on instance type and token
     */
    determineSecurityLevel(instanceType, token) {
        if (instanceType === 'claude-production')
            return 'critical';
        if (instanceType === 'webhook')
            return 'high';
        if (token)
            return 'medium';
        return 'low';
    }
    /**
     * Get maximum message size for client
     */
    getMaxMessageSize(context) {
        const baseSizes = {
            low: 10 * 1024, // 10KB
            medium: 100 * 1024, // 100KB
            high: 1024 * 1024, // 1MB
            critical: 10 * 1024 * 1024 // 10MB
        };
        return baseSizes[context.securityLevel];
    }
    /**
     * Check for suspicious content (basic implementation)
     */
    containsSuspiciousContent(data) {
        const dataStr = JSON.stringify(data).toLowerCase();
        const suspiciousPatterns = [
            'script>',
            'javascript:',
            'eval(',
            'onclick=',
            'onerror=',
            '<iframe',
            'document.cookie'
        ];
        return suspiciousPatterns.some(pattern => dataStr.includes(pattern));
    }
    /**
     * Update security configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.emit('configUpdated', this.config);
    }
    /**
     * Clean up resources
     */
    async shutdown() {
        this.clientContexts.clear();
        this.channelPermissions.clear();
        this.securityViolations.length = 0;
        this.blockedIPs.clear();
        this.suspiciousActivity.clear();
        this.removeAllListeners();
        logger_1.logger.info('Security manager shutdown completed');
    }
}
exports.SecurityManager = SecurityManager;
//# sourceMappingURL=SecurityManager.js.map