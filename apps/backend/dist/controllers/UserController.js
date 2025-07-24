"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const joi_1 = __importDefault(require("joi"));
const UserService_1 = require("@/services/UserService");
const errorHandler_1 = require("@/middleware/errorHandler");
class UserController {
    static async getProfile(req, res) {
        const userId = req.user.userId;
        const profile = await UserService_1.UserService.getUserProfile(userId);
        res.json({
            success: true,
            data: profile,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async updateProfile(req, res) {
        const { error, value } = UserController.updateProfileSchema.validate(req.body);
        if (error) {
            errorHandler_1.ErrorHandler.throwValidationError('Profile update validation failed', {
                details: error.details
            });
        }
        const userId = req.user.userId;
        const updatedProfile = await UserService_1.UserService.updateUserProfile(userId, value);
        res.json({
            success: true,
            data: updatedProfile,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async getCosmetics(req, res) {
        const userId = req.user.userId;
        const cosmetics = await UserService_1.UserService.getUserCosmetics(userId);
        res.json({
            success: true,
            data: cosmetics,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async getLeaderboard(req, res) {
        const { error, value } = UserController.leaderboardSchema.validate(req.query);
        if (error) {
            errorHandler_1.ErrorHandler.throwValidationError('Leaderboard validation failed', {
                details: error.details
            });
        }
        const { period, limit } = value;
        const leaderboard = await UserService_1.UserService.getLeaderboard(period, limit);
        res.json({
            success: true,
            data: leaderboard,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
}
exports.UserController = UserController;
UserController.updateProfileSchema = joi_1.default.object({
    email: joi_1.default.string().email().optional(),
    currentPassword: joi_1.default.string().min(8).when('newPassword', {
        is: joi_1.default.exist(),
        then: joi_1.default.required(),
        otherwise: joi_1.default.optional()
    }),
    newPassword: joi_1.default.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).optional()
        .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    })
});
UserController.leaderboardSchema = joi_1.default.object({
    period: joi_1.default.string().valid('daily', 'weekly', 'all-time').default('daily'),
    limit: joi_1.default.number().integer().min(1).max(100).default(10)
});
//# sourceMappingURL=UserController.js.map