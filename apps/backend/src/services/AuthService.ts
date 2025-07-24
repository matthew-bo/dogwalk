import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/services/DatabaseService';
import { RedisService } from '@/services/RedisService';
import { ErrorHandler } from '@/middleware/errorHandler';
import { 
  CreateUserRequest, 
  AuthResponse, 
  User, 
  JWTPayload,
  ERROR_CODES,
  LIMITS 
} from 'shared';

export class AuthService {
  private static getJWTSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  }
  
  private static JWT_ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || LIMITS.JWT_ACCESS_TOKEN_EXPIRY;
  private static JWT_REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || LIMITS.JWT_REFRESH_TOKEN_EXPIRY;

  public static async register(userData: CreateUserRequest): Promise<AuthResponse> {
    const { username, email, password, ageConfirmed } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        ErrorHandler.throwBusinessError('Username already exists', ERROR_CODES.USER_ALREADY_EXISTS);
      } else {
        ErrorHandler.throwBusinessError('Email already exists', ERROR_CODES.USER_ALREADY_EXISTS);
      }
    }

    // Age verification
    if (!ageConfirmed) {
      ErrorHandler.throwAuthError('Age confirmation required', ERROR_CODES.AGE_NOT_VERIFIED);
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        isAgeVerified: ageConfirmed,
        usdBalanceCents: 0
      },
      select: {
        id: true,
        username: true,
        email: true,
        usdBalanceCents: true,
        isAgeVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Generate tokens
    const { accessToken, refreshToken } = await AuthService.generateTokens(user);

    // Store refresh token in Redis
    await AuthService.storeRefreshToken(user.id, refreshToken);

    return {
      success: true,
      user,
      token: accessToken
    };
  }

  public static async login(username: string, password: string): Promise<AuthResponse & { refreshToken: string }> {
    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      }
    });

    if (!user) {
      ErrorHandler.throwAuthError('Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      ErrorHandler.throwAuthError('Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Check if age verified
    if (!user.isAgeVerified) {
      ErrorHandler.throwAuthError('Age verification required', ERROR_CODES.AGE_NOT_VERIFIED);
    }

    // Generate tokens
    const { accessToken, refreshToken } = await AuthService.generateTokens(user);

    // Store refresh token in Redis
    await AuthService.storeRefreshToken(user.id, refreshToken);

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword,
      token: accessToken,
      refreshToken
    };
  }

  public static async logout(token: string): Promise<void> {
    try {
      // Decode token to get expiry
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        return; // Invalid token, nothing to blacklist
      }

      // Calculate remaining TTL
      const expirySeconds = decoded.exp - Math.floor(Date.now() / 1000);
      if (expirySeconds > 0) {
        // Blacklist token for remaining TTL
        await RedisService.blacklistToken(token, expirySeconds);
      }

      // Remove refresh token from Redis
      if (decoded.userId) {
        await RedisService.del(`refresh_token:${decoded.userId}`);
      }
    } catch (error) {
      // Log error but don't throw - logout should always succeed
      console.error('Error during logout:', error);
    }
  }

  public static async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, AuthService.getJWTSecret()) as JWTPayload;
      
      // Check if refresh token exists in Redis
      const storedToken = await RedisService.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        ErrorHandler.throwAuthError('Invalid refresh token', ERROR_CODES.TOKEN_INVALID);
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          usdBalanceCents: true,
          isAgeVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        ErrorHandler.throwAuthError('User not found', ERROR_CODES.USER_NOT_FOUND);
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = await AuthService.generateTokens(user);

      // Store new refresh token
      await AuthService.storeRefreshToken(user.id, newRefreshToken);

      return {
        token: accessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        ErrorHandler.throwAuthError('Refresh token expired', ERROR_CODES.TOKEN_EXPIRED);
      } else if (error instanceof jwt.JsonWebTokenError) {
        ErrorHandler.throwAuthError('Invalid refresh token', ERROR_CODES.TOKEN_INVALID);
      }
      throw error;
    }
  }

  public static async getCurrentUser(userId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        usdBalanceCents: true,
        isAgeVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      ErrorHandler.throwAuthError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    return user;
  }

  /**
   * Verify a password against a hash
   */
  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  public static async verifyToken(token: string): Promise<JWTPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await RedisService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        ErrorHandler.throwAuthError('Token has been revoked', ERROR_CODES.TOKEN_REVOKED);
      }

      // Verify token
      const decoded = jwt.verify(token, AuthService.getJWTSecret()) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        ErrorHandler.throwAuthError('Token expired', ERROR_CODES.TOKEN_EXPIRED);
      } else if (error instanceof jwt.JsonWebTokenError) {
        ErrorHandler.throwAuthError('Invalid token', ERROR_CODES.TOKEN_INVALID);
      }
      throw error;
    }
  }

  private static async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      userId: user.id,
      username: user.username
    };

    const secret = AuthService.getJWTSecret();

    // Temporary simple token generation for development
    const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  private static async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    // Store refresh token in Redis with expiry
    const expirySeconds = 7 * 24 * 60 * 60; // 7 days
    await RedisService.set(`refresh_token:${userId}`, refreshToken, expirySeconds);
  }

  public static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      ErrorHandler.throwAuthError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      ErrorHandler.throwAuthError('Current password is incorrect', ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    // Invalidate all existing tokens for this user
    await RedisService.del(`refresh_token:${userId}`);
  }
} 