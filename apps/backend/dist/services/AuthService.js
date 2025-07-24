"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const DatabaseService_1 = require("@/services/DatabaseService");
const RedisService_1 = require("@/services/RedisService");
const errorHandler_1 = require("@/middleware/errorHandler");
const shared_1 = require("shared");
class AuthService {
    static async register(userData) {
        const { username, email, password, ageConfirmed } = userData;
        // Check if user already exists
        const existingUser = await DatabaseService_1.prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });
        if (existingUser) {
            if (existingUser.username === username) {
                errorHandler_1.ErrorHandler.throwBusinessError('Username already exists', shared_1.ERROR_CODES.USER_ALREADY_EXISTS);
            }
            else {
                errorHandler_1.ErrorHandler.throwBusinessError('Email already exists', shared_1.ERROR_CODES.USER_ALREADY_EXISTS);
            }
        }
        // Age verification
        if (!ageConfirmed) {
            errorHandler_1.ErrorHandler.throwAuthError('Age confirmation required', shared_1.ERROR_CODES.AGE_NOT_VERIFIED);
        }
        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
        // Create user
        const user = await DatabaseService_1.prisma.user.create({
            data: {
                username,
                email,
                passwordHash,
                isAgeVerified: ageConfirmed,
                usdBalanceCents: 0
            },
            select: {
                id: true,
                username: true,
                email: true,
                usdBalanceCents: true,
                isAgeVerified: true,
                createdAt: true,
                updatedAt: true
            }
        });
        // Generate tokens
        const { accessToken, refreshToken } = await AuthService.generateTokens(user);
        // Store refresh token in Redis
        await AuthService.storeRefreshToken(user.id, refreshToken);
        return {
            success: true,
            user,
            token: accessToken
        };
    }
    static async login(username, password) {
        // Find user by username or email
        const user = await DatabaseService_1.prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email: username }
                ]
            }
        });
        if (!user) {
            errorHandler_1.ErrorHandler.throwAuthError('Invalid credentials', shared_1.ERROR_CODES.INVALID_CREDENTIALS);
        }
        // Verify password
        const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            errorHandler_1.ErrorHandler.throwAuthError('Invalid credentials', shared_1.ERROR_CODES.INVALID_CREDENTIALS);
        }
        // Check if age verified
        if (!user.isAgeVerified) {
            errorHandler_1.ErrorHandler.throwAuthError('Age verification required', shared_1.ERROR_CODES.AGE_NOT_VERIFIED);
        }
        // Generate tokens
        const { accessToken, refreshToken } = await AuthService.generateTokens(user);
        // Store refresh token in Redis
        await AuthService.storeRefreshToken(user.id, refreshToken);
        // Remove password hash from response
        const { passwordHash, ...userWithoutPassword } = user;
        return {
            success: true,
            user: userWithoutPassword,
            token: accessToken,
            refreshToken
        };
    }
    static async logout(token) {
        try {
            // Decode token to get expiry
            const decoded = jsonwebtoken_1.default.decode(token);
            if (!decoded || !decoded.exp) {
                return; // Invalid token, nothing to blacklist
            }
            // Calculate remaining TTL
            const expirySeconds = decoded.exp - Math.floor(Date.now() / 1000);
            if (expirySeconds > 0) {
                // Blacklist token for remaining TTL
                await RedisService_1.RedisService.blacklistToken(token, expirySeconds);
            }
            // Remove refresh token from Redis
            if (decoded.userId) {
                await RedisService_1.RedisService.del(`refresh_token:${decoded.userId}`);
            }
        }
        catch (error) {
            // Log error but don't throw - logout should always succeed
            console.error('Error during logout:', error);
        }
    }
    static async refreshToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jsonwebtoken_1.default.verify(refreshToken, AuthService.JWT_SECRET);
            // Check if refresh token exists in Redis
            const storedToken = await RedisService_1.RedisService.get(`refresh_token:${decoded.userId}`);
            if (!storedToken || storedToken !== refreshToken) {
                errorHandler_1.ErrorHandler.throwAuthError('Invalid refresh token', shared_1.ERROR_CODES.TOKEN_INVALID);
            }
            // Get user
            const user = await DatabaseService_1.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    usdBalanceCents: true,
                    isAgeVerified: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            if (!user) {
                errorHandler_1.ErrorHandler.throwAuthError('User not found', shared_1.ERROR_CODES.USER_NOT_FOUND);
            }
            // Generate new tokens
            const { accessToken, refreshToken: newRefreshToken } = await AuthService.generateTokens(user);
            // Store new refresh token
            await AuthService.storeRefreshToken(user.id, newRefreshToken);
            return {
                token: accessToken,
                refreshToken: newRefreshToken
            };
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                errorHandler_1.ErrorHandler.throwAuthError('Refresh token expired', shared_1.ERROR_CODES.TOKEN_EXPIRED);
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                errorHandler_1.ErrorHandler.throwAuthError('Invalid refresh token', shared_1.ERROR_CODES.TOKEN_INVALID);
            }
            throw error;
        }
    }
    static async getCurrentUser(userId) {
        const user = await DatabaseService_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                usdBalanceCents: true,
                isAgeVerified: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            errorHandler_1.ErrorHandler.throwAuthError('User not found', shared_1.ERROR_CODES.USER_NOT_FOUND);
        }
        return user;
    }
    static async verifyToken(token) {
        try {
            // Check if token is blacklisted
            const isBlacklisted = await RedisService_1.RedisService.isTokenBlacklisted(token);
            if (isBlacklisted) {
                errorHandler_1.ErrorHandler.throwAuthError('Token has been revoked', shared_1.ERROR_CODES.TOKEN_REVOKED);
            }
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, AuthService.JWT_SECRET);
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                errorHandler_1.ErrorHandler.throwAuthError('Token expired', shared_1.ERROR_CODES.TOKEN_EXPIRED);
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                errorHandler_1.ErrorHandler.throwAuthError('Invalid token', shared_1.ERROR_CODES.TOKEN_INVALID);
            }
            throw error;
        }
    }
    static async generateTokens(user) {
        const payload = {
            userId: user.id,
            username: user.username
        };
        // Generate access token
        const accessToken = jsonwebtoken_1.default.sign(payload, AuthService.JWT_SECRET, {
            expiresIn: AuthService.JWT_ACCESS_TOKEN_EXPIRY
        });
        // Generate refresh token
        const refreshToken = jsonwebtoken_1.default.sign(payload, AuthService.JWT_SECRET, {
            expiresIn: AuthService.JWT_REFRESH_TOKEN_EXPIRY
        });
        return { accessToken, refreshToken };
    }
    static async storeRefreshToken(userId, refreshToken) {
        // Store refresh token in Redis with expiry
        const expirySeconds = 7 * 24 * 60 * 60; // 7 days
        await RedisService_1.RedisService.set(`refresh_token:${userId}`, refreshToken, expirySeconds);
    }
    static async changePassword(userId, currentPassword, newPassword) {
        const user = await DatabaseService_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            errorHandler_1.ErrorHandler.throwAuthError('User not found', shared_1.ERROR_CODES.USER_NOT_FOUND);
        }
        // Verify current password
        const isCurrentPasswordValid = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            errorHandler_1.ErrorHandler.throwAuthError('Current password is incorrect', shared_1.ERROR_CODES.INVALID_CREDENTIALS);
        }
        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt_1.default.hash(newPassword, saltRounds);
        // Update password
        await DatabaseService_1.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash }
        });
        // Invalidate all existing tokens for this user
        await RedisService_1.RedisService.del(`refresh_token:${userId}`);
    }
}
exports.AuthService = AuthService;
AuthService.JWT_SECRET = process.env.JWT_SECRET;
AuthService.JWT_ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || shared_1.LIMITS.JWT_ACCESS_TOKEN_EXPIRY;
AuthService.JWT_REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || shared_1.LIMITS.JWT_REFRESH_TOKEN_EXPIRY;
//# sourceMappingURL=AuthService.js.map