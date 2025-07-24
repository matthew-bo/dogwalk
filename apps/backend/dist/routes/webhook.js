"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const WebhookController_1 = require("@/controllers/WebhookController");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const errorHandler_1 = require("@/middleware/errorHandler");
const router = (0, express_1.Router)();
// Apply rate limiting
router.use(rateLimiter_1.webhookRateLimiter);
// Webhook routes
router.post('/coinbase', (0, errorHandler_1.asyncHandler)(WebhookController_1.WebhookController.handleCoinbaseWebhook));
exports.default = router;
//# sourceMappingURL=webhook.js.map