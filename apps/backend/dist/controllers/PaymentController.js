"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const joi_1 = __importDefault(require("joi"));
const PaymentService_1 = require("@/services/PaymentService");
const errorHandler_1 = require("@/middleware/errorHandler");
class PaymentController {
    static async createDeposit(req, res) {
        const { error, value } = PaymentController.depositSchema.validate(req.body);
        if (error) {
            errorHandler_1.ErrorHandler.throwValidationError('Deposit validation failed', {
                details: error.details
            });
        }
        const { amount } = value;
        const userId = req.user.userId;
        const deposit = await PaymentService_1.PaymentService.createDeposit(userId, amount);
        res.status(201).json({
            success: true,
            data: deposit,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async createWithdrawal(req, res) {
        const { error, value } = PaymentController.withdrawSchema.validate(req.body);
        if (error) {
            errorHandler_1.ErrorHandler.throwValidationError('Withdrawal validation failed', {
                details: error.details
            });
        }
        const { amount, walletAddress, cryptoType } = value;
        const userId = req.user.userId;
        const withdrawal = await PaymentService_1.PaymentService.createWithdrawal(userId, amount, walletAddress, cryptoType);
        res.status(201).json({
            success: true,
            data: withdrawal,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async getTransactions(req, res) {
        const { error, value } = PaymentController.transactionHistorySchema.validate(req.query);
        if (error) {
            errorHandler_1.ErrorHandler.throwValidationError('Transaction history validation failed', {
                details: error.details
            });
        }
        const { limit, offset, type } = value;
        const userId = req.user.userId;
        const transactions = await PaymentService_1.PaymentService.getTransactionHistory(userId, limit, offset, type);
        res.json({
            success: true,
            data: transactions,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
    static async getBalance(req, res) {
        const userId = req.user.userId;
        const balance = await PaymentService_1.PaymentService.getUserBalance(userId);
        res.json({
            success: true,
            data: balance,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            }
        });
    }
}
exports.PaymentController = PaymentController;
PaymentController.depositSchema = joi_1.default.object({
    amount: joi_1.default.number().min(5).max(100000).required() // USD amount, $5 to $100k
});
PaymentController.withdrawSchema = joi_1.default.object({
    amount: joi_1.default.number().integer().min(1000).required(), // satoshis, min $10 worth
    walletAddress: joi_1.default.string().required(),
    cryptoType: joi_1.default.string().valid('btc', 'eth').default('btc')
});
PaymentController.transactionHistorySchema = joi_1.default.object({
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
    offset: joi_1.default.number().integer().min(0).default(0),
    type: joi_1.default.string().valid('deposit', 'withdrawal', 'bet', 'payout').optional()
});
//# sourceMappingURL=PaymentController.js.map