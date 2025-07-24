"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const crypto_1 = __importDefault(require("crypto"));
const PaymentService_1 = require("@/services/PaymentService");
class WebhookController {
    static async handleCoinbaseWebhook(req, res) {
        try {
            // Verify webhook signature
            const signature = req.headers['x-cc-webhook-signature'];
            const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;
            if (!webhookSecret) {
                console.error('COINBASE_WEBHOOK_SECRET not configured');
                res.status(500).json({
                    success: false,
                    error: { message: 'Webhook secret not configured' }
                });
                return;
            }
            // Verify the webhook signature
            if (signature) {
                const computedSignature = crypto_1.default
                    .createHmac('sha256', webhookSecret)
                    .update(JSON.stringify(req.body))
                    .digest('hex');
                if (signature !== computedSignature) {
                    console.error('Invalid webhook signature');
                    res.status(401).json({
                        success: false,
                        error: { message: 'Invalid signature' }
                    });
                    return;
                }
            }
            // Process the webhook
            await PaymentService_1.PaymentService.handleCoinbaseWebhook(req.body);
            res.status(200).json({
                success: true,
                message: 'Webhook processed successfully'
            });
        }
        catch (error) {
            console.error('Error processing Coinbase webhook:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'WEBHOOK_PROCESSING_ERROR',
                    message: 'Failed to process webhook'
                }
            });
        }
    }
}
exports.WebhookController = WebhookController;
//# sourceMappingURL=WebhookController.js.map