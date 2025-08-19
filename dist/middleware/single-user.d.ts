/**
 * Single User Middleware
 *
 * For single-user systems, automatically provides default user context
 * Eliminates need for explicit user ID input in API requests
 */
import { Request, Response, NextFunction } from 'express';
interface SingleUserRequest extends Request {
    singleUser?: {
        id: string;
        name: string;
        isDefault: boolean;
    };
}
/**
 * Middleware to automatically inject single user context
 * This middleware ensures all API requests have a valid user context
 * without requiring explicit user authentication or ID provision
 */
export declare const singleUserMiddleware: (req: SingleUserRequest, res: Response, next: NextFunction) => void;
/**
 * Helper function to get current user context
 * Always returns the default single user for this system
 */
export declare const getCurrentUser: (req: SingleUserRequest) => {
    id: string;
    name: string;
    isDefault: boolean;
};
/**
 * Validation bypass for single-user system
 * Replaces strict user ID validation with automatic provision
 */
export declare const validateSingleUser: (req: SingleUserRequest, res: Response, next: NextFunction) => void;
export default singleUserMiddleware;
//# sourceMappingURL=single-user.d.ts.map