"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const DatabaseService_1 = require("@/services/DatabaseService");
const errorHandler_1 = require("@/middleware/errorHandler");
const shared_1 = require("shared");
class PaymentService {
    static async createDeposit(userId, usdAmount) {
        // Validate user exists
        const user = await DatabaseService_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            errorHandler_1.ErrorHandler.throwBusinessError('User not found', shared_1.ERROR_CODES.USER_NOT_FOUND);
        }
        try {
            // Create payment attempt record
            const paymentAttempt = await DatabaseService_1.prisma.paymentAttempt.create({
                data: {
                    userId,
                    provider: 'coinbase_commerce',
                    amount: Math.round(usdAmount * 100), // Convert to cents
                    status: 'INITIATED'
                }
            });
            // Mock Coinbase Commerce charge creation
            // In production, replace with actual Coinbase Commerce SDK
            const charge = await PaymentService.createCoinbaseCharge(usdAmount, userId, paymentAttempt.id);
            // Update payment attempt with external ID
            await DatabaseService_1.prisma.paymentAttempt.update({
                where: { id: paymentAttempt.id },
                data: {
                    externalId: charge.id,
                    status: 'PENDING'
                }
            });
            return {
                paymentUrl: charge.hosted_url,
                paymentId: paymentAttempt.id
            };
        }
        catch (error) {
            console.error('Failed to create deposit:', error);
            errorHandler_1.ErrorHandler.throwBusinessError('Failed to create payment', shared_1.ERROR_CODES.PAYMENT_PROVIDER_ERROR);
        }
    }
    static async createWithdrawal(userId, usdAmountCents, walletAddress, cryptoType = 'btc') {
        // Validate user and balance
        const user = await DatabaseService_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            errorHandler_1.ErrorHandler.throwBusinessError('User not found', shared_1.ERROR_CODES.USER_NOT_FOUND);
        }
        if (user.usdBalanceCents < usdAmountCents) {
            errorHandler_1.ErrorHandler.throwBusinessError('Insufficient balance', shared_1.ERROR_CODES.INSUFFICIENT_BALANCE_FOR_WITHDRAWAL);
        }
        // Validate wallet address
        const isValidAddress = PaymentService.validateWalletAddress(walletAddress, cryptoType);
        if (!isValidAddress) {
            errorHandler_1.ErrorHandler.throwBusinessError('Invalid wallet address', shared_1.ERROR_CODES.INVALID_WALLET_ADDRESS);
        }
        // Check daily withdrawal limits
        const dailyWithdrawals = await PaymentService.getDailyWithdrawalAmount(userId);
        const dailyLimit = 10000000; // $100k in cents
        if (dailyWithdrawals + usdAmountCents > dailyLimit) {
            errorHandler_1.ErrorHandler.throwBusinessError('Daily withdrawal limit exceeded', shared_1.ERROR_CODES.WITHDRAWAL_LIMIT_EXCEEDED);
        }
        // Create withdrawal transaction
        const transaction = await DatabaseService_1.prisma.$transaction(async (tx) => {
            // Deduct from user balance
            await tx.user.update({
                where: { id: userId },
                data: { usdBalanceCents: { decrement: usdAmountCents } }
            });
            // Create transaction record
            const txRecord = await tx.transaction.create({
                data: {
                    userId,
                    type: 'WITHDRAWAL',
                    usdAmount: -usdAmountCents,
                    status: 'PENDING'
                }
            });
            return txRecord;
        });
        // In production, integrate with actual crypto withdrawal service
        // For now, simulate the withdrawal process
        const estimatedConfirmationTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
        return {
            transactionId: transaction.id,
            estimatedConfirmationTime
        };
    }
    static async getTransactionHistory(userId, limit, offset, type) {
        const whereClause = { userId };
        if (type) {
            whereClause.type = type.toUpperCase();
        }
        const [transactions, total] = await Promise.all([
            DatabaseService_1.prisma.transaction.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    type: true,
                    usdAmount: true,
                    cryptoAmount: true,
                    cryptoType: true,
                    cryptoTxHash: true,
                    status: true,
                    createdAt: true
                }
            }),
            DatabaseService_1.prisma.transaction.count({ where: whereClause })
        ]);
        // Transform to match interface
        const transformedTransactions = transactions.map(tx => ({
            id: tx.id,
            userId,
            type: tx.type.toLowerCase(),
            usdAmount: tx.usdAmount,
            cryptoAmount: tx.cryptoAmount ? Number(tx.cryptoAmount) : undefined,
            cryptoType: tx.cryptoType,
            cryptoTxHash: tx.cryptoTxHash || undefined,
            status: tx.status.toLowerCase(),
            createdAt: tx.createdAt
        }));
        return {
            transactions: transformedTransactions,
            total
        };
    }
    static async getUserBalance(userId) {
        const user = await DatabaseService_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                usdBalanceCents: true,
                updatedAt: true
            }
        });
        if (!user) {
            errorHandler_1.ErrorHandler.throwBusinessError('User not found', shared_1.ERROR_CODES.USER_NOT_FOUND);
        }
        return {
            usdBalance: user.usdBalanceCents / 100,
            usdBalanceCents: user.usdBalanceCents,
            lastUpdated: user.updatedAt.toISOString()
        };
    }
    // Webhook handler for Coinbase Commerce
    static async handleCoinbaseWebhook(payload) {
        try {
            const { event } = payload;
            if (event.type === 'charge:confirmed') {
                const chargeId = event.data.id;
                const usdAmount = parseFloat(event.data.pricing.local.amount);
                // Find payment attempt
                const paymentAttempt = await DatabaseService_1.prisma.paymentAttempt.findFirst({
                    where: { externalId: chargeId }
                });
                if (!paymentAttempt) {
                    console.error('Payment attempt not found for charge:', chargeId);
                    return;
                }
                // Process confirmed payment
                await DatabaseService_1.prisma.$transaction(async (tx) => {
                    // Update payment attempt
                    await tx.paymentAttempt.update({
                        where: { id: paymentAttempt.id },
                        data: { status: 'COMPLETED' }
                    });
                    // Add to user balance
                    const amountCents = Math.round(usdAmount * 100);
                    await tx.user.update({
                        where: { id: paymentAttempt.userId },
                        data: { usdBalanceCents: { increment: amountCents } }
                    });
                    // Create transaction record
                    await tx.transaction.create({
                        data: {
                            userId: paymentAttempt.userId,
                            type: 'DEPOSIT',
                            usdAmount: amountCents,
                            cryptoTxHash: event.data.payments?.[0]?.transaction_id,
                            status: 'CONFIRMED'
                        }
                    });
                });
            }
            else if (event.type === 'charge:failed') {
                const chargeId = event.data.id;
                await DatabaseService_1.prisma.paymentAttempt.updateMany({
                    where: { externalId: chargeId },
                    data: { status: 'FAILED' }
                });
            }
        }
        catch (error) {
            console.error('Error processing Coinbase webhook:', error);
            throw error;
        }
    }
    static async createCoinbaseCharge(usdAmount, userId, paymentAttemptId) {
        // Mock implementation - replace with actual Coinbase Commerce SDK
        // const Client = require('coinbase-commerce-node').Client;
        // Client.init(process.env.COINBASE_COMMERCE_API_KEY);
        // For now, return a mock charge
        return {
            id: `charge_${Date.now()}`,
            hosted_url: `https://commerce.coinbase.com/charges/mock_${paymentAttemptId}`,
            pricing: {
                local: { amount: usdAmount.toString(), currency: 'USD' },
                bitcoin: { amount: (usdAmount * 0.000025).toString(), currency: 'BTC' }, // Mock rate
                ethereum: { amount: (usdAmount * 0.0006).toString(), currency: 'ETH' } // Mock rate
            }
        };
    }
    static validateWalletAddress(address, cryptoType) {
        if (cryptoType === 'btc') {
            // Bitcoin address validation (simplified)
            const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
            return btcRegex.test(address);
        }
        else if (cryptoType === 'eth') {
            // Ethereum address validation
            const ethRegex = /^0x[a-fA-F0-9]{40}$/;
            return ethRegex.test(address);
        }
        return false;
    }
    static async getDailyWithdrawalAmount(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyWithdrawals = await DatabaseService_1.prisma.transaction.aggregate({
            where: {
                userId,
                type: 'WITHDRAWAL',
                createdAt: { gte: today }
            },
            _sum: { usdAmount: true }
        });
        return Math.abs(dailyWithdrawals._sum.usdAmount || 0);
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=PaymentService.js.map