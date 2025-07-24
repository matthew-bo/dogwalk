"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("@/controllers/AuthController");
const auth_1 = require("@/middleware/auth");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const errorHandler_1 = require("@/middleware/errorHandler");
const router = (0, express_1.Router)();
// Apply rate limiting to auth endpoints
router.use(rateLimiter_1.authRateLimiter);
// Public routes
router.post('/register', (0, errorHandler_1.asyncHandler)(AuthController_1.AuthController.register));
router.post('/login', (0, errorHandler_1.asyncHandler)(AuthController_1.AuthController.login));
router.post('/refresh', (0, errorHandler_1.asyncHandler)(AuthController_1.AuthController.refreshToken));
// Protected routes
router.post('/logout', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(AuthController_1.AuthController.logout));
router.get('/me', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(AuthController_1.AuthController.getCurrentUser));
exports.default = router;
//# sourceMappingURL=auth.js.map