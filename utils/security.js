const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SettingsManager = require('../settings/settings-manager');
const { t } = require('./i18n-helper');

/**
 * Security utility module for i18nTK
 * Provides secure file operations, path validation, and input sanitization
 * to prevent path traversal, code injection, and other security vulnerabilities
 */
class SecurityUtils {
  /**
   * Validates and sanitizes file paths to prevent path traversal attacks
   * @param {string} inputPath - The input path to validate
   * @param {string} basePath - The base path that the input should be within (optional)
   * @returns {string|null} - Sanitized path or null if invalid
   */
  static validatePath(filePath, basePath = process.cwd()) {
    try {
      if (!filePath || typeof filePath !== 'string') {
        SecurityUtils.logSecurityEvent('path_validation_failed', {
          inputPath: filePath,
          reason: 'Invalid input type'
        });
        return null;
      }

      // Sanitize the input path
      const sanitizedPath = path.normalize(filePath).replace(/\.\./g, '');
      
      // Resolve the full path
      const resolvedPath = path.resolve(basePath, sanitizedPath);
      
      // Check if the resolved path is within the base path
      const relativePath = path.relative(basePath, resolvedPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        SecurityUtils.logSecurityEvent('path_traversal_attempt', {
          inputPath: filePath,
          resolvedPath,
          basePath
        });
        return null;
      }
      
      SecurityUtils.logSecurityEvent('path_validated', {
        inputPath: filePath,
        resolvedPath
      });
      
      return resolvedPath;
    } catch (error) {
      SecurityUtils.logSecurityEvent('path_validation_error', {
        inputPath: filePath,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Safely reads a file with path validation and error handling
   * @param {string} filePath - Path to the file
   * @param {string} basePath - Base path for validation
   * @param {string} encoding - File encoding (default: 'utf8')
   * @returns {Promise<string|null>} - File content or null if error
   */
  static async safeReadFile(filePath, basePath, encoding = 'utf8') {
    const validatedPath = this.validatePath(filePath, basePath);
    if (!validatedPath) {
      return null;
    }

    try {
      // Check if file exists and is readable
      await fs.promises.access(validatedPath, fs.constants.R_OK);
      
      // Read file with size limit (10MB max)
      const stats = await fs.promises.stat(validatedPath);
      if (stats.size > 10 * 1024 * 1024) {
        console.warn(`Security: File too large: ${validatedPath}`);
        return null;
      }
      
      return await fs.promises.readFile(validatedPath, encoding);
    } catch (error) {
      console.warn(`Security: File read error: ${error.message}`);
      return null;
    }
  }

  /**
   * Safely reads a file synchronously with path validation and error handling
   * @param {string} filePath - Path to the file
   * @param {string} basePath - Base path for validation
   * @param {string} encoding - File encoding (default: 'utf8')
   * @returns {string|null} - File content or null if error
   */
  static safeReadFileSync(filePath, basePath, encoding = 'utf8') {
    const validatedPath = this.validatePath(filePath, basePath);
    if (!validatedPath) {
      return null;
    }

    try {
      // Check if file exists and is readable
      fs.accessSync(validatedPath, fs.constants.R_OK);
      
      // Read file with size limit (10MB max)
      const stats = fs.statSync(validatedPath);
      if (stats.size > 10 * 1024 * 1024) {
        console.warn(`Security: File too large: ${validatedPath}`);
        return null;
      }
      
      return fs.readFileSync(validatedPath, encoding);
    } catch (error) {
      console.warn(`Security: File read error: ${error.message}`);
      return null;
    }
  }

  /**
   * Safely writes a file with path validation and error handling
   * @param {string} filePath - Path to the file
   * @param {string} content - Content to write
   * @param {string} basePath - Base path for validation
   * @param {string} encoding - File encoding (default: 'utf8')
   * @returns {Promise<boolean>} - Success status
   */
  static async safeWriteFile(filePath, content, basePath, encoding = 'utf8') {
    const validatedPath = this.validatePath(filePath, basePath);
    if (!validatedPath) {
      return false;
    }

    try {
      // Validate content size (10MB max)
      if (typeof content === 'string' && content.length > 10 * 1024 * 1024) {
        console.warn(`Security: Content too large for file: ${validatedPath}`);
        return false;
      }
      
      // Ensure directory exists
      const dir = path.dirname(validatedPath);
      await fs.promises.mkdir(dir, { recursive: true });
      
      // Write file with proper permissions
      await fs.promises.writeFile(validatedPath, content, { encoding, mode: 0o644 });
      return true;
    } catch (error) {
      console.warn(`Security: File write error: ${error.message}`);
      return false;
    }
  }

  /**
   * Safely parses JSON with error handling and validation
   * @param {string} jsonString - JSON string to parse
   * @param {number} maxSize - Maximum allowed size (default: 1MB)
   * @returns {object|null} - Parsed object or null if error
   */
  static safeParseJSON(jsonString, maxSize = 1024 * 1024) {
    if (!jsonString || typeof jsonString !== 'string') {
      return null;
    }

    if (jsonString.length > maxSize) {
      console.warn('Security: JSON string too large');
      return null;
    }

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn(`Security: JSON parse error: ${error.message}`);
      return null;
    }
  }

  /**
   * Sanitizes user input to prevent injection attacks
   * @param {string} input - User input to sanitize
   * @param {object} options - Sanitization options
   * @returns {string} - Sanitized input
   */
  static sanitizeInput(input, options = {}) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const {
      allowedChars = /^[a-zA-Z0-9\s\-_\.\,\!\?\(\)\[\]\{\}\:;"']+$/,
      maxLength = 1000,
      removeHTML = true,
      removeScripts = true
    } = options;

    let sanitized = input.trim();

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove HTML tags if requested
    if (removeHTML) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Remove script-like content
    if (removeScripts) {
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/on\w+\s*=/gi, '');
      sanitized = sanitized.replace(/eval\s*\(/gi, '');
      sanitized = sanitized.replace(/function\s*\(/gi, '');
    }

    // Check against allowed characters
    if (!allowedChars.test(sanitized)) {
      console.warn('Security: Input contains disallowed characters');
      // Remove disallowed characters
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_\.\,\!\?\(\)\[\]\{\}\:;"']/g, '');
    }

    return sanitized;
  }

  /**
   * Validates command line arguments
   * @param {object} args - Command line arguments
   * @returns {object} - Validated arguments
   */
  static async validateCommandArgs(args) {
    const validatedArgs = {};
    const allowedArgs = [
      'source-dir', 'i18n-dir', 'output-dir', 'output-report', 
      'help', 'language', 'strict-mode', 'exclude-files'
    ];
    
    for (const [key, value] of Object.entries(args)) {
      if (allowedArgs.includes(key)) {
        validatedArgs[key] = value;
      } else {
        console.warn(`${t('hardcodedTexts.securityUnknownCommandArg')}: ${key}`);
      }
    }
    
    return validatedArgs;
  }

  /**
   * Validates configuration object
   * @param {object} config - Configuration object
   * @returns {object|null} - Validated configuration or null if invalid
   */
  static validateConfig(config) {
    if (!config || typeof config !== 'object') {
      return null;
    }

    const validatedConfig = {};
    const allowedKeys = [
      'sourceDir', 'outputDir', 'defaultLanguage', 'supportedLanguages',
      'filePattern', 'excludePatterns', 'reportFormat', 'logLevel',
      'i18nDir', 'sourceLanguage', 'excludeDirs', 'includeExtensions', 
      'translationPatterns', 'notTranslatedMarker', 'excludeFiles', 'strictMode',
      'uiLanguage'
    ];

    for (const [key, value] of Object.entries(config)) {
      if (!allowedKeys.includes(key)) {
        console.warn(`${t('hardcodedTexts.securityUnknownConfigKey')}: ${key}`);
        continue;
      }

      // Validate specific config values
      switch (key) {
        case 'sourceDir':
        case 'outputDir':
          if (typeof value === 'string') {
            // Basic path validation - will be further validated when used
            validatedConfig[key] = this.sanitizeInput(value, {
              allowedChars: /^[a-zA-Z0-9\-_\.\,\/\\\:]+$/,
              maxLength: 500
            });
          }
          break;
        case 'supportedLanguages':
          if (Array.isArray(value)) {
            validatedConfig[key] = value.filter(lang => 
              typeof lang === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(lang)
            );
          }
          break;
        case 'defaultLanguage':
          if (typeof value === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(value)) {
            validatedConfig[key] = value;
          }
          break;
        default:
          if (typeof value === 'string') {
            validatedConfig[key] = this.sanitizeInput(value);
          } else if (typeof value === 'boolean' || typeof value === 'number') {
            validatedConfig[key] = value;
          }
      }
    }

    return validatedConfig;
  }

  /**
   * Generates a secure hash for file integrity checking
   * @param {string} content - Content to hash
   * @returns {string} - SHA-256 hash
   */
  static generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Checks if a file path is safe for operations
   * @param {string} filePath - File path to check
   * @returns {boolean} - Whether the path is safe
   */
  static isSafePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return false;
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /\.\./,           // Parent directory traversal
      /^\//,            // Absolute path (Unix)
      /^[A-Z]:\\/,      // Absolute path (Windows)
      /~/,              // Home directory
      /\$\{/,           // Variable expansion
      /`/,              // Command substitution
      /\|/,             // Pipe
      /;/,              // Command separator
      /&/,              // Background process
      />/,              // Redirect
      /</               // Redirect
    ];

    return !dangerousPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Logs security events for monitoring
   * @param {string} event - Security event description
   * @param {string} level - Log level (info, warn, error)
   * @param {object} details - Additional details
   */
  static logSecurityEvent(event, level = 'info', details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      event,
      details: {
        ...details,
        pid: process.pid,
        nodeVersion: process.version
      }
    };

    // Only show security logs if debug mode is enabled and showSecurityLogs is true
    try {
      const settingsManager = SettingsManager;
      if (settingsManager.shouldShowSecurityLogs()) {
        console.log(`[SECURITY ${level.toUpperCase()}] ${timestamp}: ${event}`, details);
      }
    } catch (error) {
      // Fallback: if settings can't be loaded, don't show security logs to maintain clean UI
      // Only log critical security events in this case
      if (event.includes('CRITICAL') || event.includes('BREACH') || event.includes('ATTACK')) {
        console.log(`[SECURITY ALERT] ${timestamp}: ${event}`, details);
      }
    }
  }
}

module.exports = SecurityUtils;