/**
 * Security Manager - Channel isolation and access control for WebSocket Hub
 * Provides authentication, authorization, rate limiting, and security monitoring
 */
import { EventEmitter } from 'events';
export interface SecurityManagerConfig {
    enableChannelIsolation: boolean;
    maxChannelsPerClient: number;
    rateLimit: {
        messagesPerSecond: number;
        burstSize: number;
        windowSize?: number;
    };
    allowedOrigins: string[];
    tokenValidation?: {
        secret: string;
        issuer: string;
        audience: string;
    };
    ipWhitelist?: string[];
    ipBlacklist?: string[];
}
export interface ClientSecurityContext {
    clientId: string;
    instanceType: string;
    userId?: string;
    token?: string;
    origin?: string;
    ipAddress: string;
    permissions: Set<string>;
    channels: Set<string>;
    rateLimitData: RateLimitData;
    securityLevel: 'low' | 'medium' | 'high' | 'critical';
}
export interface RateLimitData {
    messageCount: number;
    windowStart: number;
    burstTokens: number;
    lastMessage: number;
    violations: number;
}
export interface SecurityViolation {
    type: 'rate_limit' | 'unauthorized_access' | 'invalid_token' | 'channel_violation' | 'ip_blocked';
    clientId: string;
    details: any;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: 'log' | 'warn' | 'block' | 'disconnect';
}
export interface ChannelPermissions {
    read: boolean;
    write: boolean;
    subscribe: boolean;
    admin: boolean;
    restrictions?: {
        timeWindows?: Array<{
            start: string;
            end: string;
        }>;
        messageTypes?: string[];
        maxMessageSize?: number;
    };
}
export declare class SecurityManager extends EventEmitter {
    private config;
    private clientContexts;
    private channelPermissions;
    private securityViolations;
    private blockedIPs;
    private suspiciousActivity;
    constructor(config: SecurityManagerConfig);
    /**
     * Initialize IP blacklist from config
     */
    private initializeIPBlacklist;
    /**
     * Validate client connection
     */
    validateClient(clientData: {
        socketId: string;
        origin?: string;
        instanceType: string;
        token?: string;
        userId?: string;
        ipAddress?: string;
    }): Promise<void>;
    /**
     * Validate IP address
     */
    private validateIPAddress;
    /**
     * Validate origin
     */
    private validateOrigin;
    /**
     * Validate JWT token
     */
    private validateToken;
    /**
     * Validate channel access
     */
    validateChannelAccess(clientId: string, channel: string, action: 'subscribe' | 'read' | 'write' | 'admin'): Promise<void>;
    /**
     * Enforce channel isolation based on instance type and security level
     */
    private enforceChannelIsolation;
    /**
     * Validate specific channel permission
     */
    private validateChannelPermission;
    /**
     * Validate message against security policies
     */
    validateMessage(clientId: string, messageData: any): Promise<void>;
    /**
     * Enforce rate limiting
     */
    private enforceRateLimit;
    /**
     * Set channel permissions for a client
     */
    setChannelPermissions(channel: string, clientId: string, permissions: ChannelPermissions): void;
    /**
     * Remove channel permissions for a client
     */
    removeChannelPermissions(channel: string, clientId: string): void;
    /**
     * Add client to channel (security context update)
     */
    addClientToChannel(clientId: string, channel: string): void;
    /**
     * Remove client from channel (security context update)
     */
    removeClientFromChannel(clientId: string, channel: string): void;
    /**
     * Remove client security context
     */
    removeClient(clientId: string): void;
    /**
     * Block IP address
     */
    blockIP(ipAddress: string, reason: string): void;
    /**
     * Unblock IP address
     */
    unblockIP(ipAddress: string): void;
    /**
     * Get security metrics
     */
    getSecurityMetrics(): {
        totalClients: number;
        blockedIPs: number;
        securityViolations: number;
        violationsByType: Map<string, number>;
        clientsBySecurityLevel: Map<string, number>;
    };
    /**
     * Get recent security violations
     */
    getRecentViolations(limit?: number): SecurityViolation[];
    /**
     * Record security violation
     */
    private recordSecurityViolation;
    /**
     * Handle security violation actions
     */
    private handleSecurityViolation;
    /**
     * Start security monitoring
     */
    private startSecurityMonitoring;
    /**
     * Get default permissions based on instance type
     */
    private getDefaultPermissions;
    /**
     * Initialize rate limit data
     */
    private initializeRateLimitData;
    /**
     * Determine security level based on instance type and token
     */
    private determineSecurityLevel;
    /**
     * Get maximum message size for client
     */
    private getMaxMessageSize;
    /**
     * Check for suspicious content (basic implementation)
     */
    private containsSuspiciousContent;
    /**
     * Update security configuration
     */
    updateConfig(newConfig: Partial<SecurityManagerConfig>): void;
    /**
     * Clean up resources
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=SecurityManager.d.ts.map