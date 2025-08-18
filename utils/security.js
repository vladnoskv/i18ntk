const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Custom SecurityError class definition
class SecurityError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'SecurityError';
    this.context = context;
    // Set error object's stack
    Error.captureStackTrace(this, SecurityError);
  }
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
      return {
        t: (key, params = {}) => key
      };
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
   * Sanitizes user-provided paths to prevent path traversal vulnerabilities
   * @param {string} inputPath - Raw user input path to be sanitized
   * @param {string} [basePath=process.cwd()] - Base path that inputPath should be within
   * @param {Object} [options={}] - Additional sanitization options
   * @param {boolean} [options.allowTraversal=false] - Whether to allow path traversal
   * @param {boolean} [options.createIfNotExists=false] - Whether to create directory if it doesn't exist
   * @param {boolean} [options.normalize=true] - Whether to normalize the path
   * @returns {string|null} - Normalized and validated safe path, or null if invalid
   * @throws {Error} - If input contains traversal sequences or invalid characters
   */

  static sanitizePath(inputPath, basePath = null, options = {}) {
    // Use project root from config if basePath not provided
    if (basePath === null) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    } else if (basePath === process.cwd()) {
      // Use process.cwd() as-is to avoid circular dependency
      basePath = process.cwd();
    } else {
      // Use provided basePath as-is
      basePath = path.resolve(basePath);
    }
    try {
      if (!inputPath || typeof inputPath !== 'string') {
        console.error('SecurityUtils.sanitizePath: inputPath is not a string:', inputPath);
        return null;
      }
      const { allowTraversal = false, createIfNotExists = false, normalize = true } = options;

      // Resolve and normalize base path using realpath for canonicalization
      let absoluteBase;
      let resolvedPath;
      
      try {
        // Use fs.realpathSync.native for proper canonicalization on Windows
        absoluteBase = fs.realpathSync.native(path.resolve(basePath));
        resolvedPath = fs.realpathSync.native(path.resolve(absoluteBase, inputPath));
      } catch (error) {
        // If realpath fails (path doesn't exist), fall back to regular resolution
        absoluteBase = path.resolve(basePath);
        resolvedPath = path.resolve(absoluteBase, inputPath);
      }
      
      // Normalize the path if requested
      const normalizedPath = normalize ? path.normalize(resolvedPath) : resolvedPath;

      // Check for path traversal attempts
      if (!allowTraversal) {
        // Use path.relative for accurate comparison, handling both separators and casing
        const relativePath = path.relative(absoluteBase, normalizedPath);
        
        // Check if the path tries to escape the base directory
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
          console.error('SecurityUtils.sanitizePath: Path traversal attempt detected:', { 
            inputPath, 
            basePath: absoluteBase, 
            resolvedPath: normalizedPath,
            relativePath 
          });
          return null;
        }
      }

      // Ensure directory exists if requested
      if (createIfNotExists) {
        const dir = path.dirname(normalizedPath);
        if (createIfNotExists) {
          const dir = path.dirname(normalizedPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        }        
      }

      return normalizedPath;
    } catch (error) {
      const i18n = getI18n();
      this.logSecurityEvent(i18n.t('security.pathValidationError'), 'error', {
        inputPath: inputPath || 'unknown',
        error: error.message
      });
      return null;
    }
  }

  /**
   * Safely reads a file synchronously with path validation and error handling
   * @param {string} filePath - Path to the file
   * @param {string} [encoding='utf8'] - File encoding
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {string|null} - File content or null if error
   */
  static safeReadFileSync(filePath, encoding = 'utf8', basePath = null) {
    if (basePath === null || basePath === process.cwd()) {
      // Use process.cwd() directly to avoid circular dependency
      basePath = process.cwd();
    }
    const validatedPath = this.sanitizePath(filePath, basePath);
    if (!validatedPath) {
      return null;
    }
    const i18n = getI18n();
    try {
      // Check if file exists and is readable
      SecurityUtils.safeAccessSync(validatedPath, fs.constants.R_OK);

      // Read file with size limit (10MB max)
      const stats = SecurityUtils.safeStatSync(validatedPath);
      if (stats.size > 10 * 1024 * 1024) {
        console.warn(i18n.t('security.file_too_large', { filePath: validatedPath }));
        return null;
      }
      return fs.readFileSync(validatedPath, encoding);
    } catch (error) {
      // Only log errors that aren't simple file-not-found
      if (error.code !== 'ENOENT') {
        console.warn(i18n.t('security.file_read_error', { errorMessage: error.message }));
      }
      return null;
    }
  }

  /**
   * Secure directory listing with path traversal protection
   * @param {string} dirPath - Directory path to list
   * @param {Object} [options={}] - Additional security options
   * @param {string} [basePath=process.cwd()] - Base directory for validation
   * @param {boolean} [options.allowSymlinks=false] - Whether to allow symlinks
   * @param {string[]} [options.allowlist=null] - List of allowed paths
   * @param {number} [options.maxDepth=1] - Maximum directory depth
   * @returns {string[]} Array of file/directory names
   * @throws {SecurityError} If directory access is denied or path is invalid
   */
  static safeReaddirSync(dirPath, options = {}, basePath = null) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const { allowSymlinks = false, allowlist = null, maxDepth = 1 } = options;

    // Validate required parameters
    if (!dirPath || typeof dirPath !== 'string') {
      const i18n = getI18n();
      SecurityUtils.logSecurityEvent(i18n.t('security.invalidDirectoryPath'), 'error', {
        inputPath: dirPath
      });
      throw new SecurityError('Invalid directory path provided');
    }
    if (!basePath || typeof basePath !== 'string') {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.invalidBasePath'), 'error', {
          basePath
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.invalidBasePath', 'error', {
          basePath
        });
      }
      throw new SecurityError('Invalid base path provided');
    }

    try {
      // Validate the directory path
      const validatedPath = this.sanitizePath(dirPath, basePath);
      if (!validatedPath) {
        try {
          const i18n = getI18n();
          throw new SecurityError(i18n.t('security.pathValidationFailed'));
        } catch {
          throw new SecurityError('security.pathValidationFailed');
        }
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
          try {
            const i18n = getI18n();
            SecurityUtils.logSecurityEvent(i18n.t('security.pathNotInAllowlist'), 'warning', {
              path: validatedPath
            });
          } catch {
            SecurityUtils.logSecurityEvent('security.pathNotInAllowlist', 'warning', {
              path: validatedPath
            });
          }
          throw new SecurityError('Directory path not in allowlist');
        }
      }

      // Check symlink protection
      if (!allowSymlinks) {
        try {
          const realPath = fs.realpathSync.native(validatedPath);
          const baseRealPath = fs.realpathSync.native(basePath);
          
          // Use path.relative for accurate comparison, handling separators and casing
          const relativePath = path.relative(baseRealPath, realPath);
          
          // Check if the symlink target is outside the base directory
          if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            try {
              const i18n = getI18n();
              SecurityUtils.logSecurityEvent(i18n.t('security.symlinkTraversalDetected'), 'warning', {
                path: validatedPath,
                realPath
              });
            } catch {
              SecurityUtils.logSecurityEvent('security.symlinkTraversalDetected', 'warning', {
                path: validatedPath,
                realPath
              });
            }
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
      const stats = SecurityUtils.safeStatSync(validatedPath);
      if (!stats.isDirectory()) {
        try {
          const i18n = getI18n();
          SecurityUtils.logSecurityEvent(i18n.t('security.pathNotDirectory'), 'error', {
            path: validatedPath
          });
        } catch {
          SecurityUtils.logSecurityEvent('security.pathNotDirectory', 'error', {
            path: validatedPath
          });
        }
        throw new SecurityError('Path is not a directory');
      }

      // Perform the directory listing
      const files = fs.readdirSync(validatedPath);
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.directoryListed'), 'info', {
          path: validatedPath,
          fileCount: files.length
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.directoryListed', 'info', {
          path: validatedPath,
          fileCount: files.length
        });
      }
      return files;
    } catch (error) {
      // Re-throw SecurityError instances
      if (error instanceof SecurityError) {
        throw error;
      }
      // Log and re-wrap other errors
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.directoryAccessError'), 'error', {
          path: dirPath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.directoryAccessError', 'error', {
          path: dirPath,
          error: error.message
        });
      }
      throw new SecurityError(`Access denied to directory: ${dirPath}`);
    }
  }

  /**
   * Checks if a path exists securely
   * @param {string} path - Path to check
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {boolean} - True if path exists and is safe
   */
  static safeExistsSync(path, basePath = null) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const sanitizedPath = this.sanitizePath(path, basePath);
    if (!sanitizedPath) {
      return false;
    }
    return SecurityUtils.safeStatSync(sanitizedPath) !== null;
  }

  /**
   * Safely gets file/directory stats synchronously with path validation
   * @param {string} filePath - Path to the file/directory
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {fs.Stats|null} - Stats object or null if error
   */
  static safeStatSync(filePath, basePath = null) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.sanitizePath(filePath, basePath);
    if (!validatedPath) {
      return null;
    }
    
    try {
      return SecurityUtils.safeStatSync(validatedPath);
    } catch (error) {
      // Only log non-ENOENT errors to avoid spam for missing files
      if (error.code !== 'ENOENT') {
        try {
          const i18n = getI18n();
          SecurityUtils.logSecurityEvent(i18n.t('security.statError'), 'error', {
            path: filePath,
            error: error.message
          });
        } catch {
          SecurityUtils.logSecurityEvent('security.statError', 'error', {
            path: filePath,
            error: error.message
          });
        }
      }
      return null;
    }
  }

  /**
   * Logs security events with context
   * @param {string} message - Event message
   * @param {string} level - Log level (info, warning, error)
   * @param {Object} [context={}] - Additional context
   */
  static logSecurityEvent(message, level, context = {}) {
    let translatedMessage;
    try {
      const i18n = getI18n();
      translatedMessage = i18n.t(message, context);
    } catch (error) {
      // Fallback to the raw message key if i18n is not available
      translatedMessage = message;
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${translatedMessage}`;
    
    // Log to console
    console.log(logEntry);
    
    // Optionally log to file (implementation depends on specific requirements)
    // This is a placeholder - actual implementation would need to handle file writing securely
    // const logFile = path.join(process.cwd(), 'security.log');
    // fs.appendFileSync(logFile, logEntry + '\n');
  }

  /**
   * Safely creates a directory synchronously with path validation
   * @param {string} dirPath - Directory path to create
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {Object} [options={}] - Options for mkdirSync
   * @returns {string|null} - Created directory path or null if error
   */
  static safeMkdirSync(dirPath, basePath = null, options = {}) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.sanitizePath(dirPath, basePath);
    if (!validatedPath) {
      return null;
    }
    
    try {
      fs.mkdirSync(validatedPath, options);
      return validatedPath;
    } catch (error) {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.directoryCreationError'), 'error', {
          path: dirPath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.directoryCreationError', 'error', {
          path: dirPath,
          error: error.message
        });
      }
      return null;
    }
  }

  /**
   * Safely writes a file synchronously with path validation
   * @param {string} filePath - Path to the file
   * @param {string|Buffer} data - File content to write
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @param {Object} [options={}] - Options for writeFileSync
   * @returns {boolean} - True if write was successful, false otherwise
   */
  static safeWriteFileSync(filePath, data, basePath = null, options = {}) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.sanitizePath(filePath, basePath);
    if (!validatedPath) {
      return false;
    }
    
    try {
      if (fs.existsSync(validatedPath)) {
        const stat = fs.statSync(validatedPath);
        if (stat.isDirectory()) {
          return false;
        }
      }
    
      // Ensure directory exists
      const dir = path.dirname(validatedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Reuse existing dir variable
      if (!SecurityUtils.safeExistsSync(dir)) {
        SecurityUtils.safeMkdirSync(dir, null, { recursive: true });
      }
      
      fs.writeFileSync(validatedPath, data, options);
      return true;
    } catch (error) {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.fileWriteError'), 'error', {
          path: filePath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.fileWriteError', 'error', {
          path: filePath,
          error: error.message
        });
      }
      return false;
    }
  }

  /**
   * Safely deletes a file or directory synchronously with path validation
   * @param {string} filePath - Path to the file or directory to delete
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {boolean} - True if deletion was successful, false otherwise
   */

  static safeDeleteSync(filePath, basePath = null) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.sanitizePath(filePath, basePath);
    if (!validatedPath) {
      return false;
    }
    
    try {
      if (SecurityUtils.safeExistsSync(validatedPath)) {
        const stat = SecurityUtils.safeStatSync(validatedPath);
        if (stat.isDirectory()) {
          fs.rmdirSync(validatedPath, { recursive: true });
        } else {
          fs.unlinkSync(validatedPath);
        }
      }
      return true;
    } catch (error) {
      try {
        const i18n = getI18n();
        SecurityUtils.logSecurityEvent(i18n.t('security.fileDeleteError'), 'error', {
          path: filePath,
          error: error.message
        });
      } catch {
        SecurityUtils.logSecurityEvent('security.fileDeleteError', 'error', {
          path: filePath,
          error: error.message
        });
      }
      return false;
    }
  }

  /**
   * Safely checks file access permissions synchronously with path validation
   * @param {string} filePath - Path to the file/directory to check
   * @param {number} [mode=fs.constants.F_OK] - Access mode to check
   * @param {string} [basePath=process.cwd()] - Base path for validation
   * @returns {boolean} - True if access is allowed, false otherwise
   */
  static safeAccessSync(filePath, mode = fs.constants.F_OK, basePath = null) {
    if (basePath === null || basePath === process.cwd()) {
      try {
        // Avoid circular dependency by using process.cwd() directly
        basePath = process.cwd();
      } catch (error) {
        basePath = process.cwd();
      }
    }
    const validatedPath = this.sanitizePath(filePath, basePath);
    if (!validatedPath) {
      return false;
    }
    
    try {
      fs.accessSync(validatedPath, mode);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Additional security utility methods would be here in the original file
}

module.exports = SecurityUtils;
module.exports.SecurityError = SecurityError;