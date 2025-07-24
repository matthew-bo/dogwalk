"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GameController_1 = require("@/controllers/GameController");
const auth_1 = require("@/middleware/auth");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const errorHandler_1 = require("@/middleware/errorHandler");
const router = (0, express_1.Router)();
// Apply authentication to all game routes
router.use(auth_1.authenticateToken);
// Apply game-specific rate limiting
router.use(rateLimiter_1.gameRateLimiter);
// Game routes
router.post('/start', (0, errorHandler_1.asyncHandler)(GameController_1.GameController.startGame));
router.post('/cashout', (0, errorHandler_1.asyncHandler)(GameController_1.GameController.cashOut));
router.get('/history', (0, errorHandler_1.asyncHandler)(GameController_1.GameController.getGameHistory));
router.get('/active-sessions', (0, errorHandler_1.asyncHandler)(GameController_1.GameController.getActiveSessions));
router.get('/verify/:sessionId', (0, errorHandler_1.asyncHandler)(GameController_1.GameController.verifyGame));
exports.default = router;
//# sourceMappingURL=game.js.map