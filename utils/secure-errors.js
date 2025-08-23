// Secure error handling utilities
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecureError extends Error {
  constructor(message, code = 'SECURE_ERROR', details = {}) {
    super(message);
    this.name = 'SecureError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.errorId = crypto.randomBytes(8).toString('hex');
    
    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      errorId: this.errorId,
      timestamp: this.timestamp
    };
  }

  static sanitizeError(error) {
    if (error instanceof SecureError) {
      return error.toJSON();
    }
    
    // For non-SecureError instances, return a sanitized version
    return {
      error: 'InternalError',
      message: 'An internal error occurred',
      code: 'INTERNAL_ERROR',
      errorId: crypto.randomBytes(8).toString('hex'),
      timestamp: new Date().toISOString()
    };
  }
}

// Common error types
class ValidationError extends SecureError {
  constructor(message = 'Validation failed', details = {}) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class SecurityError extends SecureError {
  constructor(message = 'Security violation detected', details = {}) {
    super(message, 'SECURITY_VIOLATION', details);
    this.name = 'SecurityError';
  }
}

class EncryptionError extends SecureError {
  constructor(message = 'Encryption/decryption failed', details = {}) {
    super(message, 'ENCRYPTION_ERROR', details);
    this.name = 'EncryptionError';
  }
}

// Secure error handler middleware
function secureErrorHandler(options = {}) {
  const defaults = {
    logErrors: process.env.NODE_ENV !== 'production',
    logFunction: console.error,
    logFilePath: null,
    sanitizeStack: true
  };

  const config = { ...defaults, ...options };
  
  // Ensure log directory exists
  if (config.logFilePath && !fs.existsSync(path.dirname(config.logFilePath))) {
    try {
      fs.mkdirSync(path.dirname(config.logFilePath), { recursive: true });
    } catch (e) {
      console.error('Failed to create log directory:', e);
    }
  }

  return function(error, req, res, next) {
    // Handle specific error types
    let statusCode = 500;
    let response = {};

    if (error instanceof ValidationError) {
      statusCode = 400;
      response = error.toJSON();
    } else if (error instanceof SecurityError) {
      statusCode = 403;
      response = error.toJSON();
    } else if (error instanceof EncryptionError) {
      statusCode = 400;
      response = error.toJSON();
    } else {
      // Generic error handling
      response = SecureError.sanitizeError(error);
    }

    // Log the error if enabled
    if (config.logErrors) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: config.sanitizeStack 
            ? error.stack.split('\n').slice(0, 3).join('\n') + '\n    ...'
            : error.stack,
          ...(error.details && { details: error.details }),
          errorId: response.errorId
        },
        request: req ? {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('user-agent')
        } : undefined
      };

      // Log to console
      if (typeof config.logFunction === 'function') {
        config.logFunction(JSON.stringify(logEntry, null, 2));
      }

      // Log to file if configured
      if (config.logFilePath) {
        fs.appendFileSync(
          config.logFilePath,
          JSON.stringify(logEntry) + '\n',
          'utf8'
        );
      }
    }

    // Send response
    res.status(statusCode).json(response);
  };
}

module.exports = {
  SecureError,
  ValidationError,
  SecurityError,
  EncryptionError,
  secureErrorHandler,
  createError: (message, code, details) => new SecureError(message, code, details)
};
