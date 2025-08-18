import { Request, Response, NextFunction } from 'express';
import { JWTPayload, User } from '../types';
declare global {
    namespace Express {
        interface Request {
            user?: User;
            tokenPayload?: JWTPayload;
        }
    }
}
export declare class AuthService {
    static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string;
    static generateRefreshToken(): string;
    static verifyToken(token: string): JWTPayload;
    static hashPassword(password: string): Promise<string>;
    static verifyPassword(password: string, hash: string): Promise<boolean>;
    static createUserSession(userId: string, refreshToken: string, userAgent?: string, ipAddress?: string): Promise<void>;
    static validateRefreshToken(refreshToken: string): Promise<User | null>;
    static revokeRefreshToken(refreshToken: string): Promise<void>;
    static revokeAllUserSessions(userId: string): Promise<void>;
    static getUserById(userId: string): Promise<User | null>;
    static getUserByEmail(email: string): Promise<User | null>;
    static createUser(userData: {
        email: string;
        name: string;
        password?: string;
        claude_user_id?: string;
        avatar_url?: string;
    }): Promise<User>;
    static updateLastLogin(userId: string): Promise<void>;
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const createRateLimitKey: (req: Request) => string;
export declare const loginHandler: (// eslint-disable-next-line @typescript-eslint/no-explicit-any
req: Request, res: Response) => Promise<void>;
export declare const refreshTokenHandler: (// eslint-disable-next-line @typescript-eslint/no-explicit-any
req: Request, res: Response) => Promise<void>;
export declare const logoutHandler: (// eslint-disable-next-line @typescript-eslint/no-explicit-any
req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map