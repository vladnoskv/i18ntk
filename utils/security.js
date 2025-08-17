const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const configManager = require('./config-manager');

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
 */
class SecurityUtils {
  /**
   * Validates and sanitizes file paths to prevent path traversal attacks
   * @param {string} inputPath - The input path to validate
   * @param {string} basePath - The base path that the input should be within (optional)
   * @returns {string|null} - Sanitized path or null if invalid
   */
  static sanitizePath(inputPath, basePath = process.cwd(), options = {}) {
    try {
      if (!inputPath || typeof inputPath !== 'string') {
        console.error('SecurityUtils.sanitizePath: inputPath is not a string:', inputPath);
        return null;
      }

      const { 
        allowTraversal = false, 
        createIfNotExists = false,
        normalize = true 
      } = options;

      // Resolve and normalize base path
      const absoluteBase = path.resolve(basePath);
      
      // Helper to normalize path case for comparison
      const normalizeCase = (p) => 
        process.platform === 'win32' ? p.toLowerCase() : p;
      
      // Resolve the input path relative to base
      const resolvedPath = path.resolve(absoluteBase, inputPath);
      
      // Normalize the path if requested
      const normalizedPath = normalize ? path.normalize(resolvedPath) : resolvedPath;
      
      // For Windows, normalize the path separators
      const normalizedForOs = process.platform === 'win32' 
        ? normalizedPath.replace(/\\/g, '/') 
        : normalizedPath;
      
      const normalizedBase = process.platform === 'win32'
        ? absoluteBase.replace(/\\/g, '/')
        : absoluteBase;
      
      // Check for path traversal attempts
      if (!allowTraversal) {
        // Check if the resolved path is within the base directory
        if (!normalizeCase(normalizedForOs).startsWith(normalizeCase(normalizedBase + '/'))) {
          console.error('SecurityUtils.sanitizePath: Path traversal attempt detected:', {
            inputPath,
            basePath: absoluteBase,
            resolvedPath: normalizedForOs
          });
          return null;
        }
        
        // Additional check for relative paths that might escape
        const relativePath = path.relative(absoluteBase, normalizedPath);
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
          console.error('SecurityUtils.sanitizePath: Relative path traversal detected:', relativePath);
          return null;
        }
      }
      
      // Ensure directory exists if requested
      if (createIfNotExists) {
        const dir = path.dirname(normalizedPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
      
      return normalizedPath;
    } catch (error) {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.pathValidationError'), 'error', { 
        inputPath: inputPath || 'unknown', 
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
    const validatedPath = this.sanitizePath(filePath, basePath);
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
    const validatedPath = this.sanitizePath(filePath, basePath);
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
   * Safely writes a file with path validation and error handling
   * @param {string} filePath - Path to the file
   * @param {string} content - Content to write
   * @param {string} basePath - Base path for validation
   * @param {string} encoding - File encoding (default: 'utf8')
   * @returns {Promise<boolean>} - Success status
   */
  static async safeWriteFile(filePath, content, basePath, encoding = 'utf8') {
    const validatedPath = this.sanitizePath(filePath, basePath);
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
   * Secure directory listing with path traversal protection
   * @param {string} dirPath - Directory path to list
   * @param {string} basePath - Base directory for validation (required)
   * @param {Object} options - Additional security options
   * @returns {string[]} Array of file/directory names
   */
  static safeReaddirSync(dirPath, basePath, options = {}) {
    const {
      allowSymlinks = false,
      allowlist = null,
      maxDepth = 1
    } = options;

    // Validate required parameters
    if (!dirPath || typeof dirPath !== 'string') {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.invalidDirectoryPath'), 'error', { inputPath: dirPath });
      throw new SecurityError('Invalid directory path provided');
    }

    if (!basePath || typeof basePath !== 'string') {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.invalidBasePath'), 'error', { basePath });
      throw new SecurityError('Invalid base path provided');
    }

    try {
      // Validate the directory path
      const validatedPath = this.sanitizePath(dirPath, basePath);
      if (!validatedPath) {
        const i18n = getI18n();
        throw new SecurityError(i18n.t('security.pathValidationFailed'));
      }

      // Check allowlist if provided
      if (allowlist && Array.isArray(allowlist)) {
        const isAllowed = allowlist.some(allowed => {
          try {
            const allowedPath = path.resolve(basePath, allowed);
            return validatedPath.startsWith(allowedPath);
          } catch {
            return false;
          }
        });
        
        if (!isAllowed) {
          const i18n = getI18n();
          SecurityUtils.logSecurityEvent(i18n.t('security.pathNotInAllowlist'), 'warning', { path: validatedPath });
          throw new SecurityError('Directory path not in allowlist');
        }
      }

      // Check symlink protection
      if (!allowSymlinks) {
        try {
          const realPath = fs.realpathSync(validatedPath);
          const baseRealPath = fs.realpathSync(basePath);
          
          if (!realPath.startsWith(baseRealPath)) {
            const i18n = getI18n();
            SecurityUtils.logSecurityEvent(i18n.t('security.symlinkTraversalDetected'), 'warning', { 
              path: validatedPath, 
              realPath 
            });
            throw new SecurityError('Symlink traversal detected');
          }
        } catch (error) {
          if (error instanceof SecurityError) {
            throw error;
          }
          // Continue if realpath fails (path doesn't exist)
        }
      }

      // Validate it's actually a directory
      const stats = fs.statSync(validatedPath);
      if (!stats.isDirectory()) {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.pathNotDirectory'), 'error', { path: validatedPath });
        throw new SecurityError('Path is not a directory');
      }

      // Perform the directory listing
      const files = fs.readdirSync(validatedPath);
      
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.directoryListed'), 'info', { 
        path: validatedPath, 
        fileCount: files.length 
      });
      
      return files;
      
    } catch (error) {
      // Re-throw SecurityError instances
      if (error instanceof SecurityError) {
        throw error;
      }
      
      // Log and re-wrap other errors
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.directoryAccessError'), 'error', { 
        path: dirPath, 
        error: error.message 
      });
      throw new SecurityError(`Access denied to directory: ${dirPath}`);
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
              allowedChars: /^[a-zA-Z0-9\-_\.\,\/\\\:\s]+$/,
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
   * Centralized path sanitization utility for preventing path traversal
      }
      continue;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      return resolvedPath;
    } catch (error) {
      console.error('SecurityUtils.sanitizePath error:', error);
      return null;
    }
  }

  /**
   * Secure directory creation with path validation
   * @param {string} dirPath - Directory path to create
   * @param {string} basePath - Base path for validation
   * @param {Object} options - Creation options
   * @returns {string|null} - Created directory path or null if failed
   */
  static safeMkdirSync(dirPath, basePath, options = {}) {
    const sanitizedPath = this.sanitizePath(dirPath, basePath, { 
      createIfNotExists: true,
      ...options 
    });
    
    if (!sanitizedPath) {
      return null;
    }

    try {
      if (!fs.existsSync(sanitizedPath)) {
        fs.mkdirSync(sanitizedPath, { recursive: true, mode: 0o755 });
      }
      
      // Verify it's a directory
      const stats = fs.statSync(sanitizedPath);
      if (!stats.isDirectory()) {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.pathNotDirectory'), 'error', { path: sanitizedPath });
        return null;
      }

      return sanitizedPath;
    } catch (error) {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.directoryCreationError'), 'error', { 
        path: sanitizedPath, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Secure file write with path validation and atomic operations
   * @param {string} filePath - File path to write
   * @param {string|Buffer} content - Content to write
   * @param {string} basePath - Base path for validation
   * @param {Object} options - Write options
   * @returns {boolean} - Success status
   */
  static safeWriteFileSync(filePath, content, basePath, options = {}) {
    const sanitizedPath = this.sanitizePath(filePath, basePath, { 
      createIfNotExists: true,
      ...options 
    });
    
    if (!sanitizedPath) {
      return false;
    }

    try {
      const { 
        atomic = true, 
        mode = 0o644,
        encoding = 'utf8' 
      } = options;

      // Validate content size
      const contentSize = typeof content === 'string' ? Buffer.byteLength(content, encoding) : content.length;
      if (contentSize > 10 * 1024 * 1024) { // 10MB limit
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.contentTooLarge'), 'error', { 
          filePath: sanitizedPath, 
          size: contentSize 
        });
        return false;
      }

      if (atomic) {
        // Atomic write: write to temp file, then rename
        const tempPath = `${sanitizedPath}.tmp.${Date.now()}`;
        fs.writeFileSync(tempPath, content, { encoding, mode });
        fs.renameSync(tempPath, sanitizedPath);
      } else {
        fs.writeFileSync(sanitizedPath, content, { encoding, mode });
      }

      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.fileWritten'), 'info', { 
        filePath: sanitizedPath,  
        size: contentSize 
      });

      return true;
    } catch (error) {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.fileWriteError'), 'error', { 
        filePath: sanitizedPath, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Secure file existence check with path validation
   * @param {string} filePath - File path to check
   * @param {string} basePath - Base path for validation
   * @returns {boolean} - Whether file exists and is accessible
   */
  static safeExistsSync(filePath, basePath) {
    const sanitizedPath = this.sanitizePath(filePath, basePath);
    if (!sanitizedPath) {
      return false;
    }

    try {
      fs.accessSync(sanitizedPath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Secure file stat with path validation
   * @param {string} filePath - File path to stat
   * @param {string} basePath - Base path for validation
   * @returns {fs.Stats|null} - File stats or null if error
   */
  static safeStatSync(filePath, basePath) {
    const sanitizedPath = this.sanitizePath(filePath, basePath);
    if (!sanitizedPath) {
      return null;
    }

    try {
      return fs.statSync(sanitizedPath);
    } catch (error) {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.fileStatError'), 'error', { 
        filePath: sanitizedPath, 
        error: error.message
      });
      return null;
    }
  }

  /**
   * Secure file/directory deletion with path validation
   * @param {string} filePath - File or directory path to delete
   * @param {string} basePath - Base path for validation
   * @param {Object} options - Deletion options
   * @returns {boolean} - Success status
   */
  static safeDeleteSync(filePath, basePath, options = {}) {
    const sanitizedPath = this.sanitizePath(filePath, basePath);
    if (!sanitizedPath) {
      return false;
    }

    try {
      const { recursive = false } = options;
      
      // Check if path exists before attempting deletion
      if (!fs.existsSync(sanitizedPath)) {
        return true; // Already deleted, consider success
      }

      const stats = fs.statSync(sanitizedPath);
      
      if (stats.isDirectory()) {
        if (recursive) {
          fs.rmSync(sanitizedPath, { recursive: true, force: true });
        } else {
          fs.rmdirSync(sanitizedPath);
        }
      } else {
        fs.unlinkSync(sanitizedPath);
      }

      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.fileDeleted'), 'info', { 
        filePath: sanitizedPath,
        isDirectory: stats.isDirectory(),
        recursive: recursive
      });

      return true;
    } catch (error) {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.fileDeleteError'), 'error', { 
        filePath: sanitizedPath, 
        error: error.message
      });
      return false;
    }
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
      // Avoid circular dependency by checking if configManager is available
      const cfg = configManager?.getConfig?.();
      if (cfg?.debug?.enabled && cfg?.debug?.showSecurityLogs) {
        console.log(`[SECURITY ${level.toUpperCase()}] ${timestamp}: ${event}`, details);
      }
    } catch (error) {
      // Fallback: if settings can't be loaded, don't show security logs to maintain clean UI
      // Only log critical security events in this case
      if (event.includes('CRITICAL') || event.includes('BREACH') || event.includes('ATTACK')) {
        try {
          const i18n = getI18n();
          console.log(i18n.t('security.security_alert', { timestamp, event }), details);
        } catch (i18nError) {
          // Final fallback if i18n also fails
          console.log(`[SECURITY ALERT] ${timestamp}: ${event}`, details);
        }
      }
    }
  }
}

/**
 * Custom Security Error class for security-related exceptions
 */
class SecurityError extends Error {
  constructor(message, code = 'SECURITY_ERROR') {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

module.exports = SecurityUtils;
module.exports.SecurityError = SecurityError;