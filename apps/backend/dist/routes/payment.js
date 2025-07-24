"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PaymentController_1 = require("@/controllers/PaymentController");
const auth_1 = require("@/middleware/auth");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const errorHandler_1 = require("@/middleware/errorHandler");
const router = (0, express_1.Router)();
// Apply authentication and rate limiting
router.use(auth_1.authenticateToken);
router.use(rateLimiter_1.paymentRateLimiter);
// Payment routes
router.post('/deposit', (0, errorHandler_1.asyncHandler)(PaymentController_1.PaymentController.createDeposit));
router.post('/withdraw', (0, errorHandler_1.asyncHandler)(PaymentController_1.PaymentController.createWithdrawal));
router.get('/transactions', (0, errorHandler_1.asyncHandler)(PaymentController_1.PaymentController.getTransactions));
router.get('/balance', (0, errorHandler_1.asyncHandler)(PaymentController_1.PaymentController.getBalance));
exports.default = router;
//# sourceMappingURL=payment.js.map