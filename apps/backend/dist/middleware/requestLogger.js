"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const uuid_1 = require("uuid");
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = (0, uuid_1.v4)();
    // Add request ID to request object for use in other middleware
    req.headers['x-request-id'] = requestId;
    const log = {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        timestamp: new Date().toISOString(),
    };
    // Add user ID if authenticated (will be set by auth middleware)
    if (req.user?.userId) {
        log.userId = req.user.userId;
    }
    // Log request body for non-GET requests (excluding sensitive endpoints)
    if (req.method !== 'GET' && !isSensitiveEndpoint(req.url)) {
        log.body = sanitizeRequestBody(req.body);
    }
    // Log query parameters
    if (Object.keys(req.query).length > 0) {
        log.query = req.query;
    }
    // Log route parameters
    if (Object.keys(req.params).length > 0) {
        log.params = req.params;
    }
    // Override res.end to capture response details
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const duration = Date.now() - startTime;
        const responseLog = {
            ...log,
            duration,
            statusCode: res.statusCode
        };
        // Log different levels based on status code
        if (res.statusCode >= 500) {
            console.error('REQUEST_ERROR', responseLog);
        }
        else if (res.statusCode >= 400) {
            console.warn('REQUEST_WARNING', responseLog);
        }
        else if (process.env.NODE_ENV === 'development') {
            console.info('REQUEST_INFO', responseLog);
        }
        // Call original end method
        originalEnd.call(res, chunk, encoding);
    };
    next();
};
exports.requestLogger = requestLogger;
function isSensitiveEndpoint(url) {
    const sensitivePatterns = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/refresh',
        '/api/payments',
        '/api/webhooks'
    ];
    return sensitivePatterns.some(pattern => url.includes(pattern));
}
function sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') {
        return body;
    }
    const sensitiveFields = [
        'password',
        'token',
        'secret',
        'key',
        'private',
        'wallet',
        'address',
        'seed'
    ];
    const sanitized = { ...body };
    Object.keys(sanitized).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
            sanitized[key] = '[REDACTED]';
        }
    });
    return sanitized;
}
//# sourceMappingURL=requestLogger.js.map