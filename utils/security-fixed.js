const path = require('path');
const fs = require('fs');
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
 */
console.log('🔍 DEBUG: SecurityUtils class loaded successfully');
class SecurityUtils {

  // Static properties for operation tracking
  static _operationStack = new Set();
  static _logging = false;

  constructor() {
    // Instance constructor - static properties are already initialized
  }

  /**
   * Timeout wrapper for synchronous operations to prevent hanging
   * @param {Function} operation - The synchronous operation to wrap
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} operationName - Name of the operation for logging
   * @returns {*} - Operation result or null if timeout/error
   */
  static withTimeoutSync(operation, timeoutMs = 5000, operationName = 'operation') {
    // Track recursion to prevent infinite loops
    if (!SecurityUtils._operationStack) {
      SecurityUtils._operationStack = new Set();
    }

    if (SecurityUtils._operationStack.has(operationName)) {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.recursion_detected', { operation: operationName }), 'error');
      return null;
    }

    SecurityUtils._operationStack.add(operationName);

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
      SecurityUtils._operationStack.delete(operationName);
    }
  }

  /**
   * Logs security events for monitoring
   * @param {string} event - Security event description
   * @param {string} level - Log level (info, warn, error)
   * @param {object} details - Additional details
   */
  static logSecurityEvent(event, level = 'info', details = {}) {
    // Prevent recursive logging which can occur during configuration loading
    if (SecurityUtils._logging) {
      return;
    }

    SecurityUtils._logging = true;
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
      SecurityUtils._logging = false;
    }
  }

  // Add other static methods here...
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

      // Check for obvious dangerous patterns first
      if (!SecurityUtils.isSafePath(filePath)) {
        const message = useI18n
          ? i18n.t('security.pathTraversalAttempt')
          : 'Path traversal attempt';
        SecurityUtils.logSecurityEvent(message, 'warning', {
          inputPath: filePath,
          reason: 'Contains dangerous patterns'
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

      // Check for actual path traversal (going outside the base directory)
      const relativePath = path.relative(base, finalPath);
      if (relativePath.startsWith('..')) {
        const message = useI18n
          ? i18n.t('security.pathTraversalAttempt')
          : 'Path traversal attempt';
        SecurityUtils.logSecurityEvent(message, 'warning', {
          inputPath: filePath,
          resolvedPath: finalPath,
          basePath: base,
          relativePath: relativePath
        });
        return null;
      }

      // Allow absolute paths that resolve within the project structure
      // The isSafePath check above already filtered out dangerous absolute paths

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

  static generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

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
  static validateConfig(config) {
    if (!config || typeof config !== 'object') {
      SecurityUtils.logSecurityEvent('Invalid configuration object provided', 'error', {
        configType: typeof config
      });
      return {};
    }

    const sanitized = { ...config };
    const i18n = getI18n();

    // Define allowed configuration properties
    const allowedProperties = new Set([
      // Core directories and paths
      'projectRoot', 'sourceDir', 'i18nDir', 'outputDir', 'backupDir', 'tempDir', 'cacheDir', 'configDir',
      // Language settings
      'sourceLanguage', 'uiLanguage', 'language', 'defaultLanguages', 'supportedLanguages',
      // Translation markers and content
      'notTranslatedMarker', 'notTranslatedMarkers', 'translatedMarker', 'translatedMarkers',
      // File handling
      'supportedExtensions', 'excludeFiles', 'excludeDirs', 'includeFiles', 'includeDirs',
      // Operational settings
      'strictMode', 'debug', 'displayPaths', 'version', 'scriptDirectories',
      // Framework and processing
      'framework', 'processing', 'performance', 'advanced',
      // UI and theme settings
      'theme', 'ui', 'setup', 'reports', 'display', 'interface',
      // Security and settings
      'security', 'settings', 'preferences', 'config', 'configuration',
      // Additional common properties
      'autoSave', 'autoBackup', 'validateOnSave', 'showWarnings', 'verbose',
      'timeout', 'retries', 'batchSize', 'maxConcurrency', 'cacheEnabled'
    ]);

    // Remove unknown properties
    Object.keys(sanitized).forEach(key => {
      if (!allowedProperties.has(key)) {
        // Only log warnings for properties that might be security risks
        const value = sanitized[key];
        const isSuspicious = typeof value === 'string' &&
          (value.includes('..') || value.includes('/') || value.includes('\\') ||
           value.includes('$') || value.includes('`') || value.includes('|') ||
           value.includes(';') || value.includes('&'));

        if (isSuspicious) {
          SecurityUtils.logSecurityEvent('Removing potentially suspicious configuration property', 'warn', {
            property: key,
            value: sanitized[key]
          });
        } else {
          // Use info level for normal unknown properties to reduce noise
          SecurityUtils.logSecurityEvent('Removing unknown configuration property', 'info', {
            property: key,
            value: sanitized[key]
          });
        }
        delete sanitized[key];
      }
    });

    // Validate and sanitize path properties
    const pathProperties = ['projectRoot', 'sourceDir', 'i18nDir', 'outputDir', 'backupDir', 'tempDir', 'cacheDir', 'configDir'];

    pathProperties.forEach(prop => {
      if (sanitized[prop] && typeof sanitized[prop] === 'string') {
        // Check for dangerous patterns
        if (!SecurityUtils.isSafePath(sanitized[prop])) {
          SecurityUtils.logSecurityEvent('Path validation failed for configuration property', 'error', {
            property: prop,
            originalPath: sanitized[prop]
          });

          // Attempt to sanitize the path by removing dangerous patterns
          let sanitizedPath = sanitized[prop];

          // Remove parent directory references (path traversal)
          sanitizedPath = sanitizedPath.replace(/\.\.[\/\\]/g, '');

          // Remove shell metacharacters and dangerous patterns
          sanitizedPath = sanitizedPath.replace(/[|;&$`{}()[\]<>?]/g, '');

          // Only remove absolute path indicators if they're suspicious
          // Allow legitimate Windows drive letters (C:\, D:\, etc.) but remove suspicious ones
          if (sanitizedPath.match(/^[A-Z]:[\/\\]/)) {
            // Check if this looks like a legitimate Windows path by ensuring it doesn't contain
            // suspicious patterns after the drive letter
            const afterDrive = sanitizedPath.substring(3); // Everything after "C:\"
            if (afterDrive.includes('..') || afterDrive.match(/[|;&$`{}()[\]<>?]/)) {
              // Remove the drive letter if the rest of the path is suspicious
              sanitizedPath = sanitizedPath.replace(/^[A-Z]:[\/\\]/, '');
            }
            // If the path looks legitimate, keep the drive letter
          } else {
            // For non-Windows paths, remove leading slashes as before
            sanitizedPath = sanitizedPath.replace(/^[\/\\]/, '');
          }

          if (sanitizedPath !== sanitized[prop]) {
            // Only warn if significant changes were made (not just removing drive letters for legitimate paths)
            const significantChange = sanitizedPath.length < sanitized[prop].length * 0.8 ||
              sanitizedPath.replace(/[\/\\]/g, '') !== sanitized[prop].replace(/^[A-Z]:[\/\\]/, '').replace(/[\/\\]/g, '');

            if (significantChange) {
              SecurityUtils.logSecurityEvent('Path sanitized for configuration property', 'warn', {
                property: prop,
                originalPath: sanitized[prop],
                sanitizedPath: sanitizedPath
              });
            } else {
              SecurityUtils.logSecurityEvent('Path normalized for configuration property', 'info', {
                property: prop,
                originalPath: sanitized[prop],
                sanitizedPath: sanitizedPath
              });
            }
            sanitized[prop] = sanitizedPath;
          }
        }
      }
    });

    // Validate security settings
    if (sanitized.security) {
      const security = sanitized.security;

      // Validate session timeout (should be reasonable)
      if (security.sessionTimeout && (typeof security.sessionTimeout !== 'number' || security.sessionTimeout < 60000 || security.sessionTimeout > 86400000)) {
        SecurityUtils.logSecurityEvent('Invalid session timeout in security configuration', 'warn', {
          sessionTimeout: security.sessionTimeout
        });
        security.sessionTimeout = 1800000; // Default to 30 minutes
      }

      // Validate max failed attempts
      if (security.maxFailedAttempts && (typeof security.maxFailedAttempts !== 'number' || security.maxFailedAttempts < 1 || security.maxFailedAttempts > 10)) {
        SecurityUtils.logSecurityEvent('Invalid max failed attempts in security configuration', 'warn', {
          maxFailedAttempts: security.maxFailedAttempts
        });
        security.maxFailedAttempts = 3; // Default to 3 attempts
      }
    }

    // Validate language settings
    if (sanitized.sourceLanguage && typeof sanitized.sourceLanguage === 'string') {
      // Sanitize language code (only allow alphanumeric, hyphens, underscores)
      sanitized.sourceLanguage = sanitized.sourceLanguage.replace(/[^a-zA-Z0-9\-_]/g, '');
    }

    if (sanitized.uiLanguage && typeof sanitized.uiLanguage === 'string') {
      sanitized.uiLanguage = sanitized.uiLanguage.replace(/[^a-zA-Z0-9\-_]/g, '');
    }

    // Validate default languages array
    if (sanitized.defaultLanguages && Array.isArray(sanitized.defaultLanguages)) {
      sanitized.defaultLanguages = sanitized.defaultLanguages
        .filter(lang => typeof lang === 'string')
        .map(lang => lang.replace(/[^a-zA-Z0-9\-_]/g, ''))
        .filter(lang => lang.length > 0);
    }

    SecurityUtils.logSecurityEvent('Configuration validation completed', 'info', {
      propertiesCount: Object.keys(sanitized).length,
      sanitizedPaths: pathProperties.filter(prop => sanitized[prop]).length
    });

    return sanitized;
  }
}

module.exports = SecurityUtils;