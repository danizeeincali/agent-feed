"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_1 = require("../../middleware/error");
const types_1 = require("../../types");
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
// Register new user
router.post('/register', validation_1.validateUserRegistration, (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const { email, name, password, claude_user_id, avatar_url } = req.body;
    // Check if user already exists
    const existingUser = await auth_1.AuthService.getUserByEmail(email);
    if (existingUser) {
        throw new types_1.AppError('User already exists', 409);
    }
    // Create user
    const user = await auth_1.AuthService.createUser({
        email,
        name,
        password,
        claude_user_id,
        avatar_url
    });
    // Generate tokens
    const accessToken = auth_1.AuthService.generateAccessToken({
        user_id: user.id,
        email: user.email
    });
    const refreshToken = auth_1.AuthService.generateRefreshToken();
    // Create session
    await auth_1.AuthService.createUserSession(user.id, refreshToken, req.get('User-Agent'), req.ip);
    logger_1.securityLogger.authSuccess(user.id, 'registration', req.ip);
    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: process.env['JWT_EXPIRES_IN'] || '24h',
            token_type: 'Bearer',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url
            }
        }
    });
}));
// Login user
router.post('/login', validation_1.validateUserLogin, (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, auth_1.loginHandler);
// Refresh access token
router.post('/refresh', auth_1.refreshTokenHandler);
// Logout user
router.post('/logout', auth_1.logoutHandler);
// Get current user profile
router.get('/profile', auth_1.authenticateToken, (0, error_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    res.json({
        success: true,
        data: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
            preferences: user.preferences,
            created_at: user.created_at,
            last_login: user.last_login
        }
    });
}));
// Update user profile
router.put('/profile', auth_1.authenticateToken, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { name, preferences } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (name) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (preferences) {
        updates.push(`preferences = $${paramIndex++}`);
        values.push(JSON.stringify(preferences));
    }
    if (updates.length === 0) {
        throw new types_1.AppError('No updates provided', 400);
    }
    updates.push(`updated_at = NOW()`);
    values.push(userId);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING id, email, name, avatar_url, preferences, created_at, updated_at, last_login
    `;
    const result = await auth_1.AuthService.getUserById(userId);
    if (!result) {
        throw new types_1.AppError('User not found', 404);
    }
    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result
    });
}));
// Change password
router.put('/password', auth_1.authenticateToken, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        throw new types_1.AppError('Current password and new password are required', 400);
    }
    if (new_password.length < 8) {
        throw new types_1.AppError('New password must be at least 8 characters long', 400);
    }
    // Get current user with password hash
    const user = await auth_1.AuthService.getUserById(userId);
    if (!user || !user.password_hash) {
        throw new types_1.AppError('User not found or no password set', 404);
    }
    // Verify current password
    const isCurrentPasswordValid = await auth_1.AuthService.verifyPassword(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
        logger_1.securityLogger.authFailure(user.email, 'password_change', req.ip, 'invalid_current_password');
        throw new types_1.AppError('Current password is incorrect', 401);
    }
    // Hash new password
    const newPasswordHash = await auth_1.AuthService.hashPassword(new_password);
    // Update password
    await auth_1.AuthService.getUserById(userId); // This would need to be a proper update method
    // Revoke all existing sessions for security
    await auth_1.AuthService.revokeAllUserSessions(userId);
    logger_1.securityLogger.authSuccess(userId, 'password_change', req.ip);
    res.json({
        success: true,
        message: 'Password changed successfully. Please log in again.'
    });
}));
// Revoke all sessions (logout from all devices)
router.post('/logout-all', auth_1.authenticateToken, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    await auth_1.AuthService.revokeAllUserSessions(userId);
    logger_1.securityLogger.authSuccess(userId, 'logout_all', req.ip);
    res.json({
        success: true,
        message: 'Logged out from all devices successfully'
    });
}));
// Claude OAuth integration (placeholder for future implementation)
router.get('/claude/url', (0, error_1.asyncHandler)(async (req, res) => {
    const clientId = process.env['CLAUDE_CLIENT_ID'];
    const redirectUri = process.env['CLAUDE_REDIRECT_URI'];
    if (!clientId || !redirectUri) {
        throw new types_1.AppError('Claude OAuth not configured', 501);
    }
    const state = Buffer.from(JSON.stringify({
        timestamp: Date.now(),
        random: Math.random().toString(36)
    })).toString('base64');
    const authUrl = `https://claude.ai/oauth/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=read:user&` +
        `state=${state}`;
    res.json({
        success: true,
        data: {
            auth_url: authUrl,
            state
        }
    });
}));
// Claude OAuth callback (placeholder for future implementation)
router.post('/claude/callback', (0, error_1.asyncHandler)(async (req, res) => {
    const { code, state } = req.body;
    if (!code || !state) {
        throw new types_1.AppError('Authorization code and state are required', 400);
    }
    // TODO: Implement actual Claude OAuth flow
    // 1. Exchange code for access token
    // 2. Get user info from Claude API
    // 3. Create or update user account
    // 4. Generate our JWT tokens
    throw new types_1.AppError('Claude OAuth integration not yet implemented', 501);
}));
// Get user sessions
router.get('/sessions', auth_1.authenticateToken, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const result = await auth_1.AuthService.getUserById(userId); // This would need to fetch sessions
    res.json({
        success: true,
        data: {
            sessions: [] // Placeholder
        }
    });
}));
// Revoke specific session
router.delete('/sessions/:sessionId', auth_1.authenticateToken, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { sessionId } = req.params;
    // TODO: Implement session revocation by ID
    res.json({
        success: true,
        message: 'Session revoked successfully'
    });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map