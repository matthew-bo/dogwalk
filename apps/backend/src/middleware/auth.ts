import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/AuthService';
import { ErrorHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest, ERROR_CODES } from 'shared';

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      ErrorHandler.throwAuthError('No token provided', ERROR_CODES.TOKEN_MISSING);
    }

    // Verify token and get user payload
    const decoded = await AuthService.verifyToken(token);

    // Add user to request object
    (req as AuthenticatedRequest).user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      try {
        const decoded = await AuthService.verifyToken(token);
        (req as AuthenticatedRequest).user = decoded;
      } catch (error) {
        // For optional auth, ignore token errors and continue without user
        console.warn('Optional auth token verification failed:', error);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check if user has verified age
export const requireAgeVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // This will be called after authenticateToken, so user should exist
  if (!req.user) {
    ErrorHandler.throwAuthError('Authentication required', ERROR_CODES.TOKEN_MISSING);
  }

  // We'll need to fetch user from database to check age verification
  // For now, we assume the JWT contains this info or we fetch it
  // In a real implementation, you might want to include this in the JWT payload
  next();
}; 