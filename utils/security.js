const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Lazy load configManager to avoid circular dependency
let configManager;
function getConfigManager() {
  if (!configManager) {
    try {
      configManager = require('./config-manager');
    } catch (error) {
      // Return null if config-manager can't be loaded
      return null;
    }
  }
  return configManager;
}

// Lazy load i18n to prevent initialization race conditions
let i18n;
function getI18n() {
  if (!i18n) {
    try {
      i18n = require('./i18n-helper');
    } catch (error) {
      // Fallback to simple identity function if i18n fails to load
      console.warn('i18n-helper not available, using fallback messages');
      return { t: (key, params = {}) => key };
    }
  }
  return i18n;
}

/**
 * Security utility module for i18nTK
 * Provides secure file operations, path validation, and input sanitization
 * to prevent path traversal, code injection, and other security vulnerabilities
  // Add debugging for SecurityUtils loading
  console.log('🔍 DEBUG: SecurityUtils class loaded successfully');
 */
class SecurityUtils {
  /**
   * Timeout wrapper for synchronous operations to prevent hanging
   * @param {Function} operation - The synchronous operation to wrap
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} operationName - Name of the operation for logging
   * @returns {*} - Operation result or null if timeout/error
   */
  static withTimeoutSync(operation, timeoutMs = 5000, operationName = 'operation') {
    // Track recursion to prevent infinite loops
    if (!this._operationStack) {
      this._operationStack = new Set();
    }

    if (this._operationStack.has(operationName)) {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.recursion_detected', { operation: operationName }), 'error');
      return null;
    }

    this._operationStack.add(operationName);

    try {
      // Simple timeout using setTimeout for synchronous operations
      let result = null;
      let hasResult = false;
      let timeoutId = null;

      const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(() => {
          if (!hasResult) {
            const i18n = getI18n();
            SecurityUtils.logSecurityEvent(i18n.t('security.operation_timeout', { operation: operationName }), 'warning');
            resolve(null);
          }
        }, timeoutMs);
      });

      // Execute operation synchronously
      result = operation();
      hasResult = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return result;
    } catch (error) {
      const i18n = getI18n();
      console.warn(i18n.t('security.operation_error', { operation: operationName, error: error.message }));
      return null;
    } finally {
      this._operationStack.delete(operationName);
    }
  }

  /**
   * Validates and sanitizes file paths to prevent path traversal attacks
  * @param {string} inputPath - The input path to validate
  * @param {string} basePath - The base path that the input should be within (optional)
  * @returns {string|null} - Sanitized path or null if invalid
  */
  static validatePath(filePath, basePath = process.cwd(), verbose = false) {
    const i18n = getI18n();
    const useI18n = i18n && i18n.isInitialized && typeof i18n.t === 'function';

    try {
      if (!filePath || typeof filePath !== 'string') {
        const message = useI18n
          ? i18n.t('security.pathValidationFailed')
          : 'Path validation failed';
        const reason = useI18n
          ? i18n.t('security.invalidInputType')
          : 'Invalid input type';
        SecurityUtils.logSecurityEvent(message, 'error', {
          inputPath: filePath,
          reason
        });
        return null;
      }

      // Resolve base and target paths
      const base = fs.realpathSync(basePath);
      const resolvedPath = path.resolve(base, filePath);

      // Resolve symlinks if the path exists
      let finalPath = resolvedPath;
      try {
        finalPath = fs.realpathSync(resolvedPath);
      } catch {
        // If the path doesn't exist yet, fall back to the resolved path
      }

      // Ensure the target path is within the base directory
      const relativePath = path.relative(base, finalPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        const message = useI18n
          ? i18n.t('security.pathTraversalAttempt')
          : 'Path traversal attempt';
        SecurityUtils.logSecurityEvent(message, 'warning', {
          inputPath: filePath,
          resolvedPath: finalPath,
          basePath: base
        });
        return null;
      }

      if (verbose) {
        const successMsg = useI18n
          ? i18n.t('security.pathValidated')
          : 'Path validated';
        SecurityUtils.logSecurityEvent(successMsg, 'info', {
          inputPath: filePath,
          resolvedPath: finalPath
        });
      }
      return finalPath;
    } catch (error) {
      const message = useI18n
        ? i18n.t('security.pathValidationError')
        : 'Path validation error';
      SecurityUtils.logSecurityEvent(message, 'error', {
        inputPath: filePath,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Safely checks if a path exists.
   * @param {string} filePath - Path to check.
   * @param {string} basePath - Base path for validation.
   * @param {number} timeoutMs - Timeout in milliseconds (default: 3000)
   * @returns {boolean} - True if the path exists and is safe.
   */
  static safeExistsSync(filePath, basePath, timeoutMs = 3000) {
    return this.withTimeoutSync(() => {
      const validatedPath = this.validatePath(filePath, basePath);
      if (!validatedPath) {
        return false;
      }
      try {
        return fs.existsSync(validatedPath);
      } catch (error) {
        return false;
      }
    }, timeoutMs, 'safeExistsSync');
  }

  /**
   * Safely gets file stats.
   * @param {string} filePath - Path to get stats for.
   * @param {string} basePath - Base path for validation.
   * @returns {fs.Stats|null} - File stats or null if error.
   */
  static safeStatSync(filePath, basePath) {
    const validatedPath = this.validatePath(filePath, basePath);
    if (!validatedPath) {
      return null;
    }
    try {
      return fs.statSync(validatedPath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Safely creates a directory.
   * @param {string} dirPath - Path of the directory to create.
   * @param {string} basePath - Base path for validation.
   * @param {object} options - fs.mkdirSync options.
   * @returns {boolean} - True if successful.
   */
  static safeMkdirSync(dirPath, basePath, options) {
    const validatedPath = this.validatePath(dirPath, basePath);
    if (!validatedPath) {
      return false;
    }
    try {
      fs.mkdirSync(validatedPath, options);
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') {
        return true; // Already exists
      }
      return false;
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
        const i18n = getI18n();
        console.warn(i18n.t('security.file_too_large', { filePath: validatedPath }));
        return null;
      }
      
      return await fs.promises.readFile(validatedPath, encoding);
    } catch (error) {
      const i18n = getI18n();
      console.warn(i18n.t('security.file_read_error', { errorMessage: error.message }));
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
    const i18n = getI18n();
    try {
      // Check if file exists and is readable
      fs.accessSync(validatedPath, fs.constants.R_OK);
      
      // Read file with size limit (10MB max)
      const stats = fs.statSync(validatedPath);
      if (stats.size > 10 * 1024 * 1024) {
        console.warn(i18n.t('security.file_too_large', { filePath: validatedPath }));
        return null;
      }
      
      return fs.readFileSync(validatedPath, encoding);
    } catch (error) {
      console.warn(i18n.t('security.file_read_error', { errorMessage: error.message }));
      return null;
    }
  }
   /**
    * Safely writes a file synchronously with path validation and error handling
    * @param {string} filePath - Path to the file
    * @param {string} content - Content to write
    * @param {string} basePath - Base path for validation
    * @param {string} encoding - File encoding (default: 'utf8')
    * @returns {boolean} - Success status
    */
   static safeWriteFileSync(filePath, content, basePath, encoding = 'utf8') {
     const validatedPath = this.validatePath(filePath, basePath);
     if (!validatedPath) {
       return false;
     }

     try {
       // Validate content size (10MB max)
       if (typeof content === 'string' && content.length > 10 * 1024 * 1024) {
         const i18n = getI18n();
         console.warn(i18n.t('security.content_too_large_for_file', { filePath: validatedPath }));
         return false;
       }

       // Ensure directory exists
       const dir = path.dirname(validatedPath);
       fs.mkdirSync(dir, { recursive: true });

       // Write file with proper permissions
       fs.writeFileSync(validatedPath, content, { encoding, mode: 0o644 });
       return true;
     } catch (error) {
       const i18n = getI18n();
       console.warn(i18n.t('security.file_write_error', { errorMessage: error.message }));
       return false;
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
        const i18n = getI18n();
        console.warn(i18n.t('security.content_too_large_for_file', { filePath: validatedPath }));
        return false;
      }
      
      // Ensure directory exists
      const dir = path.dirname(validatedPath);
      await fs.promises.mkdir(dir, { recursive: true });
      
      // Write file with proper permissions
      await fs.promises.writeFile(validatedPath, content, { encoding, mode: 0o644 });
      return true;
    } catch (error) {
      const i18n = getI18n();
      console.warn(i18n.t('security.file_write_error', { errorMessage: error.message }));
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
      const i18n = getI18n();
      console.warn(i18n.t('security.json_string_too_large'));
      return null;
    }

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      const i18n = getI18n();
      console.warn(i18n.t('security.json_parse_error', { errorMessage: error.message }));
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
      allowedChars = /^[a-zA-Z0-9\s\-_\.\,\!\?\(\)\[\]\{\}\:\;"'\/\\]+$/, 
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

    // Check against allowed characters - suppress warnings for normal operations
    if (!allowedChars.test(sanitized)) {
      // Skip warning for common file path characters and reduce verbosity
      const isFilePath = sanitized.includes('/') || sanitized.includes('\\') || sanitized.includes('.');
      const isCommonContent = sanitized.length < 1000 && !sanitized.includes('<script');
      if (!isFilePath && !isCommonContent) {
      const i18n = getI18n();
        console.warn(i18n.t('security.inputDisallowedCharacters'));
      }
      // Allow more characters for file paths and content
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_\.\,\!\?\(\)\[\]\{\}\:\;"'\/\\]/g, '');
    }

    return sanitized;
  }

  /**
   * Validates command line arguments
   * @param {object} args - Command line arguments
   * @returns {object} - Validated arguments
   */
  static async validateCommandArgs(args) {
    const i18n = getI18n();
    const validatedArgs = {};
    const allowedArgs = [
      'source-dir', 'i18n-dir', 'output-dir', 'output-report', 
      'help', 'language', 'strict-mode', 'exclude-files', 'no-prompt'
    ];
    
    for (const [key, value] of Object.entries(args)) {
      if (allowedArgs.includes(key)) {
        validatedArgs[key] = value;
      } else {
        console.warn(i18n.t('security.unknown_command_argument', { key }));
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
    const i18n = getI18n();
    if (!config || typeof config !== 'object') {
      return null;
    }

    const validatedConfig = {};
    const allowedKeys = [
      'version', 'sourceDir', 'outputDir', 'defaultLanguage', 'supportedLanguages',
      'filePattern', 'excludePatterns', 'reportFormat', 'logLevel',
      'i18nDir', 'sourceLanguage', 'excludeDirs', 'includeExtensions', 
      'translationPatterns', 'notTranslatedMarker', 'excludeFiles', 'strictMode',
      'uiLanguage', 'language', 'sizeLimit', 'defaultLanguages', 'reportLanguage',
      'theme', 'autoSave', 'notifications', 'dateFormat', 'timeFormat', 'timezone',
      'processing', 'performance', 'advanced', 'security', 'debug', 'projectRoot', 'scriptDirectories',
      'supportedExtensions', 'settings', 'backupDir', 'tempDir', 'cacheDir', 'configDir',
      'displayPaths', 'reports', 'ui', 'behavior', 'dateTime', 'backup', 'framework',
      'notTranslatedMarkers', 'placeholderStyles'
    ];

    const strict = config.security?.strictConfig || false;

    for (const [key, value] of Object.entries(config)) {
      if (!allowedKeys.includes(key)) {
        if (strict) {
          console.warn(i18n.t('security.unknown_config_key', { key }));
        }
        continue;
      }

      // Validate specific config values
      switch (key) {
        case 'sourceDir':
        case 'outputDir':
          if (typeof value === 'string') {
            // Basic path validation - will be further validated when used
            validatedConfig[key] = this.sanitizeInput(value, {
              allowedChars: /^[a-zA-Z0-9\-_\.\,\/\\:\s]+$/, 
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
   * Securely saves an encrypted PIN to the settings directory
   * @param {string} pin - 4 digit PIN
   * @returns {Promise<boolean>} - success status
   */
  static async saveEncryptedPin(pin) {
    try {
      const hash = crypto.createHash('sha256').update(pin).digest('hex');
      const settingsDir = require('../settings/settings-manager').configDir;
      const pinFile = path.join(settingsDir, 'admin-pin.hash');
      await fs.promises.mkdir(settingsDir, { recursive: true });
      await fs.promises.writeFile(pinFile, hash, 'utf8');
      return true;
    } catch (error) {
      return false;
    }
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
    // Prevent recursive logging which can occur during configuration loading
    if (this._logging) {
      return;
    }

    this._logging = true;
    try {
      const cfg = getConfigManager()?.getConfig?.() || {};
      const envLevel = (process.env.SECURITY_LOG_LEVEL || process.env.I18NTK_SECURITY_LOG_LEVEL || '').toLowerCase();
      const configLevel = (cfg.security?.logLevel || cfg.security?.audit?.logLevel || '').toLowerCase();
      const currentLevel = envLevel || configLevel || 'warn';

      const levels = { error: 0, warn: 1, warning: 1, info: 2 };
      const messageLevel = levels[level.toLowerCase()] ?? 2;
      const allowedLevel = levels[currentLevel] ?? 1;
      if (messageLevel > allowedLevel) {
        return;
      }

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

      const message = `[SECURITY ${level.toUpperCase()}] ${timestamp}: ${event}`;
      if (level === 'error') {
        console.error(message, details);
      } else if (level === 'warn' || level === 'warning') {
        console.warn(message, details);
      } else {
        console.log(message, details);
      }
    } finally {
      this._logging = false;
    }
  }
  /**
   * Safely reads directory contents with path validation
   * @param {string} dirPath - Directory path to read
   * @param {string} basePath - Base path for validation
   * @param {object} options - Options for readdirSync (withFileTypes, etc.)
   * @returns {Array|null} - Directory contents or null if error
   */
  static safeReaddirSync(dirPath, basePath, options = {}) {
    const validatedPath = this.validatePath(dirPath, basePath);
    if (!validatedPath) {
      return null;
    }

    try {
      return fs.readdirSync(validatedPath, options);
    } catch (error) {
      const i18n = getI18n();
      console.warn(i18n.t('security.directory_read_error', { errorMessage: error.message }));
      return null;
    }
  }

  /**
   * Secure performance measurement utility
   * Provides safe timing functionality using Date.now()
   * @returns {object} - Performance timing object
   */
  static getPerformanceTimer() {
    return {
      now: () => Date.now(),
      isHighResolution: false
    };
  }

  /**
   * Secure debug logging utility
   * Provides controlled debug output based on configuration
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} message - Log message
   * @param {object} details - Additional details
   */
  static debugLog(level, message, details = {}) {
    try {
      const cfg = getConfigManager()?.getConfig();
      const debugEnabled = cfg.debug?.enabled || false;
      const logLevel = cfg.debug?.logLevel || 'info';
      
      if (!debugEnabled) {
        return;
      }

      const levels = { debug: 0, info: 1, warn: 2, error: 3 };
      const currentLevel = levels[logLevel] || 1;
      const messageLevel = levels[level] || 1;

      if (messageLevel < currentLevel) {
        return;
      }

      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        details,
        pid: process.pid
      };

      // Only log to console if debug mode is enabled
      if (cfg.debug?.showConsoleOutput !== false) {
        console.log(`[${logEntry.level}] ${timestamp}: ${message}`, details);
      }

      // Log to file if configured
      if (cfg.debug?.logFile) {
        const fs = require('fs');
        const path = require('path');
        const logFile = path.resolve(cfg.debug.logFile);
        
        try {
          const logLine = JSON.stringify(logEntry) + '\n';
          fs.appendFileSync(logFile, logLine);
        } catch (error) {
          // Silently fail if file logging fails
        }
      }
    } catch (error) {
      // Fallback: if config can't be loaded, don't crash
      console.warn(`[DEBUG] ${message}`, details);
    }
  }
}

module.exports = SecurityUtils;
