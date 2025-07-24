"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAgeVerification = exports.optionalAuth = exports.authenticateToken = void 0;
const AuthService_1 = require("@/services/AuthService");
const errorHandler_1 = require("@/middleware/errorHandler");
const shared_1 = require("shared");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            errorHandler_1.ErrorHandler.throwAuthError('No token provided', shared_1.ERROR_CODES.TOKEN_MISSING);
        }
        // Verify token and get user payload
        const decoded = await AuthService_1.AuthService.verifyToken(token);
        // Add user to request object
        req.user = decoded;
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        if (token) {
            try {
                const decoded = await AuthService_1.AuthService.verifyToken(token);
                req.user = decoded;
            }
            catch (error) {
                // For optional auth, ignore token errors and continue without user
                console.warn('Optional auth token verification failed:', error);
            }
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.optionalAuth = optionalAuth;
// Middleware to check if user has verified age
const requireAgeVerification = (req, res, next) => {
    // This will be called after authenticateToken, so user should exist
    if (!req.user) {
        errorHandler_1.ErrorHandler.throwAuthError('Authentication required', shared_1.ERROR_CODES.TOKEN_MISSING);
    }
    // We'll need to fetch user from database to check age verification
    // For now, we assume the JWT contains this info or we fetch it
    // In a real implementation, you might want to include this in the JWT payload
    next();
};
exports.requireAgeVerification = requireAgeVerification;
//# sourceMappingURL=auth.js.map