"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthError = exports.ValidationError = exports.BusinessError = void 0;
// Error types for better error handling
class BusinessError extends Error {
    constructor(message, code = 'BUSINESS_ERROR', details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'BusinessError';
    }
}
exports.BusinessError = BusinessError;
class ValidationError extends Error {
    constructor(message, code = 'VALIDATION_ERROR', details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class AuthError extends Error {
    constructor(message, code = 'AUTH_ERROR', details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
//# sourceMappingURL=index.js.map