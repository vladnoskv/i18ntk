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
    sanitizeStack: true,
    maxErrorsPerMinute: 10,
    maxLogSize: 1024 * 1024, // 1MB per log entry
    maxFileSize: 10 * 1024 * 1024, // 10MB total file size
    timeoutMs: 5000 // 5 second timeout for file operations
  };

  const config = { ...defaults, ...options };
  
  // Rate limiting state
  const errorCounts = new Map();
  const operationQueue = [];
  
  // Ensure log directory exists
  if (config.logFilePath && !fs.existsSync(path.dirname(config.logFilePath))) {
    try {
      fs.mkdirSync(path.dirname(config.logFilePath), { recursive: true });
    } catch (e) {
      console.error('Failed to create log directory:', e);
    }
  }

  // Helper function for rate limiting
  function isRateLimited(clientId) {
    const now = Date.now();
    const minuteAgo = now - 60000;
    
    if (!errorCounts.has(clientId)) {
      errorCounts.set(clientId, []);
    }
    
    const clientErrors = errorCounts.get(clientId);
    clientErrors.push(now);
    
    // Remove old entries
    const recentErrors = clientErrors.filter(timestamp => timestamp > minuteAgo);
    errorCounts.set(clientId, recentErrors);
    
    return recentErrors.length > config.maxErrorsPerMinute;
  }

  return async function(error, req, res, next) {
    const clientId = req?.ip || 'unknown';
    
    // Rate limiting check
    if (isRateLimited(clientId)) {
      res.status(429).json({
        error: 'TooManyRequests',
        message: 'Too many error requests',
        code: 'RATE_LIMITED'
      });
      return;
    }
    
    // Add rate limiting for error handling
    const now = Date.now();
    if (!this.lastErrorHandled || (now - this.lastErrorHandled) >= 100) { // Minimum 100ms between error handling
      this.lastErrorHandled = now;
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
          try {
            const logString = JSON.stringify(logEntry) + '\n';
            const maxLogSize = 1024 * 1024; // 1MB limit per log entry
            
            // Only proceed if log entry size is within limits
            if (logString.length <= maxLogSize) {
              // Use a rolling file size limit
              let stats;
              try {
                stats = fs.statSync(config.logFilePath);
              } catch (err) {
                // File doesn't exist yet
                stats = { size: 0 };
              }

              const maxFileSize = 10 * 1024 * 1024; // 10MB total file size limit
              
              if (stats.size + logString.length <= maxFileSize) {
                // Use async file write with proper error handling
                await fs.promises.appendFile(
                  config.logFilePath,
                  logString,
                  { encoding: 'utf8' }
                );
              } else {
                // Rotate log file if size limit reached
                try {
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  const backupPath = `${config.logFilePath}.${timestamp}`;
                  await fs.promises.rename(config.logFilePath, backupPath);
                  await fs.promises.appendFile(config.logFilePath, logString, { encoding: 'utf8' });
                } catch (rotateError) {
                  console.error('Failed to rotate log file:', rotateError);
                }
              }
            }
          } catch (writeError) {
            console.error('Failed to write error log:', writeError);
          }
        }
      }

      // Send response
      res.status(statusCode).json(response);
    }
  },

module.exports = {
  SecureError,
  ValidationError,
  SecurityError,
  EncryptionError,
  secureErrorHandler,
  createError: (message, code, details) => new SecureError(message, code, details)
}}
