"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutHandler = exports.refreshTokenHandler = exports.loginHandler = exports.createRateLimitKey = exports.requireAdmin = exports.optionalAuth = exports.authenticateToken = exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const connection_1 = require("../database/connection");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const JWT_SECRET = process.env['JWT_SECRET'] || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '24h';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;
class AuthService {
    // Generate JWT access token
    static generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'agent-feed',
            audience: 'agent-feed-users'
        });
    }
    // Generate refresh token
    static generateRefreshToken() {
        return jsonwebtoken_1.default.sign({ type: 'refresh', timestamp: Date.now() }, JWT_SECRET, { expiresIn: `${REFRESH_TOKEN_EXPIRES_DAYS}d` });
    }
    // Verify JWT token
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new types_1.AppError('Token expired', 401);
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new types_1.AppError('Invalid token', 401);
            }
            throw new types_1.AppError('Token verification failed', 401);
        }
    }
    // Hash password
    static async hashPassword(password) {
        const rounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
        return bcryptjs_1.default.hash(password, rounds);
    }
    // Verify password
    static async verifyPassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    // Create user session
    static async createUserSession(userId, refreshToken, userAgent, ipAddress) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
        await connection_1.db.query(`INSERT INTO user_sessions (user_id, refresh_token, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`, [userId, refreshToken, expiresAt, userAgent, ipAddress]);
    }
    // Validate refresh token
    static async validateRefreshToken(refreshToken) {
        try {
            const result = await connection_1.db.query(`SELECT u.*, us.expires_at
         FROM users u
         JOIN user_sessions us ON u.id = us.user_id
         WHERE us.refresh_token = $1 AND us.expires_at > NOW()`, [refreshToken]);
            if (result.rows.length === 0) {
                return null;
            }
            // Update last used timestamp
            await connection_1.db.query('UPDATE user_sessions SET last_used = NOW() WHERE refresh_token = $1', [refreshToken]);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Refresh token validation error:', error);
            return null;
        }
    }
    // Revoke refresh token
    static async revokeRefreshToken(refreshToken) {
        await connection_1.db.query('DELETE FROM user_sessions WHERE refresh_token = $1', [refreshToken]);
    }
    // Revoke all user sessions
    static async revokeAllUserSessions(userId) {
        await connection_1.db.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    }
    // Get user by ID
    static async getUserById(userId) {
        try {
            const result = await connection_1.db.query('SELECT * FROM users WHERE id = $1', [userId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            logger_1.logger.error('Get user by ID error:', error);
            return null;
        }
    }
    // Get user by email
    static async getUserByEmail(email) {
        try {
            const result = await connection_1.db.query('SELECT * FROM users WHERE email = $1', [email]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            logger_1.logger.error('Get user by email error:', error);
            return null;
        }
    }
    // Create user
    static async createUser(userData) {
        const { email, name, password, claude_user_id, avatar_url } = userData;
        let password_hash;
        if (password) {
            password_hash = await this.hashPassword(password);
        }
        try {
            const result = await connection_1.db.query(`INSERT INTO users (email, name, password_hash, claude_user_id, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`, [email, name, password_hash, claude_user_id, avatar_url]);
            return result.rows[0];
        }
        catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new types_1.AppError('User already exists', 409);
            }
            logger_1.logger.error('Create user error:', error);
            throw new types_1.AppError('Failed to create user', 500);
        }
    }
    // Update user last login
    static async updateLastLogin(userId) {
        await connection_1.db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
    }
}
exports.AuthService = AuthService;
// Middleware to authenticate JWT tokens
const authenticateToken = async (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            throw new types_1.AppError('Access token required', 401);
        }
        const payload = AuthService.verifyToken(token);
        const user = await AuthService.getUserById(payload.user_id);
        if (!user) {
            throw new types_1.AppError('User not found', 401);
        }
        req.user = user;
        req.tokenPayload = payload;
        next();
    }
    catch (error) {
        if (error instanceof types_1.AppError) {
            res.status(error.statusCode).json({
                error: { message: error.message }
            });
        }
        else {
            logger_1.logger.error('Authentication middleware error:', error);
            res.status(401).json({
                error: { message: 'Authentication failed' }
            });
        }
    }
};
exports.authenticateToken = authenticateToken;
// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const payload = AuthService.verifyToken(token);
            const user = await AuthService.getUserById(payload.user_id);
            if (user) {
                req.user = user;
                req.tokenPayload = payload;
            }
        }
        next();
    }
    catch (error) {
        // Silently fail for optional auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Middleware to check if user is admin (placeholder for future roles)
const requireAdmin = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            error: { message: 'Authentication required' }
        });
        return;
    }
    // For now, check if user email contains 'admin' (replace with proper role system)
    if (!req.user.email.includes('admin')) {
        res.status(403).json({
            error: { message: 'Admin access required' }
        });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
// Rate limiting helper
const createRateLimitKey = (req) => {
    const userId = req.user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return userId ? `user:${userId}` : `ip:${ip}`;
};
exports.createRateLimitKey = createRateLimitKey;
// Login endpoint handler
const loginHandler = async (// eslint-disable-next-line @typescript-eslint/no-explicit-any
req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new types_1.AppError('Email and password required', 400);
        }
        const user = await AuthService.getUserByEmail(email);
        if (!user || !user.password_hash) {
            logger_1.securityLogger.authFailure(email, 'password', req.ip, 'user_not_found');
            throw new types_1.AppError('Invalid credentials', 401);
        }
        const isValidPassword = await AuthService.verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            logger_1.securityLogger.authFailure(email, 'password', req.ip, 'invalid_password');
            throw new types_1.AppError('Invalid credentials', 401);
        }
        // Generate tokens
        const accessToken = AuthService.generateAccessToken({
            user_id: user.id,
            email: user.email
        });
        const refreshToken = AuthService.generateRefreshToken();
        // Create session
        await AuthService.createUserSession(user.id, refreshToken, req.get('User-Agent'), req.ip);
        // Update last login
        await AuthService.updateLastLogin(user.id);
        logger_1.securityLogger.authSuccess(user.id, 'password', req.ip);
        res.json({
            success: true,
            data: {
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: JWT_EXPIRES_IN,
                token_type: 'Bearer',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    avatar_url: user.avatar_url
                }
            }
        });
    }
    catch (error) {
        if (error instanceof types_1.AppError) {
            res.status(error.statusCode).json({
                error: { message: error.message }
            });
        }
        else {
            logger_1.logger.error('Login error:', error);
            res.status(500).json({
                error: { message: 'Internal server error' }
            });
        }
    }
};
exports.loginHandler = loginHandler;
// Refresh token endpoint handler
const refreshTokenHandler = async (// eslint-disable-next-line @typescript-eslint/no-explicit-any
req, res) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            throw new types_1.AppError('Refresh token required', 400);
        }
        const user = await AuthService.validateRefreshToken(refresh_token);
        if (!user) {
            throw new types_1.AppError('Invalid refresh token', 401);
        }
        // Generate new access token
        const accessToken = AuthService.generateAccessToken({
            user_id: user.id,
            email: user.email
        });
        logger_1.securityLogger.tokenRefresh(user.id, req.ip);
        res.json({
            success: true,
            data: {
                access_token: accessToken,
                expires_in: JWT_EXPIRES_IN,
                token_type: 'Bearer'
            }
        });
    }
    catch (error) {
        if (error instanceof types_1.AppError) {
            res.status(error.statusCode).json({
                error: { message: error.message }
            });
        }
        else {
            logger_1.logger.error('Refresh token error:', error);
            res.status(500).json({
                error: { message: 'Internal server error' }
            });
        }
    }
};
exports.refreshTokenHandler = refreshTokenHandler;
// Logout endpoint handler
const logoutHandler = async (// eslint-disable-next-line @typescript-eslint/no-explicit-any
req, res) => {
    try {
        const { refresh_token } = req.body;
        if (refresh_token) {
            await AuthService.revokeRefreshToken(refresh_token);
        }
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Logout error:', error);
        res.status(500).json({
            error: { message: 'Internal server error' }
        });
    }
};
exports.logoutHandler = logoutHandler;
//# sourceMappingURL=auth.js.map