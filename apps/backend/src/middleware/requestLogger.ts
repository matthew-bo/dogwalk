import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from 'shared';

interface RequestLog {
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  responseTime?: number;
  statusCode?: number;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Create log entry
  const log: RequestLog = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    timestamp: new Date().toISOString()
  };

  // Add user ID if available (after authentication)
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.userId) {
    log.userId = authReq.user.userId;
  }

  // Log request
  console.log('REQUEST:', JSON.stringify(log));

  // Capture response information
  const originalEnd = res.end;
  const originalWrite = res.write;
  const originalWriteHead = res.writeHead;

  let responseBody = '';

  // Override res.write to capture response body
  res.write = function(chunk: any, encoding?: any, cb?: any): boolean {
    if (chunk) {
      responseBody += chunk.toString();
    }
    return originalWrite.call(this, chunk, encoding, cb);
  };

  // Override res.end to capture final response and log
  res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
    const responseTime = Date.now() - startTime;
    
    if (chunk) {
      responseBody += chunk.toString();
    }

    // Update log with response information
    log.responseTime = responseTime;
    log.statusCode = res.statusCode;

    // Log response (with sanitized body for security)
    const responseLog = {
      ...log,
      responseTime,
      statusCode: res.statusCode,
      responseBodyLength: responseBody.length
    };

    // Don't log sensitive endpoints in production
    const sensitiveEndpoints = ['/api/auth/login', '/api/auth/register', '/api/payments'];
    const isSensitive = sensitiveEndpoints.some(endpoint => req.url.includes(endpoint));
    
    if (!isSensitive || process.env.NODE_ENV !== 'production') {
      console.log('RESPONSE:', JSON.stringify(responseLog));
    }

    // Call original end
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}; 