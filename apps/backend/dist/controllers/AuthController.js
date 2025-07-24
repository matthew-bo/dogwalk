"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const joi_1 = __importDefault(require("joi"));
const AuthService_1 = require("@/services/AuthService");
const errorHandler_1 = require("@/middleware/errorHandler");
class AuthController {
    static async register(req, res) {
        const { error, value } = AuthController.registerSchema.validate(req.body);
        if (error) {
            errorHandler_1.ErrorHandler.throwValidationError('Registration validation failed', {
                details: error.details
            });
        }
        const { username, email, password, ageConfirmed } = value;
        const result = await AuthService_1.AuthService.register({
            username,
            email,
            password,
            ageConfirmed
        });
        res.status(201).json({
            success: true,
            data: {
                user: result.user,
                token: result.token
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async login(req, res) {
        const { error, value } = AuthController.loginSchema.validate(req.body);
        if (error) {
            errorHandler_1.ErrorHandler.throwValidationError('Login validation failed', {
                details: error.details
            });
        }
        const { username, password } = value;
        const result = await AuthService_1.AuthService.login(username, password);
        res.json({
            success: true,
            data: {
                user: result.user,
                token: result.token,
                refreshToken: result.refreshToken
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async logout(req, res) {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            errorHandler_1.ErrorHandler.throwAuthError('No token provided for logout');
        }
        await AuthService_1.AuthService.logout(token);
        res.json({
            success: true,
            data: {
                message: 'Successfully logged out'
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async refreshToken(req, res) {
        const { error, value } = AuthController.refreshTokenSchema.validate(req.body);
        if (error) {
            errorHandler_1.ErrorHandler.throwValidationError('Refresh token validation failed', {
                details: error.details
            });
        }
        const { refreshToken } = value;
        const result = await AuthService_1.AuthService.refreshToken(refreshToken);
        res.json({
            success: true,
            data: {
                token: result.token,
                refreshToken: result.refreshToken
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async getCurrentUser(req, res) {
        const user = await AuthService_1.AuthService.getCurrentUser(req.user.userId);
        res.json({
            success: true,
            data: {
                user
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
}
exports.AuthController = AuthController;
AuthController.registerSchema = joi_1.default.object({
    username: joi_1.default.string().alphanum().min(3).max(30).required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
        .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
    ageConfirmed: joi_1.default.boolean().valid(true).required()
        .messages({
        'any.only': 'You must confirm that you are 21 years or older'
    })
});
AuthController.loginSchema = joi_1.default.object({
    username: joi_1.default.string().required(),
    password: joi_1.default.string().required()
});
AuthController.refreshTokenSchema = joi_1.default.object({
    refreshToken: joi_1.default.string().required()
});
//# sourceMappingURL=AuthController.js.map