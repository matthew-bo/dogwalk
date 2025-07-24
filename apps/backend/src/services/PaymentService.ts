import { prisma } from '@/services/DatabaseService';
import { RedisService } from '@/services/RedisService';
import { ErrorHandler } from '@/middleware/errorHandler';
import { PrismaClient } from '@prisma/client';

// Import types (work around for shared module import issue)
interface DepositResponse {
  paymentUrl: string;
  paymentId: string;
}

interface WithdrawResponse {
  transactionId: string;
  status: string;
  estimatedConfirmationTime: string;
}

interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'payout';
  usdAmount: number;
  cryptoAmount?: number;
  cryptoType?: 'btc' | 'eth';
  cryptoTxHash?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  createdAt: Date;
}

// Error codes constant
const ERROR_CODES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INSUFFICIENT_BALANCE_FOR_WITHDRAWAL: 'INSUFFICIENT_BALANCE_FOR_WITHDRAWAL',
  INVALID_WALLET_ADDRESS: 'INVALID_WALLET_ADDRESS',
  WITHDRAWAL_LIMIT_EXCEEDED: 'WITHDRAWAL_LIMIT_EXCEEDED',
  PAYMENT_PROVIDER_ERROR: 'PAYMENT_PROVIDER_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
} as const;

// API response interfaces
interface CoinGeckoResponse {
  bitcoin?: { usd: number };
  ethereum?: { usd: number };
}

interface CoinbaseResponse {
  data: {
    rates: {
      USD: string;
    };
  };
}

// Mock Coinbase Commerce for now - replace with actual SDK in production
interface CoinbaseCommerceCharge {
  id: string;
  hosted_url: string;
  pricing: {
    local: { amount: string; currency: string };
    bitcoin?: { amount: string; currency: string };
    ethereum?: { amount: string; currency: string };
  };
}

export class PaymentService {
  public static async createDeposit(userId: string, usdAmount: number): Promise<DepositResponse> {
    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      ErrorHandler.throwBusinessError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    try {
      // Create payment attempt record
      const paymentAttempt = await prisma.paymentAttempt.create({
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
      await prisma.paymentAttempt.update({
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

    } catch (error) {
      console.error('Failed to create deposit:', error);
      ErrorHandler.throwBusinessError('Failed to create payment', ERROR_CODES.PAYMENT_PROVIDER_ERROR);
    }
  }

  public static async createWithdrawal(
    userId: string, 
    usdAmountCents: number, 
    walletAddress: string,
    cryptoType: 'btc' | 'eth' = 'btc'
  ): Promise<WithdrawResponse> {
    // Validate user and balance
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      ErrorHandler.throwBusinessError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    if (user.usdBalanceCents < usdAmountCents) {
      ErrorHandler.throwBusinessError('Insufficient balance', ERROR_CODES.INSUFFICIENT_BALANCE_FOR_WITHDRAWAL);
    }

    // Validate wallet address
    const isValidAddress = PaymentService.validateWalletAddress(walletAddress, cryptoType);
    if (!isValidAddress) {
      ErrorHandler.throwBusinessError('Invalid wallet address', ERROR_CODES.INVALID_WALLET_ADDRESS);
    }

    // Check daily withdrawal limits
    const dailyWithdrawals = await PaymentService.getDailyWithdrawalAmount(userId);
    const dailyLimit = 10000000; // $100k in cents
    
    if (dailyWithdrawals + usdAmountCents > dailyLimit) {
      ErrorHandler.throwBusinessError('Daily withdrawal limit exceeded', ERROR_CODES.WITHDRAWAL_LIMIT_EXCEEDED);
    }

    // Create withdrawal transaction
    const transaction = await prisma.$transaction(async (tx: any) => {
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
      status: 'pending',
      estimatedConfirmationTime
    };
  }

  public static async getTransactionHistory(
    userId: string, 
    limit: number, 
    offset: number,
    type?: string
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const whereClause: any = { userId };
    if (type) {
      whereClause.type = type.toUpperCase();
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
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
      prisma.transaction.count({ where: whereClause })
    ]);

    // Transform to match interface
    const transformedTransactions: Transaction[] = transactions.map((tx: any) => ({
      id: tx.id,
      userId,
      type: tx.type.toLowerCase() as any,
      usdAmount: tx.usdAmount,
      cryptoAmount: tx.cryptoAmount ? Number(tx.cryptoAmount) : undefined,
      cryptoType: tx.cryptoType as any,
      cryptoTxHash: tx.cryptoTxHash || undefined,
      status: tx.status.toLowerCase() as any,
      createdAt: tx.createdAt
    }));

    return {
      transactions: transformedTransactions,
      total
    };
  }

  public static async getUserBalance(userId: string): Promise<{
    usdBalance: number;
    usdBalanceCents: number;
    lastUpdated: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        usdBalanceCents: true,
        updatedAt: true
      }
    });

    if (!user) {
      ErrorHandler.throwBusinessError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    return {
      usdBalance: user.usdBalanceCents / 100,
      usdBalanceCents: user.usdBalanceCents,
      lastUpdated: user.updatedAt.toISOString()
    };
  }

  public static async getCryptoPrices(): Promise<{ BTC: number; ETH: number }> {
    try {
      // Check Redis cache first
      const cachedPrices = await RedisService.getExchangeRates();
      if (cachedPrices) {
        return JSON.parse(cachedPrices);
      }

      // Fetch real prices from CoinGecko API
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'DogWalkGamble/1.0'
            },
            // Timeout after 5 seconds
            signal: AbortSignal.timeout(5000)
          }
        );

        if (!response.ok) {
          throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();
        
        const prices = {
          BTC: data.bitcoin?.usd || 45000, // Fallback if API fails
          ETH: data.ethereum?.usd || 2800   // Fallback if API fails
        };

        // Cache for 60 seconds (CoinGecko allows frequent requests)
        await RedisService.setExchangeRates(JSON.stringify(prices), 60);
        
        console.log('Updated crypto prices from CoinGecko:', prices);
        return prices;

      } catch (apiError) {
        console.warn('CoinGecko API failed, using fallback prices:', apiError);
        
        // Try backup API (Coinbase Pro)
        try {
          const [btcResponse, ethResponse] = await Promise.all([
            fetch('https://api.coinbase.com/v2/exchange-rates?currency=BTC'),
            fetch('https://api.coinbase.com/v2/exchange-rates?currency=ETH')
          ]);

          if (btcResponse.ok && ethResponse.ok) {
            const btcData = await btcResponse.json();
            const ethData = await ethResponse.json();

            const prices = {
              BTC: parseFloat(btcData.data.rates.USD) || 45000,
              ETH: parseFloat(ethData.data.rates.USD) || 2800
            };

            await RedisService.setExchangeRates(JSON.stringify(prices), 60);
            console.log('Updated crypto prices from Coinbase:', prices);
            return prices;
          }
        } catch (backupError) {
          console.warn('Backup price API also failed:', backupError);
        }

        // Final fallback to reasonable estimates
        const fallbackPrices = { BTC: 45000, ETH: 2800 };
        await RedisService.setExchangeRates(JSON.stringify(fallbackPrices), 30);
        return fallbackPrices;
      }

    } catch (error) {
      console.error('Failed to fetch crypto prices:', error);
      // Return cached prices if available, otherwise fallback
      return { BTC: 45000, ETH: 2800 };
    }
  }

  public static async createDepositAddress(userId: string, currency: 'BTC' | 'ETH'): Promise<{
    address: string;
    qrCode: string;
    sessionId: string;
    expiresAt: string;
  }> {
    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      ErrorHandler.throwBusinessError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    try {
      // In production, generate real crypto addresses using wallet services
      // For now, generate mock addresses that look realistic
      const mockAddress = currency === 'BTC' 
        ? `bc1q${Math.random().toString(36).substring(2, 42)}` // Bech32 format
        : `0x${Math.random().toString(16).substring(2, 42)}`; // Ethereum format

      // Generate session ID for tracking
      const sessionId = `deposit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Set expiration time (6 hours from now)
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

      // Generate QR code data URL (in production, use a proper QR code library)
      const qrCodeData = `${currency.toLowerCase()}:${mockAddress}`;
      const qrCode = await PaymentService.generateQRCode(qrCodeData);

      // Store the deposit session in Redis for monitoring
      await RedisService.setDepositSession(sessionId, {
        userId,
        currency,
        address: mockAddress,
        createdAt: new Date().toISOString(),
        expiresAt,
        status: 'pending'
      }, 6 * 60 * 60); // 6 hours TTL

      return {
        address: mockAddress,
        qrCode,
        sessionId,
        expiresAt
      };

    } catch (error) {
      console.error('Failed to create deposit address:', error);
      ErrorHandler.throwBusinessError('Failed to generate deposit address', ERROR_CODES.PAYMENT_PROVIDER_ERROR);
    }
  }

  // Webhook handler for Coinbase Commerce
  public static async handleCoinbaseWebhook(payload: any): Promise<void> {
    try {
      const { event } = payload;
      
      if (event.type === 'charge:confirmed') {
        const chargeId = event.data.id;
        const usdAmount = parseFloat(event.data.pricing.local.amount);
        
        // Find payment attempt
        const paymentAttempt = await prisma.paymentAttempt.findFirst({
          where: { externalId: chargeId }
        });

        if (!paymentAttempt) {
          console.error('Payment attempt not found for charge:', chargeId);
          return;
        }

        // Process confirmed payment
        await prisma.$transaction(async (tx: any) => {
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

      } else if (event.type === 'charge:failed') {
        const chargeId = event.data.id;
        
        await prisma.paymentAttempt.updateMany({
          where: { externalId: chargeId },
          data: { status: 'FAILED' }
        });
      }

    } catch (error) {
      console.error('Error processing Coinbase webhook:', error);
      throw error;
    }
  }

  private static async createCoinbaseCharge(
    usdAmount: number, 
    userId: string, 
    paymentAttemptId: string
  ): Promise<CoinbaseCommerceCharge> {
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

  private static validateWalletAddress(address: string, cryptoType: 'btc' | 'eth'): boolean {
    if (cryptoType === 'btc') {
      // Bitcoin address validation (simplified)
      const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
      return btcRegex.test(address);
    } else if (cryptoType === 'eth') {
      // Ethereum address validation
      const ethRegex = /^0x[a-fA-F0-9]{40}$/;
      return ethRegex.test(address);
    }
    return false;
  }

  private static async getDailyWithdrawalAmount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyWithdrawals = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'WITHDRAWAL',
        createdAt: { gte: today }
      },
      _sum: { usdAmount: true }
    });

    return Math.abs(dailyWithdrawals._sum.usdAmount || 0);
  }

  private static async generateQRCode(data: string): Promise<string> {
    // In production, use a proper QR code library like 'qrcode'
    // For now, return a mock QR code SVG
    const qrSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="white"/>
        <g fill="black">
          <!-- Mock QR code pattern -->
          <rect x="20" y="20" width="20" height="20"/>
          <rect x="60" y="20" width="20" height="20"/>
          <rect x="100" y="20" width="20" height="20"/>
          <rect x="140" y="20" width="20" height="20"/>
          <rect x="20" y="60" width="20" height="20"/>
          <rect x="140" y="60" width="20" height="20"/>
          <rect x="20" y="100" width="20" height="20"/>
          <rect x="60" y="100" width="20" height="20"/>
          <rect x="140" y="100" width="20" height="20"/>
          <rect x="20" y="140" width="20" height="20"/>
          <rect x="60" y="140" width="20" height="20"/>
          <rect x="100" y="140" width="20" height="20"/>
          <rect x="140" y="140" width="20" height="20"/>
        </g>
        <text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="10" fill="gray">
          ${data.substring(0, 20)}...
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString('base64')}`;
  }
} 