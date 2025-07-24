"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameController = void 0;
const joi_1 = __importDefault(require("joi"));
const GameService_1 = require("@/services/GameService");
const errorHandler_1 = require("@/middleware/errorHandler");
const shared_1 = require("shared");
class GameController {
    static async startGame(req, res) {
        const { error, value } = GameController.startGameSchema.validate(req.body);
        if (error) {
            errorHandler_1.ErrorHandler.throwValidationError('Start game validation failed', {
                details: error.details
            });
        }
        const { betAmount } = value;
        const userId = req.user.userId;
        const session = await GameService_1.GameService.startGame(userId, betAmount);
        res.status(201).json({
            success: true,
            data: session,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async cashOut(req, res) {
        const { error, value } = GameController.cashOutSchema.validate(req.body);
        if (error) {
            errorHandler_1.ErrorHandler.throwValidationError('Cash out validation failed', {
                details: error.details
            });
        }
        const { sessionId, cashoutSecond } = value;
        const userId = req.user.userId;
        const result = await GameService_1.GameService.cashOut(userId, sessionId, cashoutSecond);
        res.json({
            success: true,
            data: result,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async getGameHistory(req, res) {
        const { error, value } = GameController.historySchema.validate(req.query);
        if (error) {
            errorHandler_1.ErrorHandler.throwValidationError('Game history validation failed', {
                details: error.details
            });
        }
        const { limit, offset } = value;
        const userId = req.user.userId;
        const history = await GameService_1.GameService.getGameHistory(userId, limit, offset);
        res.json({
            success: true,
            data: history,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async getActiveSessions(req, res) {
        const userId = req.user.userId;
        const activeSessions = await GameService_1.GameService.getActiveSessions(userId);
        res.json({
            success: true,
            data: {
                activeSessions,
                hasActiveSession: activeSessions.length > 0
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async verifyGame(req, res) {
        const { sessionId } = req.params;
        if (!sessionId) {
            errorHandler_1.ErrorHandler.throwValidationError('Session ID is required');
        }
        const verification = await GameService_1.GameService.verifyGame(sessionId);
        res.json({
            success: true,
            data: verification,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
}
exports.GameController = GameController;
GameController.startGameSchema = joi_1.default.object({
    betAmount: joi_1.default.number().integer().min(shared_1.GAME_CONFIG.MIN_BET_CENTS).max(shared_1.GAME_CONFIG.MAX_BET_CENTS).required()
});
GameController.cashOutSchema = joi_1.default.object({
    sessionId: joi_1.default.string().uuid().required(),
    cashoutSecond: joi_1.default.number().integer().min(1).max(shared_1.GAME_CONFIG.MAX_GAME_DURATION).required()
});
GameController.historySchema = joi_1.default.object({
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
    offset: joi_1.default.number().integer().min(0).default(0)
});
//# sourceMappingURL=GameController.js.map