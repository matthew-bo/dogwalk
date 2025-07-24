"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("@/controllers/UserController");
const auth_1 = require("@/middleware/auth");
const errorHandler_1 = require("@/middleware/errorHandler");
const router = (0, express_1.Router)();
// Apply authentication to all user routes
router.use(auth_1.authenticateToken);
// User routes
router.get('/profile', (0, errorHandler_1.asyncHandler)(UserController_1.UserController.getProfile));
router.put('/profile', (0, errorHandler_1.asyncHandler)(UserController_1.UserController.updateProfile));
router.get('/cosmetics', (0, errorHandler_1.asyncHandler)(UserController_1.UserController.getCosmetics));
router.get('/leaderboard', (0, errorHandler_1.asyncHandler)(UserController_1.UserController.getLeaderboard));
exports.default = router;
//# sourceMappingURL=user.js.map